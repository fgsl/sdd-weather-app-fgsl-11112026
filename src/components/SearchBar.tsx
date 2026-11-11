import { useRef, useState, type FormEvent } from 'react';

interface SearchBarProps {
  onSearch: (city: string) => void;
  disabled?: boolean;
}

/** Barra de busca de cidade. Bloqueia submit com input vazio. */
export default function SearchBar({ onSearch, disabled }: SearchBarProps) {
  const [value, setValue] = useState('');
  const [validationMessage, setValidationMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setValidationMessage('Informe o nome de uma cidade.');
      inputRef.current?.focus();
      return;
    }
    setValidationMessage('');
    onSearch(trimmed);
  }

  return (
    <form
      role="search"
      aria-label="Buscar cidade"
      onSubmit={handleSubmit}
      className="w-full min-w-0"
    >
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.055] p-1.5 backdrop-blur-md transition focus-within:border-accent-400/60 focus-within:ring-2 focus-within:ring-accent-400/20">
        <span aria-hidden="true" className="pl-2 text-white/45">
          🔍
        </span>
        <label htmlFor="city-search" className="sr-only">
          Buscar cidade
        </label>
        <input
          ref={inputRef}
          id="city-search"
          type="text"
          value={value}
          aria-required="true"
          aria-invalid={Boolean(validationMessage)}
          aria-describedby={validationMessage ? 'city-search-error' : undefined}
          onChange={(e) => {
            setValue(e.target.value);
            if (validationMessage) setValidationMessage('');
          }}
          placeholder="Buscar cidade…"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-white placeholder-white/60 outline-none"
        />
        <button
          type="submit"
          disabled={disabled}
          className="rounded-lg bg-accent-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-accent-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
        >
          Buscar
        </button>
      </div>
      {validationMessage && (
        <p id="city-search-error" role="alert" className="mt-2 text-sm text-red-200">
          {validationMessage}
        </p>
      )}
    </form>
  );
}
