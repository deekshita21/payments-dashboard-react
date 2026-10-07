import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { createMockApi, DEMO_ACCOUNTS } from '../api/mockApi';

describe('App', () => {
  it('loads an account, sends a transfer and shows it in history', async () => {
    render(<App api={createMockApi(0)} />);

    expect(await screen.findByTestId('balance')).toHaveTextContent('$2,500.00');

    await userEvent.type(screen.getByLabelText(/to account id/i), DEMO_ACCOUNTS[1].id);
    await userEvent.type(screen.getByLabelText(/amount/i), '125.50');
    await userEvent.click(screen.getByRole('button', { name: /send transfer/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/completed/);
    expect(await screen.findByTestId('balance')).toHaveTextContent('$2,374.50');
    const history = screen.getByRole('region', { name: /transfer history/i });
    expect(within(history).getByText('Sent')).toBeInTheDocument();
  });

  it('disables sending from a frozen account', async () => {
    render(<App api={createMockApi(0)} />);
    await screen.findByTestId('balance');

    await userEvent.selectOptions(screen.getByRole("combobox", { name: /^account$/i }), DEMO_ACCOUNTS[2].id);

    expect(await screen.findByText('FROZEN')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send transfer/i })).toBeDisabled();
  });
});
