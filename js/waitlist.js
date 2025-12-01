const version = '0.733';
const isDebugging = false; // Set to true to enable log buffering for mobile debugging
const isResetLocalStorage = false; // Set to true to reset all badges on every page load
const isShowNewPaxBadge = false; // Set to true to show "New Pax" badge (false = only show Pax color change)

const trading_name = 'Donkas Lab';
const store_id = 'DL_Sunway_Geo';
const theme = 'dark';
const minPax_for_bigTable = 5;    // Minimum pax for big table highlight
const maxPax_for_smallTable = 0;  // Maximum pax for small table highlight
const scrollPositionTolerance = 5; // Tolerance (px) for determining if scrolled to Active Queue position

/**Flow types that can trigger handleNewEvent
 * Flow 1.2: New booking created via waitlist form
 * Flow 9.2: Chat response
 */
const flow_arr_that_can_trigger_handleNewEvent = [1.2, 1.9, 2.2, 9.2];

// Display version in header
document.addEventListener('DOMContentLoaded', () => {
  const versionDisplay = document.getElementById('version-display');
  if (versionDisplay) {
    versionDisplay.textContent = `(Ver. ${version})`;
  }
});

let updateCounter = 0;
let lastProcessedTimestamp = null; // Track last processed _force_update timestamp to prevent duplicate processing
// polling_json.js 파일의 pollOnce() 함수에서 호출함
function handleNewEvent(obj) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  //console.log('HANDLE_NEW_EVENT: Function called');
  
  // Increment counter immediately to prevent race conditions with multiple events
  const currentCounter = updateCounter++;
  
  if(currentCounter === 0) {
    console.log('HANDLE_NEW_EVENT: updateCounter =', currentCounter);
  } else if (currentCounter === 1) {
    console.log(`HANDLE_NEW_EVENT: Incremented updateCounter to:`, currentCounter);
    console.log('Future inccrements will not be logged and process events normally.');
  }
  //console.log('HANDLE_NEW_EVENT: Received obj:', obj);

  // Check if obj is an array and get the last element
  let lastItem = null;
  if (Array.isArray(obj) && obj.length > 0) {
    lastItem = obj[obj.length - 1];
    //console.log('HANDLE_NEW_EVENT: Array detected, using last item:', lastItem);
  } else if (obj && !Array.isArray(obj)) {
    lastItem = obj;
    console.log('HANDLE_NEW_EVENT: Single object detected:', lastItem);
  }

  // Validate booking_flow - only process if it matches flow_arr_that_can_trigger_handleNewEvent
  if (lastItem && lastItem.booking_flow !== undefined) {
    const flowMatches = flow_arr_that_can_trigger_handleNewEvent.some(
      flow => Math.abs(flow - lastItem.booking_flow) < 0.0001 // Float comparison with tolerance
    );

    if (!flowMatches) {
      console.log('HANDLE_NEW_EVENT: ⚠ booking_flow not in trigger list:', Number(lastItem.booking_flow).toFixed(1));
      //console.log('HANDLE_NEW_EVENT: Allowed flows:', flow_arr_that_can_trigger_handleNewEvent);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return;
    }

    console.log('HANDLE_NEW_EVENT: ✓ booking_flow matches trigger list:', Number(lastItem.booking_flow).toFixed(1));
    
    // Special debugging for flow 9.2 (chat response)
    /*
    if (Math.abs(lastItem.booking_flow - 9.2) < 0.0001) {
      console.log('HANDLE_NEW_EVENT: 💬 FLOW 9.2 DETECTED - Chat Response Processing');
      console.log('HANDLE_NEW_EVENT: 💬 Full lastItem object:', JSON.stringify(lastItem, null, 2));
      console.log('HANDLE_NEW_EVENT: 💬 booking_list_id:', lastItem.booking_list_id);
      console.log('HANDLE_NEW_EVENT: 💬 subscriber_id:', lastItem.subscriber_id);
      console.log('HANDLE_NEW_EVENT: 💬 booking_response:', lastItem.booking_response);
      console.log('HANDLE_NEW_EVENT: 💬 _session_id:', lastItem._session_id);
      console.log('HANDLE_NEW_EVENT: 💬 _force_update:', lastItem._force_update);
    }
      */
  }

  // Check if this is a critical flow (Chat Response) that happened recently (within 10 seconds)
  // This allows processing chat responses even on the first poll (e.g. immediately after refresh)
  const isCriticalFlow = lastItem && lastItem.booking_flow && Math.abs(lastItem.booking_flow - 9.2) < 0.0001;
  const eventTime = lastItem ? (lastItem._force_update || 0) : 0;
  const now = Date.now();
  // If _force_update is missing, we can't determine recency, so we skip to avoid duplicates on every refresh
  const isRecent = eventTime > 0 && (now - eventTime) < 10000; 

  if (currentCounter > 0 || (isCriticalFlow && isRecent)) {
    if (currentCounter === 0) {
      console.log('HANDLE_NEW_EVENT: ⚡ Processing critical recent event on first poll!');
    } else {
      //console.log('HANDLE_NEW_EVENT: Counter > 0, processing event...');
    }

    if (!lastItem || !lastItem.subscriber_id) {
      // No valid data, exit without notification
      console.log('HANDLE_NEW_EVENT: No valid data or subscriber_id, exiting');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return;
    }

    // Check if this is a duplicate event (same timestamp as last processed)
    if (lastItem._force_update && lastItem._force_update === lastProcessedTimestamp) {
      console.log('HANDLE_NEW_EVENT: ⚠ Duplicate event detected (same timestamp), skipping');
      console.log('HANDLE_NEW_EVENT: Timestamp:', lastItem._force_update);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return;
    }

    // Update last processed timestamp
    if (lastItem._force_update) {
      lastProcessedTimestamp = lastItem._force_update;
      //console.log('HANDLE_NEW_EVENT: Updated lastProcessedTimestamp to:', lastProcessedTimestamp);
    }

    // Check if this event was triggered by this client (same session ID)
    if (lastItem._session_id && lastItem._session_id === sessionId) {
      
      console.log('HANDLE_NEW_EVENT: ⚠ Event triggered by THIS client (session match), skipping notification/badge');
      //console.log('HANDLE_NEW_EVENT: Session ID:', lastItem._session_id);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      return;
    }

    /*
    console.log('HANDLE_NEW_EVENT: Valid lastItem with subscriber_id:', lastItem.subscriber_id);
    console.log('HANDLE_NEW_EVENT: Valid lastItem with booking_list_id:', lastItem.booking_list_id);
    console.log('HANDLE_NEW_EVENT: Session ID from event:', lastItem._session_id || 'none');
    */

    // Find booking_number from waitlist using booking_list_id (before server update)
    // Use == for flexible type comparison (string vs number)
    let bookingItemBefore = waitlist.find(item => item.booking_list_id == lastItem.booking_list_id);
    
    // Fallback: try finding by subscriber_id if not found by booking_list_id
    if (!bookingItemBefore && lastItem.subscriber_id) {
      //console.log('HANDLE_NEW_EVENT: booking_list_id lookup failed for OLD waitlist, trying subscriber_id:', lastItem.subscriber_id);
      bookingItemBefore = waitlist.find(item => item.subscriber_id == lastItem.subscriber_id);
    }

    //console.log('HANDLE_NEW_EVENT: Searched OLD waitlist for existing booking, found:', bookingItemBefore ? `#${bookingItemBefore.booking_number}` : 'NOT FOUND');
    if (bookingItemBefore) {
      /*
      console.log('HANDLE_NEW_EVENT: bookingItemBefore details:', {
        booking_list_id: bookingItemBefore.booking_list_id,
        booking_number: bookingItemBefore.booking_number,
        subscriber_id: bookingItemBefore.subscriber_id,
        customer_name: bookingItemBefore.customer_name
      });
      */
    }

    // Delay notification and UI update by 300ms
    setTimeout(async () => {
      //console.log('HANDLE_NEW_EVENT: 300ms timeout elapsed, starting server update...');

      // Refresh data from server first to get latest state
      await getServerSideUpdate();
      //console.log('HANDLE_NEW_EVENT: Server update completed');

      let title, body;

      // Find booking in REFRESHED waitlist (use == for flexible type comparison)
      let bookingItem = waitlist.find(item => item.booking_list_id == lastItem.booking_list_id);
      
      // Fallback: try finding by subscriber_id if not found by booking_list_id
      if (!bookingItem && lastItem.subscriber_id) {
        console.log('HANDLE_NEW_EVENT: booking_list_id lookup failed for REFRESHED waitlist, trying subscriber_id:', lastItem.subscriber_id);
        bookingItem = waitlist.find(item => item.subscriber_id == lastItem.subscriber_id);
      }

      console.log('HANDLE_NEW_EVENT: Searched REFRESHED waitlist for booking, found:', bookingItem);

      // Determine if this is a new booking or message update by checking if booking existed before
      /*
      console.log('HANDLE_NEW_EVENT: 🔍 DEBUG - Comparing booking_list_id:');
      console.log('HANDLE_NEW_EVENT:   bookingItemBefore exists?', !!bookingItemBefore);
      console.log('HANDLE_NEW_EVENT:   bookingItemBefore.booking_list_id:', bookingItemBefore?.booking_list_id, 'Type:', typeof bookingItemBefore?.booking_list_id);
      console.log('HANDLE_NEW_EVENT:   lastItem.booking_list_id:', lastItem.booking_list_id, 'Type:', typeof lastItem.booking_list_id);
      console.log('HANDLE_NEW_EVENT:   Are they equal? (==)', bookingItemBefore?.booking_list_id == lastItem.booking_list_id);
      */
      const isExistingBooking = !!bookingItemBefore;
      //console.log('HANDLE_NEW_EVENT: Is existing booking?', isExistingBooking);

      // Show notification for both new and updated items
      if (isExistingBooking && bookingItem) {
        //console.log('HANDLE_NEW_EVENT: ★ EXISTING BOOKING - Processing update');

        // UPDATED - existing booking received new message
        title = '[UPDATED] Waitlist';
        body = `Updated Booking #: ${bookingItem.booking_number}`;
        //console.log('HANDLE_NEW_EVENT: Showing notification:', title, body);
        showNotification(title, body);

        //console.log('HANDLE_NEW_EVENT: Found updated item in refreshed waitlist:', bookingItem);

        if (bookingItem && bookingItem.subscriber_id && bookingItem.booking_list_id) {
          //console.log(`HANDLE_NEW_EVENT: Unhiding badge for booking_list_id: ${bookingItem.booking_list_id}`);

          // Remove badge from hidden list to show it for new message (always unhide to trigger state change)
          const badgeKey = `${bookingItem.subscriber_id}_${bookingItem.booking_list_id}`;
          delete chatBadgeHidden[badgeKey];

          const today = new Date().toISOString().split('T')[0];
          localStorage.setItem(`chatBadgeHidden_${today}`, JSON.stringify(chatBadgeHidden));
          //console.log('HANDLE_NEW_EVENT: Saved to localStorage:', `chatBadgeHidden_${today}`);

          // Show badge via DOM immediately with appropriate text
          requestAnimationFrame(() => {
            const chatBadgeSpan = document.getElementById(`chat-new-badge-${bookingItem.booking_list_id}`);
            //console.log('HANDLE_NEW_EVENT: Looking for badge element with ID:', `chat-new-badge-${bookingItem.booking_list_id}`);
            //console.log('HANDLE_NEW_EVENT: Badge element found:', chatBadgeSpan);

            if (chatBadgeSpan) {
              // Check if this is a pax update (booking_flow 2.2)
              const isPaxUpdate = Math.abs(lastItem.booking_flow - 2.2) < 0.0001;
              const badgeText = isPaxUpdate ? 'New Pax' : 'NEW';
              
              console.log(`HANDLE_NEW_EVENT: 🏷️ BADGE - Flow: ${lastItem.booking_flow}, isPaxUpdate: ${isPaxUpdate}, badgeText: ${badgeText}`);

              // Save badge type to chatBadgeType for persistence across refreshes (Always save type)
              chatBadgeType[badgeKey] = badgeText;
              localStorage.setItem(`chatBadgeType_${today}`, JSON.stringify(chatBadgeType));

              // Only show badge DOM element if it's NOT a pax update OR if isShowNewPaxBadge is true
              if (!isPaxUpdate || isShowNewPaxBadge) {
                chatBadgeSpan.textContent = badgeText;
                chatBadgeSpan.style.display = 'inline';
                console.log('HANDLE_NEW_EVENT: 🏷️ BADGE - ✓ Badge set to visible:', badgeText);
              } else {
                console.log('HANDLE_NEW_EVENT: 🏷️ BADGE - ✗ New Pax badge suppressed by configuration (isShowNewPaxBadge=false)');
              }
              
              // Update Pax colors if this is a "New Pax" badge (even if badge is hidden)
              if (isPaxUpdate) {
                console.log('HANDLE_NEW_EVENT: 🏷️ BADGE - Updating Pax colors for booking_number:', bookingItem.booking_number);
                updatePaxColors(bookingItem.booking_number);
              }
            } else {
              console.log(`HANDLE_NEW_EVENT: 🏷️ BADGE - ✗ Badge element NOT FOUND in DOM (ID: chat-new-badge-${bookingItem.booking_list_id})`);
            }

            console.log('HANDLE_NEW_EVENT: Event processing completed');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          });
        } else {
          console.log('HANDLE_NEW_EVENT: ✗ Could not find updated item with required fields');
          console.log('HANDLE_NEW_EVENT: Event processing completed');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }
      } else {
        console.log('HANDLE_NEW_EVENT: ★ NEW BOOKING - Processing new registration');

        // New booking detected - find it in updated waitlist (use == for flexible type comparison)
        const newBookingItem = bookingItem; // Already found above after server update
        console.log('HANDLE_NEW_EVENT: Using booking item from refreshed waitlist:', newBookingItem);

        if (newBookingItem && newBookingItem.subscriber_id) {
          console.log(`HANDLE_NEW_EVENT: Found new booking - subscriber_id: ${newBookingItem.subscriber_id}, booking_list_id: ${newBookingItem.booking_list_id}`);

          // Use double requestAnimationFrame to ensure DOM is fully ready after renderWaitlist
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // Chat badge: Already showing by default, just ensure it's not in hidden list
              const badgeKey = `${newBookingItem.subscriber_id}_${newBookingItem.booking_list_id}`;
              console.log('HANDLE_NEW_EVENT: Ensuring badge is visible for key:', badgeKey);

              delete chatBadgeHidden[badgeKey];
              const today = new Date().toISOString().split('T')[0];
              localStorage.setItem(`chatBadgeHidden_${today}`, JSON.stringify(chatBadgeHidden));
              console.log('HANDLE_NEW_EVENT: Badge state saved to localStorage');

              // Update button state and trigger scroll to active after badge is displayed
              console.log('HANDLE_NEW_EVENT: Updating scroll button state...');
              updateScrollAndButtonState();

              // Use another requestAnimationFrame to ensure button state is updated before scrolling
              requestAnimationFrame(() => {
                if (scrollButton && !scrollButton.disabled) {
                  console.log('HANDLE_NEW_EVENT: Scroll button enabled, triggering scroll to active queue');
                  handleScrollToActive(true);
                } else {
                  console.log('HANDLE_NEW_EVENT: Scroll button is disabled, cannot scroll');
                }
                console.log('HANDLE_NEW_EVENT: Event processing completed');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              });
            });
          });

          title = '[NEW] Waitlist';
          body = `New Booking #: ${newBookingItem.booking_number}`;
          console.log('HANDLE_NEW_EVENT: Showing notification:', title, body);
          showNotification(title, body);
        } else {
          console.log('HANDLE_NEW_EVENT: ✗ Could not find new booking item in refreshed waitlist');
          console.log('HANDLE_NEW_EVENT: Event processing completed');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }
      }

    }, 300);
  } else {
    console.log('HANDLE_NEW_EVENT: Counter = 0, skipping (first poll)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
  // updateCounter increment moved to top of function
}

// Generate unique session ID for this client
const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
//console.log('SESSION_ID: Generated unique session ID:', sessionId);

let waitlist = [];
let chatlist = [];
let questionnaire = [];
let answers = [];
let configuration = [];
let chatBadgeHidden = {}; // { 'subscriber_id_booking_list_id': true/false } - tracks which chat NEW badges should be hidden
let chatBadgeType = {}; // { 'subscriber_id_booking_list_id': 'NEW' | 'New Pax' } - tracks badge text type

const color_codes = {
  theme: {
    dark: {
      // Background colors
      body_background: '#0f172a',        // body background (slate-950)
      container_background: '#1e293b',   // main container (slate-800) 
      row_active_background: '#0f172a',  // active row background (slate-950)
      row_completed_background: '#1e293b', // completed row background (slate-800)

      // Text colors
      text_primary: '#e2e8f0',          // primary text (slate-200)
      text_secondary: '#cbd5e1',        // secondary text (slate-300)
      text_muted: '#64748b',           // muted text (slate-500)
      text_active_name: '#fbbf24',     // active customer name (amber-400)
      text_completed_name: '#f1f5f9',  // completed customer name (slate-100)
      text_active_id: '#fbbf24',       // active booking ID (amber-400)  
      text_completed_id: '#e2e8f0',    // completed booking ID (slate-200)
      text_chat_default: '#94a3b8',    // default chat text (slate-400)
      text_chat_q200: '#60a5fa',       // q_level >= 200 chat (blue-400)
      text_chat_q300: '#34d399',       // q_level >= 300 chat (emerald-400)

      // Status colors
      status_waiting: '#fbbf24',        // Waiting status (amber-400)
      status_ready: '#34d399',          // Ready status (emerald-400) 
      status_arrived: '#8b5cf6',        // Arrived status (purple-500)
      status_cancelled: '#f87171',      // Cancelled status (red-400)

      // Button colors
      btn_ready: '#34d399',             // Ready button (emerald-400)
      btn_ask: '#60a5fa',               // Ask button (blue-400)
      btn_arrive: '#8b5cf6',            // Arrive button (purple-500)
      btn_cancel: '#f87171',            // Cancel button (red-400)
      btn_undo: '#fbbf24',              // Undo button (amber-400)
      btn_next: '#fbbf24',              // Next button (amber-400)
      btn_disabled: '#64748b',          // Disabled button (slate-500)

      // Highlight colors
      highlight_border: '#fbbf24',      // Row highlight border (amber-400)
      highlight_pax_big_bg: '#fef3c7',  // Large pax background (yellow-100)
      highlight_pax_big_text: '#1f2937', // Large pax text (slate-800)
      highlight_pax_small_border: '#fbbf24', // Small pax border (amber-400)
      highlight_tags_active_border: '#fbbf24', // Active highlight tags border (amber-400)
      highlight_tags_active_text: '#fbbf24',  // Active highlight tags text (amber-400)
      highlight_tags_completed_border: '#f1f5f9', // Completed highlight tags border (slate-100)
      highlight_tags_completed_text: '#f1f5f9',   // Completed highlight tags text (slate-100)

      // Scroll button colors
      scroll_btn_active_bg: '#fbbf24',   // Active scroll button background (amber-400)
      scroll_btn_active_text: '#1f2937', // Active scroll button text (slate-900)
      scroll_btn_disabled_bg: '#374151', // Disabled scroll button background (slate-700)
      scroll_btn_disabled_text: '#64748b', // Disabled scroll button text (slate-500)

      // Chat status colors
      chat_arrived: '#a855f7',          // Chat arrived status (purple-500)
      chat_cancelled: '#f87171',        // Chat cancelled status (red-400)

      // Background highlights
      webBooking_active_bg: '#374151',  // Active webBooking background (slate-700)
      webBooking_active_text: '#cbd5e1', // Active webBooking text (slate-300)
      webBooking_completed_bg: '#475569', // Completed webBooking background (slate-600)
      webBooking_completed_text: '#e2e8f0', // Completed webBooking text (slate-200)

      // Toast message
      toast_background: '#343A40',        // Toast message background

      highlight: ['#fbbf24', '#fbbf24', '#fbbf24']
    },
    light: {
      // Light theme colors would go here
    }
  }
};

const isEnableReadyAskBtn_for_webBooking = false; // 추후에 과금 가능한 상황에서 메세지 보낼 시 활성화

// --- Database Connection ---
// Connector 인스턴스 생성 (preProd 환경, urlPrefix는 waitlist.html 기준 상대 경로)
const connector = new Connector('preProd', '');

// 페이지 로딩 시 booking_list 테이블 데이터 가져오기
async function fetchBookingList(booking_from = null) {
  try {
    // Get today's date in YYYY-MM-DD format for filtering
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    // booking_list 테이블에서 조건에 맞는 데이터 가져오기
    let template, values, types;

    if (booking_from !== null) {
      // booking_from이 전달된 경우 - 3개 조건으로 검색
      template = 'store_id = ? AND booking_from = ? AND DATE(dine_dateTime) = ?';
      values = [store_id, booking_from, todayStr];
      types = 'sss'; // string, string, string
    } else {
      // booking_from이 null인 경우 - 2개 조건으로 검색
      template = 'store_id = ? AND DATE(dine_dateTime) = ?';
      values = [store_id, todayStr];
      types = 'ss'; // string, string
    }

    const result = await connector.selectWhere('waitlist', 'booking_list', {
      template: template,
      values: values,
      types: types
    });

    if (result.success && result.data) {

      // 날짜 필드들을 timestamp (밀리초)로 변환
      const processedData = result.data.map(item => {
        const processedItem = { ...item };

        // dine_dateTime 변환
        if (processedItem.dine_dateTime) {
          processedItem.dine_dateTime = new Date(processedItem.dine_dateTime).getTime();
        }

        // time_cleared 변환 (null일 수 있음)
        if (processedItem.time_cleared) {
          processedItem.time_cleared = new Date(processedItem.time_cleared).getTime();
        }

        // time_created 변환 (null일 수 있음)
        if (processedItem.time_created) {
          processedItem.time_created = new Date(processedItem.time_created).getTime();
        }

        return processedItem;
      });

      return processedData;
    } else {
      console.error('데이터 조회 실패:', result.error);
      return [];
    }
  } catch (error) {
    console.error('fetchBookingList 오류:', error);
    return [];
  }
}

// 페이지 로딩 시 history_chat 테이블 데이터 가져오기
async function fetchChatHistory() {
  try {
    // Get today's date in YYYY-MM-DD format for filtering
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    // history_chat 테이블에서 오늘 날짜의 데이터 가져오기
    const result = await connector.selectWhere('waitlist', 'history_chat', {
      template: 'DATE(dateTime) = ?',
      values: [todayStr],
      types: 's' // string
    });

    if (result.success && result.data) {

      // dateTime 필드를 timestamp (밀리초)로 변환
      const processedData = result.data.map(item => {
        const processedItem = { ...item };

        // dateTime 변환
        if (processedItem.dateTime) {
          processedItem.dateTime = new Date(processedItem.dateTime).getTime();
        }

        return processedItem;
      });

      return processedData;
    } else {
      console.error('데이터 조회 실패:', result.error);
      return [];
    }
  } catch (error) {
    console.error('fetchChatHistory 오류:', error);
    return [];
  }
}

// 페이지 로딩 시 ask_question_list 테이블 데이터 가져오기
async function fetchAskQList() {
  try {
    // ask_question_list 테이블에서 store_id로 필터링하여 데이터 가져오기
    const result = await connector.selectWhere('waitlist', 'ask_question_list', {
      template: 'store_id = ?',
      values: [store_id],
      types: 's' // string
    });

    if (result.success && result.data) {
      return result.data;
    } else {
      console.error('데이터 조회 실패:', result.error);
      return [];
    }
  } catch (error) {
    console.error('fetchAskQList 오류:', error);
    return [];
  }
}

// 페이지 로딩 시 ask_question_list 테이블 데이터 가져오기
async function fetchAnswerList() {
  try {
    // ask_question_list 테이블에서 store_id로 필터링하여 데이터 가져오기
    const result = await connector.selectWhere('waitlist', 'answer_list', {
      template: 'store_id = ?',
      values: [store_id],
      types: 's' // string
    });

    if (result.success && result.data) {
      return result.data;
    } else {
      console.error('데이터 조회 실패:', result.error);
      return [];
    }
  } catch (error) {
    console.error('fetchAnswerList 오류:', error);
    return [];
  }
}

// 페이지 로딩 시 ask_question_list 테이블 데이터 가져오기
async function fetchConfiguration() {
  try {
    // ask_question_list 테이블에서 store_id로 필터링하여 데이터 가져오기
    const result = await connector.selectWhere('waitlist', 'configuration', {
      template: 'store_id = ?',
      values: [store_id],
      types: 's' // string
    });

    if (result.success && result.data) {
      return result.data;
    } else {
      console.error('데이터 조회 실패:', result.error);
      return [];
    }
  } catch (error) {
    console.error('fetchAskQList 오류:', error);
    return [];
  }
}

// 고정 데이터 로드 함수 - 페이지 로딩 시 한번만 실행 (questionnaire 등)
async function loadStaticData() {
  try {
    //console.log('STATIC_DATA: Loading static data...');

    // 고정 데이터 병렬로 가져오기
    const [questionsData, answerData, configurationData] = await Promise.all([
      fetchAskQList(),
      fetchAnswerList(),
      fetchConfiguration()
    ]);
    /*
    console.log('STATIC_DATA: Static data loaded successfully');
    console.log('- Questions:', questionsData?.length || 0);
    console.log('- Answers:', answerData?.length || 0);
    console.log('- Configuration:', configurationData?.length || 0);
    */
    // 전역 변수 설정
    questionnaire = questionsData;
    answers = answerData;
    configuration = configurationData[0];

    //console.log(answers);
    //console.log(configuration);

    //console.log('STATIC_DATA: Static data load completed');

  } catch (error) {
    console.error('STATIC_DATA: Error loading static data:', error);
  }
}

// Shared promise to prevent multiple simultaneous server updates
let serverUpdatePromise = null;

// 서버 사이드 업데이트 함수 - 데이터베이스에서 실시간 변화하는 데이터를 가져와서 전역 변수를 업데이트하고 렌더링
// 페이지 로딩 시 초기화와 수동 데이터 새로고침 모두에 사용됨
async function getServerSideUpdate() {
  // If an update is already in progress, return the existing promise
  if (serverUpdatePromise) {
    console.log('SERVER_UPDATE: Update already in progress, joining existing request...');
    return serverUpdatePromise;
  }

  // Create a new promise for the update
  serverUpdatePromise = (async () => {
    try {
      console.log('SERVER_UPDATE: Getting server-side data, will render table once loaded...');

      // 실시간 변화하는 데이터만 병렬로 가져오기
      const [waitlistData, chatData] = await Promise.all([
        fetchBookingList(),
        fetchChatHistory()
      ]);

      /*
      console.log('SERVER_UPDATE: All data loaded successfully');
      console.log('- Waitlist items:', waitlistData?.length || 0);
      console.log('- Chat records:', chatData?.length || 0);
      */

      // 전역 변수 오버라이드 (실시간 데이터만)
      waitlist = waitlistData;
      chatlist = chatData;

      //console.log(waitlist);

      //console.log('SERVER_UPDATE: Global variables updated, re-rendering waitlist...');

      // Save current scroll position before re-rendering
      const currentScrollTop = waitlistContainer.scrollTop;

      // 새 데이터로 렌더링
      renderWaitlist();

      // Restore scroll position after render completes
      requestAnimationFrame(() => {
        waitlistContainer.scrollTop = currentScrollTop;
      });

      //console.log('SERVER_UPDATE: Update completed successfully');

    } catch (error) {
      console.error('SERVER_UPDATE: Error during server-side update:', error);
    } finally {
      // Clear the promise when done so future calls can start a new update
      serverUpdatePromise = null;
    }
  })();

  return serverUpdatePromise;
}

/**
 * Force update webhook JSON file to trigger polling detection.
 * This function calls update_webhook.php which modifies the webhook_waitlist_events.json file,
 * causing polling_json.js to detect the change and trigger handleNewEvent().
 * 
 * Use cases:
 * - Manual refresh trigger
 * - Testing event handling
 * - Force UI update after external changes
 * 
 * @param {number} subscriber_id - Optional subscriber_id to include in the webhook update
 * @returns {Promise<Object>} Response from PHP script
 */
async function forceUpdateWebhook(subscriber_id = null) {
  const phpUrl = 'webhook/received_json/update_webhook.php';

  console.log('🔄 FORCE_UPDATE: Calling update_webhook.php with session ID:', sessionId);
  if (subscriber_id) {
    console.log('🔄 FORCE_UPDATE: Including subscriber_id:', subscriber_id);
  }

  try {
    const payload = {
      session_id: sessionId,
      store_id: store_id
    };

    // Add subscriber_id to payload if provided
    if (subscriber_id !== null) {
      payload.subscriber_id = subscriber_id;
    }

    const response = await fetch(phpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      //console.log('✓ FORCE_UPDATE: Webhook file updated successfully', result);
      //console.log('✓ FORCE_UPDATE: Timestamp:', result.datetime);
    } else {
      console.error('✗ FORCE_UPDATE: Update failed:', result.message);
    }

    return result;

  } catch (error) {
    console.error('✗ FORCE_UPDATE: Error calling update_webhook.php:', error);
    return {
      success: false,
      message: error.message,
      timestamp: Date.now()
    };
  }
}


/**
 * Get filtered questions based on customer's pax count and q_level.
 * Only returns questions where minPax <= customerPax AND q_level >= customer's q_level.
 * If question has q_level_min, customer's q_level must be >= q_level_min.
 * Also excludes questions that have already been asked (exist in chatlist).
 * @param {number} customerPax - The number of people in the party
 * @param {number} booking_number - The booking number to lookup q_level from waitlist
 * @returns {Array} Filtered array of question objects
 */
function getFilteredQuestions(customerPax, booking_number) {
  // Find the customer's q_level and booking_list_id from waitlist
  const customer = waitlist.find(item => item.booking_number == booking_number);

  const customerQLevel = customer ? customer.q_level : 0;
  const bookingListId = customer ? customer.booking_list_id : null;

  // Get all questions from chat history for this booking_list_id
  const askedQuestions = new Set();
  let lastChatStartsWithQ = false;

  if (bookingListId) {
    const customerChats = chatlist
      .filter(chat => chat.booking_list_id == bookingListId)
      .sort((a, b) => a.dateTime - b.dateTime); // Sort by dateTime ascending

    // Check if the last chat message starts with 'Q:'
    if (customerChats.length > 0) {
      const lastChat = customerChats[customerChats.length - 1];
      lastChatStartsWithQ = lastChat.qna.startsWith('Q:');
    }

    customerChats.forEach(chat => {
      // Try to match question text from qna by checking against questionnaire items
      // For each questionnaire item, check if qna matches "prefix question" or just "question"
      questionnaire.forEach(q => {
        const prefix = q.question_prefix || '';
        const expectedText = prefix ? `${prefix} ${q.question}` : q.question;
        if (chat.qna === expectedText || chat.qna === q.question) {
          askedQuestions.add(q.question);
        }
      });
    });
  }

  const filtered = questionnaire.filter(q => {
    // Only include questions that are triggered by Ask button
    if (q.invokedWithBtn !== 'Ask') return false;

    // Check basic conditions
    if (q.minPax > customerPax) return false;
    if (q.maxPax && q.maxPax < customerPax) return false;
    if (q.q_level < customerQLevel) return false;
    if (askedQuestions.has(q.question)) return false;

    // If q_level_min exists, customer's q_level must be >= q_level_min
    if (q.q_level_min !== undefined && customerQLevel < q.q_level_min) {
      return false;
    }

    // If last chat starts with 'Q:', exclude questions with 'Q:' prefix (waiting for answer)
    if (lastChatStartsWithQ && q.question_prefix === 'Q:') {
      return false;
    }

    return true;
  });

  return filtered;
}

/**
 * Generate question button HTML with pagination (max 3 questions per page).
 * If 4+ questions, adds Next and Exit buttons.
 * @param {Array} filteredQuestions - Array of filtered question objects
 * @param {number} booking_number - The booking number
 * @param {string} customer_name - The customer name
 * @param {boolean} isMobile - Whether rendering for mobile
 * @returns {string} HTML string for question buttons
 */
function generateQuestionButtonsHTML(filteredQuestions, booking_number, customer_name, isMobile) {
  const MAX_QUESTIONS_PER_PAGE = 3;
  const currentPage = questionPageIndex[booking_number] || 0;
  const totalQuestions = filteredQuestions.length;
  const totalPages = Math.ceil(totalQuestions / MAX_QUESTIONS_PER_PAGE);

  // Get questions for current page
  const startIdx = currentPage * MAX_QUESTIONS_PER_PAGE;
  const endIdx = Math.min(startIdx + MAX_QUESTIONS_PER_PAGE, totalQuestions);
  const pageQuestions = filteredQuestions.slice(startIdx, endIdx);

  const baseClasses = isMobile
    ? 'action-button px-2 py-1 rounded-md border font-medium text-xs'
    : 'action-button px-2 py-1 rounded-md border font-medium text-xs';
  const btnClass = isMobile ? 'mobile-btn-ask' : 'btn-ask';

  // Generate question buttons
  const questionButtons = pageQuestions.map((q, index) => {
    // Mobile: flex-1 (auto width), Desktop: flex-1 (equal distribution)
    const flexClass = 'flex-1';
    const classes = `${baseClasses} ${btnClass} ${flexClass}`;
    // Find booking_list_id from waitlist using booking_number
    const customer = waitlist.find(item => item.booking_number == booking_number);
    const bookingListId = customer ? customer.booking_list_id : null;
    // Generate unique button ID based on question ID from database
    const buttonId = `question-btn-${booking_number}-${q.Id || index}`;
    const fnCall = `handleQuestion(${bookingListId}, '${q.question.replace(/'/g, "\\'")}', ${q.q_level}, '${buttonId}', ${q.Id || 'null'})`;
    const onclickHandler = isMobile
      ? `${fnCall}`
      : `${fnCall}; setTimeout(() => this.blur(), 100);`;
    return `<button id="${buttonId}" onclick="${onclickHandler}" class="${classes}">${q.question}</button>`;
  });

  // Desktop: Add dummy button if current page has only 2 questions (regardless of total question count)
  if (!isMobile && pageQuestions.length === 2) {
    const dummyButton = `<button class="${baseClasses} ${btnClass} flex-1 invisible">Dummy</button>`;
    questionButtons.push(dummyButton);
  }

  // Add Next and Exit buttons if there are 4+ questions
  if (totalQuestions >= 4) {

    const exitBaseClasses = isMobile
      ? 'action-button px-2 py-1 rounded-md border font-medium text-xs'
      : 'action-button px-2 py-1 rounded-md border font-medium text-xs';
    const exitBtnClass = isMobile ? 'mobile-btn-cancel' : 'btn-cancel';
    const nextBtnClass = isMobile ? 'mobile-btn-next' : 'btn-next';

    // Next button (navigates to next page, wraps around)
    const nextOnclick = isMobile
      ? `handleNextQuestion(${booking_number})`
      : `handleNextQuestion(${booking_number}); setTimeout(() => this.blur(), 100);`;
    const nextButton = `<button onclick="${nextOnclick}" class="${exitBaseClasses} ${nextBtnClass} flex-1">Next</button>`;

    // Exit button
    const exitOnclick = isMobile
      ? `handleExitAsk(${booking_number})`
      : `handleExitAsk(${booking_number}); setTimeout(() => this.blur(), 100);`;
    const exitButton = `<button onclick="${exitOnclick}" class="${exitBaseClasses} ${exitBtnClass} flex-1">Exit</button>`;

    // Wrap Next and Exit in a container div
    // Mobile: w-1/4 flex-none (fixed 1/4 width), Desktop: flex-1 (equal distribution)
    const containerFlex = isMobile ? 'w-1/4 flex-none' : 'flex-1';
    const nextExitContainer = `<div class="flex gap-1.5 ${containerFlex}">${nextButton}${exitButton}</div>`;
    questionButtons.push(nextExitContainer);
  } else {
    // Only Exit button if 3 or fewer questions
    const exitBaseClasses = isMobile
      ? 'action-button px-2 py-1 rounded-md border font-medium text-xs'
      : 'action-button px-2 py-1 rounded-md border font-medium text-xs';
    const exitBtnClass = isMobile ? 'mobile-btn-cancel' : 'btn-cancel';
    // Mobile: w-1/4 flex-none (fixed 1/4 width), Desktop: flex-1 (equal distribution)
    const exitFlexClass = isMobile ? 'w-1/4 flex-none' : 'flex-1';
    const exitOnclick = isMobile
      ? `handleExitAsk(${booking_number})`
      : `handleExitAsk(${booking_number}); setTimeout(() => this.blur(), 100);`;
    const exitButton = `<button onclick="${exitOnclick}" class="${exitBaseClasses} ${exitBtnClass} ${exitFlexClass}">Exit</button>`;
    questionButtons.push(exitButton);
  }

  return questionButtons.join('\n');
}

const waitlistBody = document.getElementById('waitlist-body');
const messageBox = document.getElementById('message-box');
const messageText = document.getElementById('message-text');
const scrollButton = document.getElementById('scroll-to-active-btn');
const waitlistContainer = document.getElementById('waitlist-container');

// Mobile viewport height tracking (handles address bar)
function updateViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Update on load and resize
updateViewportHeight();
window.addEventListener('resize', updateViewportHeight);
window.addEventListener('orientationchange', updateViewportHeight);

// =============================
// CONSOLE LOG CAPTURE FOR MOBILE DEBUGGING
// =============================
const logBuffer = [];
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Log version info first
if (isDebugging) {
  logBuffer.push(`[VERSION] waitlist.js version ${version}`);
  logBuffer.push(`[DEVICE] User Agent: ${navigator.userAgent}`);
  logBuffer.push(`[VIEWPORT] Window size: ${window.innerWidth}x${window.innerHeight}px`);
}
originalConsoleLog(`VERSION: ${version}`);

// Only override console methods if debugging is enabled
if (isDebugging) {
  console.log = function (...args) {
    logBuffer.push(`[LOG] ${args.join(' ')}`);
    originalConsoleLog.apply(console, args);
  };

  console.warn = function (...args) {
    logBuffer.push(`[WARN] ${args.join(' ')}`);
    originalConsoleWarn.apply(console, args);
  };

  console.error = function (...args) {
    logBuffer.push(`[ERROR] ${args.join(' ')}`);
    originalConsoleError.apply(console, args);
  };
}

// Function to copy all logs to clipboard
window.copyLogsToClipboard = function () {
  const allLogs = logBuffer.join('\n');
  navigator.clipboard.writeText(allLogs).then(() => {
    originalConsoleLog('✓ All logs copied to clipboard! (' + logBuffer.length + ' entries)');
    alert('로그가 클립보드에 복사되었습니다!\n총 ' + logBuffer.length + '개 항목');
  }).catch(err => {
    originalConsoleError('Failed to copy logs:', err);
    alert('클립보드 복사 실패. 콘솔에서 수동으로 복사해주세요.');
  });
};

// Add button to copy logs (invisible, triggered by triple-tap on header)
let tapCount = 0;
let tapTimer = null;
document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('h1');
  if (header) {
    header.addEventListener('click', () => {
      tapCount++;
      clearTimeout(tapTimer);

      if (tapCount === 3) {
        copyLogsToClipboard();
        tapCount = 0;
      } else {
        tapTimer = setTimeout(() => {
          tapCount = 0;
        }, 500);
      }
    });
  }
});

