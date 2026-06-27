import { confirmPasswordReset } from './api.js';
import { renderNav, showMessage } from './ui.js';

renderNav();

const form = document.getElementById('confirm-reset-form') as HTMLFormElement | null;
const message = document.getElementById('form-message');

/**
 * Valida token e redefine a senha com a nova credencial informada.
 * @param event Evento de submit do formulário.
 */
form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const email = String(formData.get('email') || '').trim();
  const token = String(formData.get('token') || '').trim();
  const newPassword = String(formData.get('new-password') || '').trim();
  const confirmPassword = String(formData.get('confirm-password') || '').trim();

  if (!email || !token || !newPassword || !confirmPassword) {
    showMessage(message, 'Preencha todos os campos para continuar.');
    return;
  }

  if (newPassword !== confirmPassword) {
    showMessage(message, 'As senhas não coincidem. Verifique e tente novamente.');
    return;
  }

  try {
    await confirmPasswordReset(email, token, newPassword);
    showMessage(message, 'Senha redefinida com sucesso! Agora você pode fazer login.', true);
    form.reset();
  } catch (error) {
    const apiError = error as { message?: string };
    showMessage(message, apiError.message || 'Não foi possível redefinir a senha.');
  }
});
