import { normalizePhone } from "@/lib/utils";

type FonnteResult =
  | { ok: true; providerRef?: string }
  | { ok: false; error: string };

export async function sendWhatsAppMessage(
  phone: string,
  message: string,
): Promise<FonnteResult> {
  const token = process.env.FONNTE_TOKEN;
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
      detail?: string;
      id?: string | string[];
      reason?: string;
    };

    if (!res.ok || data.status === false) {
      return {
        ok: false,
        error: data.reason || data.detail || `HTTP ${res.status}`,
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
