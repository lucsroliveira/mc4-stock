export function PageLoading({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="page-loading-shell">
      <div className="page-loading-card" role="status" aria-live="polite">
        <div className="page-loading-spinner" />
        <p className="page-loading-label">{label}</p>
      </div>
    </div>
  );
}
