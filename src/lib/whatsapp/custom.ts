import { normalizeEnvLike } from "@/lib/crypto/secrets";
import { normalizePhone } from "@/lib/utils";
import type { WhatsAppSendResult } from "@/lib/whatsapp/types";

/**
 * Adapter gateway HTTP sendiri.
 * POST WHATSAPP_GATEWAY_URL
 * Body JSON: { phone, message }
 * Auth opsional: Authorization Bearer WHATSAPP_GATEWAY_TOKEN
 * Respons sukses: HTTP 2xx, opsional { id | messageId | providerRef }
 * Respons gagal: non-2xx atau { ok: false, error }
 */
export async function sendViaCustomGateway(
  phone: string,
  message: string,
): Promise<WhatsAppSendResult> {
  const url = normalizeEnvLike(process.env.WHATSAPP_GATEWAY_URL ?? "");
  if (!url) {
    return {
      ok: false,
      error:
        "WHATSAPP_GATEWAY_URL belum dikonfigurasi (provider custom / gateway sendiri).",
    };
  }

  const target = normalizePhone(phone);
  if (!target || target.length < 10) {
    return { ok: false, error: "Nomor WhatsApp tidak valid" };
  }

  const token = normalizeEnvLike(process.env.WHATSAPP_GATEWAY_TOKEN ?? "");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) {
    headers.Authorization = /^bearer\s+/i.test(token)
      ? token
      : `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ phone: target, message }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      message?: string;
      id?: string;
      messageId?: string;
      providerRef?: string;
    };

    if (!res.ok || data.ok === false) {
      return {
        ok: false,
        error:
          data.error ||
          data.message ||
          `Gateway WhatsApp gagal (HTTP ${res.status})`,
      };
    }

    const ref = data.providerRef || data.messageId || data.id;
    return { ok: true, providerRef: ref ? String(ref) : undefined };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "Gagal menghubungi gateway WhatsApp",
    };
  }
}
