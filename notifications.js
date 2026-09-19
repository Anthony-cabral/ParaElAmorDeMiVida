export function createGmailNotifier(env = process.env) {
  const url = env.MAIL_API_URL?.trim();
  const secret = env.MAIL_API_SECRET?.trim();

  return async function sendNotification() {
    if (!url || !secret) {
      console.error(
        '[notification] disabled: falta MAIL_API_URL o MAIL_API_SECRET'
      );
      return 'disabled';
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          secret
        }),
        redirect: 'follow',
        signal: AbortSignal.timeout(15000)
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        console.error(
          `[notification] failed: API HTTP ${response.status}`
        );
        return 'failed';
      }

      if (!data?.ok) {
        console.error(
          `[notification] failed: ${data?.error || 'API_ERROR'}`
        );
        return 'failed';
      }

      console.log(
        '[notification] sent: Google Apps Script aceptó el correo.'
      );

      return 'sent';

    } catch (error) {
      const reason =
        error?.cause?.code ||
        error?.code ||
        error?.name ||
        'API_ERROR';

      console.error(
        `[notification] failed: ${reason}`
      );

      return 'failed';
    }
  };
}