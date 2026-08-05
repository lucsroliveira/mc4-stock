/**
 * GESTÃO DE CATÁLOGO - MÓDULO DE ITENS
 * 1. createSupabaseServerClient: Inicializa a conexão com o banco via Server Side.
 * 2. create/delete/updateItem: Server Actions para manipulação direta da tabela 'itens'.
 * 3. ItemsSearchTable: Componente cliente que gerencia a busca e filtragem de itens.
 * 4. resolveSupabaseAssetUrl: Utilitário que transforma o path do Storage em URL visível.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createItem, deleteItem, updateItem } from "@/lib/supabase/actions";
import ItemsSearchTable from "@/components/ItemsSearchTable";
import { resolveSupabaseAssetUrl } from "@/lib/supabase/storage";

export default async function ItensPage() {
  const supabase = await createSupabaseServerClient();
  type ItemRow = {
    id: string;
    nome: string | null;
    categoria: string | null;
    cliente: string | null;
    descricao: string | null;
    foto_url: string | null;
    foto_preview_url: string | null;
    created_at: string | null;
  };

  // Busca a lista mestra de itens ordenada pelos cadastros mais recentes.
  const { data: itens } = await supabase
    .from("itens")
    .select("id, nome, categoria, cliente, descricao, foto_url, created_at")
    .order("created_at", { ascending: false });

  // PROCESSO DE RESOLUÇÃO DE MÍDIA:
  // Para cada item, verificamos se existe um path em 'foto_url' e solicitamos 
  // ao Supabase Storage uma URL válida para renderização do preview.
  const itemRows = await Promise.all(
    ((itens ?? []) as Omit<ItemRow, "foto_preview_url">[]).map(async (item) => ({
      ...item,
      foto_preview_url: await resolveSupabaseAssetUrl(supabase, item.foto_url),
    })),
  );

  return (
    <div className="grid gap-6">
      <section className="glass-panel rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] p-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Novo item</h3>

        {/* O formulário envia os dados para a Server Action 'createItem'.
            Note o uso de 'foto_file' para upload direto de arquivos para o bucket. */}
        <form action={createItem} className="mt-4 grid gap-4 md:grid-cols-2">
          <input name="nome" placeholder="Nome do item" className="mc4-form-input rounded-2xl px-4 py-3 text-sm md:col-span-2" required />
          
          {/* Categorias padronizadas para evitar duplicidade de nomes no banco */}
          <select name="categoria" defaultValue="Cenografia" className="mc4-form-select rounded-2xl px-4 py-3 text-sm">
            <option value="Cenografia">Cenografia</option>
            <option value="Vestuario">Vestuário</option>
            <option value="Brindes">Brindes</option>
            <option value="OOH">OOH</option>
            <option value="Ativação">Ativação</option>
          </select>

          {/* Seleção de cliente proprietário do item */}
          <select name="cliente" defaultValue="Interno / MC4" className="mc4-form-select rounded-2xl px-4 py-3 text-sm">
            <option value="Interno / MC4">Interno / MC4</option>
            {/* Lista de clientes principais da agência */}
            <option value="Esportes da Sorte">Esportes da Sorte</option>
            <option value="Boticário">Boticário</option>
            <option value="MOOD">MOOD</option>
            <option value="Cenoura e Bronze">Cenoura e Bronze</option>
          </select>
          <input name="foto_url" placeholder="URL da foto ou path salvo no bucket (opcional)" className="mc4-form-input rounded-2xl px-4 py-3 text-sm md:col-span-2" />
          <input type="file" name="foto_file" accept="image/*" className="mc4-form-input rounded-2xl px-4 py-3 text-sm md:col-span-2" />
          <textarea name="descricao" placeholder="Descrição do item" rows={3} className="mc4-form-textarea rounded-2xl px-4 py-3 text-sm md:col-span-2" />
          <div className="md:col-span-2">
            <button type="submit" className="mc4-btn-primary rounded-2xl px-5 py-3 text-sm font-semibold transition">Salvar item</button>
          </div>
        </form>
      </section>

      <section className="glass-panel rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] p-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Itens cadastrados</h3>
        
        {/* Tabela de itens com busca, paginação e o ItemRowEditor original preservado */}
        <ItemsSearchTable
          initialItems={itemRows}
          updateAction={updateItem}
          deleteAction={deleteItem}
        />
      </section>
    </div>
  );
}