// Define the Tailwind class for maximum height
const MAX_HEIGHT_CLASS = 'max-h-[60vh]';

// Number of rows to display on screen (including completed items)
const displayedRows = 7;

// --- Global State Variables ---
let isInitialScrollDone = false;
let initialScrollTop = 0; // 초기 스크롤 탑 값 저장 변수 (Active Queue의 시작 위치를 추적)
let rowHeight = 0; // 단일 행의 높이 (Check-In/Cancel 시 initialScrollTop 업데이트에 사용)
let expandedRowId = null; // 현재 확장된 행의 ID (모바일용)
let selectedRowId = null; // 현재 선택된 행의 ID (데스크탑용)
let savedScrollPosition = null; // 행 선택 시 저장된 스크롤 위치
let askModeItems = new Set(); // Track which items are in "Ask mode" showing question buttons
let questionPageIndex = {}; // Track current question page for each booking_number (default 0)
let undoAutoHideTimers = {}; // Track auto-hide countdown timers for completed items
let undoCountdownIntervals = {}; // Track countdown interval IDs for updating button text

// --- Action Button Definitions ---
const actionButtonDefinitions = [
  {
    id: 'call',
    label: 'Call',
    color: '#34d399', // green
    textColor: '#34d399',
    isBackgroundFill: false,
    functionName: 'handleCall',
    showForStatus: ['Waiting', 'Ready'], // Show for these statuses
    mobileBtnClass: 'mobile-btn-call',
    desktopBtnClass: 'btn-call',
    isMobileOnly: true // Only show on mobile
  },
  {
    id: 'ready',
    label: 'Ready',
    color: '#34d399', // green
    textColor: '#34d399',
    isBackgroundFill: false,
    functionName: 'handleReady',
    showForStatus: ['Waiting', 'Ready'], // Show for these statuses
    mobileBtnClass: 'mobile-btn-ready',
    desktopBtnClass: 'btn-ready'
  },
  {
    id: 'ask',
    label: 'Ask',
    color: '#60a5fa', // blue
    textColor: '#60a5fa',
    isBackgroundFill: false,
    functionName: 'handleAsk',
    showForStatus: ['Waiting', 'Ready'],
    mobileBtnClass: 'mobile-btn-ask',
    desktopBtnClass: 'btn-ask'
  },
  {
    id: 'arrive',
    label: 'Arrive',
    color: '#8b5cf6', // purple
    textColor: '#8b5cf6', // purple text for outline style
    isBackgroundFill: false,
    functionName: 'handleArrive',
    showForStatus: ['Waiting', 'Ready'],
    mobileBtnClass: 'mobile-btn-arrive',
    desktopBtnClass: 'btn-arrive'
  },
  {
    id: 'cancel',
    label: 'Cancel',
    color: '#f87171', // red
    textColor: '#f87171',
    isBackgroundFill: false,
    functionName: 'handleCancel',
    showForStatus: ['Waiting', 'Ready'],
    mobileBtnClass: 'mobile-btn-cancel',
    desktopBtnClass: 'btn-cancel'
  },
  {
    id: 'undo',
    label: 'Undo',
    color: '#fbbf24', // yellow/amber
    textColor: '#fbbf24',
    isBackgroundFill: false,
    functionName: 'handleUndo',
    showForStatus: ['Arrived', 'Cancelled'],
    mobileBtnClass: 'mobile-btn-undo',
    desktopBtnClass: 'btn-undo'
  }
];

