import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WeatherCard } from '../../src/client/components/WeatherCard';
import type { CurrentWeatherObservation, Location } from '../../src/shared/types';

const location: Location = {
  name: 'Los Angeles',
  region: 'California',
  country: 'United States',
  countryCode: 'US',
  latitude: 34.05223,
  longitude: -118.24368,
  timeZone: 'America/Los_Angeles',
  displayName: 'Los Angeles, California, US',
  source: 'search',
  isCoordinateLabel: false,
};

const observation: CurrentWeatherObservation = {
  temperatureC: 22.44,
  feelsLikeC: 21.17,
  humidityPct: 58.4,
  windSpeedKmh: 19.8,
  windDirectionDeg: 329.6,
  weatherCode: 2,
  isDay: true,
  condition: { category: 'partly-cloudy', description: 'Partly cloudy' },
  observedAt: '2026-11-17T15:45:00-08:00',
  timeZone: 'America/Los_Angeles',
};

function fact(label: string): HTMLElement {
  const term = screen.getByText(label, { selector: 'dt' });
  const dd = term.nextElementSibling;
  if (!(dd instanceof HTMLElement)) throw new Error(`no value for ${label}`);
  return dd;
}

describe('WeatherCard', () => {
  it('shows every FR-003 fact in metric', () => {
    render(<WeatherCard location={location} observation={observation} units="metric" />);
    const card = screen.getByRole('region', {
      name: 'Current weather for Los Angeles, California, US',
    });
    expect(
      within(card).getByRole('heading', { name: 'Los Angeles, California, US' }),
    ).toBeInTheDocument();
    expect(fact('Temperature')).toHaveTextContent('22.4 °C');
    expect(fact('Feels like')).toHaveTextContent('21.2 °C');
    expect(fact('Conditions')).toHaveTextContent('Partly cloudy');
    expect(within(card).getByRole('img', { name: 'Partly cloudy' })).toBeInTheDocument();
    expect(fact('Humidity')).toHaveTextContent('58%');
    expect(fact('Wind')).toHaveTextContent('19.8 km/h NNW 330°');
    expect(fact('Observed')).toHaveTextContent('3:45 PM PST');
    expect(
      within(card).getByRole('link', { name: 'Weather data by Open-Meteo.com' }),
    ).toBeInTheDocument();
  });

  it('converts to imperial', () => {
    render(<WeatherCard location={location} observation={observation} units="imperial" />);
    expect(fact('Temperature')).toHaveTextContent('72.4 °F');
    expect(fact('Wind')).toHaveTextContent('12.3 mph NNW 330°');
  });

  it('shows "—" labeled "Not available" for missing values', () => {
    render(
      <WeatherCard
        location={location}
        observation={{ ...observation, feelsLikeC: null, windDirectionDeg: null, condition: null }}
        units="metric"
      />,
    );
    expect(screen.getByLabelText('Feels like: Not available')).toHaveTextContent('—');
    expect(screen.getByLabelText('Conditions: Not available')).toHaveTextContent('—');
    expect(fact('Wind')).toHaveTextContent('19.8 km/h');
  });

  it('shows "—" for wind when speed is missing', () => {
    render(
      <WeatherCard
        location={location}
        observation={{ ...observation, windSpeedKmh: null }}
        units="metric"
      />,
    );
    expect(screen.getByLabelText('Wind: Not available')).toHaveTextContent('—');
  });

  it('renders extreme values', () => {
    render(
      <WeatherCard
        location={location}
        observation={{ ...observation, temperatureC: -50, windSpeedKmh: 150 }}
        units="metric"
      />,
    );
    expect(fact('Temperature')).toHaveTextContent('-50.0 °C');
    expect(fact('Wind')).toHaveTextContent('150.0 km/h');
  });
});
