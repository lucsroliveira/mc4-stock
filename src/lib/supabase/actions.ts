"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseConfig } from "./config";
import { uploadFileToSupabaseStorage } from "./storage";

export type AuthState = {
  error?: string;
};

export type UserRole = "cliente" | "operador" | "admin";

async function createActionClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseConfig();

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}

/**
 * Helper de segurança RBAC: Obtém a role do usuário logado e valida se está permitida.
 */
async function assertUserRole(
  supabase: Awaited<ReturnType<typeof createActionClient>>,
  allowedRoles: UserRole[],
): Promise<UserRole> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const currentRole = (profile?.role ?? "cliente") as UserRole;

  if (!allowedRoles.includes(currentRole)) {
    throw new Error(
      `Acesso negado: o seu perfil (${currentRole}) não tem permissão para esta operação.`,
    );
  }

  return currentRole;
}

async function resolveItemPhotoReference(formData: FormData, supabase: Awaited<ReturnType<typeof createActionClient>>) {
  const manualReference = String(formData.get("foto_url") ?? "").trim();
  const uploadedFile = formData.get("foto_file");

  if (uploadedFile instanceof File && uploadedFile.size > 0) {
    return uploadFileToSupabaseStorage(supabase, uploadedFile);
  }

  return manualReference || null;
}

