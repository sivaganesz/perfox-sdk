/** Header of an approved WhatsApp template. */
export interface WhatsAppTemplateHeader {
  type: "text" | "image" | "video" | "document";
  text?: string;
  /** format: uri. */
  url?: string;
}

/** A dynamic button parameter of an approved WhatsApp template. */
export interface WhatsAppTemplateButton {
  sub_type: "quick_reply" | "url";
  /** 0–9. */
  index: number;
  payload?: string;
  text?: string;
}

/** An approved WhatsApp template and the values to fill it with. */
export interface WhatsAppTemplate {
  /** minLength 1. */
  name: string;
  /** 2–10 characters. */
  language?: string;
  /** Up to 50 values. */
  body_parameters?: string[];
  header?: WhatsAppTemplateHeader;
  /** Up to 10 buttons. */
  buttons?: WhatsAppTemplateButton[];
}
