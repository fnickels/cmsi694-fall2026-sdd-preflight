import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UnitToggle } from '../../src/client/components/UnitToggle';

describe('UnitToggle', () => {
  it('is a radiogroup named "Units" reflecting the current system', () => {
    render(<UnitToggle value="imperial" onChange={vi.fn()} />);
    const group = screen.getByRole('radiogroup', { name: 'Units' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Imperial (°F, mph)' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Metric (°C, km/h)' })).not.toBeChecked();
  });

  it('calls onChange on click and with arrow keys', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<UnitToggle value="imperial" onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: 'Metric (°C, km/h)' }));
    expect(onChange).toHaveBeenLastCalledWith('metric');

    rerender(<UnitToggle value="metric" onChange={onChange} />);
    screen.getByRole('radio', { name: 'Metric (°C, km/h)' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('imperial');
  });
});
