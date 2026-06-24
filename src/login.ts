import { loginUser } from './api.js';
import { renderNav, showMessage } from './ui.js';

renderNav();

const params = new URLSearchParams(window.location.search);
const form = document.getElementById('login-form') as HTMLFormElement | null;
const message = document.getElementById('form-message');

if (params.get('message') === 'login-required') {
  showMessage(message, 'Você precisa estar logado para acessar essa área.');
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '').trim();

  try {
    await loginUser(username, password);
    showMessage(message, 'Login realizado com sucesso!', true);
    window.location.href = './capsulas.html';
  } catch (error) {
    const apiError = error as { message?: string };
    showMessage(message, apiError.message || 'Não foi possível entrar.');
  }
});
