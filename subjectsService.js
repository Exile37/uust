import AsyncStorage from '@react-native-async-storage/async-storage';

const PROXY_URL = 'https://uust-proxy.onrender.com';
const CACHE_KEY = 'cached_subjects';
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

async function safeJson(resp) {
  const contentType = resp.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Сервер просыпается, подождите 15–20 секунд и попробуйте снова');
  }
  return resp.json();
}

export async function fetchSubjects({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const { data, ts } = JSON.parse(raw);
        const fresh = Date.now() - ts < CACHE_TTL;
        return { subjects: data, fromCache: true, stale: !fresh };
      }
    } catch {}
  }

  const resp = await fetch(`${PROXY_URL}/api/subjects`);
  if (resp.status === 401) throw new Error('auth');
  const data = await safeJson(resp);
  if (data.error === 'auth') throw new Error('auth');
  if (data.error) throw new Error(data.error);

  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ data: data.subjects, ts: Date.now() }));
  } catch {}

  return { subjects: data.subjects, fromCache: false };
}

export async function clearSubjectsCache() {
  try { await AsyncStorage.removeItem(CACHE_KEY); } catch {}
}

export async function fetchGrades(subjectUrl) {
  const resp = await fetch(`${PROXY_URL}/api/grades?url=${encodeURIComponent(subjectUrl)}`);
  if (resp.status === 401) throw new Error('auth');
  const data = await safeJson(resp);
  if (data.error === 'auth') throw new Error('auth');
  if (data.error) throw new Error(data.error);
  return data.lessons;
}