/**
 * Helper function to get buttons for a specific item status
 * Filters by isMobileOnly flag based on current platform
 */
function getButtonsForStatus(status, isMobile) {
  return actionButtonDefinitions.filter(btn => {
    // Check if button should be shown for this status
    if (!btn.showForStatus.includes(status)) return false;

    // If isMobileOnly is true, only show on mobile
    if (btn.isMobileOnly === true && !isMobile) return false;

    return true;
  });
}

/**
 * Helper function to generate button HTML
 */
function generateButtonHTML(buttonDef, booking_number, customer_name, isMobile) {
  const baseClasses = 'action-button px-3 py-1.5 rounded-md border font-medium text-sm';
  const btnClass = isMobile ? buttonDef.mobileBtnClass : buttonDef.desktopBtnClass;

  // Call button gets fixed small width with centered content, other buttons get equal flex distribution
  const flexClass = buttonDef.functionName === 'handleCall' ? 'flex-none w-12 flex items-center justify-center' : 'flex-1';
  let classes = `${baseClasses} ${btnClass} ${flexClass}`;

  // Special handling for Ask and Ready buttons
  let isDisabled = false;
  const item = waitlist.find(i => i.booking_number == booking_number);

  if (buttonDef.functionName === 'handleAsk') {
    if (item) {
      // Disable Ask button for WEB bookings (based on isEnableReadyAskBtn_for_webBooking setting) or when no questions available
      if (item.booking_from === 'WEB' && !isEnableReadyAskBtn_for_webBooking) {
        isDisabled = true;
        const disabledBtnClass = isMobile ? 'mobile-btn-disabled' : 'btn-disabled';
        classes = `${baseClasses} ${disabledBtnClass} ${flexClass}`;
      } else {
        const filteredQuestions = getFilteredQuestions(item.pax, booking_number);
        if (filteredQuestions.length === 0) {
          // No questions available - make button grey and disabled
          isDisabled = true;
          const disabledBtnClass = isMobile ? 'mobile-btn-disabled' : 'btn-disabled';
          classes = `${baseClasses} ${disabledBtnClass} ${flexClass}`;
        }
      }
    }
  } else if (buttonDef.functionName === 'handleReady') {
    if (item) {
      // Disable Ready button for WEB bookings (based on isEnableReadyAskBtn_for_webBooking setting) or when already ready
      if ((item.booking_from === 'WEB' && !isEnableReadyAskBtn_for_webBooking) || item.q_level >= 300) {
        isDisabled = true;
        const disabledBtnClass = isMobile ? 'mobile-btn-disabled' : 'btn-disabled';
        classes = `${baseClasses} ${disabledBtnClass} ${flexClass}`;
      }
    }
  }

  // Special handling for Ready button - use touchstart/mousedown instead of click for long press
  if (buttonDef.functionName === 'handleReady' && !isDisabled) {
    // Generate unique button ID for Ready button
    const buttonId = `ready-btn-${booking_number}`;
    // Ready button needs special event handling for long press
    const readyHandlerCall = `handleReadyWithLongPress(${booking_number}, '${customer_name}', event, '${buttonId}')`;
    const onTouchStart = `ontouchstart="${readyHandlerCall}"`;
    const onMouseDown = `onmousedown="${readyHandlerCall}"`;
    // Add blur for desktop after long press completes
    const preventClick = isMobile
      ? `onclick="event.preventDefault(); return false;"`
      : `onclick="event.preventDefault(); setTimeout(() => this.blur(), 100); return false;"`;

    return `<button id="${buttonId}" ${onTouchStart} ${onMouseDown} ${preventClick} class="${classes}">${buttonDef.label}</button>`;
  }

  // Standard button handling for all other buttons
  const needsEvent = ['handleAsk'].includes(buttonDef.functionName);
  const fnCall = needsEvent
    ? `${buttonDef.functionName}(${booking_number}, '${customer_name}', event)`
    : `${buttonDef.functionName}(${booking_number}, '${customer_name}')`;

  // Add blur on click to remove focus highlight (desktop only)
  // Also add event.stopPropagation() to prevent row click from interfering
  const onclickHandler = isMobile
    ? `event.stopPropagation(); ${fnCall}`
    : `event.stopPropagation(); ${fnCall}; setTimeout(() => this.blur(), 100);`;

  // If disabled, prevent onclick
  const finalOnclickHandler = isDisabled ? '' : `onclick="${onclickHandler}"`;
  const disabledAttr = isDisabled ? 'disabled' : '';

  // Special handling for Call button - show phone icon instead of text
  let buttonContent = buttonDef.label;
  if (buttonDef.functionName === 'handleCall') {
    buttonContent = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`;
  }

  return `<button ${finalOnclickHandler} ${disabledAttr} class="${classes}">${buttonContent}</button>`;
}

/**
 * Mobile: Toggle mobile action row for a specific item
 * Desktop: Toggle row highlight and exit Ask mode for other rows
 */
function toggleMobileActions(booking_number, event) {
  // Check for Pax Click (Mobile & Desktop)
  if (event) {
    const paxElement = event.target.closest('[data-pax-clickable="true"]');
    if (paxElement) {
      // Check if row is already selected
      const isMobile = window.innerWidth <= 768;
      const isSelected = isMobile ? (expandedRowId == booking_number) : (selectedRowId == booking_number);

      if (isSelected) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof changePax === 'function') {
          // Find booking_list_id from waitlist using booking_number
          const item = waitlist.find(i => i.booking_number == booking_number);
          const booking_list_id = item ? item.booking_list_id : null;
          if (booking_list_id) {
            changePax(booking_list_id);
          } else {
            console.error('Could not find booking_list_id for booking_number:', booking_number);
          }
        }
        return; // Stop function here, do not toggle row
      }
      // Row not selected. Allow execution to proceed to toggle row selection
    }
  }

  // Check if we're on mobile (screen width <= 768px)
  if (window.innerWidth > 768) {
    // Desktop: Toggle row highlight (persistent)
    if (event) {
      // If the click originated from a button, ignore it
      if (event.target.tagName === 'BUTTON' || event.target.closest('button')) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    }

    // Check if we need to re-render (Ask mode changes)
    const bookingNumberStr = String(booking_number);
    let needsRerender = false;

    // Exit Ask mode for other rows when clicking a different row
    const askModeItemsArray = Array.from(askModeItems);
    if (askModeItemsArray.length > 0 && !askModeItems.has(bookingNumberStr)) {
      askModeItems.clear();
      needsRerender = true;
    }

    // Toggle row selection for desktop
    if (selectedRowId === booking_number) {
      // Deselect current row
      selectedRowId = null;
      toggleRowSelection(booking_number, false);
      toggleChatHistoryDisplay(booking_number, false); // Show only last message

      // Stop auto-hide countdown if active
      stopUndoAutoHideCountdown(booking_number);

      // Exit Ask mode for deselected row if active
      if (askModeItems.has(bookingNumberStr)) {
        askModeItems.delete(bookingNumberStr);
        needsRerender = true;
      }

      console.log(`DESKTOP: Deselected row #${booking_number}`);
    } else {
      // Deselect previous row if any
      if (selectedRowId !== null) {
        toggleRowSelection(selectedRowId, false);
        toggleChatHistoryDisplay(selectedRowId, false);

        // Stop auto-hide countdown for previous row if active
        stopUndoAutoHideCountdown(selectedRowId);
      }

      // Select new row
      selectedRowId = booking_number;
      toggleRowSelection(booking_number, true);
      toggleChatHistoryDisplay(booking_number, true); // Show all messages

      // Hide chat NEW badge for this booking
      const selectedItem = waitlist.find(item => item.booking_number == booking_number);
      if (selectedItem && selectedItem.subscriber_id && selectedItem.booking_list_id) {
        const badgeKey = `${selectedItem.subscriber_id}_${selectedItem.booking_list_id}`;
        chatBadgeHidden[badgeKey] = true;
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(`chatBadgeHidden_${today}`, JSON.stringify(chatBadgeHidden));

        // Hide chat badge via DOM
        const chatBadgeSpan = document.getElementById(`chat-new-badge-${selectedItem.booking_list_id}`);
        if (chatBadgeSpan) {
          chatBadgeSpan.style.display = 'none';
          chatBadgeSpan.textContent = '';
        }
        
        // Update Pax colors after hiding badge
        updatePaxColors(booking_number);
      }

      console.log(`DESKTOP: Selected row #${booking_number}`);
    }

    // Re-render if Ask mode was changed
    if (needsRerender) {
      const currentScrollTop = waitlistContainer.scrollTop;
      renderWaitlist();
      requestAnimationFrame(() => {
        waitlistContainer.scrollTop = currentScrollTop;
      });
    }

    return;
  }

  // Mobile functionality (rest of the code remains the same)
  // Prevent event bubbling and default behavior
  if (event) {
    // If the click originated from a button, ignore it (shouldn't happen on mobile but safety check)
    if (event.target.tagName === 'BUTTON' || event.target.closest('button')) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  const mobileActionRowId = `mobile-actions-${booking_number}`;
  const existingMobileRow = document.getElementById(mobileActionRowId);
  const currentRow = document.querySelector(`tr[data-item-id="${booking_number}"]`);

  // If clicking the same row, close it
  if (expandedRowId === booking_number) {
    // Save scroll position before collapsing
    const scrollBeforeCollapse = waitlistContainer.scrollTop;
    const scrollHeightBefore = waitlistContainer.scrollHeight;

    // Calculate the target scroll position we want to maintain
    // This is the position of completed items (should stay at Active Queue start)
    const completedItemsCount = waitlist.filter(item => getSortPriority(item.status) === 0).length;
    const rows = waitlistBody.getElementsByTagName('tr');
    let targetScrollTop = 0;

    if (completedItemsCount > 0) {
      let completedRowsFound = 0;
      for (let i = 0; i < rows.length && completedRowsFound < completedItemsCount; i++) {
        const row = rows[i];
        if (!row.classList.contains('mobile-action-row') && !row.classList.contains('dummy-spacer-row')) {
          targetScrollTop += row.offsetHeight;
          completedRowsFound++;
        } else if (completedRowsFound < completedItemsCount) {
          targetScrollTop += row.offsetHeight;
        }
      }
    }

    // Remove mobile action row
    removeMobileActionRow(booking_number);

    // Remove row selection visual state
    toggleRowSelection(booking_number, false);

    // Collapse chat history
    toggleChatHistoryDisplay(booking_number, false);

    // Stop auto-hide countdown if active
    stopUndoAutoHideCountdown(booking_number);

    expandedRowId = null;

    // Recalculate and adjust dummy row after DOM changes to maintain scrollability
    requestAnimationFrame(() => {
      const scrollHeightAfter = waitlistContainer.scrollHeight;
      const heightDifference = scrollHeightBefore - scrollHeightAfter;

      // If we were at Active Queue position and DOM shrunk, we need to adjust dummy row
      if (scrollBeforeCollapse >= targetScrollTop - 30 && heightDifference > 0 && completedItemsCount > 0) {
        // Recalculate heights after collapse
        const currentRows = waitlistBody.getElementsByTagName('tr');
        let totalContentHeight = 0;
        for (let i = 0; i < currentRows.length; i++) {
          const row = currentRows[i];
          if (!row.classList.contains('dummy-spacer-row')) {
            totalContentHeight += row.offsetHeight;
          }
        }

        // Calculate completed items height
        let completedItemsHeight = 0;
        let completedRowsFound = 0;
        for (let i = 0; i < currentRows.length && completedRowsFound < completedItemsCount; i++) {
          const row = currentRows[i];
          if (!row.classList.contains('mobile-action-row') && !row.classList.contains('dummy-spacer-row')) {
            completedItemsHeight += row.offsetHeight;
            completedRowsFound++;
          } else if (completedRowsFound < completedItemsCount) {
            completedItemsHeight += row.offsetHeight;
          }
        }

        const activeItemsHeight = totalContentHeight - completedItemsHeight;
        const containerHeight = waitlistContainer.offsetHeight;
        const remainingSpace = containerHeight - activeItemsHeight;
        const newDummyRowHeight = Math.max(0, remainingSpace);

        // Update dummy row height
        const dummyElement = waitlistBody.querySelector('.dummy-spacer-row td');
        if (dummyElement) {
          dummyElement.style.height = `${newDummyRowHeight}px`;

          // Now restore scroll position
          requestAnimationFrame(() => {
            waitlistContainer.scrollTop = targetScrollTop;
          });
        }
      }
    });

    //console.log(`MOBILE: Collapsed row for item #${booking_number}`);
    return;
  }

  // If another row is expanded, close it first
  if (expandedRowId !== null) {
    removeMobileActionRow(expandedRowId);
    toggleRowSelection(expandedRowId, false);
    toggleChatHistoryDisplay(expandedRowId, false);

    // Stop auto-hide countdown for previous row if active
    stopUndoAutoHideCountdown(expandedRowId);

    // Exit Ask mode for the previous row
    const expandedRowIdStr = String(expandedRowId);
    if (askModeItems.has(expandedRowIdStr)) {
      askModeItems.delete(expandedRowIdStr);
    }
  }

  // Expand the clicked row
  expandedRowId = booking_number;

  // Add visual selection
  toggleRowSelection(booking_number, true);

  // Expand chat history
  toggleChatHistoryDisplay(booking_number, true);

  // Add mobile action row
  addMobileActionRow(booking_number);

  // Hide chat NEW badge for this booking
  const expandedItem = waitlist.find(item => item.booking_number == booking_number);
  if (expandedItem && expandedItem.subscriber_id && expandedItem.booking_list_id) {
    const badgeKey = `${expandedItem.subscriber_id}_${expandedItem.booking_list_id}`;
    chatBadgeHidden[badgeKey] = true;
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`chatBadgeHidden_${today}`, JSON.stringify(chatBadgeHidden));

    // Hide chat badge via DOM
    const chatBadgeSpan = document.getElementById(`chat-new-badge-${expandedItem.booking_list_id}`);
    if (chatBadgeSpan) {
      chatBadgeSpan.style.display = 'none';
      chatBadgeSpan.textContent = '';
    }
    
    // Update Pax colors after hiding badge
    updatePaxColors(booking_number);
  }

  //console.log(`MOBILE: Expanded row for item #${booking_number}`);
}

/**
 * For completed items (Check-In/Cancelled), returns object with completion time and duration.
 * For active items (Waiting/Called), shows current elapsed time from dine_dateTime.
 */
function formatElapsedTime(item) {
  if (item.time_cleared) {
    // Completed items - return completion time and duration separately for two-line display
    const completionTime = new Date(item.time_cleared);
    const timeString = completionTime.toLocaleTimeString('en-GB', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Calculate duration
    const durationMs = item.time_cleared - item.dine_dateTime;
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    let durationString;
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes > 0) {
        durationString = `${hours} hr ${remainingMinutes} min`;
      } else {
        durationString = `${hours} hr`;
      }
    } else if (minutes > 0) {
      durationString = `${minutes} min`;
    } else {
      durationString = `${seconds} sec`;
    }

    return { time: durationString, duration: '', isTwoLine: false };
  } else {
    // Active items - calculate current elapsed time
    const elapsedMs = Date.now() - item.dine_dateTime;
    const totalSeconds = Math.floor(elapsedMs / 1000);

    // Handle negative time (future webBookings) with simplified format
    if (totalSeconds < 0) {
      const absMinutes = Math.floor(Math.abs(totalSeconds) / 60);
      if (absMinutes >= 60) {
        const hours = Math.floor(absMinutes / 60);
        return { time: `-${hours} h`, duration: '', isTwoLine: false };
      } else {
        return { time: `-${absMinutes} min`, duration: '', isTwoLine: false };
      }
    }

    let minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, '0');

    let displayString;
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = String(minutes % 60).padStart(2, '0');
      displayString = `${hours}:${remainingMinutes}:${seconds}`;
    } else {
      displayString = `${minutes}:${seconds}`;
    }

    return { time: displayString, duration: '', isTwoLine: false };
  }
}

/**
 * Toggle chat history display for a specific booking without re-rendering
 */
function toggleChatHistoryDisplay(booking_number, showAll) {
  const row = document.querySelector(`tr[data-item-id="${booking_number}"]`);
  if (!row) return;

  const nameCell = row.querySelector('td:nth-child(2)');
  if (!nameCell) return;

  // Find all chat history divs (look for elements with arrow ↳)
  const chatDivs = Array.from(nameCell.querySelectorAll('div')).filter(div =>
    div.textContent.includes('↳')
  );

  if (chatDivs.length === 0) return;

  if (showAll) {
    // Show all chat history
    chatDivs.forEach(div => {
      div.style.display = '';
    });
  } else {
    // Show only the last chat message
    chatDivs.forEach((div, index) => {
      if (index === chatDivs.length - 1) {
        div.style.display = ''; // Show last message
      } else {
        div.style.display = 'none'; // Hide other messages
      }
    });
  }
}

/**
 * Add mobile action row without re-rendering
 */
function addMobileActionRow(booking_number) {
  const item = waitlist.find(i => i.booking_number == booking_number);
  if (!item) return;

  const mainRow = document.querySelector(`tr[data-item-id="${booking_number}"]`);
  if (!mainRow) return;

  // Remove existing mobile row if present
  const existingRow = document.getElementById(`mobile-actions-${booking_number}`);
  if (existingRow) {
    existingRow.remove();
  }

  // Get buttons for this item's status
  let buttonHTMLs;

  if (askModeItems.has(item.booking_number)) {
    const filteredQuestions = getFilteredQuestions(item.pax, item.booking_number);
    const questionButtonsHTML = generateQuestionButtonsHTML(filteredQuestions, item.booking_number, item.customer_name, true);
    buttonHTMLs = [questionButtonsHTML];
  } else {
    const buttons = getButtonsForStatus(item.status, true);
    buttonHTMLs = buttons.map(btnDef => generateButtonHTML(btnDef, item.booking_number, item.customer_name, true));
  }

  const actionButtons = buttonHTMLs.join('\n');

  const mobileRow = document.createElement('tr');
  mobileRow.id = `mobile-actions-${booking_number}`;
  mobileRow.className = 'mobile-action-row selected-action-row';
  mobileRow.innerHTML = `
    <td colspan="4" class="px-2 py-3">
      <div class="flex gap-1.5">
        ${actionButtons}
      </div>
    </td>
  `;

  mainRow.insertAdjacentElement('afterend', mobileRow);
}

/**
 * Remove mobile action row
 */
function removeMobileActionRow(booking_number) {
  const mobileRow = document.getElementById(`mobile-actions-${booking_number}`);
  if (mobileRow) {
    mobileRow.remove();
  }
}

/**
 * Toggle row selection visual state
 */
function toggleRowSelection(booking_number, selected) {
  const row = document.querySelector(`tr[data-item-id="${booking_number}"]`);
  if (!row) return;

  const paxElement = document.getElementById(`pax-${booking_number}`);

  if (selected) {
    row.classList.add('row-selected');
    if (paxElement) {
      paxElement.classList.add('pax-selected');
    }
  } else {
    row.classList.remove('row-selected');
    if (paxElement) {
      paxElement.classList.remove('pax-selected');
    }
  }
}

