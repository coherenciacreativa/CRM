export default function handler(req: any, res: any) {
  const supabaseOk = Boolean(
    (process.env.SUPABASE_URL || process.env.SUPABASE_URL_CRM) &&
      (process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_CRM),
  );
  const mailerliteOk = Boolean(
    process.env.MAILERLITE_API_KEY || process.env.MAILERLITE_TOKEN || process.env.ML_API_KEY,
  );
  return res.status(200).json({
    ok: supabaseOk,
    supabase_ok: supabaseOk,
    mailerlite_key_present: mailerliteOk,
    ts: new Date().toISOString(),
  });
}
