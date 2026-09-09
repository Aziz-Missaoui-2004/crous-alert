export function FullScreenLoader({ label = "Chargement…" }: { label?: string }) {
  return (
    <main className="loading-screen" role="status" aria-label={label}>
      <svg className="loading-spinner" width="65" height="65" viewBox="0 0 66 66" aria-hidden="true">
        <circle className="loading-path" fill="none" strokeWidth="6" strokeLinecap="round" cx="33" cy="33" r="30" />
      </svg>
      <span className="sr-only">{label}</span>
    </main>
  );
}
