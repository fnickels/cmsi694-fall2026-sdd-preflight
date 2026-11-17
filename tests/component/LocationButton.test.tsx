import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LocationButton } from '../../src/client/components/LocationButton';

describe('LocationButton', () => {
  it('is named "Use my location" and calls onClick', async () => {
    const onClick = vi.fn();
    render(<LocationButton busy={false} onClick={onClick} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Use my location' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled while busy', () => {
    render(<LocationButton busy onClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Use my location' })).toBeDisabled();
  });
});