/**
 * Select a row in desktop mode (handles deselecting previous row and all visual states)
 * @param {number} booking_number - The booking number to select
 */
function toggleDesktopRowSelection(booking_number) {
  // Deselect previous row if any
  if (selectedRowId !== null && selectedRowId !== booking_number) {
    toggleRowSelection(selectedRowId, false);
    toggleChatHistoryDisplay(selectedRowId, false);

    // Stop auto-hide countdown for previous row if active
    stopUndoAutoHideCountdown(selectedRowId);
  }

  // Select new row
  selectedRowId = booking_number;
  toggleRowSelection(booking_number, true);
  toggleChatHistoryDisplay(booking_number, true); // Show all messages

  // Hide chat NEW badge for this booking
  const selectedItem = waitlist.find(item => item.booking_number == booking_number);
  if (selectedItem && selectedItem.subscriber_id && selectedItem.booking_list_id) {
    const badgeKey = `${selectedItem.subscriber_id}_${selectedItem.booking_list_id}`;
    chatBadgeHidden[badgeKey] = true;
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`chatBadgeHidden_${today}`, JSON.stringify(chatBadgeHidden));

    // Hide chat badge via DOM
    const chatBadgeSpan = document.getElementById(`chat-new-badge-${selectedItem.booking_list_id}`);
    if (chatBadgeSpan) {
      chatBadgeSpan.style.display = 'none';
      chatBadgeSpan.textContent = '';
    }
    
    // Update Pax colors after hiding badge
    updatePaxColors(booking_number);
  }

  console.log(`DESKTOP: Selected row #${booking_number}`);
}

/**
 * Update Pax display colors based on badge state
 * Called after badge is hidden to restore normal colors
 */
function updatePaxColors(booking_number) {
  const item = waitlist.find(i => i.booking_number == booking_number);
  if (!item) return;

  const badgeKey = `${item.subscriber_id}_${item.booking_list_id}`;
  const hasNewPaxBadge = chatBadgeType[badgeKey] === 'New Pax' && !chatBadgeHidden[badgeKey];
  const statusPriority = getSortPriority(item.status);
  const paxElement = document.getElementById(`pax-${booking_number}`);
  
  if (!paxElement) return;

  const paxLabel = paxElement.querySelector('span:first-child');
  const paxNumber = paxElement.querySelector('.pax-number');

  if (hasNewPaxBadge) {
    // Red colors for "New Pax" badge
    if (item.pax >= minPax_for_bigTable) {
      // 5명 이상: 빨간 배경 + 흰색 텍스트 (Pax: 레이블도 흰색)
      if (paxLabel) paxLabel.className = 'font-bold text-slate-800';
      if (paxNumber) {
        paxNumber.className = 'pax-number bg-red-500 text-slate-800 px-1 py-0.5 rounded font-bold';
        paxElement.className = paxElement.className.replace(/bg-\S+/g, '').replace(/text-\S+/g, '').trim() + ' bg-red-500 text-xs text-slate-800';
      }
    } else {
      // 4명 이하: 빨간 텍스트
      if (paxLabel) paxLabel.className = 'font-bold text-red-500';
      if (paxNumber) {
        paxNumber.className = 'pax-number pr-1 font-bold text-red-500';
      }
    }
  } else {
    // Normal colors (restore to default)
    if (paxLabel) paxLabel.className = 'font-bold';
    if (paxNumber) {
      if (item.pax >= minPax_for_bigTable) {
        if (statusPriority === 0) {
          paxNumber.className = 'pax-number bg-white text-slate-800 px-1 py-0.5 rounded font-bold';
          paxElement.className = paxElement.className.replace(/bg-\S+/g, '').trim() + ' bg-white text-slate-800';
        } else {
          paxNumber.className = 'pax-number bg-yellow-400 text-slate-800 px-1 py-0.5 rounded font-bold';
          paxElement.className = paxElement.className.replace(/bg-\S+/g, '').trim() + ' bg-yellow-400 text-slate-800';
        }
      } else {
        paxNumber.className = 'pax-number pr-1 font-bold';
      }
    }
  }
}

/**
 * Returns the appropriate icon and CSS class based on the status string.
 */
function getStatusIconAndClass(status) {
  let icon = '';
  let className = 'text-2xl font-bold';

  switch (status) {
    case 'Waiting':
    case 'Ready':
      icon = '◎';
      className += ' status-waiting';
      break;
    case 'Arrived':
      icon = '✔';
      className += ' status-checkedin';
      break;
    case 'Cancelled':
      icon = '✗';
      className += ' status-cancelled';
      break;
    default:
      icon = '❔';
      className += ' text-gray-500';
  }
  return { icon, className };
}

/**
 * Displays a message box (replacing alert()).
 */
function showMessageBox(message) {
  messageText.textContent = message;
  messageBox.classList.remove('hidden');
  messageBox.classList.add('flex');
}

/**
 * Closes the message box.
 */
function closeMessageBox() {
  messageBox.classList.add('hidden');
  messageBox.classList.remove('flex');
}

/**
 * Adds a temporary highlight effect to a row.
 * The highlight appears briefly and then fades out.
 */
function highlightRow(booking_number, shouldFlash = false) {
  requestAnimationFrame(() => {
    const rows = waitlistBody.getElementsByTagName('tr');
    const targetRow = Array.from(rows).find(row => {
      const idCell = row.querySelector('td:first-child');
      return idCell && idCell.textContent.trim() === booking_number.toString();
    });

    if (targetRow) {
      if (shouldFlash) {
        // Flash effect: temporary yellow border highlight
        targetRow.classList.add('button-click-highlight');

        setTimeout(() => {
          targetRow.classList.remove('button-click-highlight');
        }, 500);
      } else {
        // Toggle persistent yellow border highlight
        const isCurrentlyHighlighted = targetRow.classList.contains('row-persistent-highlight');

        // First, remove highlight from all other rows
        const allRows = waitlistBody.getElementsByTagName('tr');
        Array.from(allRows).forEach(row => {
          if (row !== targetRow) {
            row.classList.remove('row-persistent-highlight');
          }
        });

        if (isCurrentlyHighlighted) {
          // Remove highlight from this row
          targetRow.classList.remove('row-persistent-highlight');
        } else {
          // Add highlight to this row
          targetRow.classList.add('row-persistent-highlight');
        }
      }
    }
  });
}

/**
 * Adds a temporary flash effect to a button.
 */
function flashButton(event) {
  if (!event || !event.target) return;

  const button = event.target;
  const originalBgColor = button.style.backgroundColor;
  const originalColor = button.style.color;

  // Get button color from button definition
  let flashColor = '#8b5cf6'; // default
  if (button.classList.contains('btn-ready')) flashColor = '#34d399';
  else if (button.classList.contains('btn-ask')) flashColor = '#60a5fa';
  else if (button.classList.contains('btn-arrive')) flashColor = '#8b5cf6';
  else if (button.classList.contains('btn-cancel')) flashColor = '#f87171';
  else if (button.classList.contains('btn-undo')) flashColor = '#fbbf24';

  // Apply flash
  button.style.backgroundColor = flashColor;
  button.style.color = '#ffffff';

  // Remove flash after brief moment
  setTimeout(() => {
    button.style.backgroundColor = originalBgColor;
    button.style.color = originalColor;
  }, 200);
}

/**
 * Check if user performed a long press (0.5 seconds or more)
 * Optimized for both desktop (mouse) and mobile (touch) events
 * @param {Event} event - The mouse/touch event (mousedown, touchstart, or click)
 * @param {number} duration - Duration in milliseconds (default: 500ms)
 * @returns {Promise<boolean>} Promise that resolves to true if long press, false otherwise
 */
function isLongPress(event, duration = 500) {
  return new Promise((resolve) => {
    if (!event || !event.target) {
      resolve(false);
      return;
    }

    const button = event.target;
    let isPressed = true;
    let longPressTimer;
    let startX, startY;
    const moveThreshold = 10; // Allow small movement (10px)

    // Prevent default browser actions (context menu, text selection)
    event.preventDefault();

    // Visual feedback - darken button during press
    const originalOpacity = button.style.opacity;
    button.style.opacity = '0.7';

    // For touch events, get initial touch coordinates
    if (event.type === 'touchstart' && event.touches && event.touches[0]) {
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    } else if (event.type === 'mousedown') {
      startX = event.clientX;
      startY = event.clientY;
    }

    // Set timer for long press detection
    longPressTimer = setTimeout(() => {
      if (isPressed) {
        // Long press successful
        button.style.opacity = originalOpacity;
        cleanupListeners();
        resolve(true);
      }
    }, duration);

    // Handle movement (cancel long press if moved too much)
    const handleMove = (moveEvent) => {
      if (!isPressed) return;

      let currentX, currentY;
      if (moveEvent.type === 'touchmove' && moveEvent.touches && moveEvent.touches[0]) {
        currentX = moveEvent.touches[0].clientX;
        currentY = moveEvent.touches[0].clientY;
      } else if (moveEvent.type === 'mousemove') {
        currentX = moveEvent.clientX;
        currentY = moveEvent.clientY;
      } else {
        return;
      }

      const deltaX = Math.abs(currentX - startX);
      const deltaY = Math.abs(currentY - startY);

      if (deltaX > moveThreshold || deltaY > moveThreshold) {
        // Moved too much - cancel long press
        handleEnd();
      }
    };

    // Handle press end events
    const handleEnd = () => {
      if (!isPressed) return; // Already handled

      isPressed = false;
      button.style.opacity = originalOpacity;
      clearTimeout(longPressTimer);

      // Short press - not long enough
      cleanupListeners();
      resolve(false);
    };

    // Clean up all event listeners
    const cleanupListeners = () => {
      // Always try to remove both types of events to be safe
      // Mouse events
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('mousemove', handleMove);
      button.removeEventListener('mouseleave', handleEnd);

      // Touch events (remove with same options as added)
      document.removeEventListener('touchend', handleEnd, { passive: false });
      document.removeEventListener('touchcancel', handleEnd, { passive: false });
      document.removeEventListener('touchmove', handleMove, { passive: false });
    };

    // Add event listeners based on actual input type (not device capability)
    if (event.type === 'touchstart') {
      // Actual touch event - use touch events with passive: false to allow preventDefault
      document.addEventListener('touchend', handleEnd, { passive: false });
      document.addEventListener('touchcancel', handleEnd, { passive: false });
      document.addEventListener('touchmove', handleMove, { passive: false });
    } else {
      // Mouse event (mousedown) - use mouse events
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('mousemove', handleMove);
      button.addEventListener('mouseleave', handleEnd);
    }
  });
}

/**
 * Special wrapper for Ready button that handles long press detection
 * This function is called from touchstart/mousedown events on Ready buttons
 */
async function handleReadyWithLongPress(booking_number, customer_name, event, buttonId) {
  // Check for long press first
  const longPress = await isLongPress(event);
  if (!longPress) {
    console.log(`ACTION: Ready button press too short for ${customer_name} (#${booking_number}). Long press required.`);
    toastMsg('Long-press required for \'Ready\'', 2000);
    return; // Exit if not a long press
  }

  // Call the actual Ready handler
  await handleReadyInternal(booking_number, customer_name, event, buttonId);
}

/**
 * Handles customer actions. Updates status without changing buttons.
 */
async function handleReady(booking_number, customer_name, event) {
  // This is kept for backward compatibility with other callers
  await handleReadyInternal(booking_number, customer_name, event);
}

/**
 * Internal Ready handler that performs the actual ready action
 */
async function handleReadyInternal(booking_number, customer_name, event, buttonId = null) {
  console.log(`ACTION: Marking customer ${customer_name} (#${booking_number}) as ready.`);
  console.log(`INFO: [${customer_name}, #${booking_number}] 고객님께 테이블이 준비되었음을 알립니다.`);

  // Check if mobile - on desktop, highlight the row and flash button
  const isMobile = window.innerWidth <= 768;

  if (!isMobile) {
    // Desktop: Flash row (temporary) and flash button
    highlightRow(booking_number, true);
    flashButton(event);
  }

  const item = waitlist.find(item => item.booking_number == booking_number);

  if (!item) {
    console.error('Item not found for booking_number:', booking_number);
    return;
  }

  // Find the Ready button question from questionnaire
  const readyQuestion = questionnaire.find(q => q.invokedWithBtn === 'Ready');
  if (readyQuestion) {
    handleQuestion(
      parseInt(item.booking_list_id),
      readyQuestion.question,
      readyQuestion.q_level,
      buttonId, // Pass the Ready button ID
      readyQuestion.Id
    );
  } else {
    // Fallback to default question if no Ready question found in questionnaire
    console.warn('No Ready button question found in questionnaire, using fallback');
    handleQuestion(parseInt(item.booking_list_id), 'Table is Ready. Coming?', 300, buttonId, null);
  }

  // Update database and local data
  try {
    // 1. Update database first
    const updateResult = await connector.updateDataArr(
      'waitlist', // dbKey
      'booking_list', // tableName
      [{
        booking_list_id: item.booking_list_id, // Include the ID for WHERE condition
        status: 'Ready',
        time_cleared: null,
        q_level: 300
      }], // dataSetArr
      ['booking_list_id'], // whereSet - will match against booking_list_id
      'booking_list_id' // primaryKey - use booking_list_id as primary key
    );

    console.log('Database update result:', updateResult);

    if (!updateResult || !updateResult.success) {
      console.error('Database update failed:', updateResult);
      return; // Exit if database update failed
    }

    console.log('Database updated successfully for booking #' + booking_number);

    // 2. Trigger webhook update to notify polling system
    await forceUpdateWebhook(item.subscriber_id);

    // 3. Update local data after successful database update
    item.status = 'Ready';
    item.q_level = 300; // Update q_level to match database

    // 4. Save current scroll position before re-rendering
    const currentScrollTop = waitlistContainer.scrollTop;

    // 4. Re-render to immediately update button state
    renderWaitlist();

    // 5. Restore scroll position after render completes
    requestAnimationFrame(() => {
      waitlistContainer.scrollTop = currentScrollTop;
    });

  } catch (error) {
    console.error('Error updating database:', error);
    return; // Exit if there's an error
  }
}

function handleAsk(booking_number, customer_name, event) {
  //console.log(`ACTION: Asking customer ${customer_name} (#${booking_number}).`);
  //console.log(`INFO: [${customer_name}, #${booking_number}]에게 메시지/문의 창을 엽니다.`);

  // Check if mobile - on desktop, highlight the row (no flash button to avoid interference)
  const isMobile = window.innerWidth <= 768;

  if (!isMobile) {
    // Desktop: Select row and flash it
    toggleDesktopRowSelection(booking_number);
    highlightRow(booking_number, true);
  }

  // Toggle Ask mode for this item
  // CRITICAL: Convert to string for consistent Set comparison (waitlist.booking_number is string)
  const bookingNumberStr = String(booking_number);

  if (askModeItems.has(bookingNumberStr)) {
    askModeItems.delete(bookingNumberStr);
  } else {
    // Exit Ask mode for all other items before enabling for this one
    if (askModeItems.size > 0) {
      askModeItems.clear();
    }
    askModeItems.add(bookingNumberStr);
  }

  // Save current scroll position before re-rendering
  const currentScrollTop = waitlistContainer.scrollTop;

  // Re-render to show question buttons
  renderWaitlist();

  // Restore scroll position and chat history display after render completes
  requestAnimationFrame(() => {
    waitlistContainer.scrollTop = currentScrollTop;

    // Restore chat history expansion for desktop selected row
    if (!isMobile && selectedRowId !== null) {
      toggleChatHistoryDisplay(selectedRowId, true);
    }
  });

  // On mobile, re-open the action row after rendering
  if (isMobile) {
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      // Re-trigger mobile action row expansion
      const mainRow = document.querySelector(`tr[data-item-id="${booking_number}"]`);
      if (mainRow) {
        // Simulate the expansion logic
        expandedRowId = booking_number;
        const item = waitlist.find(i => i.booking_number == booking_number);
        if (!item) return;

        const mobileActionRowId = `mobile-actions-${booking_number}`;

        // Remove existing action row to prevent duplication
        const existingActionRow = document.getElementById(mobileActionRowId);
        if (existingActionRow) {
          existingActionRow.remove();
        }

        let buttonHTMLs;

        // Check if this item is in Ask mode
        if (askModeItems.has(item.booking_number)) {
          // Show question buttons + Exit button (mobile) - filtered by pax and q_level
          const filteredQuestions = getFilteredQuestions(item.pax, item.booking_number);
          const questionButtonsHTML = generateQuestionButtonsHTML(filteredQuestions, item.booking_number, item.customer_name, true);
          buttonHTMLs = [questionButtonsHTML];
        } else {
          // Show normal buttons
          const buttons = getButtonsForStatus(item.status, true);
          buttonHTMLs = buttons.map(btnDef => generateButtonHTML(btnDef, item.booking_number, item.customer_name, true));
        }

        const actionButtons = buttonHTMLs.join('\n');

        const mobileRow = document.createElement('tr');
        mobileRow.id = mobileActionRowId;
        mobileRow.className = 'mobile-action-row selected-action-row';
        mobileRow.innerHTML = `
              <td colspan="4" class="px-2 py-3">
                <div class="flex gap-1.5">
                  ${actionButtons}
                </div>
              </td>
            `;

        // Insert after the main row
        mainRow.insertAdjacentElement('afterend', mobileRow);
        mainRow.classList.add('row-selected');
        //console.log(`MOBILE: Re-opened action row for #${booking_number} after Ask mode toggle`);
      }
    });
  }
}

/**
 * Get ManyChat payload for sending message
 * @param {number} booking_list_id - The booking list ID
 * @param {number} questionId - The question ID from questionnaire
 * @returns {Object} ManyChat payload with subscriber_id, actualMsg, and answer_ids
 */
function createManyChatPayload(booking_list_id, questionId) {
  /**
   * Helper function to map field ID from configuration
   * @param {any|Array} value - The value(s) to be used as field_value. Can be a single value or an array.
   * @param {string} fid_name - The field name to look up in configuration (e.g., 'BLId', 'BQ', 'BA')
   * @returns {Object|Array} Object with field_id and field_value, or array of such objects if value is an array
   */
  function getFieldIdValueSet(value, fid_name) {
    // If value is an array, return array of field objects with sequential numbering
    if (Array.isArray(value)) {
      return value.map((item, index) => {
        const fieldKey = `fid_${fid_name}${index + 1}`; // BA1, BA2, BA3, etc.
        const field_id = configuration[fieldKey] ? parseInt(configuration[fieldKey]) : null;
        return {
          field_id: field_id,
          field_value: item
        };
      });
    }

    // Single value - return single object
    const fieldKey = `fid_${fid_name}`;
    const field_id = configuration[fieldKey] ? parseInt(configuration[fieldKey]) : null;
    return {
      field_id: field_id,
      field_value: value
    };
  }

  // Find subscriber_id from waitlist using booking_list_id
  const booking = waitlist.find(item => item.booking_list_id == booking_list_id);
  const subscriber_id = booking ? booking.subscriber_id : null;

  // Find question object from questionnaire using questionId
  const questionObj = questionnaire.find(q => q.Id == questionId);
  const question_prefix = questionObj ? questionObj.question_prefix : null;

  // Build fields based on question_prefix
  let fields = [];

  switch (question_prefix) {
    case 'Q:':
      // Find actualMsg and answer_ids from questionnaire using questionId
      const booking_question = questionObj ? questionObj.actualMsg : null;

      const answer_ids = questionObj ? questionObj.answer_ids : null;
      // Convert answer_ids string to array (e.g., '1,2,3' -> [1, 2, 3])
      const answer_ids_array = answer_ids ? answer_ids.split(',').map(id => parseInt(id.trim())) : [];

      // Find actualMsg for each answer_id from answers array
      const actualMsg_array = answer_ids_array.map(answerId => {
        const answerObj = answers.find(a => a.Id == answerId);
        return answerObj ? answerObj.actualMsg : null;
      }).filter(msg => msg !== null); // Remove null values if answer not found

      const booking_answer_count = answer_ids_array.length;

      // Build fields array with all ManyChat custom fields
      fields = [
        getFieldIdValueSet(booking_list_id, 'BLId'),
        getFieldIdValueSet(booking_answer_count, 'BAC'),
        getFieldIdValueSet(booking_question, 'BQ'),
        ...getFieldIdValueSet(actualMsg_array, 'BA') // Spread array of answer fields
      ];
      break;
    case 'i:':
      // Get actualMsg text from questionnaire
      const informed_actualMsg = questionObj ? questionObj.actualMsg : null;

      // Split actualMsg by '\n' to create array of WhatsApp text lines
      const whatsapp_text_arr = informed_actualMsg ? informed_actualMsg.split('LINEBREAK') : [];
      const whatsapp_text_count = whatsapp_text_arr.length;

      // Build fields array with WhatsApp text fields
      fields = [
        getFieldIdValueSet(booking_list_id, 'BLId'),
        getFieldIdValueSet(whatsapp_text_count, 'WTC'),
        ...getFieldIdValueSet(whatsapp_text_arr, 'WT') // Spread array of WhatsApp text fields (WT1, WT2, WT3, ...)
      ];
      break;


    default:
      // Default case: no fields to send
      fields = [];
      break;
  }

  // Filter out invalid fields (null field_id or null field_value)
  const validFields = fields.filter(field =>
    field &&
    field.field_id !== null &&
    field.field_id !== undefined &&
    field.field_value !== null &&
    field.field_value !== undefined
  );

  //console.log('createManyChatPayload: validFields count:', validFields.length, 'of', fields.length);

  return {
    subscriber_id,
    fields: validFields
  };
}

