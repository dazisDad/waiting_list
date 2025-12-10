/**
 * api_init.js
 * 웨이트리스트 애플리케이션 핵심 초기화 및 API 통신 모듈
 * 
 * 주요 기능:
 * - Service Worker 등록 및 브라우저 알림 권한 관리
 * - ManyChat webhook 이벤트 폴링 시작
 * - ManyChat API 커스텀 필드 업데이트 기능
 * - HTTPS 요청 처리 및 버튼 상태 관리
 * 
 * 의존성:
 * - notification.js: registerSW(), ensureNotificationPermission()
 * - polling_json.js: startPolling()
 * - sender.js: sendHttpsRequest()
 * 
 * 초기화 흐름:
 * 1. Service Worker 등록
 * 2. 브라우저 알림 권한 확인/요청
 * 3. webhook_waitlist_events.json 파일 폴링 시작
 * 
 * API 통신:
 * - updateManyChatCustomFields(payload): ManyChat 커스텀 필드 업데이트
 *   - subscriber_id, fields 배열 포함한 payload 전송
 *   - sender.php를 통해 ManyChat API 호출
 * 
 * @author Donkas Lab
 * @version 1.0
 */

// Set monitoring target to waitlist webhook events
window.appSelect = { value: 'webhook_waitlist_events.json' };

(async () => {
  // Start polling for waitlist webhook events
  if (typeof registerSW === 'function') await registerSW();
  if (typeof ensureNotificationPermission === 'function') await ensureNotificationPermission();
  if (typeof startPolling === 'function') startPolling();
})();

// Reusable action function for button clicks
async function httpsRequestAction(btnId, inputDataSet) {
  const btn = document.getElementById(btnId);
  if (btn) btn.disabled = true;

  try {
    // Extract method from inputDataSet if provided (defaults to POST in sendHttpsRequest)
    const method = inputDataSet.method || 'POST';
    const result = await sendHttpsRequest(inputDataSet, method);

    // Handle the response as needed
    if (result.success !== false) {
      //console.log('Request successful:', result);
    } else {
      console.error('Request failed:', result.error);
    }

    return result;
  } finally {
    if (btn) btn.disabled = false;
  }
}

/**
 * Send a custom field update request to ManyChat API
 * @param {Object} payload - The payload containing subscriber_id, field_id, and field_value
 * @returns {Promise} The result of the HTTPS request
 */
async function updateManyChatCustomFields(btnId, payload) {
  const inputDataSet = {
    requestTo: 'manychat', // This will be used to lookup bearer token from .env
    url: 'https://api.manychat.com/fb/subscriber/setCustomFields', // Target API URL
    payload: payload
  };

  return await httpsRequestAction(btnId, inputDataSet);
}

async function resetManyChatLooping(btnId, subscriber_id) {
  const inputDataSet = {
    requestTo: 'manychat', // This will be used to lookup bearer token from .env
    url: 'https://api.manychat.com/fb/subscriber/setCustomFields', // Target API URL  
    payload: {
      subscriber_id: subscriber_id,
      fields: [
        { field_id: 13835108, field_value: 0 } // Reset "is_booking_loop" custom field to 0
      ]
    }
  };
  return await httpsRequestAction(btnId, inputDataSet);
}

async function executeFlow(btnId, flow_ns) {
  const inputDataSet = {
    requestTo: 'manychat', // This will be used to lookup bearer token from .env
    url: 'https://api.manychat.com/fb/sending/sendFlow', // Target API URL
    payload: flow_ns
  };

  return await httpsRequestAction(btnId, inputDataSet);
}

async function createSubscriber(btnId, payload) {
  const inputDataSet = {
    requestTo: 'manychat', // This will be used to lookup bearer token from .env
    url: 'https://api.manychat.com/fb/subscriber/createSubscriber', // Target API URL
    payload: payload
  };

  return await httpsRequestAction(btnId, inputDataSet);
}


async function getInfoByPhoneNumber(btnId, phoneNumber) {
  
  // field_id=13974135 is for "Phone Number" custom field
  const inputDataSet = {
    requestTo: 'manychat', // This will be used to lookup bearer token from .env
    url: `https://api.manychat.com/fb/subscriber/findByCustomField?field_id=13974135&field_value=${phoneNumber}`, // Target API URL
    method: 'GET', // Use GET method for subscriber info retrieval
    payload: {}
  };

  return await httpsRequestAction(btnId, inputDataSet);
}

async function getInfoBySubscriberId(btnId, subscriber_id) {
  
  // field_id=13974135 is for "Phone Number" custom field
  const inputDataSet = {
    requestTo: 'manychat', // This will be used to lookup bearer token from .env
    url: `https://api.manychat.com/fb/subscriber/getInfo?subscriber_id=${subscriber_id}`, // Target API URL
    method: 'GET', // Use GET method for subscriber info retrieval
    payload: {}
  };

  return await httpsRequestAction(btnId, inputDataSet);
}