import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

let online = true;
Object.defineProperty(window.navigator, 'onLine', {
  configurable: true,
  get: () => online,
});

export function setOnline(value: boolean): void {
  online = value;
}

beforeEach(() => {
  window.localStorage.clear();
  online = true;
});

afterEach(() => {
  cleanup();
});
