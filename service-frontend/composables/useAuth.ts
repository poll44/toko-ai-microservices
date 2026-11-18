import type { Role, User } from '~/types';

const STORAGE_KEY = 'tokoai.auth';
/** Semua akun demo di auth.db memakai password yang sama (lihat service-gateway/src/db/auth.db.ts) */
const DEMO_PASSWORD = '123456';

interface StoredAuth {
  token: string;
  user: User;
}

export function useAuth() {
  const config = useRuntimeConfig();
  const token = useState<string | null>('auth.token', () => null);
  const user = useState<User | null>('auth.user', () => null);
  const demoUsers = useState<User[]>('auth.demoUsers', () => []);
  const switching = useState<boolean>('auth.switching', () => false);

  const role = computed<Role>(() => user.value?.role ?? 'GUEST');

  function hydrate() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredAuth;
      token.value = parsed.token;
      user.value = parsed.user;
    } catch {
      /* storage tidak tersedia / rusak -> tetap Guest */
    }
  }

  function persist() {
    try {
      if (token.value && user.value) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: token.value, user: user.value }));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* abaikan */
    }
  }

  /** GET /auth/demo-users — daftar akun untuk Quick Role Switcher */
  async function loadDemoUsers() {
    if (demoUsers.value.length) return demoUsers.value;
    const res = await $fetch<{ data: User[] }>('/auth/demo-users', { baseURL: config.public.apiBase });
    demoUsers.value = res.data;
    return res.data;
  }

  /** POST /auth/login -> JWT */
  async function loginAs(email: string) {
    switching.value = true;
    try {
      const res = await $fetch<{ token: string; user: User }>('/auth/login', {
        baseURL: config.public.apiBase,
        method: 'POST',
        body: { email, password: DEMO_PASSWORD },
      });
      token.value = res.token;
      user.value = res.user;
      persist();
      return res.user;
    } finally {
      switching.value = false;
    }
  }

  function logout() {
    token.value = null;
    user.value = null;
    persist();
  }

  return { token, user, role, demoUsers, switching, hydrate, loadDemoUsers, loginAs, logout };
}
