import { createSupabaseServerClient } from "./server";
import { hasSupabaseConfig } from "./config";
import { getSupabaseStorageBucket } from "./storage";

type DiagnosticCheck = {
  target: string;
  ok: boolean;
  detail: string;
};

export type SupabaseDiagnostics = {
  mode: "misconfigured" | "supabase";
  checks: DiagnosticCheck[];
  hasFailures: boolean;
};

export async function getSupabaseDiagnostics(): Promise<SupabaseDiagnostics> {
  if (!hasSupabaseConfig()) {
    const checks: DiagnosticCheck[] = [
      {
        target: "configuração",
        ok: false,
        detail: "NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não foram definidos com valores reais.",
      },
    ];

    return {
      mode: "misconfigured",
      checks,
      hasFailures: true,
    };
  }

  const supabase = await createSupabaseServerClient();
  const tableNames = ["itens", "estoques", "movimentacoes", "estoque_itens"];
  const tableChecks = await Promise.all(
    tableNames.map(async (tableName) => {
      const { error } = await supabase.from(tableName).select("id", { head: true, count: "exact" });

      return {
        target: `table:${tableName}`,
        ok: !error,
        detail: error ? `Falha ao ler ${tableName}: ${error.message}` : `Leitura da tabela ${tableName} ok.`,
      };
    }),
  );

  const bucket = getSupabaseStorageBucket();
  const storageCheck = !bucket
    ? {
        target: "storage",
        ok: false,
        detail: "NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET não foi definido.",
      }
    : await supabase.storage.from(bucket).list("", { limit: 1 }).then(({ error }: { error: { message: string } | null }) => ({
        target: `storage:${bucket}`,
        ok: !error,
        detail: error ? `Falha ao acessar o bucket ${bucket}: ${error.message}` : `Acesso ao bucket ${bucket} ok.`,
      }));

  const checks = [...tableChecks, storageCheck];

  return {
    mode: "supabase",
    checks,
    hasFailures: checks.some((check) => !check.ok),
  };
}