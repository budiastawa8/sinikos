import { sendViaCustomGateway } from "@/lib/whatsapp/custom";
import { sendViaFonnte } from "@/lib/whatsapp/fonnte";
import { sendViaMeta } from "@/lib/whatsapp/meta";
import type {
  WhatsAppProviderId,
  WhatsAppSendResult,
} from "@/lib/whatsapp/types";

function resolveProvider(): WhatsAppProviderId {
  const raw = (process.env.WHATSAPP_PROVIDER ?? "fonnte")
    .trim()
    .toLowerCase();
  if (raw === "meta" || raw === "cloud" || raw === "meta_cloud") {
    return "meta";
  }
  if (raw === "custom" || raw === "gateway" || raw === "self") {
    return "custom";
  }
  return "fonnte";
}

export function getWhatsAppProvider(): WhatsAppProviderId {
  return resolveProvider();
}

/**
 * Pintu tunggal pengiriman WhatsApp platform.
 * Provider: WHATSAPP_PROVIDER=fonnte|meta|custom (default fonnte).
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string,
): Promise<WhatsAppSendResult> {
  const provider = resolveProvider();
  switch (provider) {
    case "meta":
      return sendViaMeta(phone, message);
    case "custom":
      return sendViaCustomGateway(phone, message);
    default:
      return sendViaFonnte(phone, message);
  }
}

export type { WhatsAppProviderId, WhatsAppSendResult } from "@/lib/whatsapp/types";
