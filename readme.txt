# Waitlist Application - Code Flow Documentation

## 목차
1. 질문 버튼 클릭 시 코드 진행
2. 고객 응답 후 Webhook 처리
3. Ready 버튼 클릭 시 코드 진행
4. Arrive/Cancel 버튼 클릭 시 코드 진행
5. 채팅 NEW 배지 시스템

================================================================================

## 1. 질문 버튼 클릭 시 코드 진행

### 📍 1-1. 사용자 액션
- 위치: waitlist.html (DOM)
- 사용자가 질문 버튼 클릭
- 버튼 onclick 속성: handleQuestion(booking_list_id, question, q_level, buttonId, questionId)

### 📍 1-2. handleQuestion() 함수 실행
- 파일: js/waitlist.js (line ~1715)
- 파라미터: booking_list_id, question, q_level, buttonId, questionId

**단계 A: ManyChat Payload 생성**
  - createManyChatPayload(booking_list_id, questionId) 호출
  - 반환값: {subscriber_id, fields: [{field_id, field_value}, ...]}
  - fields 배열 구성:
    * BLId: booking_list_id
    * BAC: 답변 개수
    * BQ: 질문 텍스트 (actualMsg)
    * BA1, BA2, BA3...: 답변 텍스트들 (actualMsg)

