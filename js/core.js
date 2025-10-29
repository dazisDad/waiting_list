// Set monitoring target to ManyChat webhook events
window.appSelect = { value: 'webhook_manychat_events.json' };

(async () => {
  // Start polling for manychat webhook events
  if (typeof registerSW === 'function') await registerSW();
  if (typeof ensureNotificationPermission === 'function') await ensureNotificationPermission();
  if (typeof startPolling === 'function') startPolling();
})();

// Reusable action function for button clicks
async function httpsRequestAction(btnId, inputDataSet) {
  const btn = document.getElementById(btnId);
  if (btn) btn.disabled = true;

  try {
    const result = await sendHttpsRequest(inputDataSet);

    // Handle the response as needed
    if (result.success !== false) {
      console.log('Request successful:', result);
    } else {
      console.error('Request failed:', result.error);
    }

    return result;
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Example usage and button handler
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('httpsRequestBtn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    // Example inputDataSet - customize as needed
    const inputDataSet = {
      requestTo: 'manychat', // This will be used to lookup bearer token from .env
      url: 'https://api.manychat.com/fb/subscriber/setCustomField', // Target API URL
      payload: {
        subscriber_id: 306159212,
        field_id: 13817158,
        field_value: 100
      }
    };

    httpsRequestAction('httpsRequestBtn', inputDataSet);
  });
});