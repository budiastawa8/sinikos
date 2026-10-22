import { normalizeEnvLike } from "@/lib/crypto/secrets";
import { normalizePhone } from "@/lib/utils";
import type { WhatsAppSendResult } from "@/lib/whatsapp/types";

function resolveFonnteToken() {
  const raw = process.env.FONNTE_TOKEN;
  if (!raw) return "";
  let token = normalizeEnvLike(raw);
  // Beberapa orang menempel "Bearer xxx" dari kebiasaan API lain — Fonnte tidak memakai Bearer.
  if (/^bearer\s+/i.test(token)) {
    token = token.replace(/^bearer\s+/i, "").trim();
  }
  return token;
}

function mapFonnteError(reason?: string, detail?: string, status?: number) {
  const text = (reason || detail || "").toLowerCase();
  if (text.includes("token invalid") || text.includes("invalid token")) {
    return (
      "Token Fonnte tidak valid. Pakai token perangkat (Device) dari menu Device di Fonnte — " +
      "bukan Account Token di Settings. Tempel ulang di Vercel env FONNTE_TOKEN tanpa tanda kutip, " +
      "lalu Redeploy. Pastikan perangkat WhatsApp di Fonnte berstatus connect."
    );
  }
  if (text.includes("unknown user")) {
    return (
      "Account Token Fonnte tidak dipakai untuk kirim pesan. Isi FONNTE_TOKEN dengan token Device."
    );
  }
  return reason || detail || (status ? `HTTP ${status}` : "Gagal mengirim WhatsApp");
}

/** Adapter Fonnte (default platform). */
export async function sendViaFonnte(
  phone: string,
  message: string,
): Promise<WhatsAppSendResult> {
  const token = resolveFonnteToken();
  if (!token) {
    return { ok: false, error: "FONNTE_TOKEN belum dikonfigurasi" };
  }

  const target = normalizePhone(phone);
  if (!target || target.length < 10) {
    return { ok: false, error: "Nomor WhatsApp tidak valid" };
  }

  try {
    const body = new URLSearchParams({
      target,
      message,
      countryCode: "62",
    });

    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
      },
      body,
    });

    const data = (await res.json().catch(() => ({}))) as {
      status?: boolean;
      Status?: boolean;
      detail?: string;
      id?: string | string[];
      reason?: string;
    };

    const failed =
      !res.ok || data.status === false || data.Status === false;
    if (failed) {
      return {
        ok: false,
        error: mapFonnteError(data.reason, data.detail, res.status),
      };
    }

    const ref = Array.isArray(data.id) ? data.id[0] : data.id;
    return { ok: true, providerRef: ref ? String(ref) : undefined };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gagal menghubungi Fonnte",
    };
  }
}
