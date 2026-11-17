import { formatWindDirection } from '../../shared/compass';
import type { CurrentWeatherObservation, Location, UnitSystem } from '../../shared/types';
import { formatHumidity, formatTemp, formatWind } from '../../shared/units';
import { ConditionIcon } from '../icons/ConditionIcon';
import { Attribution } from './Attribution';
import { FactTile } from './FactTile';

function formatObserved(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(iso));
}

export interface WeatherCardProps {
  location: Location;
  observation: CurrentWeatherObservation;
  units: UnitSystem;
}

export function WeatherCard({ location, observation: o, units }: WeatherCardProps) {
  const speed = formatWind(o.windSpeedKmh, units);
  const direction = formatWindDirection(o.windDirectionDeg);
  const wind = speed === null ? null : direction === null ? speed : `${speed} ${direction}`;
  const timeZone = o.timeZone || location.timeZone || 'UTC';

  return (
    <section
      className="card weather-card"
      aria-label={`Current weather for ${location.displayName}`}
      data-condition={o.condition?.category ?? 'unknown'}
      data-daynight={o.isDay === false ? 'night' : 'day'}
    >
      <div className="weather-hero">
        <div>
          <h2 className="weather-place">{location.displayName}</h2>
          <p className="weather-temp" aria-hidden="true">
            {formatTemp(o.temperatureC, units) ?? '—'}
          </p>
        </div>
        {o.condition && <ConditionIcon condition={o.condition} isDay={o.isDay} />}
      </div>
      <dl className="facts">
        <FactTile label="Temperature" value={formatTemp(o.temperatureC, units)} />
        <FactTile label="Feels like" value={formatTemp(o.feelsLikeC, units)} />
        <FactTile label="Conditions" value={o.condition?.description ?? null} />
        <FactTile label="Humidity" value={formatHumidity(o.humidityPct)} />
        <FactTile label="Wind" value={wind} />
        <FactTile label="Observed" value={formatObserved(o.observedAt, timeZone)} />
      </dl>
      <Attribution />
    </section>
  );
}
