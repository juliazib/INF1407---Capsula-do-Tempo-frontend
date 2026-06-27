import { fetchCapsulaById, isAuthenticated } from './api.js';
import { renderNav } from './ui.js';

renderNav();

const contentContainer = document.getElementById('capsula-content')!;

/**
 * Limpa todo o conteúdo de um elemento para nova renderização.
 * @param element Elemento a ser limpo.
 */
function clearElement(element: HTMLElement) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Lê o ID da cápsula a partir da query string.
 * @returns ID numérico da cápsula ou null quando ausente/inválido.
 */
function getCapsulaIdFromUrl(): number | null {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  return id ? Number(id) : null;
}

/**
 * Renderiza os detalhes da cápsula, incluindo estado selada ou aberta.
 * @param capsula Dados da cápsula retornados pela API.
 */
function renderCapsulaDetail(capsula: Record<string, unknown>) {
  const dataAbertura = capsula.data_abertura ? new Date(String(capsula.data_abertura)) : null;
  const isAvailable = dataAbertura ? dataAbertura <= new Date() : false;
  const hasTextos = Boolean(capsula.textos && Array.isArray(capsula.textos) && capsula.textos.length > 0);

  clearElement(contentContainer);

  const header = document.createElement('header');
  header.className = 'capsula-header';

  const title = document.createElement('h1');
  title.className = 'capsula-detalhe-titulo';
  title.textContent = String(capsula.titulo || 'Sem título');
  header.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'capsula-meta';

  const createdSpan = document.createElement('span');
  const createdDate = capsula.criada_em ? new Date(String(capsula.criada_em)).toLocaleDateString('pt-BR') : 'Data desconhecida';
  createdSpan.textContent = `Selada em: ${createdDate}`;
  meta.appendChild(createdSpan);

  const openSpan = document.createElement('span');
  const openDate = capsula.data_abertura ? new Date(String(capsula.data_abertura)).toLocaleDateString('pt-BR') : 'Data desconhecida';
  openSpan.textContent = `Aberta em: ${openDate}`;
  meta.appendChild(openSpan);

  header.appendChild(meta);
  contentContainer.appendChild(header);

  const hr = document.createElement('hr');
  hr.className = 'divider';
  contentContainer.appendChild(hr);

  const contentArea = document.createElement('div');
  contentArea.className = 'capsula-content-area';

  if (isAvailable) {
    const paperLetter = document.createElement('div');
    paperLetter.className = 'paper-letter';

    const greeting = document.createElement('h3');
    greeting.className = 'letter-greeting';
    greeting.textContent = 'Querido eu do futuro...';
    paperLetter.appendChild(greeting);

    if (Array.isArray(capsula.textos) && capsula.textos.length > 0) {
      const textosArray = capsula.textos as Array<Record<string, unknown>>;
      textosArray.forEach((item) => {
        const textDiv = document.createElement('div');
        textDiv.className = 'text-item';
        textDiv.textContent = String(item.texto || '');
        paperLetter.appendChild(textDiv);
      });
    } else {
      const emptyMsg = document.createElement('p');
      emptyMsg.className = 'empty-msg';
      emptyMsg.textContent = 'Esta cápsula está vazia. O silêncio também faz parte do tempo.';
      paperLetter.appendChild(emptyMsg);
    }

    contentArea.appendChild(paperLetter);
  } else {
    const lockedDiv = document.createElement('div');
    lockedDiv.className = 'locked-message';

    const icon = document.createElement('div');
    icon.style.fontSize = '3rem';
    icon.style.color = '#822';
    icon.textContent = '🔒';
    lockedDiv.appendChild(icon);

    const h2 = document.createElement('h2');
    h2.textContent = 'Esta cápsula ainda está selada.';
    lockedDiv.appendChild(h2);

    const p = document.createElement('p');
    p.textContent = 'O tempo ainda não completou seu ciclo. Volte em ';

    const strongDate = document.createElement('strong');
    strongDate.textContent = openDate;
    p.appendChild(strongDate);

    const periodSpan = document.createElement('span');
    periodSpan.textContent = '.';
    p.appendChild(periodSpan);

    lockedDiv.appendChild(p);

    contentArea.appendChild(lockedDiv);
  }

  contentContainer.appendChild(contentArea);

  const footer = document.createElement('footer');
  footer.className = 'capsula-footer';

  const backBtn = document.createElement('a');
  backBtn.href = './capsulas.html';
  backBtn.className = 'btn-back';
  backBtn.textContent = '← Voltar para a Galeria';
  footer.appendChild(backBtn);

  // Adicionar botão de editar se a cápsula está selada
  if (!isAvailable) {
    const editBtn = document.createElement('a');
    editBtn.href = `./capsulas.html?edit=${String(capsula.id)}`;
    editBtn.className = 'btn-back';
    editBtn.textContent = '✏️ Editar';
    editBtn.style.marginLeft = '10px';
    footer.appendChild(editBtn);
  }

  contentContainer.appendChild(footer);
}

/**
 * Exibe estado de erro com opção de retorno para a página de cápsulas.
 * @param message Mensagem de erro para exibição.
 */
function renderError(message: string) {
  clearElement(contentContainer);
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  contentContainer.appendChild(errorDiv);

  const footer = document.createElement('footer');
  footer.className = 'capsula-footer';
  const backBtn = document.createElement('a');
  backBtn.href = './capsulas.html';
  backBtn.className = 'btn-back';
  backBtn.textContent = '← Voltar para a Galeria';
  footer.appendChild(backBtn);
  contentContainer.appendChild(footer);
}

/**
 * Carrega a cápsula da API e controla redirecionamento de autenticação.
 */
async function loadCapsulaDetail() {
  if (!isAuthenticated()) {
    window.location.href = './login.html?message=login-required';
    return;
  }

  const capsulaId = getCapsulaIdFromUrl();
  if (!capsulaId) {
    renderError('ID da cápsula não encontrado.');
    return;
  }

  try {
    const capsula = await fetchCapsulaById(capsulaId);
    renderCapsulaDetail(capsula as Record<string, unknown>);
  } catch (error) {
    const apiError = error as { message?: string };
    renderError(apiError.message || 'Não foi possível carregar a cápsula.');
  }
}

loadCapsulaDetail();
