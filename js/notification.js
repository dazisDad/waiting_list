
/**
 * notification.js
 * Webhook 모니터링 및 브라우저 알림 클라이언트
 * 
 * 주요 기능:
 * - 지정된 JSON 파일을 주기적으로 폴링하여 변경사항 감지
 * - 파일 내용이 변경되면 브라우저 알림 표시
 * - Service Worker를 통한 백그라운드 알림 지원
 * - 웹 브라우저 Notification API 활용
 * 
 * 의존성:
 * - polling_json.js 리소스 필요 (폴링 기능)
 * 
 * 사용법:
 * 1. registerSW(): Service Worker 등록
 * 2. ensureNotificationPermission(): 알림 권한 확인/요청
 * 3. startPolling(): 폴링 시작
 * 4. stopPolling(): 폴링 중지
 * 
 * 폴링 대상: webhook/received_json/ 폴더 내의 JSON 파일들
 * 폴링 간격: 3초 (POLL_INTERVAL)
 * 
 * @author Donkas Lab
 * @version 1.0
 */

let swRegistration = null;

async function registerSW() {
  console.log('registerSW: start');
  if ('serviceWorker' in navigator) {
    try {
      swRegistration = await navigator.serviceWorker.register('js/sw.js');
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

console.log('notification.js loaded');