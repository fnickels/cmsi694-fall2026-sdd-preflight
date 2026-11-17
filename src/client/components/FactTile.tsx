import type { ReactNode } from 'react';

/** One labeled fact. A null value renders "—" with an accessible "Not available" name. */
export function FactTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd>
        {value ?? (
          <span role="img" aria-label={`${label}: Not available`}>
            —
          </span>
        )}
      </dd>
    </div>
  );
}
