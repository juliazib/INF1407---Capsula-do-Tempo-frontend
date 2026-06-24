import { requestPasswordReset } from './api.js';
import { renderNav, showMessage } from './ui.js';

renderNav();

const form = document.getElementById('reset-form') as HTMLFormElement | null;
const message = document.getElementById('form-message');
const nextStep = document.getElementById('next-step');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const email = String(formData.get('email') || '').trim();

  try {
    await requestPasswordReset(email);
    showMessage(message, 'Se o e-mail estiver cadastrado, as instruções de recuperação serão enviadas.', true);
    if (nextStep) {
      nextStep.textContent = 'Verifique seu e-mail e acesse a página de confirmação para inserir o token e criar uma nova senha.';
      const confirmLink = document.createElement('a');
      confirmLink.href = './confirmar-senha.html';
      confirmLink.textContent = 'página de confirmação';
      confirmLink.style.marginLeft = '5px';
      nextStep.appendChild(confirmLink);
    }
    form.reset();
  } catch (error) {
    const apiError = error as { message?: string };
    showMessage(message, apiError.message || 'Não foi possível solicitar a recuperação.');
  }
});