export async function signIn(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const supabase = await createActionClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      return { error: signUpError.message };
    }

    const { error: retryError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (retryError) {
      return { error: retryError.message };
    }
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createActionClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createItem(formData: FormData) {
  const supabase = await createActionClient();
  // Apenas Operadores e Admins podem criar itens
  await assertUserRole(supabase, ["operador", "admin"]);

  const nome = String(formData.get("nome") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim();
  const cliente = String(formData.get("cliente") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const fotoUrl = await resolveItemPhotoReference(formData, supabase);

  if (!nome || !categoria || !cliente) {
    throw new Error("Preencha nome, categoria e cliente.");
  }

  const { error } = await supabase.from("itens").insert({
    nome,
    categoria,
    cliente,
    descricao: descricao || null,
    foto_url: fotoUrl || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/itens");
  revalidatePath("/dashboard");
}

export async function updateItem(formData: FormData) {
  const supabase = await createActionClient();
  // Apenas Operadores e Admins podem atualizar itens
  await assertUserRole(supabase, ["operador", "admin"]);

  const id = String(formData.get("id") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim();
  const cliente = String(formData.get("cliente") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const fotoUrl = await resolveItemPhotoReference(formData, supabase);

  if (!id || !nome || !categoria || !cliente) {
    throw new Error("Preencha id, nome, categoria e cliente.");
  }

  const { error } = await supabase
    .from("itens")
    .update({
      nome,
      categoria,
      cliente,
      descricao: descricao || null,
      foto_url: fotoUrl || null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/itens");
  revalidatePath(`/itens/${id}`);
  revalidatePath("/dashboard");
}

export async function deleteItem(formData: FormData) {
  const supabase = await createActionClient();
  // Apenas Administradores podem deletar itens
  await assertUserRole(supabase, ["admin"]);

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    throw new Error("ID do item ausente.");
  }

  const { count: movementCount, error: movementCountError } = await supabase
    .from("movimentacoes")
    .select("id", { count: "exact", head: true })
    .eq("item_id", id);

  if (movementCountError) {
    throw new Error(movementCountError.message);
  }

  // Se houver histórico de movimentação, preservamos auditoria e marcamos o item como inativo.
  if ((movementCount ?? 0) > 0) {
    const { error: inactivateError } = await supabase
      .from("itens")
      .update({ ativo: false })
      .eq("id", id);

    if (inactivateError) {
      if (inactivateError.message.toLowerCase().includes("column") && inactivateError.message.toLowerCase().includes("ativo")) {
        throw new Error(
          "Não foi possível inativar o item porque a coluna 'ativo' não existe na tabela 'itens'. Crie essa coluna no Supabase para usar exclusão lógica.",
        );
      }

      throw new Error(inactivateError.message);
    }

    revalidatePath("/itens");
    revalidatePath(`/itens/${id}`);
    revalidatePath("/dashboard");
    revalidatePath("/movimentacoes");
    revalidatePath("/consulta");
    revalidatePath("/relatorios");
    return;
  }

  const { error: stockLinksError } = await supabase
    .from("estoque_itens")
    .delete()
    .eq("item_id", id);

  if (stockLinksError) {
    throw new Error(stockLinksError.message);
  }

  const { error } = await supabase.from("itens").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/itens");
  revalidatePath(`/itens/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/movimentacoes");
  revalidatePath("/consulta");
  revalidatePath("/relatorios");
}

export async function reactivateItem(formData: FormData) {
  const supabase = await createActionClient();
  // Apenas Administradores podem reativar itens inativos
  await assertUserRole(supabase, ["admin"]);

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    throw new Error("ID do item ausente.");
  }

  const { error } = await supabase
    .from("itens")
    .update({ ativo: true })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/itens");
  revalidatePath(`/itens/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/movimentacoes");
  revalidatePath("/consulta");
  revalidatePath("/relatorios");
}

export async function createEstoque(formData: FormData) {
  const supabase = await createActionClient();
  // Apenas Operadores e Admins podem criar locais de estoque
  await assertUserRole(supabase, ["operador", "admin"]);

  const nome = String(formData.get("nome") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "").trim();
  const responsavel = String(formData.get("responsavel") ?? "").trim();
  const contato = String(formData.get("contato") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();

  if (!nome || !tipo || !responsavel || !contato) {
    throw new Error("Preencha nome, tipo, responsável e contato.");
  }

  const { error } = await supabase.from("estoques").insert({
    nome,
    tipo,
    responsavel,
    contato,
    endereco: endereco || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/estoques");
  revalidatePath("/dashboard");
}

export async function updateEstoque(formData: FormData) {
  const supabase = await createActionClient();
  // Apenas Operadores e Admins podem atualizar estoques
  await assertUserRole(supabase, ["operador", "admin"]);

  const id = String(formData.get("id") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "").trim();
  const responsavel = String(formData.get("responsavel") ?? "").trim();
  const contato = String(formData.get("contato") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();

  if (!id || !nome || !tipo || !responsavel || !contato) {
    throw new Error("Preencha id, nome, tipo, responsável e contato.");
  }

  const { error } = await supabase
    .from("estoques")
    .update({
      nome,
      tipo,
      responsavel,
      contato,
      endereco: endereco || null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/estoques");
  revalidatePath("/dashboard");
}

export async function deleteEstoque(formData: FormData) {
  const supabase = await createActionClient();
  // Apenas Administradores podem deletar estoques
  await assertUserRole(supabase, ["admin"]);

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    throw new Error("ID do estoque ausente.");
  }

  const { error } = await supabase.from("estoques").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/estoques");
  revalidatePath("/dashboard");
}

export async function createMovimentacao(formData: FormData) {
  const supabase = await createActionClient();
  // Apenas Operadores e Admins podem registrar movimentações operacionais
  await assertUserRole(supabase, ["operador", "admin"]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const itemId = String(formData.get("item_id") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "").trim();
  const origemId = String(formData.get("origem_id") ?? "").trim();
  const destinoId = String(formData.get("destino_id") ?? "").trim();
  const quantidade = Number(formData.get("quantidade") ?? 0);
  const observacao = String(formData.get("observacao") ?? "").trim();

  if (!itemId || !tipo || !quantidade || quantidade <= 0) {
    throw new Error("Preencha item, tipo e quantidade.");
  }

  if ((tipo === "saida" || tipo === "transferencia") && !origemId) {
    throw new Error("Selecione a origem para saída ou transferência.");
  }

  if ((tipo === "entrada" || tipo === "transferencia") && !destinoId) {
    throw new Error("Selecione o destino para entrada ou transferência.");
  }

  if (tipo === "saida" || tipo === "transferencia") {
    const { data: saldoAtual, error: saldoError } = await supabase
      .from("estoque_itens")
      .select("quantidade")
      .eq("item_id", itemId)
      .eq("estoque_id", origemId)
      .maybeSingle();

    if (saldoError) {
      throw new Error(saldoError.message);
    }

    if ((saldoAtual?.quantidade ?? 0) < quantidade) {
      throw new Error(`Saldo insuficiente no local selecionado. Disponível: ${saldoAtual?.quantidade ?? 0}`);
    }
  }

  const { error: rpcError } = await supabase.rpc("atualizar_estoque", {
    p_item_id: itemId,
    p_origem_id: origemId || null,
    p_destino_id: destinoId || null,
    p_quantidade: quantidade,
  });

  if (rpcError) {
    throw new Error(rpcError.message);
  }

  const { error: insertError } = await supabase.from("movimentacoes").insert({
    item_id: itemId,
    tipo,
    origem_id: origemId || null,
    destino_id: destinoId || null,
    quantidade,
    observacao: observacao || null,
    criado_por: user?.email ?? null,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/movimentacoes");
  revalidatePath("/consulta");
}

export async function deleteMovimentacao(formData: FormData) {
  const supabase = await createActionClient();
  // Apenas Administradores podem deletar movimentações
  await assertUserRole(supabase, ["admin"]);

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    throw new Error("ID da movimentação ausente.");
  }

  const { error } = await supabase.from("movimentacoes").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/movimentacoes");
  revalidatePath("/consulta");
  revalidatePath("/relatorios");
}

export async function createCategoria(formData: FormData) {
  const supabase = await createActionClient();
  // Apenas Administradores gerenciam categorias
  await assertUserRole(supabase, ["admin"]);

  const nome = String(formData.get("nome") ?? "").trim();

  if (!nome) {
    throw new Error("Informe o nome da categoria.");
  }

  const { error } = await supabase.from("categorias").insert({ nome });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/itens");
}

export async function updateCategoria(formData: FormData) {
  const supabase = await createActionClient();
  // Apenas Administradores gerenciam categorias
  await assertUserRole(supabase, ["admin"]);

  const id = String(formData.get("id") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();

  if (!id || !nome) {
    throw new Error("Preencha id e nome da categoria.");
  }

  const { error } = await supabase.from("categorias").update({ nome }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/itens");
}

export async function deleteCategoria(formData: FormData) {
  const supabase = await createActionClient();
  // Apenas Administradores gerenciam categorias
  await assertUserRole(supabase, ["admin"]);

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    throw new Error("ID da categoria ausente.");
  }

  const { error } = await supabase.from("categorias").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/itens");
}

export async function createCliente(formData: FormData) {
  const supabase = await createActionClient();
  // Apenas Administradores gerenciam clientes
  await assertUserRole(supabase, ["admin"]);

  const nome = String(formData.get("nome") ?? "").trim();

  if (!nome) {
    throw new Error("Informe o nome do cliente.");
  }

  const { error } = await supabase.from("clientes").insert({ nome });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/itens");
}

export async function updateCliente(formData: FormData) {
  const supabase = await createActionClient();
  // Apenas Administradores gerenciam clientes
  await assertUserRole(supabase, ["admin"]);

  const id = String(formData.get("id") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();

  if (!id || !nome) {
    throw new Error("Preencha id e nome do cliente.");
  }

  const { error } = await supabase.from("clientes").update({ nome }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/itens");
}

export async function deleteCliente(formData: FormData) {
  const supabase = await createActionClient();
  // Apenas Administradores gerenciam clientes
  await assertUserRole(supabase, ["admin"]);

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    throw new Error("ID do cliente ausente.");
  }

  const { error } = await supabase.from("clientes").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/itens");
}