import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import App from '../../src/App';

describe('App', () => {
  it('renderiza a marca e os dados meteorológicos mock iniciais', () => {
    render(<App />);
    expect(screen.getByText('WeatherView')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Seattle' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /previsão de 5 dias/i })).toBeInTheDocument();
  });

  it('mostra a barra de busca e o alternador de unidade', () => {
    render(<App />);
    expect(screen.getByLabelText(/buscar cidade/i)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /unidade de temperatura/i })).toBeInTheDocument();
  });

  it('busca cidades disponíveis no mock e informa quando não encontra uma cidade', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/buscar cidade/i), 'Lisboa');
    await user.click(screen.getByRole('button', { name: /buscar/i }));
    expect(screen.getByRole('heading', { name: 'Lisboa' })).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/buscar cidade/i));
    await user.type(screen.getByLabelText(/buscar cidade/i), 'xyzxyz');
    await user.click(screen.getByRole('button', { name: /buscar/i }));
    expect(screen.getByText(/nenhuma cidade encontrada/i)).toBeInTheDocument();
  });
});
