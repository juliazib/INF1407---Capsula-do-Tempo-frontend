import { getCurrentUser, updateCurrentUser } from './api.js';
import { renderNav, showMessage } from './ui.js';

renderNav();

const form = document.getElementById('profile-form') as HTMLFormElement | null;
const message = document.getElementById('form-message');

/**
 * Carrega os dados atuais do usuário e preenche o formulário de perfil.
 */
async function loadProfile() {
  try {
    const user = await getCurrentUser();
    const usernameInput = document.getElementById('username') as HTMLInputElement | null;
    const nomeInput = document.getElementById('nome') as HTMLInputElement | null;
    const emailInput = document.getElementById('email') as HTMLInputElement | null;

    if (usernameInput) usernameInput.value = String(user.username || '');
    if (nomeInput) nomeInput.value = String(user.nome || '');
    if (emailInput) emailInput.value = String(user.email || '');
  } catch {
    window.location.href = './login.html?message=login-required';
  }
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const payload: Record<string, string> = {};

  const username = String(formData.get('username') || '').trim();
  const nome = String(formData.get('nome') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '').trim();

  if (username) payload.username = username;
  if (nome) payload.nome = nome;
  if (email) payload.email = email;
  if (password) payload.password = password;

  try {
    await updateCurrentUser(payload);
    showMessage(message, 'Seus dados foram atualizados com sucesso.', true);
    const passwordInput = document.getElementById('password') as HTMLInputElement | null;
    if (passwordInput) passwordInput.value = '';
  } catch (error) {
    const apiError = error as { message?: string };
    showMessage(message, apiError.message || 'Não foi possível atualizar seus dados.');
  }
});

loadProfile();
