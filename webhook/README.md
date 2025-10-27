# webhook/

This folder contains a lightweight webhook receiver and helper for the project.

Files:
- `webhook.php` - main receiver. Expects POST JSON with header `X-WEBHOOK-SIGNATURE: sha256=<hmac>`.
- `last_event.json` - stores the latest event payload (consumed by clients).
- `send_webhook_example.php` - example script showing how to POST to the webhook with HMAC signature.

How it works:
1. Your app (the code that performs the DB update) should POST a JSON payload to `https://your-domain.com/webhook/webhook.php`.
2. The webhook verifies the HMAC signature (sha256) using a shared secret and writes the payload to `last_event.json` atomically.
3. Clients (browser) poll `/webhook/last_event.json` periodically and react when the content changes.

Important configuration:
- Edit `webhook.php` and `send_webhook_example.php` to set a strong secret in place of `REPLACE_WITH_A_STRONG_SECRET`.
- Make sure `last_event.json` is writable by the webserver user.

Security recommendations:
- Use HTTPS so payloads and signatures are protected in transit.
- Keep the shared secret out of source control if possible (use hosting config or environment variables). On shared hosting, at least set a non-default secret.
- Validate payload contents before using them in sensitive operations.

Client changes:
- Update your polling client to fetch `/webhook/last_event.json` (instead of previous `_ssePush/last_event.json` if you used that path).

Example client polling snippet (JS):
```javascript
let last = null;
async function pollEvent() {
  try {
    const r = await fetch('/webhook/last_event.json', {cache: 'no-store'});
    if (!r.ok) return;
    const text = await r.text();
    if (!text) return;
    if (text !== last) {
      last = text;
      const data = JSON.parse(text);
      handleNewMessageFromPush(data);
    }
  } catch (e) {
    console.error('poll error', e);
  }
}
setInterval(pollEvent, 3000);
```

If you want, I can also update the client script in `_ssePush/push_notification.js` to poll this path directly.