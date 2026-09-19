import test from 'node:test';
import assert from 'node:assert/strict';
import { createGmailNotifier } from '../notifications.js';

const env = {
  GMAIL_USER: 'sender@example.com',
  GMAIL_APP_PASSWORD: 'abcd efgh ijkl mnop',
  NOTIFICATION_TO: 'to@example.com'
};

test('envía y elimina espacios de la contraseña de aplicación', async () => {
  let options;
  const notifier = createGmailNotifier(
    env,
    config => {
      options = config;
      return { sendMail: async () => ({ accepted: ['to@example.com'] }) };
    },
    { info(){}, warn(){}, error(){} }
  );
  assert.equal(await notifier(), 'sent');
  assert.equal(options.auth.pass, 'abcdefghijklmnop');
});

test('un error SMTP devuelve failed y no lanza la excepción', async () => {
  const notifier = createGmailNotifier(
    env,
    () => ({ sendMail: async () => { const error = new Error('no'); error.code='EAUTH'; throw error; } }),
    { info(){}, warn(){}, error(){} }
  );
  assert.equal(await notifier(), 'failed');
});

test('sin variables queda deshabilitado', async () => {
  const notifier = createGmailNotifier({}, () => { throw new Error('no debe crear transporte'); }, { info(){}, warn(){}, error(){} });
  assert.equal(await notifier(), 'disabled');
});
