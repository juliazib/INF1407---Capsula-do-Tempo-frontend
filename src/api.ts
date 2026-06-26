const API_BASE = 'http://127.0.0.1:8000/api';

export type ApiError = {
  message: string;
  details?: Record<string, string[]>;
};

function getToken(): string | null {
  return localStorage.getItem('capsula_token');
}

function buildHeaders(includeJson = true): HeadersInit {
  const headers: Record<string, string> = {};
  if (includeJson) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function normalizeBackendMessage(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('no active account') || lower.includes('incorrect credentials')) {
    return 'Usuário ou senha incorretos. Verifique e tente novamente.';
  }

  if (lower.includes('blank') || lower.includes('this field may not be blank')) {
    return 'Por favor, preencha todos os campos obrigatórios.';
  }

  if (lower.includes('invalid') && lower.includes('email')) {
    return 'Informe um e-mail válido.';
  }

  if (lower.includes('already exists') && lower.includes('username')) {
    return 'Este nome de usuário já está em uso.';
  }

  if (lower.includes('already exists') && lower.includes('email')) {
    return 'Este e-mail já está cadastrado.';
  }

  if (lower.includes('ensure this field has at least')) {
    return 'A senha precisa ter pelo menos 8 caracteres.';
  }

  if (lower.includes('invalid') && lower.includes('token')) {
    return 'O token é inválido ou expirou. Solicite a recuperação novamente.';
  }

  return message;
}

function formatFieldError(key: string, value: unknown): string {
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item).trim()).filter(Boolean);
    if (!items.length) {
      return '';
    }

    const rawMessage = items.join(' ');
    switch (key) {
      case 'username':
        return rawMessage.includes('already exists')
          ? 'Este nome de usuário já está em uso.'
          : 'Informe um nome de usuário válido.';
      case 'email':
        return rawMessage.includes('already exists')
          ? 'Este e-mail já está cadastrado.'
          : 'Informe um e-mail válido.';
      case 'password':
        return rawMessage.includes('at least')
          ? 'A senha precisa ter pelo menos 8 caracteres.'
          : 'Informe uma senha válida.';
      case 'detail':
        return normalizeBackendMessage(rawMessage);
      default:
        return rawMessage;
    }
  }

  if (typeof value === 'string') {
    return normalizeBackendMessage(value);
  }

  if (typeof value === 'object' && value !== null) {
    return Object.entries(value)
      .map(([nestedKey, nestedValue]) => formatFieldError(nestedKey, nestedValue))
      .filter(Boolean)
      .join(' ');
  }

  return '';
}

function getErrorMessage(data: unknown, statusText: string): string {
  if (!data || typeof data !== 'object') {
    return statusText || 'Erro inesperado. Tente novamente mais tarde.';
  }

  const payload = data as Record<string, unknown>;
  if (typeof payload.detail === 'string') {
    return normalizeBackendMessage(payload.detail);
  }

  const messages: string[] = [];
  for (const [key, value] of Object.entries(payload)) {
    const message = formatFieldError(key, value);
    if (message) {
      messages.push(message);
    }
  }

  if (messages.length) {
    return messages.join(' ');
  }

  return statusText || 'Erro inesperado. Tente novamente mais tarde.';
}

function isInvalidTokenMessage(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes('token') &&
    (lower.includes('invalid') || lower.includes('expired') || lower.includes('not valid'))
  );
}

function shouldLogoutOnAuthError(response: Response, data: unknown) {
  if (response.status !== 401) {
    return false;
  }

  if (!data || typeof data !== 'object') {
    return false;
  }

  const payload = data as Record<string, unknown>;
  if (typeof payload.detail === 'string') {
    return isInvalidTokenMessage(payload.detail);
  }

  if (typeof payload.code === 'string') {
    return payload.code === 'token_not_valid';
  }

  return false;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }

  if (!response.ok) {
    if (shouldLogoutOnAuthError(response, data)) {
      logoutUser();
      window.location.href = './login.html?message=login-required';
    }

    const error = data as Record<string, unknown>;
    const details = typeof error === 'object' && error !== null ? error : undefined;
    const message = getErrorMessage(error, response.statusText || 'Erro inesperado.');
    throw { message, details } as ApiError;
  }

  return data as T;
}

export async function loginUser(username: string, password: string) {
  const response = await fetch(`${API_BASE}/token/`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ username, password }),
  });
  const data = await parseResponse<{ access?: string; refresh?: string }>(response);
  if (data.access) localStorage.setItem('capsula_token', data.access);
  return data;
}

export async function registerUser(payload: Record<string, string>) {
  return parseResponse(await fetch(`${API_BASE}/register/`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  }));
}

export async function requestPasswordReset(email: string) {
  return parseResponse(await fetch(`${API_BASE}/password-reset/`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ email }),
  }));
}

export async function confirmPasswordReset(email: string, token: string, newPassword: string) {
  return parseResponse(await fetch(`${API_BASE}/password-reset/confirm/`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ email, token, new_password: newPassword }),
  }));
}

export async function getCurrentUser(): Promise<Record<string, unknown>> {
  return parseResponse<Record<string, unknown>>(await fetch(`${API_BASE}/user/`, {
    method: 'GET',
    headers: buildHeaders(false),
  }));
}

export async function updateCurrentUser(payload: Record<string, string>): Promise<Record<string, unknown>> {
  return parseResponse<Record<string, unknown>>(await fetch(`${API_BASE}/user/`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  }));
}

export async function deleteCurrentUser(password: string) {
  return parseResponse(await fetch(`${API_BASE}/user/`, {
    method: 'DELETE',
    headers: buildHeaders(),
    body: JSON.stringify({ password }),
  }));
}

export async function fetchCapsulas() {
  return parseResponse(await fetch(`${API_BASE}/capsulas/`, {
    method: 'GET',
    headers: buildHeaders(false),
  }));
}

export async function fetchCapsulaById(id: number) {
  return parseResponse(await fetch(`${API_BASE}/capsulas/${id}/`, {
    method: 'GET',
    headers: buildHeaders(false),
  }));
}

export async function createCapsula(payload: Record<string, unknown>) {
  return parseResponse(await fetch(`${API_BASE}/capsulas/`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  }));
}

export async function updateCapsula(id: number, payload: Record<string, unknown>) {
  return parseResponse(await fetch(`${API_BASE}/capsulas/${id}/`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  }));
}

export async function deleteCapsula(id: number) {
  return parseResponse(await fetch(`${API_BASE}/capsulas/${id}/`, {
    method: 'DELETE',
    headers: buildHeaders(false),
  }));
}

export async function authorizeCapsulaEdit(id: number, password: string) {
  return parseResponse(await fetch(`${API_BASE}/capsulas/${id}/authorize/`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ senha: password }),
  }));
}

export function logoutUser() {
  localStorage.removeItem('capsula_token');
}

export function isAuthenticated() {
  return Boolean(getToken());
}
