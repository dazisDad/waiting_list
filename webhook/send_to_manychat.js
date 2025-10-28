// webhook/send_to_manychat.js
// Sends a POST to send_to_manychat.php which forwards the request to ManyChat API.

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('sendManychat');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    console.log('send_to_manychat: preparing request');

    const payload = {
      subscriber_id: 306159212,
      field_id: 13817158,
      field_value: 100
    };

    try {
      const resp = await fetch('send_to_manychat.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await resp.text();
      try {
        const data = JSON.parse(text);
        console.log('send_to_manychat: response', data);
      } catch (e) {
        console.log('send_to_manychat: non-json response', text);
      }
    } catch (e) {
      console.error('send_to_manychat: error', e);
    } finally {
      btn.disabled = false;
    }
  });
});
