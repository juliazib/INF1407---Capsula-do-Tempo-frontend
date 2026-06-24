import { getCurrentUser } from './api.js';

function clearElement(element: HTMLElement) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

export function renderNav() {
  const nav = document.getElementById('nav-right');
  if (!nav) return;

  const token = localStorage.getItem('capsula_token');
  clearElement(nav);

  if (token) {
    const profileLink = document.createElement('a');
    profileLink.href = './profile.html';
    profileLink.className = 'profile-link';

    const profileImage = document.createElement('img');
    profileImage.src = './public/img/perfil.png';
    profileImage.alt = 'Perfil';
    profileLink.appendChild(profileImage);

    const userText = document.createElement('span');
    userText.className = 'user-text';
    userText.textContent = 'Olá, usuário';
    profileLink.appendChild(userText);

    const logoutButton = document.createElement('button');
    logoutButton.type = 'button';
    logoutButton.className = 'logout-button-styled';
    logoutButton.id = 'logout-button';
    logoutButton.textContent = 'Sair';
    logoutButton.addEventListener('click', () => {
      localStorage.removeItem('capsula_token');
      window.location.href = './login.html';
    });

    nav.appendChild(profileLink);
    nav.appendChild(logoutButton);
    updateUserName();
  }

  updateNavLinks();
}

async function updateUserName() {
  const token = localStorage.getItem('capsula_token');
  if (!token) return;

  const userText = document.querySelector('.user-text');
  if (!userText) return;

  try {
    const user = await getCurrentUser();
    const username = typeof user.username === 'string' ? user.username : null;
    if (username) {
      userText.textContent = `Olá, ${username}`;
    }
  } catch {
    userText.textContent = 'Olá, usuário';
  }
}

function updateNavLinks() {
  const token = localStorage.getItem('capsula_token');
  const nav = document.querySelector('.navbar-custom');
  if (!nav) return;

  const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>('a.nav-item-frame'));
  links.forEach((link) => {
    const href = link.getAttribute('href') || '';
    const isAuthLink = href.includes('login.html') || href.includes('registro.html') || href.includes('recuperar-senha.html');

    if (token) {
      link.style.display = isAuthLink ? 'none' : '';
    } else {
      link.style.display = '';
    }
  });
}

export function showMessage(element: HTMLElement | null, message: string, isSuccess = false) {
  if (!element) return;
  element.textContent = message;
  element.className = `message ${isSuccess ? 'success' : ''}`.trim();
}

export function getQueryParam(name: string) {
  return new URLSearchParams(window.location.search).get(name);
}
