/** Validasi format & kecocokan mode Sandbox/Production untuk Midtrans per-org (sewa). */

export function looksLikeServerKey(key: string) {
  return key.startsWith("Mid-server-") || key.startsWith("SB-Mid-server-");
}

export function looksLikeClientKey(key: string) {
  return key.startsWith("Mid-client-") || key.startsWith("SB-Mid-client-");
}

export function isSandboxPrefixedKey(key: string) {
  return key.startsWith("SB-Mid-");
}

/**
 * Pastikan key cocok dengan mode yang dipilih.
 * Production menolak key berawalan SB- (Sandbox).
 * Sandbox menerima SB- maupun Mid- (dashboard Sandbox kadang menampilkan Mid- tanpa SB-).
 */
export function validateMidtransKeyMode(params: {
  isProduction: boolean;
  serverKey?: string | null;
  clientKey?: string | null;
}): string | null {
  const server = params.serverKey?.trim() || "";
  const client = params.clientKey?.trim() || "";

  if (server && !looksLikeServerKey(server)) {
    return "Server Key tidak valid. Harus diawali Mid-server- atau SB-Mid-server-";
  }
  if (client && !looksLikeClientKey(client)) {
    return "Client Key tidak valid. Harus diawali Mid-client- atau SB-Mid-client-";
  }

  if (params.isProduction) {
    if (server && isSandboxPrefixedKey(server)) {
      return "Mode Production aktif, tetapi Server Key masih Sandbox (SB-). Ambil key dari dashboard.midtrans.com (Production), bukan sandbox.";
    }
    if (client && isSandboxPrefixedKey(client)) {
      return "Mode Production aktif, tetapi Client Key masih Sandbox (SB-). Samakan mode dan key.";
    }
  }

  return null;
}
