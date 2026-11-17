import { useState, type SyntheticEvent } from 'react';
import { MAX_QUERY_LENGTH, validateQuery } from '../../shared/input';

export interface SearchFormProps {
  busy: boolean;
  onSearch: (query: string) => void;
  onInvalid: (code: 'EMPTY_INPUT' | 'INPUT_TOO_LONG') => void;
}

export function SearchForm({ busy, onSearch, onInvalid }: SearchFormProps) {
  const [value, setValue] = useState('');

  function submit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const v = validateQuery(value);
    if (v.ok) onSearch(v.value);
    else onInvalid(v.code);
  }

  return (
    <form role="search" className="search" onSubmit={submit}>
      <input
        type="search"
        aria-label="Location"
        placeholder="City, region, or US ZIP code"
        maxLength={MAX_QUERY_LENGTH}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        autoComplete="off"
        enterKeyHint="search"
      />
      <button type="submit" className="button button-primary" disabled={busy}>
        Search
      </button>
    </form>
  );
}
