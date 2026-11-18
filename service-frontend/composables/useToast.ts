export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  text: string;
}

let seq = 0;

export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => []);

  function push(type: Toast['type'], text: string, ms = 4000) {
    const id = ++seq;
    toasts.value = [...toasts.value, { id, type, text }];
    setTimeout(() => dismiss(id), ms);
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  return {
    toasts,
    dismiss,
    success: (t: string) => push('success', t),
    error: (t: string) => push('error', t, 6000),
    info: (t: string) => push('info', t),
  };
}

/**
 * Penanda "data berubah" lintas komponen. Di-bump setelah mutasi
 * (termasuk mutasi yang dilakukan AI Agent lewat MCP tool) agar halaman me-refresh datanya.
 */
export function useDataVersion() {
  const version = useState<number>('data.version', () => 0);
  return { version, bump: () => version.value++ };
}
