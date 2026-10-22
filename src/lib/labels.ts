/** Label UI bahasa Indonesia untuk enum status (kode DB tetap English). */

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draf",
  UNPAID: "Belum lunas",
  PARTIAL: "Sebagian",
  PAID: "Lunas",
  OVERDUE: "Terlambat",
};

export const WHATSAPP_STATUS_LABEL: Record<string, string> = {
  PENDING: "Menunggu",
  SENT: "Terkirim",
  FAILED: "Gagal",
};

export const ROOM_STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Kosong",
  OCCUPIED: "Terisi",
  MAINTENANCE: "Perawatan",
};

export const LEASE_STATUS_LABEL: Record<string, string> = {
  PENDING: "Menunggu bayar",
  ACTIVE: "Aktif",
  ENDED: "Selesai",
};

export const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  PENDING: "Menunggu",
  ACTIVE: "Lunas",
  EXPIRED: "Berakhir",
  CANCELED: "Batal",
};

export function labelOf(
  map: Record<string, string>,
  code: string,
  fallback = code,
) {
  return map[code] ?? fallback;
}

export function invoiceStatusLabel(status: string) {
  return labelOf(INVOICE_STATUS_LABEL, status);
}

export function whatsappStatusLabel(status: string) {
  return labelOf(WHATSAPP_STATUS_LABEL, status);
}

export function roomStatusLabel(status: string) {
  return labelOf(ROOM_STATUS_LABEL, status);
}

export function leaseStatusLabel(status: string) {
  return labelOf(LEASE_STATUS_LABEL, status);
}

export function invoiceStatusBadgeVariant(
  status: string,
): "default" | "success" | "warning" | "destructive" | "secondary" | "outline" {
  if (status === "PAID") return "success";
  if (status === "OVERDUE") return "destructive";
  if (status === "PARTIAL") return "secondary";
  if (status === "DRAFT") return "outline";
  if (status === "UNPAID") return "warning";
  return "secondary";
}

export function whatsappStatusBadgeVariant(
  status: string,
): "success" | "destructive" | "warning" | "secondary" {
  if (status === "SENT") return "success";
  if (status === "FAILED") return "destructive";
  if (status === "PENDING") return "warning";
  return "secondary";
}

export function roomStatusBadgeVariant(
  status: string,
): "success" | "secondary" | "warning" {
  if (status === "AVAILABLE") return "success";
  if (status === "OCCUPIED") return "secondary";
  return "warning";
}
