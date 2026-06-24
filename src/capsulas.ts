import { createCapsula, deleteCapsula, fetchCapsulas } from './api.js';
import { getQueryParam, renderNav, showMessage } from './ui.js';

renderNav();

const page = document.getElementById('capsulas-page')! as HTMLElement;

if (!page) {
  throw new Error('Container de cápsulas não encontrado.');
}

function clearElement(element: HTMLElement) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function createElement<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createLink(text: string, href: string, className?: string) {
  const link = document.createElement('a');
  link.href = href;
  if (className) link.className = className;
  link.textContent = text;
  return link;
}

function renderAuthRequired() {
  clearElement(page);

  const wrapper = createElement('div', 'form-container');
  wrapper.appendChild(createElement('h2', undefined, 'Acesso restrito'));
  wrapper.appendChild(createElement('p', undefined, 'Você precisa estar logado para acessar esta área.'));

  const actions = createElement('div', 'text-center');
  actions.appendChild(createLink('Fazer login', './login.html?message=login-required', 'btn'));
  wrapper.appendChild(actions);

  page.appendChild(wrapper);
}

function redirectToLogin() {
  window.location.href = './login.html?message=login-required';
}

async function loadCapsulas() {
  if (!localStorage.getItem('capsula_token')) {
    renderAuthRequired();
    return;
  }

  try {
    const capsulas = await fetchCapsulas();
    renderCapsulasPage(capsulas as Array<Record<string, unknown>>);
  } catch (error) {
    const apiError = error as { message?: string };
    const wrapper = createElement('div', 'form-container');
    wrapper.appendChild(createElement('h2', undefined, 'Minhas Cápsulas'));
    wrapper.appendChild(createElement('p', undefined, apiError.message || 'Não foi possível carregar as cápsulas.'));
    clearElement(page);
    page.appendChild(wrapper);
  }
}

function renderCapsulasPage(capsulas: Array<Record<string, unknown>>) {
  clearElement(page);

  const header = createElement('div', 'list-header');
  header.appendChild(createElement('h1', 'custom-title', 'Minhas Cápsulas'));
  page.appendChild(header);

  const message = createElement('div', 'message');
  message.id = 'capsulas-message';
  page.appendChild(message);

  const action = getQueryParam('action');
  const isCreate = action === 'create';

  if (isCreate) {
    page.appendChild(createFormMarkup());
  }

  const grid = createElement('div', 'envelope-grid');
  if (capsulas.length) {
    capsulas.forEach((capsula) => {
      grid.appendChild(envelopeMarkup(capsula));
    });
  } else {
    grid.appendChild(createElement('p', 'text-center', 'Sua jornada começa aqui. Nenhuma cápsula criada ainda.'));
  }
  page.appendChild(grid);

  attachCreateFormHandlers();
  attachDeleteLinks();
}

function isCapsulaAvailable(capsula: Record<string, unknown>): boolean {
  const dataAbertura = capsula.data_abertura ? new Date(String(capsula.data_abertura)) : null;
  if (!dataAbertura) return false;
  return dataAbertura <= new Date();
}

function envelopeMarkup(capsula: Record<string, unknown>) {
  const id = Number(capsula.id);
  const title = String(capsula.titulo || 'Sem título');
  const openDate = String(capsula.data_abertura || '');
  const available = isCapsulaAvailable(capsula);
  const hasTextos = Boolean(capsula.textos && Array.isArray(capsula.textos) && capsula.textos.length);

  const wrapper = createElement('div', 'envelope-wrapper');
  const card = createElement('div', `envelope-card ${available && hasTextos ? 'can-open' : 'locked'}`);

  if (available && hasTextos) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      window.location.href = `./capsula-detail.html?id=${id}`;
    });
  }

  card.appendChild(createElement('div', 'envelope-flap'));

  const body = createElement('div', 'envelope-body');
  body.appendChild(createElement('h2', 'capsula-title', title));

  const info = createElement('div', 'capsula-info');
  info.appendChild(createElement('span', undefined, `Abertura: ${openDate}`));
  info.appendChild(createElement('span', 'status-badge', available ? 'Disponível' : 'Selada'));
  body.appendChild(info);
  card.appendChild(body);

  const actions = createElement('div', 'envelope-actions');
  actions.appendChild(createLink('Excluir', `./capsulas.html?delete=${id}`, 'delete-link'));

  wrapper.appendChild(card);
  wrapper.appendChild(actions);
  return wrapper;
}

function createFormMarkup() {
  const wrapper = createElement('div', 'form-container');
  wrapper.appendChild(createElement('h2', undefined, 'Criar cápsula'));

  const message = createElement('div');
  message.id = 'capsulas-message';
  wrapper.appendChild(message);

  const form = document.createElement('form');
  form.id = 'create-capsula-form';
  form.className = 'stacked-form';
  form.action = 'javascript:void(0)';
  form.noValidate = true;

  form.appendChild(createElement('label', undefined, 'Título'));
  const tituloInput = document.createElement('input');
  tituloInput.id = 'titulo';
  tituloInput.name = 'titulo';
  tituloInput.type = 'text';
  tituloInput.required = true;
  form.appendChild(tituloInput);

  form.appendChild(createElement('label', undefined, 'Data de abertura'));
  const dataInput = document.createElement('input');
  dataInput.id = 'data_abertura';
  dataInput.name = 'data_abertura';
  dataInput.type = 'date';
  dataInput.required = true;
  form.appendChild(dataInput);

  form.appendChild(createElement('label', undefined, 'Senha de edição'));
  const senhaInput = document.createElement('input');
  senhaInput.id = 'senha';
  senhaInput.name = 'senha';
  senhaInput.type = 'password';
  senhaInput.required = true;
  form.appendChild(senhaInput);

  form.appendChild(createElement('label', undefined, 'Texto'));
  const textoTextarea = document.createElement('textarea');
  textoTextarea.id = 'texto';
  textoTextarea.name = 'texto';
  textoTextarea.required = true;
  form.appendChild(textoTextarea);

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = 'Salvar';
  form.appendChild(submit);

  wrapper.appendChild(form);
  return wrapper;
}

function attachCreateFormHandlers() {
  if (!localStorage.getItem('capsula_token')) {
    redirectToLogin();
    return;
  }
  const form = document.getElementById('create-capsula-form') as HTMLFormElement | null;
  const message = document.getElementById('capsulas-message');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload: Record<string, string> = {};
    formData.forEach((value, key) => {
      payload[key] = String(value);
    });

    try {
      await createCapsula(payload);
      showMessage(message, 'Cápsula criada com sucesso!', true);
      window.location.href = './capsulas.html';
    } catch (error) {
      const apiError = error as { message?: string };
      showMessage(message, apiError.message || 'Não foi possível salvar a cápsula.');
    }
  });
}

function attachDeleteLinks() {
  if (!localStorage.getItem('capsula_token')) {
    redirectToLogin();
    return;
  }
  document.querySelectorAll('.delete-link').forEach((link) => {
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      const href = link.getAttribute('href') || '';
      const match = href.match(/delete=(\d+)/);
      if (!match) return;

      const id = Number(match[1]);
      const confirmed = confirm('Tem certeza que deseja deletar esta cápsula?');
      if (!confirmed) return;

      try {
        await deleteCapsula(id);
        window.location.href = './capsulas.html';
      } catch (error) {
        const apiError = error as { message?: string };
        showMessage(document.getElementById('capsulas-message'), apiError.message || 'Não foi possível excluir.');
      }
    });
  });
}

loadCapsulas();
