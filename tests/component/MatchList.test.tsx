import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MatchList } from '../../src/client/components/MatchList';
import type { Location } from '../../src/shared/types';

const loc = (region: string, lat: number): Location => ({
  name: 'Springfield',
  region,
  country: 'United States',
  countryCode: 'US',
  latitude: lat,
  longitude: -lat,
  timeZone: 'America/Chicago',
  displayName: `Springfield, ${region}, US`,
  source: 'search',
  isCoordinateLabel: false,
});
const matches = [loc('Colorado', 1), loc('Georgia', 2), loc('Illinois', 3)];

describe('MatchList', () => {
  it('lists one named button per match', () => {
    render(
      <MatchList matches={matches} totalMatches={3} refineSuggested={false} onSelect={vi.fn()} />,
    );
    const list = screen.getByRole('list', { name: 'Matching locations' });
    const buttons = within(list).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(matches.map((m) => m.displayName));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the refine hint when more than 5 places match', () => {
    const five = [...matches, loc('Massachusetts', 4), loc('Missouri', 5)];
    render(<MatchList matches={five} totalMatches={14} refineSuggested onSelect={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Showing 5 of 14 matches. Add a region or country to narrow your search.',
    );
  });

  it('selects with click, Enter, and Space', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <MatchList matches={matches} totalMatches={3} refineSuggested={false} onSelect={onSelect} />,
    );
    await user.click(screen.getByRole('button', { name: 'Springfield, Georgia, US' }));
    expect(onSelect).toHaveBeenLastCalledWith(matches[1]);
    screen.getByRole('button', { name: 'Springfield, Illinois, US' }).focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith(matches[2]);
    screen.getByRole('button', { name: 'Springfield, Colorado, US' }).focus();
    await user.keyboard(' ');
    expect(onSelect).toHaveBeenLastCalledWith(matches[0]);
  });
});
