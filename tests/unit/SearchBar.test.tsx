import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import SearchBar from '../../src/components/SearchBar';

describe('SearchBar', () => {
  it('solicita uma cidade e não dispara busca com input vazio ou espaços', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    await userEvent.click(screen.getByRole('button', { name: /buscar/i }));
    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/informe o nome de uma cidade/i);

    await userEvent.type(screen.getByRole('textbox', { name: /buscar cidade/i }), '   ');
    await userEvent.click(screen.getByRole('button', { name: /buscar/i }));
    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: /buscar cidade/i })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('dispara busca com o termo digitado', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    await userEvent.type(screen.getByRole('textbox', { name: /buscar cidade/i }), 'Lisboa');
    await userEvent.click(screen.getByRole('button', { name: /buscar/i }));
    expect(onSearch).toHaveBeenCalledWith('Lisboa');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
