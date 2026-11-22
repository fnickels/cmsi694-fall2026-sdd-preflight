import type { UnitSystem } from '../../shared/types';

const OPTIONS: { value: UnitSystem; label: string }[] = [
  { value: 'metric', label: 'Metric (°C, km/h)' },
  { value: 'imperial', label: 'Imperial (°F, mph)' },
];

/**
 * A div with role="radiogroup" (not a fieldset, whose role is "group") per ui-contract.md.
 * Native same-name radios provide arrow-key navigation.
 */
export function UnitToggle({
  value,
  onChange,
}: {
  value: UnitSystem;
  onChange: (value: UnitSystem) => void;
}) {
  return (
    <div role="radiogroup" aria-labelledby="units-label" className="unit-toggle">
      <span id="units-label" className="unit-toggle-label">
        Units
      </span>
      {OPTIONS.map((o) => (
        <label key={o.value} className="unit-option">
          <input
            type="radio"
            name="units"
            value={o.value}
            checked={value === o.value}
            onChange={() => {
              onChange(o.value);
            }}
          />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}
