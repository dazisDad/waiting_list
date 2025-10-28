// Cleaned webhook notification client (console-only logging)

// Expects these globals from index.html: startBtn, stopBtn, eventsList, appSelect

let pollTimer = null;
let lastText = null;
let swRegistration = null;
const POLL_INTERVAL = 3000; // ms

async function registerSW() {
  console.log('registerSW: start');
  if ('serviceWorker' in navigator) {
    try {
      swRegistration = await navigator.serviceWorker.register('sw.js');
      console.log('ServiceWorker registered', swRegistration);
    } catch (e) {
      console.log('registerSW: failed', e);
    }
  } else {
    console.log('registerSW: serviceWorker not supported');
  }
}

async function ensureNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('ensureNotificationPermission: Notification API not supported');
    return false;
  }
  console.log('ensureNotificationPermission: current permission=', Notification.permission);
  if (Notification.permission === 'granted') return true;
  const p = await Notification.requestPermission();
  console.log('ensureNotificationPermission: new permission=', p);
  return p === 'granted';
}

function showNotification(title, body) {
  console.log('showNotification:', title, body);
  if (swRegistration && swRegistration.showNotification) {
    try {
      swRegistration.showNotification(title, { body });
      console.log('showNotification: sent via service worker');
    } catch (e) {
      console.log('showNotification: service worker failed, fallback', e);
      if (Notification.permission === 'granted') new Notification(title, { body });
    }
  } else if (Notification.permission === 'granted') {
    new Notification(title, { body });
    console.log('showNotification: sent via Notification API');
  } else {
    console.log('showNotification: not permitted');
  }
}

function handleNewEvent(obj) {
  console.log('handleNewEvent: received', obj);
  const li = document.createElement('li');
  li.textContent = JSON.stringify(obj);
  if (window.eventsList) window.eventsList.insertBefore(li, window.eventsList.firstChild);

  const title = obj && obj.Id ? `Row ${obj.Id} changed` : 'Webhook update';
  const body = JSON.stringify(obj);
  showNotification(title, body);
}

async function pollOnce() {
  try {
    const file = (window.appSelect && window.appSelect.value) ? window.appSelect.value : 'last_event.json';
    console.log('pollOnce: fetching', file);
    const resp = await fetch(file, { cache: 'no-store' });
    if (!resp.ok) {
      console.log('pollOnce: fetch failed', resp.status);
      return;
    }
    const text = await resp.text();
    if (!text) return;

    if (text !== lastText) {
      lastText = text;
      try {
        const obj = JSON.parse(text);
        console.log('pollOnce: parsed JSON', obj);
        handleNewEvent(obj);
      } catch (e) {
        console.log('pollOnce: JSON parse error', e);
      }
    }
  } catch (e) {
    console.log('pollOnce: error', e);
  }
}

function startPolling() {
  if (pollTimer) return;
  pollOnce();
  pollTimer = setInterval(pollOnce, POLL_INTERVAL);
  console.log('startPolling: interval set, every', POLL_INTERVAL);
  
}

function stopPolling() {
  if (!pollTimer) return;
  clearInterval(pollTimer);
  pollTimer = null;
  console.log('stopPolling: stopped');
}


console.log('notification.js loaded');
