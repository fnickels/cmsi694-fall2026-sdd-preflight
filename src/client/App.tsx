import { useCallback, useRef, useState } from 'react';
import type {
  ClientErrorCode,
  CurrentWeatherObservation,
  Location,
  SearchResult,
} from '../shared/types';
import { ApiError, getJson } from './api';
import { LocationButton } from './components/LocationButton';
import { Message } from './components/Message';
import { MatchList } from './components/MatchList';
import { SearchForm } from './components/SearchForm';
import { Spinner } from './components/Spinner';
import { UnitToggle } from './components/UnitToggle';
import { WeatherCard } from './components/WeatherCard';
import { useGeolocation } from './hooks/useGeolocation';
import { useUnits } from './hooks/useUnits';
import { RETRYABLE } from './messages';

type View =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'choosing'; result: SearchResult }
  | { kind: 'showing'; location: Location; observation: CurrentWeatherObservation }
  | { kind: 'error'; code: ClientErrorCode };

function weatherUrl(l: Location): string {
  return `/api/weather?lat=${encodeURIComponent(l.latitude)}&lon=${encodeURIComponent(l.longitude)}`;
}

export function App() {
  const [view, setView] = useState<View>({ kind: 'idle' });
  const { system: units, setSystem } = useUnits();
  const inFlight = useRef(false);
  const lastAction = useRef<(() => Promise<void>) | null>(null);

  /** Runs one lookup at a time (FR-005); there are no timers, so nothing auto-refreshes (FR-014). */
  const run = useCallback(async (action: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    lastAction.current = action;
    setView({ kind: 'loading' });
    try {
      await action();
    } catch (e) {
      setView({ kind: 'error', code: e instanceof ApiError ? e.code : 'WEATHER_UNAVAILABLE' });
    } finally {
      inFlight.current = false;
    }
  }, []);

  const showWeather = useCallback(async (location: Location) => {
    const observation = await getJson<CurrentWeatherObservation>(weatherUrl(location));
    setView({ kind: 'showing', location, observation });
  }, []);

  const search = useCallback(
    (query: string) =>
      run(async () => {
        const result = await getJson<SearchResult>(`/api/search?q=${encodeURIComponent(query)}`);
        const [only] = result.matches;
        if (only && result.matches.length === 1 && !result.refineSuggested) {
          await showWeather(only);
        } else {
          setView({ kind: 'choosing', result });
        }
      }),
    [run, showWeather],
  );

  const choose = useCallback(
    (location: Location) => run(() => showWeather(location)),
    [run, showWeather],
  );

  const geolocate = useGeolocation();
  const locateMe = useCallback(
    () =>
      run(async () => {
        const { latitude, longitude } = await geolocate();
        const location = await getJson<Location>(
          `/api/position?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`,
        );
        await showWeather(location);
      }),
    [run, geolocate, showWeather],
  );

  const retry = useCallback(() => {
    const action = lastAction.current;
    if (action) void run(action);
  }, [run]);

  const busy = view.kind === 'loading';

  return (
    <>
      <header className="app-header">
        <h1 className="app-title">Weather Lookup</h1>
        <UnitToggle value={units} onChange={setSystem} />
      </header>
      <SearchForm
        busy={busy}
        onSearch={(q) => void search(q)}
        onInvalid={(code) => {
          setView({ kind: 'error', code });
        }}
      />
      <div className="actions">
        <LocationButton busy={busy} onClick={() => void locateMe()} />
      </div>
      {view.kind === 'loading' && <Spinner />}
      {view.kind === 'error' && (
        <Message code={view.code} {...(RETRYABLE.has(view.code) ? { onRetry: retry } : {})} />
      )}
      {view.kind === 'choosing' && (
        <MatchList
          matches={view.result.matches}
          totalMatches={view.result.totalMatches}
          refineSuggested={view.result.refineSuggested}
          onSelect={(l) => void choose(l)}
        />
      )}
      {view.kind === 'showing' && (
        <WeatherCard location={view.location} observation={view.observation} units={units} />
      )}
    </>
  );
}
