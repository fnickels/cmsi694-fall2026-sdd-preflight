import type { Location } from '../../shared/types';

export interface MatchListProps {
  matches: Location[];
  totalMatches: number;
  refineSuggested: boolean;
  onSelect: (location: Location) => void;
}

export function MatchList({ matches, totalMatches, refineSuggested, onSelect }: MatchListProps) {
  return (
    <section className="card matches">
      <h2 id="matches-heading" className="matches-heading">
        Choose a location
      </h2>
      {refineSuggested && (
        <p role="status" className="status">
          Showing {matches.length} of {totalMatches} matches. Add a region or country to narrow your
          search.
        </p>
      )}
      <ul aria-label="Matching locations" className="match-list">
        {matches.map((m) => (
          <li key={`${m.latitude},${m.longitude},${m.displayName}`}>
            <button
              type="button"
              className="match"
              onClick={() => {
                onSelect(m);
              }}
            >
              {m.displayName}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
