export type WhatsAppSendResult =
  | { ok: true; providerRef?: string }
  | { ok: false; error: string };

export type WhatsAppProviderId = "fonnte" | "meta" | "custom";

export type WhatsAppSendInput = {
  phone: string;
  message: string;
};
