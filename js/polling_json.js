/**
 * polling_json.js
 * JSON 파일 폴링 전용 클라이언트
 * 
 * 주요 기능:
 * - 지정된 JSON 파일을 주기적으로 폴링하여 내용 변화 감지
 * - 파일 내용이 변경되면 handleNewEvent 함수 호출 (있을 경우)
 * - 브라우저 캐시를 우회하여 최신 데이터 확인
 * - 폴링 시작/중지 제어 기능
 * 
 * 의존성:
 * - window.appSelect: 모니터링할 파일 선택 정보 (value 속성 필요)
 * - handleNewEvent(): 새 이벤트 처리 함수 (선택사항, 있으면 자동 호출)
 *   -> notification.js가 로드 되어 있으면 호출
 * 
 * 사용법:
 * 1. startPolling(): 폴링 시작 (즉시 첫 폴링 실행 후 주기적 반복)
 * 2. stopPolling(): 폴링 중지
 * 
 * 폴링 설정:
 * - 대상 경로: webhook/received_json/ 폴더
 * - 기본 파일: window.appSelect.value에서 설정된 파일
 * - 폴링 간격: 3초 (POLL_INTERVAL)
 * - 캐시 정책: no-store (항상 서버에서 최신 파일 가져오기)
 * 
 * @author Donkas Lab
 * @version 1.0
 */

// Expects these globals from index.html: appSelect

let lastText = null;
let pollTimer = null;
const POLL_INTERVAL = 3000; // ms

async function pollOnce() {
  try {
    let file = (window.appSelect && window.appSelect.value) ? window.appSelect.value : 'webhook_last_event_events.json';
    // Add webhook/received_json/ prefix if not already present
    if (!file.startsWith('webhook/received_json/')) {
      file = 'webhook/received_json/' + file;
    }
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
        if (typeof handleNewEvent === 'function') handleNewEvent(obj); // Initiate notification if available
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