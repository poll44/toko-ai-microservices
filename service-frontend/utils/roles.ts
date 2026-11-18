import type { Role, User } from '~/types';

export const ROLE_META: Record<Role, { title: string; avatar: string; ring: string; home: string }> = {
  GUEST: { title: 'Guest', avatar: 'bg-zinc-500', ring: 'border-zinc-500', home: '/' },
  CUSTOMER: { title: 'Customer', avatar: 'bg-indigo-600', ring: 'border-indigo-500', home: '/' },
  ADMIN_SISTEM: { title: 'Admin Sistem', avatar: 'bg-cyan-600', ring: 'border-cyan-500', home: '/admin' },
  ADMIN_DEV: { title: 'Admin Dev', avatar: 'bg-purple-600', ring: 'border-purple-500', home: '/dev' },
};

/** "Budi Santoso (Customer)" -> "Budi" */
export function firstName(user: User): string {
  return user.name.replace(/\(.*\)/, '').trim().split(/\s+/)[0] ?? user.name;
}

/** -> "Customer - Budi (USR-01)" / "Guest" */
export function roleLabel(user: User | null): string {
  if (!user) return 'Guest';
  return `${ROLE_META[user.role].title} - ${firstName(user)} (${user.id})`;
}

export function initialOf(user: User | null): string {
  return user ? firstName(user)[0]!.toUpperCase() : 'G';
}

/** Quick prompt chips di AI widget, sesuai role & tools MCP yang tersedia */
export const QUICK_PROMPTS: Record<Role, string[]> = {
  GUEST: ['Produk apa saja yang ready?', 'Berapa harga USB-C Hub?', 'Bagaimana cara checkout?'],
  CUSTOMER: [
    'Cek status ORD-102',
    'Kenapa pembayaran saya gagal?',
    'Buatkan tiket komplain untuk ORD-102',
    'Produk apa yang ready?',
  ],
  ADMIN_SISTEM: [
    'Produk stok menipis?',
    'Tiket OPEN saat ini',
    'Order yang FAILED?',
    'Eskalasi TCK-01 ke developer',
  ],
  ADMIN_DEV: ['Antrean tiket ESCALATED', 'Detail order ORD-102', 'Tandai TCK-02 resolved'],
};
