import nodemailer from "nodemailer";
import { verifyWebhook } from "@/lib/verify-webhook";

// Supabase "Send Email" auth hook: Supabase can't reach Gmail's SMTP directly, so it asks us to.
export async function POST(request: Request) {
  const body = await request.text();
  if (!verifyWebhook(process.env.SEND_EMAIL_HOOK_SECRET!, request.headers, body)) {
    return Response.json({ error: { http_code: 401, message: "Invalid signature" } }, { status: 401 });
  }

  const payload = JSON.parse(body);
  const email = payload?.user?.email;
  const token = payload?.email_data?.token;
  if (typeof email !== "string" || typeof token !== "string" || !token) {
    return Response.json({ error: { http_code: 400, message: "Invalid payload" } }, { status: 400 });
  }

  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });

  try {
    await transport.sendMail({
      from: `Hearth <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Your Hearth code",
      text: `Your Hearth code is ${token}`,
    });
  } catch (error) {
    console.error("send-email failed", error);
    return Response.json({ error: { http_code: 500, message: "Email failed" } }, { status: 500 });
  }

  return Response.json({});
}
