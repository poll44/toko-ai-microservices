/** 850000 -> "Rp 850.000" */
export function rupiah(n: number): string {
  return 'Rp ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** ISO string -> "18 Nov 2026, 15:30" (zona waktu browser) */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/** Glyph placeholder untuk media product card ("Mechanical Keyboard Wireless" -> "MK") */
export function productGlyph(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const caps = words.filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]);
  return (caps.length ? caps : words.map((w) => w[0])).slice(0, 2).join('').toUpperCase();
}

/**
 * Markdown super-minimal & aman untuk balasan agent:
 * escape HTML dulu, baru **bold**, `code`, dan bullet "- ".
 */
export function miniMarkdown(src: string): string {
  const esc = src
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return esc
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-black/30 px-1 font-mono text-[12px]">$1</code>')
    .split('\n')
    .map((line) => (/^\s*[-*]\s+/.test(line) ? line.replace(/^\s*[-*]\s+/, '• ') : line))
    .join('<br>');
}