/**
 * Handles question button click - logs the question and inserts into database
 */
async function handleQuestion(booking_list_id, question, q_level = null, buttonId = null, questionId = null) {
  /*
  console.log('handleQuestion called with:', {
    booking_list_id,
    question,
    q_level,
    buttonId,
    questionId
  });
  */

  try {
    const manyChat_payload = createManyChatPayload(booking_list_id, questionId);
    //console.log('ManyChat payload prepared:', manyChat_payload);
    const manyChatResult = await updateManyChatCustomFields(buttonId, manyChat_payload);

    if (manyChatResult && manyChatResult.status === 'success') {
      console.log('✓ ManyChat API call successful - Custom fields updated for subscriber:', manyChat_payload.subscriber_id);

      // Get flow_ns from questionnaire using questionId
      const questionObj = questionnaire.find(q => q.Id == questionId);
      const flow_ns = questionObj && questionObj.flow_ns ? questionObj.flow_ns : null;

      if (flow_ns) {
        executeFlow(
          buttonId,
          {
            subscriber_id: manyChat_payload.subscriber_id,
            flow_ns // flow_ns: flow_ns 와 같음
          }
        );
        console.log('✓ ManyChat flow triggered:', flow_ns);
      } else {
        console.warn('⚠ No flow_ns found for questionId:', questionId);
      }
    } else {
      console.warn('⚠ ManyChat API call failed or returned unexpected response:', manyChatResult);
    }

    // Look up question_prefix from questionnaire if questionId is provided
    let prefix = '';

    if (questionId) {
      const questionObj = questionnaire.find(q => q.Id == questionId);

      if (questionObj && questionObj.question_prefix) {
        prefix = questionObj.question_prefix;
      }
    }
    // Format current time for database insertion
    const currentTime = new Date();
    const formattedTime = currentTime.getFullYear() + '-' +
      String(currentTime.getMonth() + 1).padStart(2, '0') + '-' +
      String(currentTime.getDate()).padStart(2, '0') + ' ' +
      String(currentTime.getHours()).padStart(2, '0') + ':' +
      String(currentTime.getMinutes()).padStart(2, '0') + ':' +
      String(currentTime.getSeconds()).padStart(2, '0');

    // Insert question into history_chat table with prefix (if any)
    const qnaText = prefix ? `${prefix} ${question}` : question;
    const updateResult = await connector.updateDataArr(
      'waitlist', // dbKey
      'history_chat', // tableName
      [{
        booking_list_id: booking_list_id,
        dateTime: formattedTime,
        qna: qnaText,
        qna_id: questionId || null
      }], // dataSetArr
    );

    if (!updateResult.success) {
      console.error('Database insert failed:', updateResult.error);
      return; // Exit if database insert failed
    }

    // Trigger webhook update to notify polling system
    const booking = waitlist.find(item => item.booking_list_id == booking_list_id);
    await forceUpdateWebhook(booking ? booking.subscriber_id : null);

    // Update q_level in booking_list table if provided
    if (q_level !== null) {
      const qLevelUpdateResult = await connector.updateDataArr(
        'waitlist', // dbKey
        'booking_list', // tableName
        [{
          booking_list_id: booking_list_id, // Include the ID for WHERE condition
          q_level: q_level,
        }], // dataSetArr
        ['booking_list_id'], // whereSet - will match against booking_list_id
        'booking_list_id' // primaryKey - use booking_list_id as primary key
      );

      if (qLevelUpdateResult.success) {
        // Update local waitlist data (use == for type flexibility)
        const item = waitlist.find(item => item.booking_list_id == booking_list_id);
        if (item) {
          item.q_level = q_level;
        }
      } else {
        console.error('Q-level database update failed:', qLevelUpdateResult.error);
      }
    }

    // ALWAYS execute: Add the new chat record to local chatlist for immediate UI update
    const newChatRecord = {
      booking_list_id: booking_list_id,
      dateTime: Date.now(), // Use current timestamp in milliseconds for local data
      qna: qnaText, // Use same qnaText as database insert
      Id: Date.now() // Use timestamp as temporary ID
    };
    chatlist.push(newChatRecord);

    // Exit Ask mode and close action buttons after question button click
    const item = waitlist.find(i => i.booking_list_id == booking_list_id);
    const isMobile = window.innerWidth <= 768;

    if (item) {
      const bookingNumberStr = String(item.booking_number);

      // Clear Ask mode
      askModeItems.delete(bookingNumberStr);

      // Clear row selection states BEFORE rendering
      if (isMobile) {
        // Mobile: clear expanded row state
        if (expandedRowId == item.booking_number) {
          expandedRowId = null;
        }
      } else {
        // Desktop: clear selected row state
        if (selectedRowId == item.booking_number) {
          selectedRowId = null;
        }
      }
    }

    // Save current scroll position before re-rendering
    const currentScrollTop = waitlistContainer.scrollTop;

    // ALWAYS execute: Re-render to show the new question in chat history
    renderWaitlist();

    // Restore scroll position after render completes
    requestAnimationFrame(() => {
      waitlistContainer.scrollTop = currentScrollTop;
    });

  } catch (error) {
    console.error('handleQuestion error:', error);
  }
}

/**
 * Navigate to next page of questions
 */
function handleNextQuestion(booking_number) {
  console.log(`ACTION: Next question page for booking #${booking_number}`);
  const item = waitlist.find(i => i.booking_number == booking_number);
  if (!item) return;

  const filteredQuestions = getFilteredQuestions(item.pax, booking_number);
  const MAX_QUESTIONS_PER_PAGE = 3;
  const totalPages = Math.ceil(filteredQuestions.length / MAX_QUESTIONS_PER_PAGE);

  // Increment page index and wrap around
  const currentPage = questionPageIndex[booking_number] || 0;
  questionPageIndex[booking_number] = (currentPage + 1) % totalPages;

  console.log(`QUESTION_PAGE: #${booking_number} moved to page ${questionPageIndex[booking_number]} of ${totalPages}`);

  // Save current scroll position before re-rendering
  const currentScrollTop = waitlistContainer.scrollTop;

  // Re-render to show next page of questions
  renderWaitlist();

  // Restore scroll position after render completes
  requestAnimationFrame(() => {
    waitlistContainer.scrollTop = currentScrollTop;
  });
}

/**
 * Exits Ask mode and returns to normal button view
 */
function handleExitAsk(booking_number) {
  console.log(`ACTION: Exiting Ask mode for booking #${booking_number}`);
  const bookingNumberStr = String(booking_number);
  askModeItems.delete(bookingNumberStr);
  // Reset question page when exiting Ask mode
  delete questionPageIndex[booking_number];

  // Save current scroll position before re-rendering
  const currentScrollTop = waitlistContainer.scrollTop;

  renderWaitlist();

  // Restore scroll position after render completes
  requestAnimationFrame(() => {
    waitlistContainer.scrollTop = currentScrollTop;
  });
}

/**
 * Handles Call button - initiates phone call to customer
 */
function handleCall(booking_number, customer_name) {
  console.log(`ACTION: Calling customer ${customer_name} (#${booking_number})`);

  const item = waitlist.find(item => item.booking_number == booking_number);

  if (!item) {
    console.error(`Customer #${booking_number} not found in waitlist`);
    toastMsg('Customer not found', 2000);
    return;
  }

  if (!item.customer_phone) {
    console.warn(`No phone number available for customer ${customer_name} (#${booking_number})`);
    toastMsg('No phone number available', 2000);
    return;
  }

  // Create tel: URI and initiate call
  const telUri = `tel:+${item.customer_phone}`;
  console.log(`Initiating call to +${item.customer_phone}`);

  // Open phone dialer
  window.location.href = telUri;
}

/**
 * Handles customer actions (Arrive). Updates initialScrollTop and performs scroll.
 */
async function handleArrive(booking_number, customer_name) {
  console.log(`🟣 ACTION: handleArrive called for ${customer_name} (#${booking_number})`);
  console.log('🔍 DEBUG: Looking for item with booking_number:', booking_number, 'Type:', typeof booking_number);
  console.log('🔍 DEBUG: Waitlist booking_numbers:', waitlist.map(i => ({ num: i.booking_number, type: typeof i.booking_number })));

  const item = waitlist.find(item => item.booking_number == booking_number);
  console.log('🔍 DEBUG: Item found?', item ? 'YES' : 'NO', item);
  let shouldScroll = false;

  if (item) {
    // Check if item was active before status change (Waiting or Ready)
    const wasActive = item.status === 'Waiting' || item.status === 'Ready';

    try {
      // 1. Update database first
      const currentTime = new Date();
      const formattedTime = currentTime.getFullYear() + '-' +
        String(currentTime.getMonth() + 1).padStart(2, '0') + '-' +
        String(currentTime.getDate()).padStart(2, '0') + ' ' +
        String(currentTime.getHours()).padStart(2, '0') + ':' +
        String(currentTime.getMinutes()).padStart(2, '0') + ':' +
        String(currentTime.getSeconds()).padStart(2, '0');

      console.log('🔵 DB_UPDATE: Calling updateDataArr for Arrive...', {
        booking_list_id: item.booking_list_id,
        booking_number: booking_number,
        status: 'Arrived',
        time_cleared: formattedTime
      });

      const updateResult = await connector.updateDataArr(
        'waitlist', // dbKey
        'booking_list', // tableName
        [{
          booking_list_id: item.booking_list_id, // Include the ID for WHERE condition
          status: 'Arrived',
          time_cleared: formattedTime
        }], // dataSetArr
        ['booking_list_id'], // whereSet - will match against booking_list_id
        'booking_list_id' // primaryKey - use booking_list_id as primary key
      );

      console.log('Database update result:', updateResult);

      if (!updateResult || !updateResult.success) {
        console.error('Database update failed:', updateResult);
        return; // Exit if database update failed
      }

      console.log('Database updated successfully for booking #' + booking_number);

      // 2. Trigger webhook update to notify polling system
      await forceUpdateWebhook(item.subscriber_id);

      // 3. Update local data after successful database update
      item.status = 'Arrived';
      item.time_cleared = Date.now(); // Set time_cleared when arrived

      if (wasActive && rowHeight > 0) {
        // 3. Update initialScrollTop by moving up one row's height to show the cleared item
        initialScrollTop -= rowHeight;
        console.log(`SCROLL_UPDATE: Arrive. Subtracting rowHeight (${rowHeight.toFixed(2)}px) from initialScrollTop.`);
        console.log(`SCROLL_UPDATE: New initialScrollTop: ${initialScrollTop.toFixed(2)}px`);
        shouldScroll = true;
      }
    } catch (error) {
      console.error('Error updating database:', error);
      return; // Exit if there's an error
    }
  }

  // 4. Rerender after successful database update and local data update
  renderWaitlist();

  // Start auto-hide countdown for this completed item
  startUndoAutoHideCountdown(booking_number);

  // 5. Always scroll to show the completed item
  requestAnimationFrame(() => {
    // Find the position of the just completed item in the DOM
    const rows = waitlistBody.getElementsByTagName('tr');
    let targetScrollTop = 0;
    let itemFound = false;

    // Look for the row that contains the just completed item
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const idCell = row.querySelector('td:first-child div:first-child');

      if (idCell && idCell.textContent.trim() === booking_number.toString()) {
        // Found the just completed item - scroll to show it at the top
        itemFound = true;
        break;
      }
      targetScrollTop += row.offsetHeight;
    }

    if (itemFound) {
      waitlistContainer.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
      console.log(`SCROLL_ACTION_RAF: Arrive scroll to show item #${booking_number} at ${targetScrollTop.toFixed(2)}px`);

      // Add highlight effect to the completed item
      setTimeout(() => {
        const targetRow = Array.from(rows).find(row => {
          const idCell = row.querySelector('td:first-child');
          return idCell && idCell.textContent.trim() === booking_number.toString();
        });

        if (targetRow) {
          targetRow.classList.add('arrive-highlight');
          console.log(`HIGHLIGHT: Added purple highlight to Arrive item #${booking_number}`);

          // Remove highlight after 1 second
          setTimeout(() => {
            targetRow.classList.remove('arrive-highlight');
            targetRow.classList.add('fade-out-highlight');

            // Clean up fade-out class
            setTimeout(() => {
              targetRow.classList.remove('fade-out-highlight');
            }, 700);
          }, 1000);
        }
      }, 300); // Small delay to ensure smooth scroll is started
    } else {
      console.log(`SCROLL_ACTION_RAF: Could not find item #${booking_number} in DOM`);
    }
  });
}

/**
 * Handles customer actions (Cancel). Updates initialScrollTop and performs scroll.
 */
async function handleCancel(booking_number, customer_name) {
  console.log(`🔴 ACTION: handleCancel called for ${customer_name} (#${booking_number})`);
  console.log('🔍 DEBUG: Looking for item with booking_number:', booking_number, 'Type:', typeof booking_number);
  console.log('🔍 DEBUG: Waitlist booking_numbers:', waitlist.map(i => ({ num: i.booking_number, type: typeof i.booking_number })));

  const item = waitlist.find(item => item.booking_number == booking_number);
  console.log('🔍 DEBUG: Item found?', item ? 'YES' : 'NO', item);
  let shouldScroll = false;

  if (item) {
    // Check if item was active before status change (Waiting or Ready)
    const wasActive = item.status === 'Waiting' || item.status === 'Ready';

    try {
      // 1. Update database first
      const currentTime = new Date();
      const formattedTime = currentTime.getFullYear() + '-' +
        String(currentTime.getMonth() + 1).padStart(2, '0') + '-' +
        String(currentTime.getDate()).padStart(2, '0') + ' ' +
        String(currentTime.getHours()).padStart(2, '0') + ':' +
        String(currentTime.getMinutes()).padStart(2, '0') + ':' +
        String(currentTime.getSeconds()).padStart(2, '0');

      console.log('🔵 DB_UPDATE: Calling updateDataArr for Cancel...', {
        booking_list_id: item.booking_list_id,
        booking_number: booking_number,
        status: 'Cancelled',
        time_cleared: formattedTime
      });

      const updateResult = await connector.updateDataArr(
        'waitlist', // dbKey
        'booking_list', // tableName
        [{
          booking_list_id: item.booking_list_id, // Include the ID for WHERE condition
          status: 'Cancelled',
          time_cleared: formattedTime
        }], // dataSetArr
        ['booking_list_id'], // whereSet - will match against booking_list_id
        'booking_list_id' // primaryKey - use booking_list_id as primary key
      );

      console.log('Database update result:', updateResult);

      if (!updateResult || !updateResult.success) {
        console.error('Database update failed:', updateResult);
        return; // Exit if database update failed
      }

      console.log('Database updated successfully for booking #' + booking_number);

      // 2. Trigger webhook update to notify polling system
      await forceUpdateWebhook(item.subscriber_id);

      // 3. Update local data after successful database update
      item.status = 'Cancelled';
      item.time_cleared = Date.now(); // Set time_cleared when cancelling

      if (wasActive && rowHeight > 0) {
        // 3. Update initialScrollTop by moving up one row's height to show the cleared item
        initialScrollTop -= rowHeight;
        console.log(`SCROLL_UPDATE: Cancel. Subtracting rowHeight (${rowHeight.toFixed(2)}px) from initialScrollTop.`);
        console.log(`SCROLL_UPDATE: New initialScrollTop: ${initialScrollTop.toFixed(2)}px`);
        shouldScroll = true;
      }
    } catch (error) {
      console.error('Error updating database:', error);
      return; // Exit if there's an error
    }
  }

  // 4. Rerender after successful database update and local data update
  renderWaitlist();

  // Start auto-hide countdown for this completed item
  startUndoAutoHideCountdown(booking_number);

  // 5. Always scroll to show the completed item
  requestAnimationFrame(() => {
    // Find the position of the just completed item in the DOM
    const rows = waitlistBody.getElementsByTagName('tr');
    let targetScrollTop = 0;
    let itemFound = false;

    // Look for the row that contains the just completed item
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const idCell = row.querySelector('td:first-child div:first-child');

      if (idCell && idCell.textContent.trim() === booking_number.toString()) {
        // Found the just completed item - scroll to show it at the top
        itemFound = true;
        break;
      }
      targetScrollTop += row.offsetHeight;
    }

    if (itemFound) {
      waitlistContainer.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
      console.log(`SCROLL_ACTION_RAF: Cancel scroll to show item #${booking_number} at ${targetScrollTop.toFixed(2)}px`);

      // Add highlight effect to the completed item
      setTimeout(() => {
        const targetRow = Array.from(rows).find(row => {
          const idCell = row.querySelector('td:first-child');
          return idCell && idCell.textContent.trim() === booking_number.toString();
        });

        if (targetRow) {
          targetRow.classList.add('cancel-highlight');
          console.log(`HIGHLIGHT: Added red highlight to Cancel item #${booking_number}`);

          // Remove highlight after 1 second
          setTimeout(() => {
            targetRow.classList.remove('cancel-highlight');
            targetRow.classList.add('fade-out-highlight');

            // Clean up fade-out class
            setTimeout(() => {
              targetRow.classList.remove('fade-out-highlight');
            }, 700);
          }, 1000);
        }
      }, 300); // Small delay to ensure smooth scroll is started
    } else {
      console.log(`SCROLL_ACTION_RAF: Could not find item #${booking_number} in DOM`);
    }
  });
}

/**
 * Start auto-hide countdown for a completed item.
 * After 10 seconds, automatically trigger the scroll to active button.
 */
function startUndoAutoHideCountdown(booking_number) {
  // Clear any existing timer/interval for this item
  stopUndoAutoHideCountdown(booking_number);

  let secondsRemaining = 10;

  // Update Undo button text immediately
  updateUndoButtonText(booking_number, secondsRemaining);

  // Update button text every second
  undoCountdownIntervals[booking_number] = setInterval(() => {
    secondsRemaining--;
    if (secondsRemaining > 0) {
      updateUndoButtonText(booking_number, secondsRemaining);
    }
  }, 1000);

  // Auto-click scroll button after 10 seconds
  undoAutoHideTimers[booking_number] = setTimeout(() => {
    console.log(`AUTO_HIDE: Auto-hiding completed item #${booking_number} after 10 seconds`);
    stopUndoAutoHideCountdown(booking_number);

    // Click the scroll to active button with auto-trigger flag
    if (scrollButton && !scrollButton.disabled) {
      handleScrollToActive(true); // Pass true to indicate auto-trigger
    }
  }, 10000);

  console.log(`AUTO_HIDE: Started countdown for item #${booking_number}`);
}

/**
 * Stop auto-hide countdown for a specific item
 */
function stopUndoAutoHideCountdown(booking_number) {
  if (undoAutoHideTimers[booking_number]) {
    clearTimeout(undoAutoHideTimers[booking_number]);
    delete undoAutoHideTimers[booking_number];
  }

  if (undoCountdownIntervals[booking_number]) {
    clearInterval(undoCountdownIntervals[booking_number]);
    delete undoCountdownIntervals[booking_number];
  }

  // Reset button text to "Undo"
  const undoButtons = document.querySelectorAll(`button.btn-undo[onclick*="${booking_number}"], button.mobile-btn-undo[onclick*="${booking_number}"]`);
  undoButtons.forEach(button => {
    button.textContent = 'Undo';
  });
}

/**
 * Update Undo button text to show countdown
 */
function updateUndoButtonText(booking_number, secondsRemaining) {
  // Update all undo buttons for this booking_number
  const undoButtons = document.querySelectorAll(`button.btn-undo[onclick*="${booking_number}"], button.mobile-btn-undo[onclick*="${booking_number}"]`);

  undoButtons.forEach(button => {
    button.textContent = `Undo (Auto Hide in ${secondsRemaining}s)`;
  });
}

