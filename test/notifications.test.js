import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGmailNotifier } from '../notifications.js';

test('Gmail SMTP message and TLS configuration, using only a fake transport',async()=>{
 let options,message,calls=0;
 const send=createGmailNotifier({GMAIL_USER:'sender@example.test',GMAIL_APP_PASSWORD:'test password only',NOTIFICATION_TO:'recipient@example.test'},config=>{
  options=config;
  return {sendMail:async data=>{calls++;message=data;return {accepted:['recipient@example.test']};}};
 });
 assert.equal(calls,0);assert.equal(await send(),'sent');assert.equal(calls,1);
 assert.equal(options.host,'smtp.gmail.com');assert.equal(options.port,465);assert.equal(options.secure,true);
 assert.equal(options.logger,false);assert.equal(options.debug,false);
 assert.equal(message.from,'sender@example.test');assert.equal(message.to,'recipient@example.test');
 assert.equal(message.subject,'Alguien empezó tu pequeña aventura 🌙');
 assert.ok(message.text.startsWith('Alguien pulsó el botón de inicio de este pequeño refugio.'));
 assert.ok(message.text.includes('America/Santo_Domingo'));assert.equal(message.html,undefined);
 assert.equal(message.attachments,undefined);
});
test('missing credentials do not create a transport or attempt any connection',async()=>{
 const send=createGmailNotifier({},()=>{throw new Error('Must never be called');});
 assert.equal(await send(),'disabled');
});
