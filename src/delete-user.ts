import { deleteCurrentUser, getCurrentUser } from './api.js';
import { renderNav, showMessage } from './ui.js';

renderNav();

const form = document.getElementById('delete-account-form') as HTMLFormElement | null;
const message = document.getElementById('form-message');
const accountSummary = document.getElementById('account-summary');

/**
 * Carrega dados básicos da conta e exibe resumo da exclusão.
 */
async function loadCurrentAccount() {
  try {
    const user = await getCurrentUser();
    const nome = typeof user.nome === 'string' ? user.nome : '';
    const username = typeof user.username === 'string' ? user.username : '';

    if (accountSummary) {
      accountSummary.textContent = nome
        ? `Você está excluindo a conta de ${nome} (@${username || 'usuário'}).`
        : `Você está excluindo a conta de @${username || 'usuário'}.`;
    }
  } catch {
    window.location.href = './login.html?message=login-required';
  }
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const password = String(formData.get('password') || '').trim();

  try {
    await deleteCurrentUser(password);
    localStorage.removeItem('capsula_token');
    window.location.href = './login.html?message=account-deleted';
  } catch (error) {
    const apiError = error as { message?: string };
    showMessage(message, apiError.message || 'Não foi possível excluir sua conta.');
  }
});

loadCurrentAccount();