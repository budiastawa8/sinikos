import { normalizeEnvLike } from "@/lib/crypto/secrets";
import { normalizePhone } from "@/lib/utils";
import type { WhatsAppSendResult } from "@/lib/whatsapp/types";

const META_BODY_PARAM_MAX = 1024;

function metaConfig() {
  const accessToken = normalizeEnvLike(
    process.env.WHATSAPP_META_ACCESS_TOKEN ?? "",
  );
  const phoneNumberId = normalizeEnvLike(
    process.env.WHATSAPP_META_PHONE_NUMBER_ID ?? "",
  );
  const apiVersion =
    normalizeEnvLike(process.env.WHATSAPP_META_API_VERSION ?? "") || "v21.0";
  const templateName = normalizeEnvLike(
    process.env.WHATSAPP_META_TEMPLATE_NAME ?? "",
  );
  const templateLang =
    normalizeEnvLike(process.env.WHATSAPP_META_TEMPLATE_LANG ?? "") || "id";
  return { accessToken, phoneNumberId, apiVersion, templateName, templateLang };
}

function truncateBodyParam(text: string) {
  if (text.length <= META_BODY_PARAM_MAX) return text;
  return `${text.slice(0, META_BODY_PARAM_MAX - 1)}…`;
}

function mapMetaError(data: {
  error?: { message?: string; error_user_msg?: string; code?: number };
}): string {
  const msg =
    data.error?.error_user_msg ||
    data.error?.message ||
    "Gagal mengirim lewat Meta Cloud API";
  if (/template/i.test(msg) || data.error?.code === 132000) {
    return (
      `${msg}. Untuk outbound cold, set WHATSAPP_META_TEMPLATE_NAME ke template ` +
      "Utility yang sudah disetujui Meta (satu variabel body), atau kirim teks hanya dalam jendela 24 jam."
    );
  }
  return msg;
}

/**
 * Adapter Meta WhatsApp Cloud API (resmi).
 * - Tanpa template: kirim teks bebas (cocok uji / jendela 24 jam).
 * - Dengan WHATSAPP_META_TEMPLATE_NAME: kirim template + 1 parameter body = isi pesan.
 */
export async function sendViaMeta(
  phone: string,
  message: string,
): Promise<WhatsAppSendResult> {
  const { accessToken, phoneNumberId, apiVersion, templateName, templateLang } =
    metaConfig();

  if (!accessToken || !phoneNumberId) {
    return {
      ok: false,
      error:
        "Meta Cloud API belum dikonfigurasi. Isi WHATSAPP_META_ACCESS_TOKEN dan WHATSAPP_META_PHONE_NUMBER_ID.",
    };
  }

  const to = normalizePhone(phone);
  if (!to || to.length < 10) {
    return { ok: false, error: "Nomor WhatsApp tidak valid" };
  }

  const url = `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(phoneNumberId)}/messages`;

  const payload = templateName
    ? {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLang },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: truncateBodyParam(message) },
              ],
            },
          ],
        },
      }
    : {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { preview_url: false, body: message },
      };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json().catch(() => ({}))) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string; error_user_msg?: string; code?: number };
    };

    if (!res.ok || data.error) {
      return { ok: false, error: mapMetaError(data) };
    }

    const ref = data.messages?.[0]?.id;
    return { ok: true, providerRef: ref ? String(ref) : undefined };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "Gagal menghubungi Meta Cloud API",
    };
  }
}
