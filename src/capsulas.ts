import { createCapsula, deleteCapsula, fetchCapsulas, updateCapsula } from './api.js';
import { getQueryParam, renderNav, showMessage } from './ui.js';

renderNav();

const page = document.getElementById('capsulas-page')! as HTMLElement;

if (!page) {
  throw new Error('Container de cápsulas não encontrado.');
}

/**
 * Remove todos os filhos de um elemento para renderizar novamente
 * @param element Elemento a ser limpo.
 */
function clearElement(element: HTMLElement) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Cria elemento HTML tipado com classe e texto opcionais.
 * @param tag Tag HTML a ser criada.
 * @param className Classe CSS opcional.
 * @param text Conteudo textual opcional.
 * @returns Elemento criado.
 */
function createElement<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/**
 * Cria um link com texto, destino e classe opcionais.
 * @param text Texto do link.
 * @param href URL de destino.
 * @param className Classe CSS opcional.
 * @returns Elemento anchor configurado.
 */
function createLink(text: string, href: string, className?: string) {
  const link = document.createElement('a');
  link.href = href;
  if (className) link.className = className;
  link.textContent = text;
  return link;
}

/**
 * Renderiza a tela de acesso restrito para usuarios nao autenticados.
 */
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

/**
 * Redireciona para a pagina de login com mensagem de autenticacao obrigatoria.
 */
function redirectToLogin() {
  window.location.href = './login.html?message=login-required';
}

/**
 * Carrega capsulas da API e aciona a renderizacao da pagina.
 */
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

/**
 * Renderiza toda a estrutura da pagina de capsulas e conecta eventos.
 * @param capsulas Lista de capsulas retornadas pela API.
 */
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
  const editId = getQueryParam('edit');

  if (isCreate) {
    page.appendChild(createFormMarkup());
  } else if (editId) {
    const capsulaToEdit = capsulas.find(c => Number(c.id) === Number(editId));
    if (capsulaToEdit) {
      page.appendChild(editFormMarkup(capsulaToEdit as Record<string, unknown>));
    }
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
  attachEditFormHandlers();
  attachDeleteLinks();
}

function formatDatePtBR(value: unknown): string {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('pt-BR');
}

function isPastDate(value: string): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
}

function formatDatePtBR(value: unknown): string {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('pt-BR');
}

function isPastDate(value: string): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
}

/**
 * Verifica se uma capsula ja esta disponivel para abertura.
 * @param capsula Dados da capsula.
 * @returns True quando a data de abertura ja chegou.
 */
function isCapsulaAvailable(capsula: Record<string, unknown>): boolean {
  const dataAbertura = capsula.data_abertura ? new Date(String(capsula.data_abertura)) : null;
  if (!dataAbertura) return false;
  return dataAbertura <= new Date();
}

/**
 * Monta o card de envelope para uma cápsula.
 * @param capsula Dados da cápsula.
 * @returns Elemento HTML que representa a cápsula na grade.
 */
function envelopeMarkup(capsula: Record<string, unknown>) {
  const id = Number(capsula.id);
  const title = String(capsula.titulo || 'Sem título');
  const openDate = formatDatePtBR(capsula.data_abertura);
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
  
  // Mostrar link de editar apenas para cápsulas seladas
  if (!available) {
    actions.appendChild(createLink('Editar', `./capsulas.html?edit=${id}`, 'edit-link'));
  }
  
  actions.appendChild(createLink('Excluir', `./capsulas.html?delete=${id}`, 'delete-link'));

  wrapper.appendChild(card);
  wrapper.appendChild(actions);
  return wrapper;
}

/**
 * Cria o markup do formulario de criacao de capsula.
 * @returns Container com o formulario completo.
 */
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
  dataInput.min = new Date().toISOString().split('T')[0];
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

/**
 * Cria o markup do formulário de edição de cápsula com dados pré-preenchidos.
 * @param capsula Dados da cápsula selecionada para edição.
 * @returns Container com o formulário completo de edição.
 */
function editFormMarkup(capsula: Record<string, unknown>) {
  const wrapper = createElement('div', 'form-container');
  wrapper.appendChild(createElement('h2', undefined, 'Editar cápsula'));

  const message = createElement('div');
  message.id = 'capsulas-message';
  wrapper.appendChild(message);

  const form = document.createElement('form');
  form.id = 'edit-capsula-form';
  form.className = 'stacked-form';
  form.action = 'javascript:void(0)';
  form.noValidate = true;
  form.dataset.capsulaId = String(capsula.id);

  form.appendChild(createElement('label', undefined, 'Título'));
  const tituloInput = document.createElement('input');
  tituloInput.id = 'edit-titulo';
  tituloInput.name = 'titulo';
  tituloInput.type = 'text';
  tituloInput.value = String(capsula.titulo || '');
  tituloInput.required = true;
  form.appendChild(tituloInput);

  form.appendChild(createElement('label', undefined, 'Data de abertura'));
  const dataInput = document.createElement('input');
  dataInput.id = 'edit-data_abertura';
  dataInput.name = 'data_abertura';
  dataInput.type = 'date';
  dataInput.value = String(capsula.data_abertura || '');
  dataInput.required = true;
  dataInput.min = new Date().toISOString().split('T')[0];
  form.appendChild(dataInput);

  form.appendChild(createElement('label', undefined, 'Senha de edição'));
  const senhaInput = document.createElement('input');
  senhaInput.id = 'edit-senha';
  senhaInput.name = 'senha';
  senhaInput.type = 'password';
  senhaInput.required = true;
  form.appendChild(senhaInput);

  form.appendChild(createElement('label', undefined, 'Texto'));
  const textoTextarea = document.createElement('textarea');
  textoTextarea.id = 'edit-texto';
  textoTextarea.name = 'texto';
  textoTextarea.required = true;
  if (Array.isArray(capsula.textos) && capsula.textos.length > 0) {
    const textosArray = capsula.textos as Array<Record<string, unknown>>;
    textoTextarea.value = textosArray.map(item => String(item.texto || '')).join('\n');
  }
  form.appendChild(textoTextarea);

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = 'Salvar alterações';
  form.appendChild(submit);

  wrapper.appendChild(form);
  return wrapper;
}

/**
 * Anexa o handler de envio do formulário de criação de cápsula.
 */
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
    const dateValue = String(formData.get('data_abertura') || '');
    if (isPastDate(dateValue)) {
      showMessage(message, 'A data de abertura não pode ser anterior a hoje.');
      return;
    }
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

/**
 * Anexa o handler de envio do formulário de edição de cápsula.
 */
function attachEditFormHandlers() {
  if (!localStorage.getItem('capsula_token')) {
    redirectToLogin();
    return;
  }
  const form = document.getElementById('edit-capsula-form') as HTMLFormElement | null;
  if (!form) return;

  const message = document.getElementById('capsulas-message');
  const capsulaId = Number(form.dataset.capsulaId);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const formData = new FormData(form);
    const dateValue = String(formData.get('data_abertura') || '');
    if (isPastDate(dateValue)) {
      showMessage(message, 'A data de abertura não pode ser anterior a hoje.');
      return;
    }

    const payload: Record<string, string> = {};
    formData.forEach((value, key) => {
      payload[key] = String(value);
    });

    try {
      await updateCapsula(capsulaId, payload);
      showMessage(message, 'Cápsula atualizada com sucesso!', true);
      window.location.href = './capsulas.html';
    } catch (error) {
      const err = error as { message?: string };
      showMessage(message, err.message || 'Não foi possível salvar as alterações.');
    }
  });
}

/**
 * Anexa handlers de exclusão para todos os links de remover capsula.
 */
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
