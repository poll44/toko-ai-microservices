// Kontrak data — mengikuti skema SQLite di masing-masing service

export type Role = 'GUEST' | 'CUSTOMER' | 'ADMIN_SISTEM' | 'ADMIN_DEV';

/** service-gateway · auth.db → users (tanpa password) */
export interface User {
  id: string;
  email: string;
  name: string;
  role: Exclude<Role, 'GUEST'>;
}

/** service-catalog · catalog.db → products */
export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
}

/** service-catalog · catalog.db → landing_sections (id = 1) */
export interface Landing {
  id: number;
  hero_title: string;
  hero_subtitle: string;
  promo_banner: string;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED';

/** service-order · order.db → orders */
export interface Order {
  id: string;
  user_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  total_price: number;
  status: OrderStatus;
  payment_note: string | null;
  created_at: string;
}

export type TicketStatus = 'OPEN' | 'ESCALATED' | 'RESOLVED';
export type TicketCategory = 'PAYMENT_ISSUE' | 'BUG_UI' | 'GENERAL';

/** service-ticket · ticket.db → tickets */
export interface Ticket {
  id: string;
  user_id: string;
  order_id: string | null;
  category: TicketCategory;
  subject: string;
  description: string;
  status: TicketStatus;
  /** Catatan INTERNAL Admin Sistem -> Developer. Tidak dikirim ke role CUSTOMER. */
  dev_note?: string | null;
  created_at: string;
  /** Penjelasan hasil penanganan dari Developer — ditampilkan ke customer */
  resolution_note: string | null;
  resolved_at: string | null;
}

/** Bentuk respons standar semua service: { data, message? } */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// ---------- AI Assistant ----------
export type ChatMessage =
  | { kind: 'user'; id: string; text: string }
  | { kind: 'assistant'; id: string; text: string }
  | {
      kind: 'tool';
      id: string;
      name: string;
      args: Record<string, unknown>;
      status: 'pending' | 'ok' | 'error';
      summary?: string;
    }
  | { kind: 'error'; id: string; text: string };