/**
 * Handles Undo action for completed items (Arrived/Cancelled).
 * Restores the item to "Waiting" status with highlight effect.
 */
async function handleUndo(booking_number, customer_name) {
  console.log(`ACTION: Undo for customer ${customer_name} (#${booking_number}).`);

  // Stop auto-hide countdown for this item
  stopUndoAutoHideCountdown(booking_number);

  const item = waitlist.find(item => item.booking_number == booking_number);

  if (item && (item.status === 'Arrived' || item.status === 'Cancelled')) {
    const wasCompleted = true;

    try {
      // 1. Update database first
      // Determine status based on q_level: Ready if q_level >= 300, otherwise Waiting
      const newStatus = (item.q_level >= 300) ? 'Ready' : 'Waiting';

      const updateResult = await connector.updateDataArr(
        'waitlist', // dbKey
        'booking_list', // tableName
        [{
          booking_list_id: item.booking_list_id, // Include the ID for WHERE condition
          status: newStatus,
          time_cleared: null,
        }], // dataSetArr
        ['booking_list_id'], // whereSet - will match against booking_list_id
        'booking_list_id' // primaryKey - use booking_list_id as primary key
      );

      if (!updateResult.success) {
        console.error('Database update failed:', updateResult.error);
        return; // Exit if database update failed
      }

      console.log('Database updated successfully for booking #' + booking_number);

      // 2. Trigger webhook update to notify polling system
      await forceUpdateWebhook(item.subscriber_id);

      // 3. Update local data after successful database update
      item.status = newStatus;
      item.time_cleared = null; // Clear the completion time

      if (wasCompleted && rowHeight > 0) {
        // Adjust initialScrollTop when moving item from completed to active
        initialScrollTop += rowHeight;
        console.log(`SCROLL_UPDATE: Undo. Adding rowHeight (${rowHeight.toFixed(2)}px) to initialScrollTop.`);
        console.log(`SCROLL_UPDATE: New initialScrollTop: ${initialScrollTop.toFixed(2)}px`);
      }
    } catch (error) {
      console.error('Error updating database:', error);
      return; // Exit if there's an error
    }
  }

  renderWaitlist();

  // Check if we're on mobile or desktop for row selection
  const isMobile = window.innerWidth <= 768;

  // Set row selection BEFORE scrolling (so handleScrollToActive doesn't clear it)
  if (isMobile) {
    expandedRowId = booking_number;
    console.log(`UNDO: Pre-set expandedRowId to #${booking_number}`);
  } else {
    selectedRowId = booking_number;
    console.log(`UNDO: Pre-set selectedRowId to #${booking_number}`);
  }

  // Scroll to active queue and highlight the restored item
  requestAnimationFrame(() => {
    // Update button state to check if scroll-to-active button should be enabled
    updateScrollAndButtonState();

    // Trigger scroll to active queue
    requestAnimationFrame(() => {
      if (scrollButton && !scrollButton.disabled) {
        console.log('UNDO: Scrolling to active queue after undo');
        handleScrollToActive(false, true); // false = not auto-triggered, true = keep row selection
      }

      // After scrolling, restore row selection for the undone item
      requestAnimationFrame(() => {
        const rows = waitlistBody.getElementsByTagName('tr');
        const targetRow = Array.from(rows).find(row => {
          const idCell = row.querySelector('td:first-child');
          return idCell && idCell.textContent.trim() === booking_number.toString();
        });

        if (targetRow) {
          // Add highlight effect
          targetRow.classList.add('arrive-highlight'); // Reuse purple highlight for Undo
          console.log(`HIGHLIGHT: Added purple highlight to Undo item #${booking_number}`);

          // Re-apply row selection (in case handleScrollToActive cleared it)
          if (isMobile) {
            // Mobile: re-expand the row
            expandedRowId = booking_number;
            toggleRowSelection(booking_number, true);
            addMobileActionRow(booking_number);
            console.log(`UNDO: Re-expanded mobile row for #${booking_number}`);
          } else {
            // Desktop: re-select the row
            selectedRowId = booking_number;
            toggleRowSelection(booking_number, true);
            console.log(`UNDO: Re-selected desktop row for #${booking_number}`);
          }

          // Remove highlight after 1 second
          setTimeout(() => {
            targetRow.classList.remove('arrive-highlight');
            targetRow.classList.add('fade-out-highlight');

            // Clean up fade-out class
            setTimeout(() => {
              targetRow.classList.remove('fade-out-highlight');
            }, 700);
          }, 1000);
        }
      });
    });
  });
}

/**
 * Helper function to determine sorting priority.
 * Arrived and Cancelled should come first (lower number = higher priority).
 * @returns {number} The sort priority (0 for completed/cancelled, 1 for active).
 */
function getSortPriority(status) {
  if (status === 'Arrived' || status === 'Cancelled') {
    return 0; // Highest priority (comes first)
  }
  return 1; // Lower priority (comes after 0)
}

/**
 * The core logic for determining scroll target, dynamic height, and button state.
 * 이 함수는 Active Queue 위치를 계산하고, 동적 높이 조절을 수행하며,
 * 스크롤 위치에 따라 버튼의 활성화/비활성화 상태를 결정합니다.
 * @returns {number} The scroll target position (total height of completed items).
 */
function updateScrollAndButtonState() {
  //console.groupCollapsed("STATE_CHECK: Running updateScrollAndButtonState...");
  const rows = waitlistBody.getElementsByTagName('tr');
  if (!waitlistContainer || rows.length === 0 || !scrollButton) {
    console.log("STATE_CHECK: Pre-requisites missing. Exiting.");
    console.groupEnd();
    return 0;
  }

  // 1. Determine the height to scroll past (completed items)
  let totalHeightToScroll = 0;
  const completedItemsCount = waitlist.filter(item => getSortPriority(item.status) === 0).length;
  const hasCompletedItems = completedItemsCount > 0;
  const totalRows = waitlist.length;

  // Check if table has been rendered (has data rows, not just empty state)
  // Before renderWaitlist() runs, there will be no data rows in the table
  const hasDataRows = Array.from(rows).some(row =>
    !row.classList.contains('mobile-action-row') &&
    !row.classList.contains('dummy-spacer-row') &&
    row.querySelector('td')
  );

  // Skip button state update if table hasn't been rendered yet
  if (!hasDataRows) {
    console.log("STATE_CHECK: Waiting for table render. Skipping button state update.");
    return 0;
  }

  // With dummy row, scrolling is always enabled when there are completed items
  const shouldEnableScrolling = hasCompletedItems;

  if (shouldEnableScrolling) {
    // Calculate ACTUAL height of completed rows including mobile action rows
    let completedRowsFound = 0;
    for (let i = 0; i < rows.length && completedRowsFound < completedItemsCount; i++) {
      const row = rows[i];
      // Only count main data rows (not mobile action rows or dummy row)
      if (!row.classList.contains('mobile-action-row') && !row.classList.contains('dummy-spacer-row')) {
        totalHeightToScroll += row.offsetHeight;
        completedRowsFound++;
      } else if (completedRowsFound < completedItemsCount) {
        // Include mobile action rows that belong to completed items
        totalHeightToScroll += row.offsetHeight;
      }
    }
  }

  /*
  console.log(`--- Scroll/Height Calculation ---`);
  console.log(`Total rows: ${totalRows}, displayedRows: ${displayedRows}, Completed items: ${completedItemsCount}`);
  console.log(`shouldEnableScrolling: ${shouldEnableScrolling}`);
  console.log(`Calculated scroll target (total height of completed items): ${totalHeightToScroll.toFixed(2)}px`);
  */

  // --- Dynamic Height/Scroll Activation ---
  // Remove any JavaScript-imposed height restrictions to let flex handle it
  waitlistContainer.classList.remove(MAX_HEIGHT_CLASS);
  waitlistContainer.style.height = '';
  waitlistContainer.style.maxHeight = '';

  // Let CSS flex-1 handle the height - no JavaScript interference needed

  // Recalculate scroll state after potential height adjustments
  const isNowScrollable = waitlistContainer.scrollHeight > waitlistContainer.clientHeight;

  // Check if the current position is the Active Queue position (increased tolerance for variable heights)
  const isScrolledToActive = shouldEnableScrolling && totalHeightToScroll > 0 &&
    waitlistContainer.scrollTop >= (totalHeightToScroll - scrollPositionTolerance) &&
    waitlistContainer.scrollTop <= (totalHeightToScroll + scrollPositionTolerance);

  /*
  console.log(`--- Current Scroll State ---`);
  console.log(`isInitialScrollDone: ${isInitialScrollDone}`);
  console.log(`shouldEnableScrolling: ${shouldEnableScrolling}`);
  console.log(`isNowScrollable: ${isNowScrollable}`);
  console.log(`Current ScrollTop: ${waitlistContainer.scrollTop.toFixed(2)}px`);
  console.log(`initialScrollTop: ${initialScrollTop.toFixed(2)}px`);
  console.log(`isScrolledToActive: ${isScrolledToActive} (Is scroll position within +/- 10px of target)`);
  */

  // 2. Button State Update (Dynamic)

  if (!isInitialScrollDone) {
    // 초기 로드 시에는 비활성화 상태 유지
    //console.log(`--- BUTTON STATE DECISION ---`);
    //console.log("BUTTON: DISABLED. Reason: Initial setup (isInitialScrollDone=false).");
    scrollButton.disabled = true;
    scrollButton.classList.remove('bg-amber-400', 'text-slate-900', 'hover:bg-amber-500', 'border-amber-400');
    scrollButton.classList.add('bg-slate-700', 'text-slate-500', 'cursor-not-allowed', 'border-slate-600');
    console.groupEnd();
    return totalHeightToScroll; // Early exit during initial setup
  }

  // isInitialScrollDone = true 일 때의 동적 로직:
  // 총 행 수가 minRowDisplay를 초과하고, Active Queue를 건너뛸 기록이 있고, 스크롤이 가능하며, 현재 Active Queue 위치에 있지 않은 경우 활성화
  const shouldEnableScrollDown = shouldEnableScrolling && isNowScrollable && !isScrolledToActive;

  //console.log(`--- BUTTON STATE DECISION (Dynamic) ---`);
  //console.log(`Should Enable? (shouldEnableScrolling && isScrollable && !isAtActive): ${shouldEnableScrollDown}`);


  if (shouldEnableScrollDown) {
    // ENABLED: User has manually scrolled away.
    //console.log(`BUTTON: ENABLED. Reason: Active history exists, scrollable, and user is not at the Active Queue.`);

    scrollButton.disabled = false;
    scrollButton.classList.remove('bg-slate-700', 'text-slate-500', 'cursor-not-allowed', 'border-slate-600');
    scrollButton.classList.add('bg-amber-400', 'text-slate-900', 'hover:bg-amber-500', 'border-amber-400');
  } else {
    // DISABLED: At the active queue, no history, or not scrollable.

    scrollButton.disabled = true;

    // Button is disabled - no text content needed since we use an icon

    scrollButton.classList.remove('bg-amber-400', 'text-slate-900', 'hover:bg-amber-500', 'border-amber-400');
    scrollButton.classList.add('bg-slate-700', 'text-slate-500', 'cursor-not-allowed', 'border-slate-600');
  }

  console.groupEnd(); // End STATE_CHECK group
  return totalHeightToScroll;
}

/**
 * Button click handler: Scrolls DOWN to the Active Queue instantly.
 * @param {boolean} isAutoTrigger - True if triggered automatically by countdown, false if user clicked
 * @param {boolean} keepRowSelection - True to keep current row selection (used by Undo), false to clear selection
 */
function handleScrollToActive(isAutoTrigger = false, keepRowSelection = false) {
  if (isAutoTrigger) {
    console.log("ACTION: Scroll button auto-triggered after countdown.");
  } else {
    console.log("ACTION: Scroll button clicked by user.");

    // Only stop countdowns if user manually clicked (not auto-triggered)
    waitlist.forEach(item => {
      if (item.status === 'Arrived' || item.status === 'Cancelled') {
        stopUndoAutoHideCountdown(item.booking_number);
      }
    });
    console.log("AUTO_HIDE: Stopped all countdown timers");
  }

  // Close any selected row (desktop) before scrolling - unless keepRowSelection is true
  if (!keepRowSelection && selectedRowId !== null) {
    console.log(`SCROLL_ACTION: Deselecting desktop row #${selectedRowId} before scroll`);
    toggleRowSelection(selectedRowId, false);
    toggleChatHistoryDisplay(selectedRowId, false);
    selectedRowId = null;
  }

  // Close any expanded row (mobile) before scrolling - unless keepRowSelection is true
  if (!keepRowSelection && expandedRowId !== null) {
    console.log(`SCROLL_ACTION: Closing expanded row #${expandedRowId} before scroll`);
    removeMobileActionRow(expandedRowId);
    toggleRowSelection(expandedRowId, false);
    toggleChatHistoryDisplay(expandedRowId, false);

    // Exit ask mode if active
    if (askModeItems.has(expandedRowId)) {
      askModeItems.delete(expandedRowId);
    }

    expandedRowId = null;

    // DOM height changed, recalculate dummy row synchronously
    const rows = waitlistBody.getElementsByTagName('tr');
    const completedItemsCount = waitlist.filter(item => getSortPriority(item.status) === 0).length;

    if (completedItemsCount > 0) {
      // Calculate completed items height first
      let completedItemsHeight = 0;
      let completedRowsFound = 0;
      for (let i = 0; i < rows.length && completedRowsFound < completedItemsCount; i++) {
        const row = rows[i];
        if (!row.classList.contains('mobile-action-row') && !row.classList.contains('dummy-spacer-row')) {
          completedItemsHeight += row.offsetHeight;
          completedRowsFound++;
        } else if (completedRowsFound < completedItemsCount) {
          completedItemsHeight += row.offsetHeight;
        }
      }

      // Calculate total content height
      let totalContentHeight = 0;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.classList.contains('dummy-spacer-row')) {
          totalContentHeight += row.offsetHeight;
        }
      }

      const activeItemsHeight = totalContentHeight - completedItemsHeight;

      // Determine correct container height
      let containerHeight = waitlistContainer.offsetHeight;
      if (activeItemsHeight > containerHeight * 0.95) {
        const bodyPadding = 24;
        const headerHeight = document.querySelector('header')?.offsetHeight || 70;
        const buttonHeight = scrollButton?.offsetHeight || 36;
        const margins = 16;
        containerHeight = window.innerHeight - bodyPadding - headerHeight - buttonHeight - margins;
        console.log(`MOBILE_DEBUG: handleScrollToActive - Active (${activeItemsHeight}px) doesn't fit, using viewport: ${containerHeight}px`);
      }

      const remainingSpace = containerHeight - activeItemsHeight;
      const dummyRowHeight = Math.max(0, remainingSpace);

      // Update dummy row height
      const dummyElement = waitlistBody.querySelector('.dummy-spacer-row td');
      if (dummyElement) {
        dummyElement.style.height = `${dummyRowHeight}px`;
      }
    }
  }

  // 이제 scrollTarget은 initialScrollTop이 아니라, DOM을 기준으로 재계산된 정확한 값입니다.
  const totalHeightToScroll = updateScrollAndButtonState();

  // 버튼이 활성화된 상태일 때만 스크롤을 수행합니다.
  if (!scrollButton.disabled) {

    // 'auto'를 사용하여 즉시 이동하고, 스크롤 이벤트 발생을 최소화합니다.
    waitlistContainer.scrollTo({ top: totalHeightToScroll, behavior: 'smooth' });

    // 스크롤 완료 후 버튼 상태를 즉시 업데이트하여 비활성화합니다.
    requestAnimationFrame(updateScrollAndButtonState);
  } else {
    console.log("SCROLL_ACTION: Scroll prevented, button is disabled.");
  }
}


/**
 * Renders the table based on the waitlist data. Called on initial load and on status change.
 */
