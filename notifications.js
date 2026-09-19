import nodemailer from 'nodemailer';

// Solo usa variables del servidor. Nunca imprime credenciales ni la configuración SMTP.
export function createGmailNotifier(env = process.env, makeTransport = nodemailer.createTransport, log = console) {
  let transport;

  return async function sendAdventureStart() {
    const user = env.GMAIL_USER?.trim();
    const password = env.GMAIL_APP_PASSWORD?.replace(/\s/g, '');
    const to = env.NOTIFICATION_TO?.trim();

    if (!user || !password || !to) {
      log.warn?.('[notification] disabled: faltan variables de Gmail.');
      return 'disabled';
    }

    const mailbox = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;
    if (!mailbox.test(user) || !mailbox.test(to)) {
      log.error?.('[notification] failed: GMAIL_USER o NOTIFICATION_TO no tiene formato válido.');
      return 'failed';
    }

    transport ??= makeTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass: password },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
      logger: false,
      debug: false,
      disableFileAccess: true,
      disableUrlAccess: true
    });

    const date = new Intl.DateTimeFormat('es-DO', {
      dateStyle: 'full',
      timeStyle: 'long',
      timeZone: 'America/Santo_Domingo'
    }).format(new Date());

    try {
      const result = await transport.sendMail({
        from: user,
        to,
        subject: 'Alguien empezó tu pequeña aventura 🌙',
        text: `Alguien pulsó el botón de inicio de este pequeño refugio.\n\n${date}\nZona: America/Santo_Domingo`
      });

      const accepted = result.accepted?.some(address =>
        String(address).toLowerCase() === to.toLowerCase()
      );

      if (accepted) {
        log.info?.('[notification] sent: Gmail aceptó el correo.');
        return 'sent';
      }

      log.warn?.('[notification] failed: Gmail no confirmó el destinatario.');
      return 'failed';
    } catch (error) {
      const code = error?.code || 'UNKNOWN';
      const responseCode = error?.responseCode ? `/${error.responseCode}` : '';
      log.error?.(`[notification] failed: ${code}${responseCode}`);
      return 'failed';
    }
  };
}
