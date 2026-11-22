import type { Condition, ConditionCategory } from '../../shared/types';

const SUN = <circle cx="24" cy="24" r="9" fill="#f5b301" />;
const MOON = <path d="M30 10a14 14 0 1 0 8 25A12 12 0 0 1 30 10z" fill="#c9d3e6" />;
const CLOUD = (
  <path
    d="M14 38h22a8 8 0 0 0 0-16 11 11 0 0 0-21-2 8 8 0 0 0-1 18z"
    fill="#9aa7bb"
    stroke="#6b788d"
    strokeWidth="1.5"
  />
);

function glyph(category: ConditionCategory, isDay: boolean) {
  const sky = isDay ? SUN : MOON;
  switch (category) {
    case 'clear':
      return sky;
    case 'partly-cloudy':
      return (
        <>
          <g transform="translate(-6 -6) scale(0.8)">{sky}</g>
          {CLOUD}
        </>
      );
    case 'cloudy':
      return CLOUD;
    case 'fog':
      return (
        <g stroke="#8592a6" strokeWidth="3" strokeLinecap="round">
          <line x1="8" y1="18" x2="40" y2="18" />
          <line x1="12" y1="26" x2="36" y2="26" />
          <line x1="8" y1="34" x2="40" y2="34" />
        </g>
      );
    case 'drizzle':
    case 'rain':
      return (
        <>
          <g transform="translate(0 -6)">{CLOUD}</g>
          <g stroke="#2f6fd6" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="38" x2="16" y2={category === 'rain' ? 45 : 42} />
            <line x1="26" y1="38" x2="24" y2={category === 'rain' ? 45 : 42} />
            <line x1="34" y1="38" x2="32" y2={category === 'rain' ? 45 : 42} />
          </g>
        </>
      );
    case 'snow':
      return (
        <>
          <g transform="translate(0 -6)">{CLOUD}</g>
          <g fill="#5d7fb8">
            <circle cx="17" cy="41" r="2" />
            <circle cx="25" cy="44" r="2" />
            <circle cx="33" cy="41" r="2" />
          </g>
        </>
      );
    case 'thunderstorm':
      return (
        <>
          <g transform="translate(0 -6)">{CLOUD}</g>
          <path d="M26 33l-6 9h5l-3 6 9-11h-5l3-4z" fill="#f5b301" />
        </>
      );
  }
}

export function ConditionIcon({
  condition,
  isDay,
}: {
  condition: Condition;
  isDay: boolean | null;
}) {
  return (
    <svg
      role="img"
      aria-label={condition.description}
      viewBox="0 0 48 48"
      width="48"
      height="48"
      className="condition-icon"
    >
      {glyph(condition.category, isDay ?? true)}
    </svg>
  );
}
