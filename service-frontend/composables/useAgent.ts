import type { ChatMessage } from '~/types';

/** Bentuk event yang dikembalikan ADK api_server di POST /run */
interface AdkPart {
  text?: string;
  thought?: boolean;
  functionCall?: { id?: string; name: string; args?: Record<string, unknown> };
  functionResponse?: {
    id?: string;
    name: string;
    response?: { content?: { type: string; text?: string }[]; isError?: boolean };
  };
}
interface AdkEvent {
  author?: string;
  content?: { role?: string; parts?: AdkPart[] };
  errorMessage?: string;
}

/** Tool MCP yang mengubah data -> halaman perlu refresh setelah dipanggil */
const MUTATING_TOOLS = new Set([
  'create_support_ticket',
  'escalate_ticket_to_dev',
  'resolve_dev_ticket',
  'update_landing_banner',
]);

let seq = 0;
const uid = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Ringkasan singkat hasil tool untuk badge di bubble Tool Call */
function summarize(text: string | undefined): { ok: boolean; summary: string } {
  if (!text) return { ok: true, summary: 'OK' };
  if (text.startsWith('Error')) return { ok: false, summary: text.replace(/^Error:\s*/, '').slice(0, 80) };
  try {
    const json = JSON.parse(text);
    const d = json?.data;
    if (Array.isArray(d)) return { ok: true, summary: `${d.length} item` };
    if (d?.id) return { ok: true, summary: [d.id, d.status].filter(Boolean).join(' · ') };
    if (json?.message) return { ok: true, summary: String(json.message).slice(0, 60) };
  } catch {
    /* bukan JSON */
  }
  return { ok: true, summary: 'OK' };
}

export function useAgent() {
  const config = useRuntimeConfig();
  const { user, role } = useAuth();
  const { request } = useApi();
  const { bump } = useDataVersion();

  const messages = useState<ChatMessage[]>('agent.messages', () => []);
  const sessions = useState<Record<string, string>>('agent.sessions', () => ({}));
  const busy = useState<boolean>('agent.busy', () => false);
  const open = useState<boolean>('agent.open', () => false);

  const appName = config.public.agentApp as string;
  const adkUserId = computed(() => user.value?.id ?? 'GUEST');

  /** POST /apps/{app}/users/{user}/sessions — satu sesi per identitas */
  async function ensureSession(): Promise<string> {
    const key = adkUserId.value;
    if (sessions.value[key]) return sessions.value[key]!;
    const s = await request<{ id: string }>(
      `/api/agent/apps/${appName}/users/${encodeURIComponent(key)}/sessions`,
      { method: 'POST', body: {} }
    );
    sessions.value = { ...sessions.value, [key]: s.id };
    return s.id;
  }

  /**
   * Agent tidak membaca header JWT, jadi identitas & role dikirim sebagai konteks
   * di awal pesan (sesuai instruksi RBAC di service-agent/src/agent.ts).
   */
  function withContext(text: string): string {
    const u = user.value;
    const ctx = u
      ? `[Konteks pengguna: nama="${u.name}", user_id=${u.id}, role=${u.role}. Gunakan actor_role="${u.role}" dan user_id="${u.id}" bila tool membutuhkannya.]`
      : '[Konteks pengguna: GUEST (belum login). Hanya boleh melihat info produk.]';
    return `${ctx}\n${text}`;
  }

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy.value) return;
    open.value = true;
    messages.value.push({ kind: 'user', id: uid(), text: clean });
    busy.value = true;

    try {
      const sessionId = await ensureSession();
      const events = await request<AdkEvent[]>('/api/agent/run', {
        method: 'POST',
        body: {
          appName,
          userId: adkUserId.value,
          sessionId,
          newMessage: { role: 'user', parts: [{ text: withContext(clean) }] },
        },
      });

      let mutated = false;
      for (const ev of events ?? []) {
        if (ev.errorMessage) messages.value.push({ kind: 'error', id: uid(), text: ev.errorMessage });
        for (const part of ev.content?.parts ?? []) {
          if (part.functionCall) {
            messages.value.push({
              kind: 'tool',
              id: part.functionCall.id ?? uid(),
              name: part.functionCall.name,
              args: part.functionCall.args ?? {},
              status: 'pending',
            });
          } else if (part.functionResponse) {
            const fr = part.functionResponse;
            const tool = [...messages.value]
              .reverse()
              .find((m) => m.kind === 'tool' && (m.id === fr.id || (m.name === fr.name && m.status === 'pending')));
            const { ok, summary } = summarize(fr.response?.content?.[0]?.text);
            const failed = !ok || fr.response?.isError === true;
            if (tool && tool.kind === 'tool') {
              tool.status = failed ? 'error' : 'ok';
              tool.summary = summary;
            }
            if (!failed && MUTATING_TOOLS.has(fr.name)) mutated = true;
          } else if (part.text && !part.thought && ev.content?.role === 'model') {
            messages.value.push({ kind: 'assistant', id: uid(), text: part.text.trim() });
          }
        }
      }
      if (mutated) bump();
    } catch (err: any) {
      messages.value.push({ kind: 'error', id: uid(), text: err?.message ?? 'Agent tidak merespons' });
    } finally {
      busy.value = false;
    }
  }

  /** Dipanggil saat role berganti: percakapan dimulai ulang dengan identitas baru */
  function reset() {
    messages.value = [];
  }

  return { messages, busy, open, role, send, reset };
}
