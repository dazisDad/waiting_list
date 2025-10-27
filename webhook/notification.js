// webhook/notification.js
// Polls /webhook/last_event.json every 3 seconds and shows notification when changed.

const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');
const eventsList = document.getElementById('events');
const logEl = document.getElementById('log');

let pollTimer = null;
let lastText = null;
let swRegistration = null;
const POLL_INTERVAL = 3000; // ms

function addLog(msg) {
  const t = new Date().toLocaleString();
  logEl.textContent += `[${t}] ${msg}\n`;
}

async function registerSW() {
  if ('serviceWorker' in navigator) {
    try {
      swRegistration = await navigator.serviceWorker.register('sw.js');
      addLog('ServiceWorker registered');
    } catch (e) {
      addLog('ServiceWorker register failed: ' + e.message);
    }
  }
}

async function ensureNotificationPermission() {
  if (!('Notification' in window)) {
    addLog('This browser does not support Notification API');
    return false;
  }
  if (Notification.permission === 'granted') return true;
  const p = await Notification.requestPermission();
  return p === 'granted';
}

function showNotification(title, body) {
  if (swRegistration && swRegistration.showNotification) {
    try {
      swRegistration.showNotification(title, { body, icon: '' });
    } catch (e) {
      // fallback
      if (Notification.permission === 'granted') new Notification(title, { body });
    }
  } else if (Notification.permission === 'granted') {
    new Notification(title, { body });
  } else {
    addLog('Notification not permitted');
  }
}

function handleNewEvent(obj) {
  const li = document.createElement('li');
  li.textContent = JSON.stringify(obj);
  eventsList.insertBefore(li, eventsList.firstChild);

  const title = obj && obj.Id ? `Row ${obj.Id} changed` : 'Webhook update';
  const body = JSON.stringify(obj);
  showNotification(title, body);
}

async function pollOnce() {
  try {
    const resp = await fetch('last_event.json', { cache: 'no-store' });
    if (!resp.ok) {
      addLog('poll fetch failed: ' + resp.status);
      return;
    }
    const text = await resp.text();
    if (!text) return;

    // avoid parsing if identical
    if (text !== lastText) {
      lastText = text;
      try {
        const obj = JSON.parse(text);
        handleNewEvent(obj);
      } catch (e) {
        addLog('invalid JSON in last_event.json');
      }
    }
  } catch (e) {
    addLog('poll error: ' + e.message);
  }
}

function startPolling() {
  if (pollTimer) return;
  pollOnce();
  pollTimer = setInterval(pollOnce, POLL_INTERVAL);
  startBtn.disabled = true;
  stopBtn.disabled = false;
  addLog('Polling started');
}

function stopPolling() {
  if (!pollTimer) return;
  clearInterval(pollTimer);
  pollTimer = null;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  addLog('Polling stopped');
}

startBtn.addEventListener('click', async () => {
  await registerSW();
  const ok = await ensureNotificationPermission();
  if (!ok) {
    addLog('Notification permission not granted');
  }
  startPolling();
});

stopBtn.addEventListener('click', stopPolling);

// Auto-start if desired (commented out)
// (async () => { await registerSW(); await ensureNotificationPermission(); startPolling(); })();
