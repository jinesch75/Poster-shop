// Brevo (ex-Sendinblue) transactional + contacts wrapper.
//
// We use plain fetch rather than a Brevo SDK — the API surface we need is
// two endpoints, and avoiding the SDK keeps cold-start size + dependency
// churn low. Everything here is server-only; the routes/actions importing
// it must be server-rendered or Node-runtime API routes.
//
// Env contract:
//   BREVO_API_KEY            — v3 key from Brevo → Settings → SMTP & API
//   BREVO_SENDER_EMAIL       — verified sender (single-sender or domain)
//   BREVO_SENDER_NAME        — "Linework Studio"
//   BREVO_NEWSLETTER_LIST_ID — numeric Brevo list id (e.g. 3)
//
// Missing env in production means we *log and no-op* rather than throwing,
// so a misconfigured Brevo doesn't break checkouts. The webhook still fires,
// the download still works — the buyer just doesn't get the receipt email.
// That's recoverable (admin re-issue). A crashing webhook isn't.

const BREVO_BASE = 'https://api.brevo.com/v3';

type BrevoSendPayload = {
  sender: { email: string; name?: string };
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  replyTo?: { email: string; name?: string };
  tags?: string[];
};

export type SendEmailArgs = {
  to: string;
  toName?: string | null;
  subject: string;
  html: string;
  text?: string;
  /** For categorisation in the Brevo dashboard (e.g. "receipt", "re-issue"). */
  tag?: string;
};

export type SendEmailResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

function brevoEnv() {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || 'Linework Studio';
  if (!apiKey || !senderEmail) {
    return { ok: false as const, reason: 'BREVO_API_KEY or BREVO_SENDER_EMAIL not set' };
  }
  return { ok: true as const, apiKey, senderEmail, senderName };
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const env = brevoEnv();
  if (!env.ok) {
    console.warn('[email] skipped — env not configured:', env.reason);
    return { ok: false, error: env.reason };
  }

  const payload: BrevoSendPayload = {
    sender: { email: env.senderEmail, name: env.senderName },
    to: [{ email: args.to, name: args.toName ?? undefined }],
    subject: args.subject,
    htmlContent: args.html,
    textContent: args.text,
    replyTo: { email: env.senderEmail, name: env.senderName },
    tags: args.tag ? [args.tag] : undefined,
  };

  try {
    const res = await fetch(`${BREVO_BASE}/smtp/email`, {
      method: 'POST',
      headers: {
        'api-key': env.apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[email] brevo send failed', res.status, body);
      return { ok: false, error: `Brevo ${res.status}: ${body.slice(0, 200)}` };
    }

    const json = (await res.json()) as { messageId?: string };
    return { ok: true, messageId: json.messageId ?? 'unknown' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[email] brevo send threw', msg);
    return { ok: false, error: msg };
  }
}

// ---------- Newsletter contact ----------
//
// Brevo `createContact` is idempotent when updateEnabled=true: an existing
// email is updated (and listIds appended) rather than rejected. That matches
// our desired "subscribe" semantics.

export type SubscribeContactResult =
  | { ok: true; created: boolean }
  | { ok: false; error: string };

export async function subscribeContact(args: {
  email: string;
  source?: string;
}): Promise<SubscribeContactResult> {
  const env = brevoEnv();
  if (!env.ok) {
    console.warn('[email] newsletter skipped — env not configured:', env.reason);
    return { ok: false, error: env.reason };
  }

  const listIdRaw = process.env.BREVO_NEWSLETTER_LIST_ID;
  const listId = listIdRaw ? Number(listIdRaw) : NaN;
  if (!Number.isFinite(listId)) {
    return { ok: false, error: 'BREVO_NEWSLETTER_LIST_ID not set or not numeric' };
  }

  const body = {
    email: args.email,
    listIds: [listId],
    updateEnabled: true,
    attributes: args.source ? { SOURCE: args.source } : undefined,
  };

  try {
    const res = await fetch(`${BREVO_BASE}/contacts`, {
      method: 'POST',
      headers: {
        'api-key': env.apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    // 201 = newly created, 204 = updated existing. Both are success.
    if (res.status === 201) return { ok: true, created: true };
    if (res.status === 204) return { ok: true, created: false };

    const text = await res.text();
    // Brevo returns 400 "Contact already exist" for some edge cases even with
    // updateEnabled — treat as success.
    if (res.status === 400 && /already exist/i.test(text)) {
      return { ok: true, created: false };
    }
    console.error('[email] brevo subscribe failed', res.status, text);
    return { ok: false, error: `Brevo ${res.status}: ${text.slice(0, 200)}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[email] brevo subscribe threw', msg);
    return { ok: false, error: msg };
  }
}
