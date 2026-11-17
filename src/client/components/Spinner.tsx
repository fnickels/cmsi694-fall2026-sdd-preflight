export function Spinner() {
  return (
    <p role="status" className="status">
      <span className="spinner" aria-hidden="true" />
      Loading weather…
    </p>
  );
}