**단계 B: ManyChat Custom Fields 업데이트 (API 호출 #1)**
  - updateManyChatCustomFields(buttonId, manyChat_payload) 호출
  - 경로: js/api_init.js → httpsRequestAction() → sendHttpsRequest()
  - 최종: httpsRequest/sender.php → ManyChat API
  - API 엔드포인트: https://api.manychat.com/fb/subscriber/setCustomFields
  - 응답: {status: 'success'}

**단계 C: ManyChat Flow 실행 (API 호출 #2)**
  - questionnaire 테이블에서 flow_ns 조회
  - executeFlow(buttonId, {subscriber_id, flow_ns}) 호출
  - 경로: js/api_init.js → sendHttpsRequest() → sender.php
  - API 엔드포인트: https://api.manychat.com/fb/sending/sendFlow
  - 결과: 고객에게 ManyChat 메시지 발송
  - 응답: {status: 'success'}

**단계 D: 데이터베이스에 질문 기록**
  - questionnaire에서 question_prefix 조회
  - qnaText 생성: "Q: 질문내용" (prefix + question)
  - history_chat 테이블에 INSERT:
    * booking_list_id
    * dateTime: '2025-11-25 14:30:00'
    * qna: 'Q: 질문내용'
    * qna_id: questionId

**단계 E: q_level 업데이트**
  - booking_list 테이블 UPDATE
  - q_level을 질문의 q_level 값으로 변경

**단계 F: Ask Mode 종료 및 UI 정리**
  - askModeItems에서 booking_number 삭제
  - 모바일: expandedRowId = null
  - 데스크탑: selectedRowId = null
  - 결과: 버튼 행 닫힘

**단계 G: 로컬 데이터 업데이트**
  - chatlist 배열에 새 채팅 기록 추가
  - renderWaitlist() 호출하여 화면 새로고침

### 📊 흐름 요약
```
[클릭] 질문 버튼
   ↓
[JS] handleQuestion()
   ↓
[JS] createManyChatPayload() → payload 생성
   ↓
[API] ManyChat Custom Fields 업데이트 (sender.php → ManyChat)
   ↓
[API] ManyChat Flow 실행 (sender.php → ManyChat) → 메시지 발송
   ↓
[DB] history_chat INSERT (질문 저장)
   ↓
[DB] booking_list UPDATE (q_level)
   ↓
[JS] Ask mode 종료 + 버튼 행 닫기
   ↓
[UI] renderWaitlist() → 화면 업데이트
```

================================================================================

## 2. 고객 응답 후 Webhook 처리

### 📍 2-1. ManyChat Webhook 수신
- 파일: webhook/receiver.php
- 고객이 ManyChat에서 답변 버튼 클릭
- ManyChat이 webhook POST 요청 전송
- payload 구조:
  ```json
  {
    "id": "event_id",
    "subscriber": {"id": "123456"},
    "data": {
      "booking_list_id": "6",
      "booking_response": "2"
    }
  }
  ```

### 📍 2-2. Webhook 데이터 저장
- received_json/webhook_waitlist_events.json 파일에 저장
- isAppend=true: 배열에 추가 (최대 10개 유지)
- processor.php 호출

### 📍 2-3. processChatResponse() 실행
- 파일: webhook/processor.php (line ~695)

**단계 A: 마지막 질문 ID 조회**
  - SQL: SELECT qna_id FROM history_chat WHERE booking_list_id = ? ORDER BY Id DESC LIMIT 1
  - 결과: 가장 최근에 물어본 질문의 ID

**단계 B: 답변 선택지 조회**
  - SQL: SELECT answer_ids FROM ask_question_list WHERE Id = ?
  - 결과: "1,2,3" (쉼표로 구분된 답변 ID 문자열)
  - 파싱: [1, 2, 3] 배열로 변환

**단계 C: 답변 텍스트 및 badge 조회**
  - SQL: SELECT answer, badge FROM answer_list WHERE Id IN (1,2,3) ORDER BY FIELD(Id, 1,2,3)
  - 결과: [{answer: "답변1", badge: "badge1"}, ...]

**단계 D: Cancel 옵션 추가**
  - 배열 맨 앞에 추가:
    * answer_ids_array.unshift(0)
    * answer_texts.unshift('Cancel')
    * badge_arr.unshift(null)

**단계 E: 선택된 답변 추출**
  - booking_response 값을 인덱스로 사용
  - selected_answer_id = answer_ids_array[booking_response]
  - selected_answer = answer_texts[booking_response]
  - selected_badge = badge_arr[booking_response]

**단계 F: history_chat에 답변 저장**
  - SQL: INSERT INTO history_chat (booking_list_id, dateTime, qna) VALUES (?, ?, ?)
  - qna: "A: 선택된 답변"

**단계 G: badge 업데이트 (조건부)**
  - selected_badge가 있는 경우에만 실행
  - booking_list에서 badge1, badge2, badge3 조회
  - 비어있는 첫 번째 컬럼에 badge 저장
  - 순서: badge1 → badge2 → badge3

**단계 H: 반환값**
  - return [selected_answer_id, selected_answer, selected_badge]

### 📍 2-4. 클라이언트 폴링으로 감지
- 파일: js/polling_json.js
- 1초마다 webhook_waitlist_events.json 파일 체크
- 변경 감지 시 handleNewEvent() 호출
- waitlist, chatlist 업데이트
- renderWaitlist() → UI 자동 갱신

### 📊 흐름 요약
```
[고객] ManyChat에서 답변 선택
   ↓
[Webhook] receiver.php 수신
   ↓
[File] webhook_waitlist_events.json 저장
   ↓
[PHP] processChatResponse() 실행
   ↓
[DB] 마지막 질문 ID 조회 (history_chat)
   ↓
[DB] 답변 선택지 조회 (ask_question_list)
   ↓
[DB] 답변 텍스트 조회 (answer_list)
   ↓
[DB] history_chat INSERT (답변 저장)
   ↓
[DB] booking_list UPDATE (badge 저장)
   ↓
[Polling] 클라이언트가 1초마다 파일 체크
   ↓
[JS] handleNewEvent() → 데이터 업데이트
   ↓
[UI] renderWaitlist() → 화면 자동 갱신
```

================================================================================

## 3. Ready 버튼 클릭 시 코드 진행

### 📍 3-1. 사용자 액션
- Long-press 감지 필요 (0.5초 이상)
- handleReadyWithLongPress() → handleReadyInternal() 호출

### 📍 3-2. Ready 질문 자동 발송
- questionnaire에서 invokedWithBtn='Ready'인 질문 검색
- handleQuestion() 호출하여 질문 발송
- ManyChat API 호출 (Custom Fields + Flow)

### 📍 3-3. 데이터베이스 업데이트
- booking_list 테이블 UPDATE:
  * status = 'Ready'
  * q_level = 300
  * time_cleared = null

### 📍 3-4. 로컬 데이터 및 UI 업데이트
- waitlist 배열에서 해당 item 업데이트
- renderWaitlist() 호출

### 📊 흐름 요약
```
[Long-press] Ready 버튼
   ↓
[JS] isLongPress() → 0.5초 체크
   ↓
[JS] handleReadyInternal()
   ↓
[JS] questionnaire에서 Ready 질문 찾기
   ↓
[JS] handleQuestion() 호출 (질문 자동 발송)
   ↓
[API] ManyChat Custom Fields + Flow
   ↓
[DB] booking_list UPDATE (status='Ready', q_level=300)
   ↓
[UI] renderWaitlist() → 버튼 상태 변경
```

================================================================================

## 4. Arrive/Cancel 버튼 클릭 시 코드 진행

### 📍 4-1. handleArrive() / handleCancel() 실행
- 파일: js/waitlist.js

### 📍 4-2. 데이터베이스 업데이트
- booking_list 테이블 UPDATE:
  * status = 'Arrived' (또는 'Cancelled')
  * time_cleared = '2025-11-25 14:30:00'

### 📍 4-3. 로컬 데이터 업데이트
- waitlist 배열에서 해당 item 업데이트
- status, time_cleared 값 변경

### 📍 4-4. UI 업데이트 및 스크롤
- renderWaitlist() 호출
- Completed items가 상단으로 이동
- Active Queue가 화면에 보이도록 자동 스크롤

### 📍 4-5. Undo 카운트다운 시작
- startUndoAutoHideCountdown(booking_number) 호출
- 10초 카운트다운 시작
- Undo 버튼 텍스트: "Undo (9)", "Undo (8)", ...
- 10초 후 자동으로 Scroll to Active 버튼 클릭

### 📍 4-6. Undo 처리 (선택사항)
- Undo 버튼 클릭 시
- status를 'Waiting'으로 되돌림
- time_cleared = null
- 카운트다운 중지

### 📊 흐름 요약
```
[클릭] Arrive/Cancel 버튼
   ↓
[JS] handleArrive() / handleCancel()
   ↓
[DB] booking_list UPDATE (status, time_cleared)
   ↓
[JS] 로컬 waitlist 업데이트
   ↓
[UI] renderWaitlist() → Completed items 상단 이동
   ↓
[JS] startUndoAutoHideCountdown() → 10초 타이머
   ↓
[10초 후] 자동 스크롤 또는 Undo
```

================================================================================

## 5. 채팅 NEW 배지 시스템

### 📍 5-1. 배지 표시 대상
- **채팅 메시지 옆에만 배지 표시** (이름 옆 배지는 제거됨)
- 마지막 채팅 메시지에만 NEW 배지 표시
- Active 상태(Waiting/Ready)의 항목에만 표시
- Completed 상태(Arrived/Cancelled)에는 배지 미표시

### 📍 5-2. 배지 렌더링 로직
- 파일: js/waitlist.js (line ~2873)
- renderWaitlist() 함수 내부에서 실행

**단계 A: 조건 체크**
  - isLastMessage: 마지막 메시지인지 확인
  - item.status === 'Waiting' || item.status === 'Ready': Active 상태 확인
  - 두 조건 모두 만족해야 배지 HTML 생성

**단계 B: 배지 상태 결정**
  - chatBadgeHidden[subscriber_id] 체크
  - true: display: none (숨김)
  - false/undefined: display: inline (표시)

**단계 C: HTML 생성**
  ```javascript
  <span id="chat-new-badge-{subscriber_id}" 
        class="bg-red-500 text-white px-1 py-0.5 rounded font-bold ml-1" 
        style="font-size: 8px; display: inline/none;">
    NEW
  </span>
  ```

### 📍 5-3. 배지 숨김 트리거
- **행 클릭 시 배지 자동 숨김**
- 데스크탑: toggleMobileActions() → 행 선택 시
- 모바일: toggleMobileActions() → 행 확장 시

**처리 과정:**
  1. subscriber_id 조회
  2. chatBadgeHidden[subscriber_id] = true
  3. 날짜 기반 localStorage 저장
  4. DOM 직접 조작으로 즉시 숨김

### 📍 5-4. localStorage 관리 (날짜 기반)
- **키 형식**: `chatBadgeHidden_YYYY-MM-DD`
- **값 형식**: `{"subscriber_id": true/false, ...}`

**자동 정리 로직:**
  - 페이지 로딩 시마다 실행
  - 오늘 날짜의 데이터만 유지
  - 과거 날짜의 모든 `chatBadgeHidden_*` 항목 삭제
  - 같은 고객이 다음날 다시 예약해도 배지 정상 표시

**저장 시점:**
  1. handleNewEvent(): 새 부킹 시 배지 표시 상태 초기화
  2. 행 클릭 시: 배지 숨김 상태 저장

### 📍 5-5. 배지 표시 흐름
```
[초기 렌더링]
   ↓
모든 Active 항목의 마지막 채팅에 배지 생성
   ↓
chatBadgeHidden[subscriber_id] 체크
   ↓
- undefined/false → display: inline (표시)
- true → display: none (숨김)
   ↓
[사용자가 행 클릭]
   ↓
chatBadgeHidden[subscriber_id] = true
   ↓
localStorage.setItem('chatBadgeHidden_2025-11-25', {...})
   ↓
DOM 직접 조작으로 배지 숨김
```

### 📍 5-6. 날짜 변경 시 동작
```
[자정 이후 첫 페이지 로드]
   ↓
오늘 날짜: 2025-11-26
   ↓
localStorage 키: 'chatBadgeHidden_2025-11-26' 생성
   ↓
어제 키 'chatBadgeHidden_2025-11-25' 삭제
   ↓
chatBadgeHidden = {} (빈 객체)
   ↓
모든 배지 다시 표시 가능
```

### 📍 5-7. 특수 케이스 처리

**새 부킹 시 (handleNewEvent)**
  - Webhook으로 새 부킹 감지
  - delete chatBadgeHidden[subscriber_id] 실행
  - localStorage 업데이트
  - 배지가 표시되도록 보장

**완료 항목으로 변경 시**
  - status가 'Arrived' 또는 'Cancelled'로 변경
  - 렌더링 시 조건 미충족으로 배지 미생성
  - 완료된 항목에는 배지가 표시되지 않음

### 📊 전체 흐름 요약
```
[페이지 로드]
   ↓
localStorage에서 오늘 날짜 데이터 로드
   ↓
과거 날짜 데이터 자동 삭제
   ↓
renderWaitlist() 실행
   ↓
Active 항목의 마지막 채팅에 배지 렌더링
   ↓
[사용자 행 클릭] → 배지 숨김 + localStorage 저장
   ↓
[다음날] → localStorage 초기화 → 배지 다시 표시
```

================================================================================

## 주요 전역 변수

### 데이터 저장
- waitlist: 예약 목록 배열
- chatlist: 채팅 기록 배열
- questionnaire: 질문 목록 배열
- answers: 답변 목록 배열
- configuration: 설정 정보 배열

### UI 상태
- expandedRowId: 모바일에서 확장된 행 ID (숫자)
- selectedRowId: 데스크탑에서 선택된 행 ID (숫자)
- askModeItems: Ask mode가 활성화된 항목들 (Set, 문자열)
- questionPageIndex: 각 항목의 질문 페이지 인덱스 (객체)
- chatBadgeHidden: 채팅 배지 숨김 상태 (객체, {subscriber_id: true/false})

### 스크롤 관리
- isInitialScrollDone: 초기 스크롤 완료 여부
- initialScrollTop: Active Queue 시작 위치
- rowHeight: 단일 행 높이

### 타이머
- undoAutoHideTimers: Undo 자동 숨김 타이머
- undoCountdownIntervals: Undo 카운트다운 인터벌

================================================================================

## 주요 파일 구조

### JavaScript
- js/waitlist.js: 메인 로직, UI 렌더링, 이벤트 핸들러
- js/api_init.js: ManyChat API 호출 함수들
- js/sqlConnector.js: 데이터베이스 연결 및 쿼리
- js/polling_json.js: Webhook 파일 폴링
- js/notification.js: Service Worker 및 알림
- js/toastMsg.js: 토스트 메시지

### PHP
- webhook/receiver.php: Webhook 수신 및 파일 저장
- webhook/processor.php: 답변 처리 로직, DB 쿼리
- httpsRequest/sender.php: ManyChat API 프록시
- sql/db_config.php: 데이터베이스 설정
- sql/sql_selectWhere.php: SELECT 쿼리 처리
- sql/sql_updateArr.php: INSERT/UPDATE 쿼리 처리

### HTML/CSS
- waitlist.html: 메인 페이지
- css/waitlist.css: 스타일시트

================================================================================

## localStorage 관리

### chatBadgeHidden (날짜 기반)
- **키**: `chatBadgeHidden_YYYY-MM-DD` (예: `chatBadgeHidden_2025-11-25`)
- **값**: `{"subscriber_id_1": true, "subscriber_id_2": false, ...}`
- **자동 정리**: 페이지 로드 시 오늘 것만 유지, 과거 날짜는 삭제
- **목적**: 같은 고객이 다른 날짜에 예약해도 배지가 정상 표시되도록

### 관리 위치
- 저장: handleNewEvent(), toggleMobileActions()
- 로드: getServerSideUpdate()
- 정리: getServerSideUpdate() 내 localStorage cleanup 로직

================================================================================

## 버전 정보
- waitlist.js: v0.680
- processor.php: v0.647

Last Updated: 2025-11-25