function renderWaitlist() {
  //console.log("RENDER: Starting table render.");

  // Reset name NEW badges only (not chat badges) - they will be re-shown by handleNewEvent if still new
  document.querySelectorAll('[id^="new-badge-"]').forEach(badge => {
    // Only reset if it's a name badge (not chat-new-badge)
    if (!badge.id.startsWith('chat-new-badge-')) {
      badge.textContent = '';
      badge.style.display = 'none';
    }
  });
  //console.log("RENDER: Reset name NEW badges (preserved chat badges)");

  // Clean up mobile state on desktop
  if (window.innerWidth > 768) {
    document.querySelectorAll('.row-selected').forEach(row => {
      row.classList.remove('row-selected');
    });
    document.querySelectorAll('.mobile-action-row').forEach(row => {
      row.remove();
    });
    expandedRowId = null;
  }

  // 1. Sort the entire list: Completed items first (by time_cleared), then Active items by dine_dateTime (oldest first).
  waitlist.sort((a, b) => {
    const priorityA = getSortPriority(a.status);
    const priorityB = getSortPriority(b.status);

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Both items have the same priority level
    if (priorityA === 0) {
      // Both are completed items - sort by time_cleared (oldest first, recent last)
      return (a.time_cleared || 0) - (b.time_cleared || 0);
    } else {
      // Both are active items - sort by dine_dateTime (oldest first)
      return a.dine_dateTime - b.dine_dateTime;
    }
  });

  const completedItemsCount = waitlist.filter(item => getSortPriority(item.status) === 0).length;
  //console.log(`RENDER: Sorted list. Total items: ${waitlist.length}, Completed items count: ${completedItemsCount}`);

  waitlistBody.innerHTML = ''; // Clear table content

  let tableHTML = '';
  waitlist.forEach((item) => {
    const statusPriority = getSortPriority(item.status);
    const rowClass = statusPriority === 0 ? 'row-completed' : 'row-hover bg-slate-900';
    const statusData = getStatusIconAndClass(item.status);
    const timeData = formatElapsedTime(item);

    // Dynamic color classes based on item status
    const idClass = statusPriority === 0 ? 'text-slate-200' : 'text-amber-400';
    const nameClass = statusPriority === 0 ? 'text-slate-100' : 'text-amber-400';
    const paxClass = statusPriority === 0 ? 'text-slate-300' : 'text-amber-400';
    const timeClass = statusPriority === 0 ? 'text-slate-200' : 'text-amber-400';

    // Get chat history for this booking_list_id
    const chatHistory = chatlist
      .filter(chat => chat.booking_list_id == item.booking_list_id) // Use == for type-flexible comparison
      .sort((a, b) => a.dateTime - b.dateTime); // Sort by dateTime ascending

    // Build chat history HTML with elapsed time
    let chatHistoryHTML = '';

    // Check if this row is actually selected (for showing all messages vs last one)
    const isRowSelected = (selectedRowId === item.booking_number) || (expandedRowId === item.booking_number);

    // Check if this is a WEB booking - show simple webBooking info instead of chat history
    if (item.booking_from === 'WEB') {
      const chatClass = statusPriority === 0 ? 'text-slate-400' : 'text-slate-400';

      // Check if this is a "walk-in" (time_created === dine_dateTime) or scheduled reservation
      // Use == for flexible type comparison (string vs number)
      const isWalkIn = item.time_created == item.dine_dateTime;

      let bookingText = '';
      let dataAttributes = '';
      if (isWalkIn) {
        // Walk-in booking: Show elapsed time format [hh:mm]
        const elapsedMs = Date.now() - item.time_created;
        const totalSeconds = Math.floor(elapsedMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = String(totalSeconds % 60).padStart(2, '0');

        let elapsedTime;
        if (minutes >= 60) {
          const hours = Math.floor(minutes / 60);
          const remainingMinutes = String(minutes % 60).padStart(2, '0');
          elapsedTime = `${hours}:${remainingMinutes}:${seconds}`;
        } else {
          elapsedTime = `${minutes}:${seconds}`;
        }

        bookingText = `[${elapsedTime}] Web booking (Now)`;
        // Add data attributes for live time updates
        dataAttributes = `data-web-booking-time="${item.time_created}" data-booking-list-id="${item.booking_list_id}"`;
      } else {
        // Scheduled reservation: Show dine_dateTime
        const dineTime = new Date(item.dine_dateTime);
        const timeString = dineTime.toLocaleTimeString('en-GB', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        });
        bookingText = `Web booking @ ${timeString}`;
      }

      // Show booking line with background highlight (similar to PAX >= 5 style but maintaining gray color)
      const webBookingHighlight = statusPriority === 0 ? 'bg-slate-600 text-slate-200 px-1 py-0.5 rounded font-bold' : 'bg-slate-700 text-slate-300 px-1 py-0.5 rounded font-bold';

      // Add NEW badge for Web Booking (only for active items)
      let webBookingBadge = '';
      if (item.status === 'Waiting' || item.status === 'Ready') {
        const chatBadgeId = `chat-new-badge-${item.booking_list_id}`;
        const badgeKey = `${item.subscriber_id}_${item.booking_list_id}`;
        const isChatHidden = chatBadgeHidden[badgeKey];
        if (isChatHidden) {
          webBookingBadge = `<span id="${chatBadgeId}" class="bg-red-500 text-slate-800 px-1 py-0.5 rounded font-bold ml-1" style="font-size: 8px; display: none;">NEW</span>`;
        } else {
          webBookingBadge = `<span id="${chatBadgeId}" class="bg-red-500 text-slate-800 px-1 py-0.5 rounded font-bold ml-1" style="font-size: 8px; display: inline;">NEW</span>`;
        }
      }

      chatHistoryHTML = `<div class="text-xs ${chatClass} leading-relaxed" ${dataAttributes}>↳ <span class="${webBookingHighlight}">${bookingText}</span>${webBookingBadge}</div>`;

      // Add status message if item is Arrived or Cancelled with completion time (always show for WEB bookings)
      if (item.status === 'Arrived' || item.status === 'Cancelled') {
        // Apply color based on status: purple for Arrived (#8b5cf6), red for Cancelled (#f87171)
        const statusColor = item.status === 'Arrived' ? 'text-purple-500' : 'text-red-400';
        const completionTime = new Date(item.time_cleared);
        const timeString = completionTime.toLocaleTimeString('en-GB', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        chatHistoryHTML += `<div class="text-xs ${statusColor} leading-relaxed">↳ ${item.status} @ ${timeString}</div>`;
      }
    } else if (chatHistory.length > 0) {
      // Regular chat history for non-WEB bookings
      const chatClass = statusPriority === 0 ? 'text-slate-400' : 'text-slate-400';
      const hasStatusMessage = item.status === 'Arrived' || item.status === 'Cancelled';

      // Always render ALL messages in DOM, but hide non-selected ones with display:none
      // This allows toggleChatHistoryDisplay to work without re-rendering
      chatHistoryHTML = chatHistory.map((chat, index) => {
        const originalIndex = index;
        let elapsedTime;
        const isLastMessage = originalIndex === chatHistory.length - 1;

        if (isLastMessage && !hasStatusMessage) {
          // Last message and no status message to follow: calculate ongoing elapsed time from message dateTime to now
          const elapsedMs = Date.now() - chat.dateTime;
          const totalSeconds = Math.floor(elapsedMs / 1000);
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = String(totalSeconds % 60).padStart(2, '0');

          if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = String(minutes % 60).padStart(2, '0');
            elapsedTime = `${hours}:${remainingMinutes}:${seconds}`;
          } else {
            elapsedTime = `${minutes}:${seconds}`;
          }
        } else {
          // Not last message OR last message with status to follow: calculate fixed elapsed time to next event
          let nextEventTime;
          if (isLastMessage && hasStatusMessage) {
            // Calculate time to status event (time_cleared)
            nextEventTime = item.time_cleared;
          } else {
            // Calculate time to next chat message
            const nextChat = chatHistory[originalIndex + 1];
            nextEventTime = nextChat.dateTime;
          }

          const elapsedMs = nextEventTime - chat.dateTime;
          const totalSeconds = Math.floor(elapsedMs / 1000);
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = String(totalSeconds % 60).padStart(2, '0');

          if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = String(minutes % 60).padStart(2, '0');
            elapsedTime = `${hours}:${remainingMinutes}:${seconds}`;
          } else {
            elapsedTime = `${minutes}:${seconds}`;
          }
        }

        // Add a data attribute to identify ongoing messages for live updates (only if truly last and no status)
        const dataAttr = (isLastMessage && !hasStatusMessage) ? `data-chat-id="${chat.Id}" data-chat-time="${chat.dateTime}"` : '';

        // Apply color based on q_level for the last message only
        let messageChatClass = chatClass; // Default color
        if (isLastMessage) {
          if (item.q_level >= 300) {
            messageChatClass = 'text-emerald-400'; // Green for q_level >= 300 (same as Ready button)
          } else if (item.q_level >= 200) {
            messageChatClass = 'text-blue-400'; // Blue for q_level >= 200 (same as Ask button)
          }
        }

        // Add NEW badge span for last message only - render with correct state immediately
        // Only show chat badge for active items (Waiting/Ready), not for completed items (Arrived/Cancelled)
        let chatBadge = '';
        if (isLastMessage && (item.status === 'Waiting' || item.status === 'Ready')) {
          const chatBadgeId = `chat-new-badge-${item.booking_list_id}`;
          // Chat badge: shown by default, hidden if user clicked row (tracked in chatBadgeHidden)
          const badgeKey = `${item.subscriber_id}_${item.booking_list_id}`;
          const isChatHidden = chatBadgeHidden[badgeKey];
          // Get badge text from chatBadgeType, default to 'NEW'
          const badgeText = chatBadgeType[badgeKey] || 'NEW';
          
          // Hide "New Pax" badge if isShowNewPaxBadge is false (keep NEW badges visible)
          const shouldHideBadge = (badgeText === 'New Pax' && !isShowNewPaxBadge) || isChatHidden;
          
          if (shouldHideBadge) {
            chatBadge = `<span id="${chatBadgeId}" class="bg-red-500 text-slate-800 px-1 py-0.5 rounded font-bold ml-1" style="font-size: 8px; display: none;">${badgeText}</span>`;
          } else {
            chatBadge = `<span id="${chatBadgeId}" class="bg-red-500 text-slate-800 px-1 py-0.5 rounded font-bold ml-1" style="font-size: 8px; display: inline;">${badgeText}</span>`;
          }
        }

        // Hide logic for chat messages:
        // - For completed items: hide ALL chat messages (status message will be shown instead)
        // - For active items: hide non-last messages if row is not selected
        let shouldHide;
        if (hasStatusMessage) {
          // Completed item: hide all chat messages when not selected
          shouldHide = !isRowSelected;
        } else {
          // Active item: hide non-last messages when not selected
          shouldHide = !isRowSelected && !isLastMessage;
        }
        const hideStyle = shouldHide ? ' style="display: none;"' : '';

        return `<div class="text-xs ${messageChatClass} leading-relaxed" ${dataAttr}${hideStyle}>↳ [${elapsedTime}] ${chat.qna}${chatBadge}</div>`; //arrow
      }).join('');

      // Add status message if item is Arrived or Cancelled with completion time
      if (hasStatusMessage) {
        // Apply color based on status: purple for Arrived (#8b5cf6), red for Cancelled (#f87171)
        const statusColor = item.status === 'Arrived' ? 'text-purple-500' : 'text-red-400';
        const completionTime = new Date(item.time_cleared);
        const timeString = completionTime.toLocaleTimeString('en-GB', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        // Show status message by default when not selected (hide when row is clicked to show chat history)
        const statusHideStyle = isRowSelected ? ' style="display: none;"' : '';
        chatHistoryHTML += `<div class="text-xs ${statusColor} leading-relaxed"${statusHideStyle}>↳ ${item.status} @ ${timeString}</div>`;
      }
    }

    // Action Buttons - Generate using button definitions
    const buttons = getButtonsForStatus(item.status, false);
    let buttonHTMLs;

    // Check if this item is in Ask mode
    const isInAskMode = askModeItems.has(item.booking_number);

    if (isInAskMode) {
      // Show question buttons + Exit button (with ask-mode-btn class for 2-per-row layout) - filtered by pax and q_level
      const filteredQuestions = getFilteredQuestions(item.pax, item.booking_number);
      const questionButtonsHTML = generateQuestionButtonsHTML(filteredQuestions, item.booking_number, item.customer_name, false);

      // Split the HTML string into individual button elements and add ask-mode-btn class
      buttonHTMLs = questionButtonsHTML.split('\n').map(btnHTML => {
        // Add ask-mode-btn class to each button for desktop 2-per-row layout
        return btnHTML.replace('flex-1', 'flex-1 ask-mode-btn');
      });
    } else {
      // Show normal buttons
      buttonHTMLs = buttons.map(btnDef => generateButtonHTML(btnDef, item.booking_number, item.customer_name, false));
    }

    const actionButtons = buttonHTMLs.join('\n');
    const actionContainerClass = 'flex gap-1.5';

    // Build time cell HTML - two lines for completed items, one line for active items
    let timeHTML;
    if (timeData.isTwoLine) {
      timeHTML = `
            <div class="font-mono tracking-wider">${timeData.time}</div>
            <div class="text-xs font-mono">(${timeData.duration})</div>
          `;
    } else {
      timeHTML = `<div class="font-mono tracking-wider">${timeData.time}</div>`;
    }

    // Mobile: Add onclick handler, Desktop: no onclick
    // Always add onclick - the function itself checks if mobile
    const onclickAttr = `onclick="toggleMobileActions(${item.booking_number}, event)"`;
    const rowClickableClass = 'row-clickable';

    // Add margin bottom for highlighted names  
    const hasHighlight = item.pax >= minPax_for_bigTable || item.pax <= maxPax_for_smallTable;
    const nameMarginClass = hasHighlight ? 'mb-1.5' : '';

    // PAX display with highlight styling (moved to No. column)
    // Check if this item has "New Pax" badge
    const badgeKey = `${item.subscriber_id}_${item.booking_list_id}`;
    const hasNewPaxBadge = chatBadgeType[badgeKey] === 'New Pax' && !chatBadgeHidden[badgeKey];
    
    // Base classes for Pax container (border will be added via pax-selected class)
    const paxContainerClass = 'px-0.5 py-0.5 rounded font-bold text-xs';

    // Label styling - depends on "New Pax" badge and pax count
    let paxLabelClass;
    if (hasNewPaxBadge) {
      // 5명 이상: 테이블 배경색(slate-800) 텍스트, 4명 이하: 빨간색 텍스트
      paxLabelClass = item.pax >= minPax_for_bigTable ? 'font-bold text-slate-800' : 'font-bold text-red-500';
    } else {
      paxLabelClass = 'font-bold';
    }

    // Number styling - background highlight for big tables only
    // If "New Pax" badge exists, use red color instead of yellow/white
    let paxNumberClass;
    if (hasNewPaxBadge) {
      // Red color for "New Pax" badge
      paxNumberClass = item.pax >= minPax_for_bigTable ?
        'bg-red-500 text-slate-800 px-1 py-0.5 rounded font-bold' :
        'pr-1 font-bold text-red-500';
    } else {
      // Normal colors (yellow for active, white for completed)
      paxNumberClass = item.pax >= minPax_for_bigTable ?
        (statusPriority === 0 ? 'bg-white text-slate-800 px-1 py-0.5 rounded font-bold' : 'bg-yellow-400 text-slate-800 px-1 py-0.5 rounded font-bold') :
        'pr-1 font-bold';
    }

    // Initial background for big tables (will have border added when selected)
    let paxInitialBg;
    if (hasNewPaxBadge) {
      // Red background for "New Pax" badge
      paxInitialBg = item.pax >= minPax_for_bigTable ? 'bg-red-500 text-slate-800' : '';
    } else {
      // Normal backgrounds
      paxInitialBg = item.pax >= minPax_for_bigTable ?
        (statusPriority === 0 ? 'bg-white text-slate-800' : 'bg-yellow-400 text-slate-800') :
        '';
    }

    const paxHighlightClass = `${paxContainerClass} ${paxInitialBg}`;

    // Generate highlight tags for badge1, badge2, badge3 (same as Pax styling - all same color, only completed/active difference)
    const highlights = [];
    const highlightClass = statusPriority === 0 ?
      'bg-white text-slate-800 px-1 py-0.5 rounded font-bold mr-1' :
      'bg-yellow-400 text-slate-800 px-1 py-0.5 rounded font-bold mr-1';

    if (item.badge1 && item.badge1.trim()) {
      highlights.push(`<span class="${highlightClass}" style="font-size: 10px;">${item.badge1}</span>`);
    }
    if (item.badge2 && item.badge2.trim()) {
      highlights.push(`<span class="${highlightClass}" style="font-size: 10px;">${item.badge2}</span>`);
    }
    if (item.badge3 && item.badge3.trim()) {
      highlights.push(`<span class="${highlightClass}" style="font-size: 10px;">${item.badge3}</span>`);
    }
    const highlightHTML = highlights.length > 0 ? `<span class="ml-2">${highlights.join('')}</span>` : '';

    // Don't add selected class during initial render - will be added by DOM manipulation
    const selectedClass = '';

    tableHTML += `
                    <tr class="${rowClass} ${rowClickableClass} ${selectedClass}" data-item-id="${item.booking_number}" ${onclickAttr}>
                        <td class="px-2 py-2 whitespace-nowrap text-sm font-medium ${idClass} text-center">
                            <div>${item.booking_number}</div>
                            <div class="mt-0.5">
                                <span id="pax-${item.booking_number}" class="${paxHighlightClass}" data-pax-clickable="true" data-booking-number="${item.booking_number}" data-pax-count="${item.pax}" data-is-completed="${statusPriority === 0}" style="display: inline-block; cursor: pointer; pointer-events: auto; position: relative; z-index: 10;"><span class="${paxLabelClass}" style="pointer-events: none;">Pax:</span> <span class="pax-number ${paxNumberClass}" style="pointer-events: none;">${item.pax}</span></span>
                            </div>
                        </td>
                        <td class="px-2 py-2 text-sm">
                            <div class="flex items-baseline">
                                <span class="font-semibold ${nameClass} ${nameMarginClass}">${item.customer_name}</span>
                                ${highlightHTML}
                            </div>
                            ${chatHistoryHTML}
                        </td>
                        <td id="time-${item.booking_number}" class="px-2 py-2 whitespace-nowrap text-sm text-center ${timeClass}">
                            ${timeHTML}
                        </td>
                        <td class="action-column-cell px-2 py-2 whitespace-nowrap text-center text-sm font-medium">
                            <div class="${actionContainerClass}">
                                ${actionButtons}
                            </div>
                        </td>
                    </tr>
                 `;
  });

  waitlistBody.innerHTML = tableHTML;
  //console.log("RENDER: Table HTML injected into DOM.");

  // Add dummy row to ensure scrollability even with few items
  requestAnimationFrame(() => {
    const completedItemsCount = waitlist.filter(item => getSortPriority(item.status) === 0).length;
    const hasCompletedItems = completedItemsCount > 0;

    if (hasCompletedItems) {
      const rows = waitlistBody.getElementsByTagName('tr');

      // First, calculate active items height to check if we need viewport-based calculation
      let totalContentHeight = 0;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.classList.contains('dummy-spacer-row')) {
          totalContentHeight += row.offsetHeight;
        }
      }

      // Calculate completed items height
      let completedItemsHeight = 0;
      let completedRowsFound = 0;
      for (let i = 0; i < rows.length && completedRowsFound < completedItemsCount; i++) {
        const row = rows[i];
        if (!row.classList.contains('mobile-action-row') && !row.classList.contains('dummy-spacer-row')) {
          completedItemsHeight += row.offsetHeight;
          completedRowsFound++;
        } else if (completedRowsFound < completedItemsCount) {
          completedItemsHeight += row.offsetHeight;
        }
      }

      const activeItemsHeight = totalContentHeight - completedItemsHeight;
      let containerHeight = waitlistContainer.offsetHeight;

      // If active items don't fit in container, use viewport-based calculation
      // This is the key fix: we need enough space for active items + scroll capability
      if (activeItemsHeight > containerHeight * 0.95) {
        // Calculate available height: window height - body padding - header - button area
        const bodyPadding = 24; // p-4 padding
        const headerHeight = document.querySelector('header')?.offsetHeight || 70;
        const buttonHeight = scrollButton?.offsetHeight || 36;
        const margins = 16; // Additional margins and spacing
        containerHeight = window.innerHeight - bodyPadding - headerHeight - buttonHeight - margins;
        //console.log(`MOBILE_DEBUG: Active items (${activeItemsHeight}px) don't fit in container, using viewport calculation: ${containerHeight}px`);
      }

      //console.log(`MOBILE_DEBUG: renderWaitlist - Container offsetHeight: ${waitlistContainer.offsetHeight}px, Used height: ${containerHeight}px, Active: ${activeItemsHeight}px, window.innerHeight: ${window.innerHeight}px`);

      // Calculate remaining space in container after active items
      const remainingSpace = containerHeight - activeItemsHeight;

      // Dummy row height = remaining space only
      // Goal: scrollHeight - clientHeight = completedItemsHeight
      // scrollHeight = completed + active + dummy
      // We want: completed + active + dummy - clientHeight = completed
      // Therefore: active + dummy = clientHeight
      // dummy = clientHeight - active = remainingSpace
      const dummyRowHeight = Math.max(0, remainingSpace);

      /*
      console.log(`DUMMY_ROW: Container height: ${containerHeight.toFixed(2)}px`);
      console.log(`DUMMY_ROW: Completed items height: ${completedItemsHeight.toFixed(2)}px`);
      console.log(`DUMMY_ROW: Active items height: ${activeItemsHeight.toFixed(2)}px`);
      console.log(`DUMMY_ROW: Calculated dummy height: ${dummyRowHeight.toFixed(2)}px`);
      */

      if (dummyRowHeight > 0) {
        // Remove existing dummy row if present
        const existingDummy = waitlistBody.querySelector('.dummy-spacer-row');
        if (existingDummy) {
          existingDummy.remove();
        }

        // Create and append dummy row
        const dummyRow = document.createElement('tr');
        dummyRow.className = 'dummy-spacer-row';
        dummyRow.innerHTML = `<td colspan="4" style="height: ${dummyRowHeight}px; padding: 0; border: none; background: transparent;"></td>`;
        waitlistBody.appendChild(dummyRow);

        //console.log(`DUMMY_ROW: Added dummy spacer row with height ${dummyRowHeight.toFixed(2)}px`);

        // Store the actual scroll target for later adjustment verification
        // We need to recalculate this after DOM is stable to get the real target
        requestAnimationFrame(() => {
          // Calculate the actual scroll target (with offset applied)
          const rows = waitlistBody.getElementsByTagName('tr');
          let actualScrollTarget = 0;
          let completedRowsFound = 0;
          const targetCount = completedItemsCount;

          for (let i = 0; i < rows.length && completedRowsFound < targetCount; i++) {
            const row = rows[i];
            if (!row.classList.contains('mobile-action-row') && !row.classList.contains('dummy-spacer-row')) {
              actualScrollTarget += row.offsetHeight;
              completedRowsFound++;
            } else if (completedRowsFound < targetCount) {
              actualScrollTarget += row.offsetHeight;
            }
          }

          const scrollHeight = waitlistContainer.scrollHeight;
          const clientHeight = waitlistContainer.clientHeight;
          const maxScrollTop = scrollHeight - clientHeight;

          /*
          console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log(`SCROLL_MEASURE: Container Analysis`);
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log(`Container clientHeight (visible area): ${clientHeight.toFixed(2)}px`);
          console.log(`Container scrollHeight (actual DOM): ${scrollHeight.toFixed(2)}px`);
          console.log(`\nCalculated Heights:`);
          console.log(`  Completed items: ${completedItemsHeight.toFixed(2)}px`);
          console.log(`  Active items: ${activeItemsHeight.toFixed(2)}px`);
          console.log(`  Dummy row: ${dummyRowHeight.toFixed(2)}px`);
          console.log(`  Sum (calculated): ${(completedItemsHeight + activeItemsHeight + dummyRowHeight).toFixed(2)}px`);
          console.log(`\nScroll Capability:`);
          console.log(`  Max scrollTop possible: ${maxScrollTop.toFixed(2)}px`);
          console.log(`  Actual scroll target: ${actualScrollTarget.toFixed(2)}px`);
          */

          // Check if we need to adjust dummy height to reach the ACTUAL scroll target
          const shortfall = actualScrollTarget - maxScrollTop;
          if (shortfall > 1) {
            //console.log(`\n⚠️  ADJUSTING: Need ${shortfall.toFixed(2)}px more scroll range`);
            const adjustedDummyHeight = dummyRowHeight + shortfall;
            const dummyElement = waitlistBody.querySelector('.dummy-spacer-row td');
            if (dummyElement) {
              dummyElement.style.height = `${adjustedDummyHeight}px`;
              //console.log(`✓ Adjusted dummy row: ${dummyRowHeight.toFixed(2)}px → ${adjustedDummyHeight.toFixed(2)}px`);

              // Verify the adjustment
              requestAnimationFrame(() => {
                const newScrollHeight = waitlistContainer.scrollHeight;
                const newMaxScrollTop = newScrollHeight - clientHeight;
                const newDifference = actualScrollTarget - newMaxScrollTop;
                /*
                console.log(`✓ New scrollHeight: ${newScrollHeight.toFixed(2)}px`);
                console.log(`✓ New maxScrollTop: ${newMaxScrollTop.toFixed(2)}px`);
                console.log(`✓ Remaining difference: ${newDifference.toFixed(2)}px`);
                */
              });
            }
          } else {
            //console.log(`✓ No adjustment needed (difference: ${shortfall.toFixed(2)}px)`);
          }

          //console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
        });
      }
    } else {
      // No completed items - remove dummy row if it exists
      const existingDummy = waitlistBody.querySelector('.dummy-spacer-row');
      if (existingDummy) {
        existingDummy.remove();
        //console.log('DUMMY_ROW: Removed dummy row (no completed items)');
      }
    }
  });

  // Clean up any problematic styles and classes
  const allRows = waitlistBody.querySelectorAll('tr');
  allRows.forEach((row) => {
    row.removeAttribute('style'); // Remove any inline styles
    if (window.innerWidth > 768) {
      // Desktop: Remove row-selected classes
      row.classList.remove('row-selected');
    }
  });

  // Close any expanded mobile row when re-rendering (only if on desktop)
  if (window.innerWidth > 768) {
    expandedRowId = null;
  }

  // NOTE: 데이터가 변경되어 렌더링이 발생하면, 버튼 상태와 스크롤 타겟을 즉시 업데이트합니다.
  updateScrollAndButtonState();

  // Initialize chat history display states after render
  requestAnimationFrame(() => {
    // Chat messages are already rendered correctly based on isRowSelected
    // No need to call toggleChatHistoryDisplay since it would hide divs with badges

    // Restore countdown text for completed items that have active timers
    waitlist.forEach(item => {
      if ((item.status === 'Arrived' || item.status === 'Cancelled') && undoAutoHideTimers[item.booking_number]) {
        // Timer exists, button text will be updated by the interval
        // Just ensure the interval continues to update the newly rendered button
      }
    });

    // Restore desktop selection visual state
    if (selectedRowId !== null) {
      toggleRowSelection(selectedRowId, true);
    }

    // Restore mobile expansion visual state and action row
    if (expandedRowId !== null) {
      toggleRowSelection(expandedRowId, true);
      addMobileActionRow(expandedRowId);
    }
  });
}

