import type { NextApiRequest, NextApiResponse } from 'next';

type LeadBody = {
  name?: unknown;
  email?: unknown;
  whatsapp?: unknown;
  acceptedPrivacy?: unknown;
  company?: unknown; // honeypot
};

type ApiResponse =
  | { ok: true; message: string }
  | { ok: false; error: string; message: string };

const MAILERLITE_ENDPOINT = 'https://connect.mailerlite.com/api/subscribers';
const DEFAULT_ONBOARDING_GROUP = '153400728188094209';

const isNumericGroupId = (value: string) => /^\d{5,}$/.test(value);

const normalizeText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isValidWhatsapp = (value: string) => /^\+?[0-9\s()\-]{7,20}$/.test(value);

const getMailerLiteKey = () =>
  process.env.MAILERLITE_API_KEY || process.env.MAILERLITE_TOKEN || process.env.ML_API_KEY || '';

const resolveGroups = () => {
  const onboarding =
    normalizeText(process.env.PERFECT_WEEK_ONBOARDING_GROUP_ID) ||
    normalizeText(process.env.MAILERLITE_ONBOARDING_GROUP_ID) ||
    DEFAULT_ONBOARDING_GROUP;

  const perfectWeek = normalizeText(process.env.PERFECT_WEEK_GROUP_ID);

  const groups = [onboarding, perfectWeek].filter(Boolean);
  const deduped = Array.from(new Set(groups));

  if (!deduped.every(isNumericGroupId)) {
    throw new Error('group_ids_invalid');
  }

  return { onboarding, perfectWeek, all: deduped };
};

async function postToMailerLite(payload: Record<string, unknown>, key: string) {
  const response = await fetch(MAILERLITE_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }

  return { response, json };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed', message: 'Método no permitido.' });
  }

  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as LeadBody;

  const honeypot = normalizeText(body.company);
  if (honeypot) {
    return res.status(200).json({ ok: true, message: 'Recibimos tus datos. Gracias.' });
  }

  const name = normalizeText(body.name);
  const email = normalizeText(body.email).toLowerCase();
  const whatsapp = normalizeText(body.whatsapp);
  const acceptedPrivacy = body.acceptedPrivacy === true;

  if (!acceptedPrivacy) {
    return res.status(400).json({
      ok: false,
      error: 'privacy_required',
      message: 'Debes aceptar la política de privacidad para continuar.',
    });
  }

  if (name.length < 2 || name.length > 120) {
    return res.status(400).json({
      ok: false,
      error: 'invalid_name',
      message: 'Escribe un nombre válido (mínimo 2 caracteres).',
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      ok: false,
      error: 'invalid_email',
      message: 'Ingresa un correo electrónico válido.',
    });
  }

  if (whatsapp && !isValidWhatsapp(whatsapp)) {
    return res.status(400).json({
      ok: false,
      error: 'invalid_whatsapp',
      message: 'El WhatsApp no tiene un formato válido.',
    });
  }

  const key = getMailerLiteKey();
  if (!key) {
    return res.status(500).json({
      ok: false,
      error: 'mailerlite_not_configured',
      message: 'Configuración incompleta. Intenta de nuevo más tarde.',
    });
  }

  let groups: string[] = [];
  try {
    const resolved = resolveGroups();
    if (!resolved.perfectWeek) {
      return res.status(500).json({
        ok: false,
        error: 'perfect_week_group_missing',
        message: 'Falta configurar el grupo de Perfect Week.',
      });
    }
    groups = resolved.all;
  } catch {
    return res.status(500).json({
      ok: false,
      error: 'group_configuration_error',
      message: 'La configuración de grupos está incompleta o es inválida.',
    });
  }

  const source = normalizeText(process.env.PERFECT_WEEK_FORM_SOURCE) || 'Perfect Week';
  const senderName = normalizeText(process.env.PERFECT_WEEK_SENDER_NAME) || 'Alejandro Gómez';

  const notes = [
    `Origen: ${source}`,
    `Responsable: ${senderName}`,
    whatsapp ? `WhatsApp: ${whatsapp}` : '',
  ]
    .filter(Boolean)
    .join(' | ');

  const basePayload: Record<string, unknown> = {
    email,
    name,
    resubscribe: true,
    groups,
    fields: {
      ...(whatsapp ? { phone: whatsapp } : {}),
      notas: notes,
    },
  };

  try {
    const firstTry = await postToMailerLite(basePayload, key);

    if (firstTry.response.ok) {
      return res.status(200).json({ ok: true, message: '¡Listo! Ya estás dentro de Perfect Week ✅' });
    }

    // Fallback if custom fields are not available in this MailerLite account.
    if (firstTry.response.status === 422) {
      const fallbackPayload = {
        email,
        name,
        resubscribe: true,
        groups,
      };

      const retry = await postToMailerLite(fallbackPayload, key);
      if (retry.response.ok || retry.response.status === 409) {
        return res.status(200).json({ ok: true, message: '¡Listo! Ya estás dentro de Perfect Week ✅' });
      }
    }

    if (firstTry.response.status === 409) {
      return res.status(200).json({ ok: true, message: 'Tu correo ya estaba registrado. ¡Bienvenido/a!' });
    }

    return res.status(502).json({
      ok: false,
      error: 'mailerlite_rejected',
      message: 'No pudimos guardar tu registro. Inténtalo nuevamente en unos minutos.',
    });
  } catch (error) {
    console.error('perfect-week lead error', error);
    return res.status(500).json({
      ok: false,
      error: 'unexpected_error',
      message: 'Ocurrió un error inesperado. Inténtalo nuevamente.',
    });
  }
}
