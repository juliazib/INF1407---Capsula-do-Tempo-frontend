import { registerUser } from './api.js';
import { renderNav, showMessage } from './ui.js';

renderNav();

const form = document.getElementById('register-form') as HTMLFormElement | null;
const message = document.getElementById('form-message');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const payload: Record<string, string> = {};
  formData.forEach((value, key) => {
    payload[key] = String(value);
  });

  try {
    await registerUser(payload);
    showMessage(message, 'Conta criada com sucesso. Você pode fazer login agora.', true);
    form.reset();
  } catch (error) {
    const apiError = error as { message?: string };
    showMessage(message, apiError.message || 'Não foi possível criar a conta.');
  }
});
