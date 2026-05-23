import AsyncStorage from '@react-native-async-storage/async-storage';

export const PROXY_URL = 'https://uust-proxy.onrender.com';

// Пинг — проверяем жив ли сервер (вызывай при старте экрана)
export async function pingServer() {
  try {
    const resp = await fetch(`${PROXY_URL}/ping`, { signal: AbortSignal.timeout(5000) });
    return resp.ok;
  } catch {
    return false;
  }
}

export async function login(username, password) {
  const resp = await fetch(`${PROXY_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return resp.json();
}

export function logout() {
  fetch(`${PROXY_URL}/api/logout`, { method: 'POST' }).catch(() => {});
  return { success: true };
}

// Сохранить логин (не пароль!)
export async function saveUsername(username) {
  try {
    await AsyncStorage.setItem('saved_username', username);
  } catch {}
}

export async function loadUsername() {
  try {
    return await AsyncStorage.getItem('saved_username');
  } catch {
    return null;
  }
}

export async function clearUsername() {
  try {
    await AsyncStorage.removeItem('saved_username');
  } catch {}
}
