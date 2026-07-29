import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userLabel = user.user_metadata?.full_name ?? user.email ?? "Usuário";

  return (
    <AppShell
      title="Dashboard"
      subtitle="A base nova do sistema vai reunir inventário, movimentações, relatórios e cadastros em uma interface única."
      userLabel={userLabel}
    >
      {children}
    </AppShell>
  );
}