/**
 * Updates the elapsed time for all items every second.
 * Updates the HTML content of the time cell to support two-line display.
 * Also updates ongoing chat message elapsed times.
 */
function updateElapsedTimes() {
  waitlist.forEach(item => {
    const timeElement = document.getElementById(`time-${item.booking_number}`);
    if (timeElement) {
      const timeData = formatElapsedTime(item);

      // Build time cell HTML - two lines for completed items, one line for active items
      let timeHTML;
      if (timeData.isTwoLine) {
        timeHTML = `
              <div class="font-mono tracking-wider">${timeData.time}</div>
              <div class="text-xs font-mono">(${timeData.duration})</div>
            `;
      } else {
        timeHTML = `<div class="font-mono tracking-wider">${timeData.time}</div>`;
      }

      timeElement.innerHTML = timeHTML;
    }
  });

  // Update ongoing chat message elapsed times (messages with data-chat-id attribute)
  document.querySelectorAll('[data-chat-id]').forEach(chatElement => {
    const chatTime = parseInt(chatElement.getAttribute('data-chat-time'));
    if (chatTime) {
      const elapsedMs = Date.now() - chatTime;
      const totalSeconds = Math.floor(elapsedMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = String(totalSeconds % 60).padStart(2, '0');

      let elapsedTime;
      if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = String(minutes % 60).padStart(2, '0');
        elapsedTime = `${hours}:${remainingMinutes}:${seconds}`;
      } else {
        elapsedTime = `${minutes}:${seconds}`;
      }

      // Extract the message text (everything after the closing bracket ']')
      // But preserve the badge span if it exists
      const badge = chatElement.querySelector('[id^="chat-new-badge-"]');
      const currentText = chatElement.textContent;
      const messageStart = currentText.indexOf(']') + 1;
      let messageText = currentText.substring(messageStart);

      // Remove badge text from messageText if badge exists (it will be re-added as span)
      if (badge) {
        messageText = messageText.replace('NEW', '').replace('New Pax', '').trim();
      }

      // Update the text content while preserving the badge
      if (badge) {
        // Save badge HTML
        const badgeHTML = badge.outerHTML;
        // Update text and re-append badge
        chatElement.textContent = `↳ [${elapsedTime}] ${messageText}`; //arrow
        chatElement.insertAdjacentHTML('beforeend', badgeHTML);
      } else {
        // No badge, just update text
        chatElement.textContent = `↳ [${elapsedTime}]${messageText}`; //arrow
      }
    }
  });

  // Update Web booking walk-in elapsed times (messages with data-web-booking-time attribute)
  document.querySelectorAll('[data-web-booking-time]').forEach(webBookingElement => {
    const bookingTime = parseInt(webBookingElement.getAttribute('data-web-booking-time'));
    if (bookingTime) {
      const elapsedMs = Date.now() - bookingTime;
      const totalSeconds = Math.floor(elapsedMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = String(totalSeconds % 60).padStart(2, '0');

      let elapsedTime;
      if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = String(minutes % 60).padStart(2, '0');
        elapsedTime = `${hours}:${remainingMinutes}:${seconds}`;
      } else {
        elapsedTime = `${minutes}:${seconds}`;
      }

      // Extract the badge if it exists
      const badge = webBookingElement.querySelector('[id^="chat-new-badge-"]');

      // Find the span with highlight class
      const highlightSpan = webBookingElement.querySelector('span[class*="bg-slate-"]');
      if (highlightSpan) {
        // Update the text inside the highlight span
        highlightSpan.textContent = `[${elapsedTime}] Web booking (Now)`;
      }
    }
  });
}

// --- Initial Setup ---

// 0. Clean up any stray mobile state classes on load
document.querySelectorAll('.row-selected').forEach(row => {
  row.classList.remove('row-selected');
});
document.querySelectorAll('.mobile-action-row').forEach(row => {
  row.remove();
});

// 1. Add scroll event listener
// 사용자가 스크롤을 시작하면 버튼 상태가 동적으로 업데이트됩니다.

waitlistContainer.addEventListener('scroll', () => {
  //const currentScrollTop = waitlistContainer.scrollTop;
  //console.log(`SCROLL_EVENT: User scrolled to position: ${currentScrollTop.toFixed(2)}px`);
  updateScrollAndButtonState();
});


// 2. Initialize data loading and setup after completion
async function startInitialization() {
  try {
    // Load or reset badge state from localStorage with date-based keys (once only on page load)
    // This must be done BEFORE getServerSideUpdate() so badge state is ready for first render
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const storageKey = `chatBadgeHidden_${todayStr}`;

    if (isResetLocalStorage) {
      // Reset localStorage on every load
      chatBadgeHidden = {};
      chatBadgeType = {};
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`chatBadgeType_${todayStr}`);
      //console.log('INIT: Reset mode enabled - cleared all badge states');
    } else {
      // Load from localStorage for today's date only
      const savedChat = localStorage.getItem(storageKey);
      const savedType = localStorage.getItem(`chatBadgeType_${todayStr}`);
      //console.log('INIT: localStorage key:', storageKey);
      //console.log('INIT: localStorage raw value:', savedChat);
      //console.log('INIT: localStorage badge type value:', savedType);

      if (savedChat) {
        try {
          chatBadgeHidden = JSON.parse(savedChat);
          //console.log('INIT: Loaded badge state from localStorage:', Object.keys(chatBadgeHidden).length, 'items');
          //console.log('INIT: Badge state:', chatBadgeHidden);
        } catch (e) {
          console.error('Failed to parse chatBadgeHidden from localStorage:', e);
          chatBadgeHidden = {};
        }
      } else {
        // First load of the day - will initialize after data is loaded
        chatBadgeHidden = {};
        //console.log('INIT: No localStorage found for today - will initialize after data load');
      }

      if (savedType) {
        try {
          chatBadgeType = JSON.parse(savedType);
          //console.log('INIT: Loaded badge type from localStorage:', Object.keys(chatBadgeType).length, 'items');
          //console.log('INIT: Badge types:', chatBadgeType);
        } catch (e) {
          console.error('Failed to parse chatBadgeType from localStorage:', e);
          chatBadgeType = {};
        }
      } else {
        chatBadgeType = {};
        //console.log('INIT: No badge type found in localStorage');
      }

      // Clean up old date entries (keep only today's data)
      Object.keys(localStorage).forEach(key => {
        if ((key.startsWith('chatBadgeHidden_') || key.startsWith('chatBadgeType_')) && 
            key !== storageKey && key !== `chatBadgeType_${todayStr}`) {
          localStorage.removeItem(key);
          //console.log('INIT: Cleaned up old localStorage key:', key);
        }
      });
    }

    // Load static data first (once only)
    await loadStaticData();

    // Load dynamic data (this will render the waitlist)
    await getServerSideUpdate();

    // If this is first load of the day (no localStorage), initialize all bookings as "seen"
    if (!isResetLocalStorage && Object.keys(chatBadgeHidden).length === 0 && waitlist.length > 0) {
      waitlist.forEach(item => {
        if (item.subscriber_id && item.booking_list_id) {
          const badgeKey = `${item.subscriber_id}_${item.booking_list_id}`;
          chatBadgeHidden[badgeKey] = true;
        }
      });
      // Save initial state to localStorage
      localStorage.setItem(storageKey, JSON.stringify(chatBadgeHidden));
      //console.log('INIT: First load today - initialized', Object.keys(chatBadgeHidden).length, 'bookings as seen');

      // Re-render to hide all badges
      renderWaitlist();
    }

    // Initial scroll setup: Set position and initial button state after data is loaded and rendered
    // requestAnimationFrame을 사용하여 DOM이 렌더링된 후 정확한 위치로 이동합니다.
    requestAnimationFrame(() => {
      //console.log("INIT: DOM rendered. Waiting for dummy row to be added...");

      // Wait for dummy row to be added (it's added in another requestAnimationFrame in renderWaitlist)
      requestAnimationFrame(() => {
        //console.log("INIT: Dummy row added. Starting initial scroll/state calculation.");

        // 1. 초기 스크롤 목표 위치를 계산하고 동적 높이 설정을 업데이트합니다.
        const scrollTarget = updateScrollAndButtonState();
        const completedItemsCount = waitlist.filter(item => getSortPriority(item.status) === 0).length;

        const rows = waitlistBody.getElementsByTagName('tr');
        // NEW: Calculate row height based on a rendered row (must be done after render)
        if (rows.length > 0) {
          rowHeight = rows[0].offsetHeight;
          //console.log(`INIT: Measured single rowHeight for update: ${rowHeight.toFixed(2)}px`);
        }

        //console.log(`INIT: Calculated scrollTarget = ${scrollTarget.toFixed(2)}px. Completed items = ${completedItemsCount}`);

        // 2. Completed items가 있으면 항상 스크롤 실행 (더미 row로 인해 항상 스크롤 가능)
        const totalRows = waitlist.length;
        const shouldScrollToActive = completedItemsCount > 0;
        //console.log(`INIT: Total rows: ${totalRows}, Completed items: ${completedItemsCount}, shouldScrollToActive: ${shouldScrollToActive}`);

        if (shouldScrollToActive) {
          // Disable hover temporarily during scroll
          waitlistContainer.classList.add('disable-hover');

          // 스크롤 위치를 즉시 설정합니다. (비헤이비어 'auto')
          waitlistContainer.scrollTop = scrollTarget;
          //console.log(`INIT: Forced scroll to position: ${scrollTarget.toFixed(2)}px`);

          // Re-enable hover only when the user actually interacts (mousemove or window focus)
          const reenableHover = () => {
            waitlistContainer.classList.remove('disable-hover');
            //console.log('INIT: Hover re-enabled after user interaction');
            document.removeEventListener('mousemove', reenableHover);
            window.removeEventListener('focus', reenableHover);
            clearTimeout(reenableFallback);
          };

          // If the user moves the mouse (or window gains focus), re-enable hover immediately
          document.addEventListener('mousemove', reenableHover, { once: true });
          window.addEventListener('focus', reenableHover, { once: true });

          // Fallback: if no interaction occurs within 8s, re-enable to avoid permanently disabling hover
          const reenableFallback = setTimeout(() => {
            waitlistContainer.classList.remove('disable-hover');
            //console.log('INIT: Hover re-enabled by fallback after 8s');
            document.removeEventListener('mousemove', reenableHover);
            window.removeEventListener('focus', reenableHover);
          }, 8000);

          // 실제 스크롤된 위치를 다음 프레임에서 읽어서 정확한 값을 저장
          requestAnimationFrame(() => {
            // 더 정확한 스크롤을 위해 한 번 더 시도
            const actualScrollTop = waitlistContainer.scrollTop;
            if (Math.abs(actualScrollTop - scrollTarget) > 2) {
              //console.log(`INIT: Adjusting scroll position. First attempt: ${actualScrollTop.toFixed(2)}px`);
              waitlistContainer.scrollTop = scrollTarget;

              // 조정 후 다시 한번 확인
              requestAnimationFrame(() => {
                initialScrollTop = waitlistContainer.scrollTop;
                //console.log(`INIT: InitialScrollTop value recorded (final): ${initialScrollTop.toFixed(2)}px`);
                //console.log(`INIT: Final difference: ${(scrollTarget - initialScrollTop).toFixed(2)}px`);
              });
            } else {
              initialScrollTop = actualScrollTop;
              //console.log(`INIT: InitialScrollTop value recorded (actual): ${initialScrollTop.toFixed(2)}px`);
              //console.log(`INIT: Difference between target and actual: ${(scrollTarget - initialScrollTop).toFixed(2)}px`);
            }
          });
        } else {
          initialScrollTop = 0; // Ensure it's 0 if no initial scroll occurred
          //console.log("INIT: No completed items, skipping initial forced scroll.");
        }

        // 3. 스크롤 위치 설정 직후 버튼 상태를 업데이트하여 즉시 비활성화하고 텍스트를 변경합니다.
        updateScrollAndButtonState();
        //console.log("INIT: Final button state check completed.");

        // 4. 초기 설정이 완료되었음을 플래그로 표시합니다. 
        isInitialScrollDone = true;
        //console.log("INIT: isInitialScrollDone set to TRUE. Enabling dynamic button logic.");
      });
    });

  } catch (error) {
    console.error('INIT: Error during initialization:', error);
    // Fallback: render with mock data if database loading fails
    renderWaitlist();
  }
}

/**
 * Handles Pax click action.
 * This function is called when the Pax span is clicked on an already selected row.
 * @param {number} booking_list_id - The booking list ID
 */
function changePax(booking_list_id) {
  console.log(`PAX_CHANGE: Triggered for booking_list_id: ${booking_list_id}`);

  // Find the booking item to get current pax
  const item = waitlist.find(i => i.booking_list_id == booking_list_id);
  if (!item) {
    console.error('PAX_CHANGE: Could not find booking with booking_list_id:', booking_list_id);
    return;
  }

  const currentPax = item.pax;

  // Check if dialog already exists, if so remove it
  let dialog = document.getElementById('change-pax-dialog');
  if (dialog) {
    dialog.remove();
  }

  // Create new dialog
  dialog = document.createElement('dialog');
  dialog.id = 'change-pax-dialog';
  dialog.className = 'rounded-xl shadow-2xl border border-slate-700 bg-slate-800 p-0 backdrop:bg-black backdrop:bg-opacity-70';
  dialog.style.maxWidth = '90vw';
  dialog.style.maxHeight = '95vh';

  // Dialog content
  dialog.innerHTML = `
    <div class="flex flex-col h-full w-full min-w-[280px] max-w-[400px]">
      <!-- Header -->
      <div class="flex justify-between items-center p-6 border-b border-slate-700">
        <h2 class="text-xl font-semibold text-slate-100">Change Pax</h2>
      </div>
      
      <!-- Content -->
      <div class="flex-1 p-6">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Current Pax: ${currentPax}</label>
          </div>
          
          <!-- Pax Counter -->
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">New Pax</label>
            <div class="flex items-center justify-center gap-4">
              <button onclick="decrementChangePax()" class="w-12 h-12 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600 flex items-center justify-center transition">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
              <span id="change-pax-counter" class="text-3xl font-semibold text-slate-100 w-16 text-center">${currentPax}</span>
              <button onclick="incrementChangePax()" class="w-12 h-12 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600 flex items-center justify-center transition">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="flex justify-end gap-3 p-6 border-t border-slate-700">
        <button onclick="closeChangePaxDialog()" class="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition">
          Cancel
        </button>
        <button onclick="submitChangePax(${booking_list_id})" class="px-4 py-2 rounded-lg bg-amber-400 text-slate-900 hover:bg-amber-500 transition font-medium">
          Update
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);

  // Show dialog
  dialog.showModal();

  // Close on backdrop click
  dialog.addEventListener('click', (e) => {
    const rect = dialog.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      closeChangePaxDialog();
    }
  });
}

/**
* Increment pax counter in change pax dialog
*/
function incrementChangePax() {
  const counter = document.getElementById('change-pax-counter');
  if (counter) {
    let currentValue = parseInt(counter.textContent);
    counter.textContent = currentValue + 1;
  }
}

/**
 * Decrement pax counter in change pax dialog (minimum 1)
 */
function decrementChangePax() {
  const counter = document.getElementById('change-pax-counter');
  if (counter) {
    let currentValue = parseInt(counter.textContent);
    if (currentValue > 1) {
      counter.textContent = currentValue - 1;
    }
  }
}

/**
 * Close change pax dialog
 */
function closeChangePaxDialog() {
  const dialog = document.getElementById('change-pax-dialog');
  if (dialog) {
    dialog.close();
    dialog.remove();
  }
}

/**
 * Submit change pax request
 */
function submitChangePax(booking_list_id) {
  const counter = document.getElementById('change-pax-counter');
  const newPax = parseInt(counter.textContent);

  // Find the booking item to get current pax
  const item = waitlist.find(i => i.booking_list_id == booking_list_id);
  if (!item) {
    console.error('PAX_CHANGE: Could not find booking with booking_list_id:', booking_list_id);
    toastMsg('Error: Booking not found');
    return;
  }

  const currentPax = item.pax;

  // Check if pax value has changed
  if (newPax === currentPax) {
    console.log(`PAX_CHANGE: No change detected (current: ${currentPax}, new: ${newPax}). Closing dialog.`);
    toastMsg('No change in pax');
    closeChangePaxDialog();
    return;
  }

  console.log(`PAX_CHANGE: Updating booking_list_id ${booking_list_id} from ${currentPax} to ${newPax}`);

  const payload = {
    store_id: store_id,
    booking_flow: 2.2,
    booking_list_id: booking_list_id,
    subscriber_id: item.subscriber_id,
    pax_new: newPax,
    session_id: sessionId
  };

  console.log('PAX_CHANGE: Payload includes session_id:', sessionId);

  // Send data to local_receiver.php
  fetch('webhook/local_receiver.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Server response:', data);

      if (data.success) {
        // Update local data
        item.pax = newPax;
        console.log(`PAX_CHANGE: Local data updated for booking_list_id ${booking_list_id}`);

        // Re-render waitlist to show updated pax
        renderWaitlist();
        console.log('PAX_CHANGE: Waitlist re-rendered');

        toastMsg('Pax updated successfully');
        closeChangePaxDialog();
      } else {
        toastMsg('Failed to update pax');
      }
    })
    .catch((error) => {
      console.error('Failed to update pax:', error);
      toastMsg('Failed to update pax');
    });
}


// 3. Start the initialization process
startInitialization();

// 4. Set up the non-rendering interval:
// Updates elapsed times every second.
setInterval(updateElapsedTimes, 1000);

// 5. Add window resize listener: Scrollability and height calculations change on resize.
// 창 크기가 변경될 때 버튼 상태를 업데이트합니다.
window.addEventListener('resize', () => {
  updateScrollAndButtonState();

  // Clean up mobile state when switching to desktop
  if (window.innerWidth > 768) {
    // Remove all mobile action rows
    document.querySelectorAll('.mobile-action-row').forEach(row => row.remove());
    // Reset mobile row tracking
    expandedRowId = null;
    console.log('RESIZE: Switched to desktop, cleaned up mobile state');
  } else {
    // Reset desktop selection when switching to mobile
    selectedRowId = null;
    console.log('RESIZE: Switched to mobile, reset desktop selection');
  }

  // Reset scroll position on device change
  savedScrollPosition = null;

  // Re-render to update chat display
  renderWaitlist();
});