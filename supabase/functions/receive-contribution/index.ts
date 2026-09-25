import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const allowedOrigins = new Set([
  "https://floydskd-netizen.github.io",
  "https://latramapublica.pages.dev",
]);
const allowedTypes = new Set(["tip", "source", "document", "correction", "investigation", "other"]);
const allowedContact = new Set(["email", "whatsapp", "telegram", "phone", "x", "other"]);
const allowedMime = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_FILE = 10 * 1024 * 1024;
const labels: Record<string, string> = {
  tip: "Dato / pista",
  source: "Fuente",
  document: "Documento",
  correction: "Correcci\u00f3n",
  investigation: "Propuesta de investigaci\u00f3n",
  other: "Otro aporte",
};

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://floydskd-netizen.github.io",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
function clean(v: FormDataEntryValue | null, max = 6000) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
function html(v: string) {
  return v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
}
function safeName(name: string) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 120) || "archivo";
}

Deno.serve(async (req: Request) => {
  const headers = { ...cors(req), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  const origin = req.headers.get("origin") || "";
  if (origin && !allowedOrigins.has(origin)) return new Response(JSON.stringify({ error: "origin_not_allowed" }), { status: 403, headers });

  try {
    const form = await req.formData();
    if (clean(form.get("website"), 200)) return new Response(JSON.stringify({ ok: true }), { status: 200, headers });

    const contribution_type = clean(form.get("contribution_type"), 40);
    const topic = clean(form.get("topic"), 200);
    const details = clean(form.get("details"), 6000);
    const source_url = clean(form.get("source_url"), 2000) || null;
    const contact_name = clean(form.get("contact_name"), 120) || null;
    const contact_method = clean(form.get("contact_method"), 30) || null;
    const contact_value = clean(form.get("contact_value"), 200) || null;
    const credit_name = clean(form.get("credit_name"), 120) || null;
    const allow_contact = clean(form.get("allow_contact"), 10) === "true";
    const public_credit = clean(form.get("public_credit"), 10) === "true";
    const public_contact = clean(form.get("public_contact"), 10) === "true";

    if (!allowedTypes.has(contribution_type)) throw new Error("Tipo de aporte inv\u00e1lido.");
    if (topic.length < 3) throw new Error("Ingres\u00e1 un tema o asunto.");
    if (details.length < 20) throw new Error("Contanos un poco m\u00e1s sobre la informaci\u00f3n.");
    if (source_url && !/^https?:\/\//i.test(source_url)) throw new Error("La fuente debe ser un enlace http/https.");
    if (contact_method && !allowedContact.has(contact_method)) throw new Error("Medio de contacto inv\u00e1lido.");
    if ((contact_method && !contact_value) || (!contact_method && contact_value)) throw new Error("Complet\u00e1 medio y dato de contacto, o dej\u00e1 ambos vac\u00edos.");

    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(url, service, { auth: { persistSession: false } });
    const id = crypto.randomUUID();

    let file_path: string | null = null;
    let file_name: string | null = null;
    let file_type: string | null = null;
    let file_size: number | null = null;
    const fileEntry = form.get("file");
    if (fileEntry instanceof File && fileEntry.size > 0) {
      if (fileEntry.size > MAX_FILE) throw new Error("El archivo supera el m\u00e1ximo de 10 MB.");
      if (!allowedMime.has(fileEntry.type)) throw new Error("Tipo de archivo no admitido.");
      file_name = fileEntry.name.slice(0, 180);
      file_type = fileEntry.type;
      file_size = fileEntry.size;
      file_path = `${id}/${Date.now()}-${safeName(fileEntry.name)}`;
      const bytes = new Uint8Array(await fileEntry.arrayBuffer());
      const up = await db.storage.from("contribution-files").upload(file_path, bytes, { contentType: fileEntry.type, upsert: false });
      if (up.error) throw up.error;
    }

    const row = {
      id, contribution_type, topic, details, source_url, contact_name, contact_method, contact_value,
      credit_name, allow_contact, public_credit, public_contact, file_path, file_name, file_type, file_size,
      status: "pending", email_status: "pending",
    };
    const ins = await db.from("general_contributions").insert(row);
    if (ins.error) {
      if (file_path) await db.storage.from("contribution-files").remove([file_path]);
      throw ins.error;
    }

    const setting = await db.from("portal_private_settings").select("setting_value").eq("setting_key", "contribution_notify_email").maybeSingle();
    const notifyTo = setting.data?.setting_value || "";
    const smtpPass = Deno.env.get("GMAIL_APP_PASSWORD") || "";
    let emailSent = false;

    if (notifyTo && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: notifyTo, pass: smtpPass } });
        const subject = `[La Trama P\u00fablica] ${labels[contribution_type] || "Nuevo aporte"} \u2014 ${topic}`.slice(0, 180);
        const body = `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>Nuevo aporte a La Trama P\u00fablica</h2>
          <h3>Tipo de aporte</h3><p>${html(labels[contribution_type] || contribution_type)}</p>
          <h3>Tema / asunto</h3><p>${html(topic)}</p>
          <h3>Informaci\u00f3n aportada</h3><p>${html(details).replace(/\n/g, "<br>")}</p>
          <h3>Fuente / enlace</h3><p>${source_url ? `<a href="${html(source_url)}">${html(source_url)}</a>` : "No informado"}</p>
          <h3>Archivo</h3><p>${file_name ? `${html(file_name)} (${Math.round((file_size || 0) / 1024)} KB) \u2014 disponible en la cola privada de aportes` : "No adjunt\u00f3 archivo"}</p>
          <h3>Colaborador</h3><p>${html(contact_name || "No informado")}</p>
          <h3>Contacto</h3><p>${contact_method && contact_value ? `${html(contact_method)}: ${html(contact_value)}` : "No informado"}</p>
          <h3>Cr\u00e9dito</h3><p>${public_credit ? html(credit_name || contact_name || "Alias/nombre no informado") : "Solicita no publicar cr\u00e9dito"}</p>
          <h3>Permisos</h3><p>Contacto privado autorizado: ${allow_contact ? "S\u00ed" : "No"}<br>Contacto p\u00fablico autorizado: ${public_contact ? "S\u00ed" : "No"}</p>
          <p><strong>ID:</strong> ${id}</p>
        </body></html>`;
        await transporter.sendMail({ from: `"La Trama P\u00fablica" <${notifyTo}>`, to: notifyTo, subject, html: body });
        emailSent = true;
        await db.from("general_contributions").update({ email_status: "sent", email_sent_at: new Date().toISOString(), email_error: null }).eq("id", id);
      } catch (mailError) {
        const msg = String((mailError as Error)?.message || mailError).slice(0, 1000);
        await db.from("general_contributions").update({ email_status: "failed", email_error: msg }).eq("id", id);
        console.error("notification email failed", msg);
      }
    } else {
      await db.from("general_contributions").update({ email_status: "pending", email_error: smtpPass ? null : "SMTP secret not configured" }).eq("id", id);
    }

    return new Response(JSON.stringify({ ok: true, id, email_sent: emailSent }), { status: 200, headers });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: String((error as Error)?.message || error) }), { status: 400, headers });
  }
});
