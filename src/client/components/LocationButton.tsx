export function LocationButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button type="button" className="button button-secondary" disabled={busy} onClick={onClick}>
      <span aria-hidden="true">📍 </span>
      Use my location
    </button>
  );
}
