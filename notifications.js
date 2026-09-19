import nodemailer from 'nodemailer';

// Only server-side environment variables. Never log the SMTP configuration/errors.
export function createGmailNotifier(env = process.env, makeTransport = nodemailer.createTransport) {
  let transport;
  return async function sendAdventureStart() {
    const user = env.GMAIL_USER?.trim();
    const password = env.GMAIL_APP_PASSWORD?.replace(/\s/g, '');
    const to = env.NOTIFICATION_TO?.trim();
    if (!user || !password || !to) return 'disabled';
    const mailbox = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;
    if (!mailbox.test(user) || !mailbox.test(to)) return 'failed';
    transport ??= makeTransport({
      host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user, pass: password },
      connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 10000,
      logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true
    });
    const date = new Intl.DateTimeFormat('es-DO', {
      dateStyle: 'full', timeStyle: 'long', timeZone: 'America/Santo_Domingo'
    }).format(new Date());
    const result = await transport.sendMail({
      from: user, to,
      subject: 'Alguien empezó tu pequeña aventura 🌙',
      text: `Alguien pulsó el botón de inicio de este pequeño refugio.\n\n${date}\nZona: America/Santo_Domingo`
    });
    return result.accepted?.includes(to) ? 'sent' : 'failed';
  };
}
