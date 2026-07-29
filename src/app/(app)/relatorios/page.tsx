export default function RelatoriosPage() {
  return (
    <section className="glass-panel rounded-3xl border border-white/10 p-6">
      <h3 className="text-lg font-semibold text-white">Relatórios</h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
        O relatório de auditoria vai voltar com os mesmos filtros do sistema atual, mas consumindo o Supabase pelo Next e pronto para exportação.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">Filtro por período.</div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">Filtro por tipo de movimento.</div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">Exportação CSV.</div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">Base para auditoria avançada.</div>
      </div>
    </section>
  );
}