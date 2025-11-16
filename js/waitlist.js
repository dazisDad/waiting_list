const store_id = 'DL_Sunway_Geo';

let waitlist = [];
let chatlist = [];
let questionnaire = [];

const minPax_for_bigTable = 5;
const maxPax_for_smallTable = 1;

// --- Database Connection ---
// Connector 인스턴스 생성 (preProd 환경, urlPrefix는 waitlist.html 기준 상대 경로)
const connector = new Connector('preProd', '');

// 페이지 로딩 시 booking_list 테이블 데이터 가져오기
async function fetchBookingList(booking_from = 'QR') {
  try {
    // Get today's date in YYYY-MM-DD format for filtering
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // booking_list 테이블에서 조건에 맞는 데이터 가져오기
    const result = await connector.selectWhere('waitlist', 'booking_list', {
      template: 'store_id = ? AND booking_from = ? AND DATE(time_created) = ?',
      values: [store_id, booking_from, todayStr],
      types: 'sss' // string, string, string
    });
    
    if (result.success && result.data) {
      
      // 날짜 필드들을 timestamp (밀리초)로 변환
      const processedData = result.data.map(item => {
        const processedItem = { ...item };
        
        // time_created 변환
        if (processedItem.time_created) {
          processedItem.time_created = new Date(processedItem.time_created).getTime();
        }
        
        // time_cleared 변환 (null일 수 있음)
        if (processedItem.time_cleared) {
          processedItem.time_cleared = new Date(processedItem.time_cleared).getTime();
        }
        
        // dine_dateTime 변환 (null일 수 있음)
        if (processedItem.dine_dateTime) {
          processedItem.dine_dateTime = new Date(processedItem.dine_dateTime).getTime();
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

// 서버 사이드 업데이트 함수 - 데이터베이스에서 최신 데이터를 가져와서 전역 변수를 업데이트하고 렌더링
// 페이지 로딩 시 초기화와 수동 데이터 새로고침 모두에 사용됨
async function getServerSideUpdate() {
  try {
    console.log('SERVER_UPDATE: Starting server-side data update...');
    
    // 모든 데이터를 병렬로 가져오기
    const [waitlistData, chatData, questionsData] = await Promise.all([
      fetchBookingList(),
      fetchChatHistory(),
      fetchAskQList()
    ]);
    
    console.log('SERVER_UPDATE: All data loaded successfully');
    console.log('- Waitlist items:', waitlistData?.length || 0);
    console.log('- Chat records:', chatData?.length || 0); 
    console.log('- Questions:', questionsData?.length || 0);

    // 전역 변수 오버라이드
    waitlist = waitlistData;
    chatlist = chatData;
    questionnaire = questionsData;

    console.log(questionnaire);

    console.log('SERVER_UPDATE: Global variables updated, re-rendering waitlist...');
    
    // 새 데이터로 렌더링
    renderWaitlist();
    
    console.log('SERVER_UPDATE: Update completed successfully');
    
  } catch (error) {
    console.error('SERVER_UPDATE: Error during server-side update:', error);
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
  const customer = waitlist.find(item => item.booking_number === booking_number);
  const customerQLevel = customer ? customer.q_level : 0;
  const bookingListId = customer ? customer.booking_list_id : null;

  // Get all questions from chat history for this booking_list_id
  const askedQuestions = new Set();
  if (bookingListId) {
    chatlist
      .filter(chat => chat.booking_list_id === bookingListId)
      .forEach(chat => {
        // Extract question from "Q: <question text>" format
        const match = chat.qna.match(/^Q:\s*(.+)/);
        if (match) {
          askedQuestions.add(match[1]);
        }
      });
  }

  return questionnaire.filter(q => {
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

    return true;
  });
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
  const questionButtons = pageQuestions.map(q => {
    // Mobile: flex-1 (auto width), Desktop: flex-1 (equal distribution)
    const flexClass = 'flex-1';
    const classes = `${baseClasses} ${btnClass} ${flexClass}`;
    // Find booking_list_id from waitlist using booking_number
    const customer = waitlist.find(item => item.booking_number === booking_number);
    const bookingListId = customer ? customer.booking_list_id : null;
    const fnCall = `handleQuestion(${bookingListId}, '${q.question.replace(/'/g, "\\'")}', ${q.q_level})`;
    const onclickHandler = isMobile
      ? `${fnCall}`
      : `${fnCall}; setTimeout(() => this.blur(), 100);`;
    return `<button onclick="${onclickHandler}" class="${classes}">${q.question}</button>`;
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

// Define the Tailwind class for maximum height
const MAX_HEIGHT_CLASS = 'max-h-[60vh]';

// Number of rows to display on screen (including completed items)
const displayedRows = 7;

// --- Global State Variables ---
let isInitialScrollDone = false;
let initialScrollTop = 0; // 초기 스크롤 탑 값 저장 변수 (Active Queue의 시작 위치를 추적)
let rowHeight = 0; // 단일 행의 높이 (Check-In/Cancel 시 initialScrollTop 업데이트에 사용)
let expandedRowId = null; // 현재 확장된 행의 ID (모바일용)
let askModeItems = new Set(); // Track which items are in "Ask mode" showing question buttons
let questionPageIndex = {}; // Track current question page for each booking_number (default 0)

// --- Action Button Definitions ---
const actionButtonDefinitions = [
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
 */
function getButtonsForStatus(status) {
  return actionButtonDefinitions.filter(btn => btn.showForStatus.includes(status));
}

/**
 * Helper function to generate button HTML
 */
function generateButtonHTML(buttonDef, booking_number, customer_name, isMobile) {
  const baseClasses = 'action-button px-3 py-1.5 rounded-md border font-medium text-sm';
  const btnClass = isMobile ? buttonDef.mobileBtnClass : buttonDef.desktopBtnClass;
  let classes = `${baseClasses} ${btnClass} flex-1`;

  // Special handling for Ask and Ready buttons
  let isDisabled = false;
  const item = waitlist.find(i => i.booking_number === booking_number);
  
  if (buttonDef.functionName === 'handleAsk') {
    if (item) {
      const filteredQuestions = getFilteredQuestions(item.pax, booking_number);
      if (filteredQuestions.length === 0) {
        // No questions available - make button grey and disabled
        isDisabled = true;
        const disabledBtnClass = isMobile ? 'mobile-btn-disabled' : 'btn-disabled';
        classes = `${baseClasses} ${disabledBtnClass} flex-1`;
      }
    }
  } else if (buttonDef.functionName === 'handleReady') {
    if (item && item.q_level >= 300) {
      // Already ready (q_level >= 300) - make button grey and disabled
      isDisabled = true;
      const disabledBtnClass = isMobile ? 'mobile-btn-disabled' : 'btn-disabled';
      classes = `${baseClasses} ${disabledBtnClass} flex-1`;
    }
  }

  // Special handling for Ready button - use touchstart/mousedown instead of click for long press
  if (buttonDef.functionName === 'handleReady' && !isDisabled) {
    // Ready button needs special event handling for long press
    const readyHandlerCall = `handleReadyWithLongPress(${booking_number}, '${customer_name}', event)`;
    const onTouchStart = `ontouchstart="${readyHandlerCall}"`;
    const onMouseDown = `onmousedown="${readyHandlerCall}"`;
    // Add blur for desktop after long press completes
    const preventClick = isMobile 
      ? `onclick="event.preventDefault(); return false;"`
      : `onclick="event.preventDefault(); setTimeout(() => this.blur(), 100); return false;"`;
    
    return `<button ${onTouchStart} ${onMouseDown} ${preventClick} class="${classes}">${buttonDef.label}</button>`;
  }

  // Standard button handling for all other buttons
  const needsEvent = ['handleAsk'].includes(buttonDef.functionName);
  const fnCall = needsEvent
    ? `${buttonDef.functionName}(${booking_number}, '${customer_name}', event)`
    : `${buttonDef.functionName}(${booking_number}, '${customer_name}')`;

  // Add blur on click to remove focus highlight (desktop only)
  const onclickHandler = isMobile
    ? `${fnCall}`
    : `${fnCall}; setTimeout(() => this.blur(), 100);`;

  // If disabled, prevent onclick
  const finalOnclickHandler = isDisabled ? '' : `onclick="${onclickHandler}"`;
  const disabledAttr = isDisabled ? 'disabled' : '';

  return `<button ${finalOnclickHandler} ${disabledAttr} class="${classes}">${buttonDef.label}</button>`;
}

/**
 * Mobile: Toggle mobile action row for a specific item
 * Desktop: Toggle row highlight and exit Ask mode for other rows
 */
function toggleMobileActions(booking_number, event) {
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

    // Exit Ask mode for other rows when clicking a different row
    const askModeItemsArray = Array.from(askModeItems);
    if (askModeItemsArray.length > 0 && !askModeItems.has(booking_number)) {
      askModeItems.clear();
      console.log(`ASK_MODE: Auto-exited for items ${askModeItemsArray.join(', ')} when clicking row #${booking_number} (desktop)`);
      // Re-render to update the UI
      renderWaitlist();
    }

    // Toggle persistent highlight on the row
    highlightRow(booking_number, false);
    console.log(`DESKTOP: Toggled highlight for row #${booking_number}`);
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
    if (existingMobileRow) {
      existingMobileRow.remove();
    }
    if (currentRow) {
      // Force immediate class removal
      currentRow.classList.remove('row-selected');
      // Force reflow to ensure immediate visual update
      void currentRow.offsetHeight;
    }
    expandedRowId = null;
    console.log(`MOBILE: Collapsed row for item #${booking_number}`);
    return;
  }

  // If another row is expanded, close it first
  if (expandedRowId !== null) {
    const prevMobileRow = document.getElementById(`mobile-actions-${expandedRowId}`);
    if (prevMobileRow) {
      prevMobileRow.remove();
    }
    const prevRow = document.querySelector(`tr[data-item-id="${expandedRowId}"]`);
    if (prevRow) {
      prevRow.classList.remove('row-selected');
      // Force reflow
      void prevRow.offsetHeight;
    }
    // Exit Ask mode for the previous row
    if (askModeItems.has(expandedRowId)) {
      askModeItems.delete(expandedRowId);
      console.log(`ASK_MODE: Auto-exited for #${expandedRowId} when switching to #${booking_number}`);
    }
  }

  // Add highlight to the newly selected row immediately
  if (currentRow) {
    // Force reflow before adding class to ensure clean state
    void currentRow.offsetHeight;
    currentRow.classList.add('row-selected');
    // Force another reflow to ensure immediate application
    void currentRow.offsetHeight;
  }

  // Expand the clicked row
  expandedRowId = booking_number;
  const item = waitlist.find(i => i.booking_number === booking_number);
  if (!item) return;

  // Get buttons for this item's status
  let buttonHTMLs;

  // Check if this item is in Ask mode
  if (askModeItems.has(item.booking_number)) {
    // Show question buttons + Exit button (mobile) - filtered by pax and q_level
    const filteredQuestions = getFilteredQuestions(item.pax, item.booking_number);
    const questionButtonsHTML = generateQuestionButtonsHTML(filteredQuestions, item.booking_number, item.customer_name, true);
    buttonHTMLs = [questionButtonsHTML];
  } else {
    // Show normal buttons
    const buttons = getButtonsForStatus(item.status);
    buttonHTMLs = buttons.map(btnDef => generateButtonHTML(btnDef, item.booking_number, item.customer_name, true));
  }

  const actionButtons = buttonHTMLs.join('\n');

  // Find the main row and insert mobile action row after it
  const mainRow = document.querySelector(`tr[data-item-id="${booking_number}"]`);
  if (mainRow) {
    const mobileRow = document.createElement('tr');
    mobileRow.id = mobileActionRowId;
    mobileRow.className = 'mobile-action-row';
    mobileRow.innerHTML = `
          <td colspan="4" class="px-2 py-3">
            <div class="flex gap-1.5">
              ${actionButtons}
            </div>
          </td>
        `;

    // Insert after the main row
    mainRow.insertAdjacentElement('afterend', mobileRow);
    console.log(`MOBILE: Expanded row for item #${booking_number}`);
  }
}

/**
 * For completed items (Check-In/Cancelled), returns object with completion time and duration.
 * For active items (Waiting/Called), shows current elapsed time from time_created.
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
    const durationMs = item.time_cleared - item.time_created;
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
    const elapsedMs = Date.now() - item.time_created;
    const totalSeconds = Math.floor(elapsedMs / 1000);

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
async function handleReadyWithLongPress(booking_number, customer_name, event) {
  // Check for long press first
  const longPress = await isLongPress(event);
  if (!longPress) {
    console.log(`ACTION: Ready button press too short for ${customer_name} (#${booking_number}). Long press required.`);
    toastMsg('Long-press required for \'Ready\'', 2000);
    return; // Exit if not a long press
  }

  // Call the actual Ready handler
  await handleReadyInternal(booking_number, customer_name, event);
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
async function handleReadyInternal(booking_number, customer_name, event) {
  console.log(`ACTION: Marking customer ${customer_name} (#${booking_number}) as ready.`);
  console.log(`INFO: [${customer_name}, #${booking_number}] 고객님께 테이블이 준비되었음을 알립니다.`);
  
  // Check if mobile - on desktop, highlight the row and flash button
  const isMobile = window.innerWidth <= 768;

  if (!isMobile) {
    // Desktop: Flash row (temporary) and flash button
    highlightRow(booking_number, true);
    flashButton(event);
  }

  const item = waitlist.find(item => item.booking_number === booking_number);
  
  // Find the Ready button question from questionnaire
  const readyQuestion = questionnaire.find(q => q.invokedWithBtn === 'Ready');
  if (readyQuestion) {
    handleQuestion(item.booking_list_id, readyQuestion.question);
  } else {
    // Fallback to default question if no Ready question found in questionnaire
    console.warn('No Ready button question found in questionnaire, using fallback');
    handleQuestion(item.booking_list_id, 'Table is Ready. Coming?');
  }

  // Update database and local data
  if (item) {
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
      
      if (!updateResult.success) {
        console.error('Database update failed:', updateResult.error);
        return; // Exit if database update failed
      }
      
      console.log('Database updated successfully for booking #' + booking_number);
      
      // 2. Update local data after successful database update
      item.status = 'Ready';
      item.q_level = 300; // Update q_level to match database
      
      // 3. Re-render to immediately update button state
      renderWaitlist();
      
    } catch (error) {
      console.error('Error updating database:', error);
      return; // Exit if there's an error
    }
  }
}

function handleAsk(booking_number, customer_name, event) {
  console.log(`ACTION: Asking customer ${customer_name} (#${booking_number}).`);
  console.log(`INFO: [${customer_name}, #${booking_number}]에게 메시지/문의 창을 엽니다.`);

  // Check if mobile - on desktop, highlight the row (no flash button to avoid interference)
  const isMobile = window.innerWidth <= 768;

  if (!isMobile) {
    // Desktop: Flash row (temporary) only
    highlightRow(booking_number, true);
  }

  // Toggle Ask mode for this item
  if (askModeItems.has(booking_number)) {
    askModeItems.delete(booking_number);
    console.log(`ASK_MODE: Disabled for #${booking_number}. Current set:`, Array.from(askModeItems));
  } else {
    // Exit Ask mode for all other items before enabling for this one
    if (askModeItems.size > 0) {
      const previousItems = Array.from(askModeItems);
      askModeItems.clear();
      console.log(`ASK_MODE: Auto-exited for items ${previousItems.join(', ')} when enabling for #${booking_number}`);
    }
    askModeItems.add(booking_number);
    console.log(`ASK_MODE: Enabled for #${booking_number}. Current set:`, Array.from(askModeItems));
  }

  // Re-render to show question buttons
  renderWaitlist();

  // On mobile, re-open the action row after rendering
  if (isMobile) {
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      // Re-trigger mobile action row expansion
      const mainRow = document.querySelector(`tr[data-item-id="${booking_number}"]`);
      if (mainRow) {
        // Simulate the expansion logic
        expandedRowId = booking_number;
        const item = waitlist.find(i => i.booking_number === booking_number);
        if (!item) return;

        const mobileActionRowId = `mobile-actions-${booking_number}`;
        let buttonHTMLs;

        // Check if this item is in Ask mode
        if (askModeItems.has(item.booking_number)) {
          // Show question buttons + Exit button (mobile) - filtered by pax and q_level
          const filteredQuestions = getFilteredQuestions(item.pax, item.booking_number);
          const questionButtonsHTML = generateQuestionButtonsHTML(filteredQuestions, item.booking_number, item.customer_name, true);
          buttonHTMLs = [questionButtonsHTML];
        } else {
          // Show normal buttons
          const buttons = getButtonsForStatus(item.status);
          buttonHTMLs = buttons.map(btnDef => generateButtonHTML(btnDef, item.booking_number, item.customer_name, true));
        }

        const actionButtons = buttonHTMLs.join('\n');

        const mobileRow = document.createElement('tr');
        mobileRow.id = mobileActionRowId;
        mobileRow.className = 'mobile-action-row';
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
        console.log(`MOBILE: Re-opened action row for #${booking_number} after Ask mode toggle`);
      }
    });
  }
}

/**
 * Handles question button click - logs the question and inserts into database
 */
async function handleQuestion(booking_list_id, question, q_level = null) {
  console.log(`QUESTION: booking_list_id: ${booking_list_id}, question: ${question}, q_level: ${q_level}`);

  try {
    // Format current time for database insertion
    const currentTime = new Date();
    const formattedTime = currentTime.getFullYear() + '-' + 
      String(currentTime.getMonth() + 1).padStart(2, '0') + '-' + 
      String(currentTime.getDate()).padStart(2, '0') + ' ' +
      String(currentTime.getHours()).padStart(2, '0') + ':' +
      String(currentTime.getMinutes()).padStart(2, '0') + ':' +
      String(currentTime.getSeconds()).padStart(2, '0');

    // Insert question into history_chat table
    const updateResult = await connector.updateDataArr(
      'waitlist', // dbKey
      'history_chat', // tableName
      [{
        booking_list_id: booking_list_id,
        dateTime: formattedTime,
        qna: `Q: ${question}`
      }], // dataSetArr
    );

    if (!updateResult.success) {
      console.error('Database insert failed:', updateResult.error);
      return; // Exit if database insert failed
    }

    console.log('Question inserted successfully into history_chat for booking_list_id:', booking_list_id);

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

      if (!qLevelUpdateResult.success) {
        console.error('Q-level database update failed:', qLevelUpdateResult.error);
      } else {
        console.log('Q-level updated successfully for booking_list_id:', booking_list_id, 'to:', q_level);
        
        // Update local waitlist data
        const item = waitlist.find(item => item.booking_list_id === booking_list_id);
        if (item) {
          item.q_level = q_level;
          console.log('Local q_level updated for booking_list_id:', booking_list_id);
        }
      }
    }

    // Add the new chat record to local chatlist for immediate UI update
    const newChatRecord = {
      booking_list_id: booking_list_id,
      dateTime: Date.now(), // Use current timestamp in milliseconds for local data
      qna: `Q: ${question}`,
      Id: Date.now() // Use timestamp as temporary ID
    };
    chatlist.push(newChatRecord);

    // Re-render to show the new question in chat history
    renderWaitlist();

  } catch (error) {
    console.error('Error inserting question into database:', error);
  }
}

/**
 * Navigate to next page of questions
 */
function handleNextQuestion(booking_number) {
  console.log(`ACTION: Next question page for booking #${booking_number}`);
  const item = waitlist.find(i => i.booking_number === booking_number);
  if (!item) return;

  const filteredQuestions = getFilteredQuestions(item.pax, booking_number);
  const MAX_QUESTIONS_PER_PAGE = 3;
  const totalPages = Math.ceil(filteredQuestions.length / MAX_QUESTIONS_PER_PAGE);

  // Increment page index and wrap around
  const currentPage = questionPageIndex[booking_number] || 0;
  questionPageIndex[booking_number] = (currentPage + 1) % totalPages;

  console.log(`QUESTION_PAGE: #${booking_number} moved to page ${questionPageIndex[booking_number]} of ${totalPages}`);

  // Re-render to show next page of questions
  renderWaitlist();

  // On mobile, re-open the action row after rendering
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    requestAnimationFrame(() => {
      const mainRow = document.querySelector(`tr[data-item-id="${booking_number}"]`);
      if (mainRow) {
        expandedRowId = booking_number;
        const questionButtonsHTML = generateQuestionButtonsHTML(filteredQuestions, booking_number, item.customer_name, true);

        const mobileActionRowId = `mobile-actions-${booking_number}`;
        const mobileRow = document.createElement('tr');
        mobileRow.id = mobileActionRowId;
        mobileRow.className = 'mobile-action-row';
        mobileRow.innerHTML = `
              <td colspan="4" class="px-2 py-3">
                <div class="flex gap-1.5">
                  ${questionButtonsHTML}
                </div>
              </td>
            `;

        mainRow.insertAdjacentElement('afterend', mobileRow);
        mainRow.classList.add('row-selected');
        console.log(`MOBILE: Re-opened action row for #${booking_number} after Next`);
      }
    });
  }
}

/**
 * Exits Ask mode and returns to normal button view
 */
function handleExitAsk(booking_number) {
  console.log(`ACTION: Exiting Ask mode for booking #${booking_number}`);
  askModeItems.delete(booking_number);
  // Reset question page when exiting Ask mode
  delete questionPageIndex[booking_number];
  renderWaitlist();
}

/**
 * Handles customer actions (Arrive). Updates initialScrollTop and performs scroll.
 */
async function handleArrive(booking_number, customer_name) {
  console.log(`ACTION: Customer ${customer_name} (#${booking_number}) has arrived.`);
  const item = waitlist.find(item => item.booking_number === booking_number);
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
      
      if (!updateResult.success) {
        console.error('Database update failed:', updateResult.error);
        return; // Exit if database update failed
      }
      
      console.log('Database updated successfully for booking #' + booking_number);
      
      // 2. Update local data after successful database update
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

  // IMPORTANT FIX: Scroll must happen AFTER the DOM is updated by renderWaitlist.
  if (shouldScroll) {
    requestAnimationFrame(() => {
      // Find the position of the just completed item in the DOM
      const rows = waitlistBody.getElementsByTagName('tr');
      let targetScrollTop = 0;
      let itemFound = false;

      // Look for the row that contains the just completed item
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const idCell = row.querySelector('td:first-child');
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
        initialScrollTop = targetScrollTop;

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
}

/**
 * Handles customer actions (Cancel). Updates initialScrollTop and performs scroll.
 */
async function handleCancel(booking_number, customer_name) {
  console.log(`ACTION: Cancelling customer ${customer_name} (#${booking_number}).`);
  const item = waitlist.find(item => item.booking_number === booking_number);
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
      
      if (!updateResult.success) {
        console.error('Database update failed:', updateResult.error);
        return; // Exit if database update failed
      }
      
      console.log('Database updated successfully for booking #' + booking_number);
      
      // 2. Update local data after successful database update
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

  // IMPORTANT FIX: Scroll must happen AFTER the DOM is updated by renderWaitlist.
  if (shouldScroll) {
    requestAnimationFrame(() => {
      // Find the position of the just completed item in the DOM
      const rows = waitlistBody.getElementsByTagName('tr');
      let targetScrollTop = 0;
      let itemFound = false;

      // Look for the row that contains the just completed item
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const idCell = row.querySelector('td:first-child');
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
        initialScrollTop = targetScrollTop;

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
}

/**
 * Handles Undo action for completed items (Arrived/Cancelled).
 * Restores the item to "Waiting" status with highlight effect.
 */
async function handleUndo(booking_number, customer_name) {
  console.log(`ACTION: Undo for customer ${customer_name} (#${booking_number}).`);
  const item = waitlist.find(item => item.booking_number === booking_number);

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
      
      // 2. Update local data after successful database update
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

  // Add highlight effect to the restored item
  requestAnimationFrame(() => {
    const rows = waitlistBody.getElementsByTagName('tr');
    const targetRow = Array.from(rows).find(row => {
      const idCell = row.querySelector('td:first-child');
      return idCell && idCell.textContent.trim() === booking_number.toString();
    });

    if (targetRow) {
      targetRow.classList.add('arrive-highlight'); // Reuse purple highlight for Undo
      console.log(`HIGHLIGHT: Added purple highlight to Undo item #${booking_number}`);

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
  const shouldEnableScrolling = totalRows > displayedRows && hasCompletedItems;

  if (shouldEnableScrolling) {
    // Calculate ACTUAL height of completed rows including mobile action rows
    let completedRowsFound = 0;
    for (let i = 0; i < rows.length && completedRowsFound < completedItemsCount; i++) {
      const row = rows[i];
      // Only count main data rows (not mobile action rows)
      if (!row.classList.contains('mobile-action-row')) {
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
    waitlistContainer.scrollTop >= (totalHeightToScroll - 30) &&
    waitlistContainer.scrollTop <= (totalHeightToScroll + 30);

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
    scrollButton.textContent = "@ Active Queue";
    scrollButton.classList.remove('bg-yellow-600', 'text-slate-900', 'hover:bg-yellow-700', 'border-yellow-500');
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
    scrollButton.textContent = "Scroll to Active";
    scrollButton.classList.remove('bg-slate-700', 'text-slate-500', 'cursor-not-allowed', 'border-slate-600');
    scrollButton.classList.add('bg-yellow-600', 'text-slate-900', 'hover:bg-yellow-700', 'border-yellow-500');
  } else {
    // DISABLED: At the active queue, no history, or not scrollable.

    scrollButton.disabled = true;

    // Display appropriate text for the disabled state
    if (isScrolledToActive) {
      //console.log(`BUTTON: DISABLED. Reason: Already at the Active Queue position.`);
      scrollButton.textContent = "@ Active Queue";
    } else if (!shouldEnableScrolling) {
      if (totalRows <= displayedRows) {
        //console.log(`BUTTON: DISABLED. Reason: Total rows (${totalRows}) <= displayedRows (${displayedRows}). All items visible.`);
        scrollButton.textContent = "Showing All";
      } else {
        //console.log(`BUTTON: DISABLED. Reason: No completed history to scroll past.`);
        scrollButton.textContent = "Scroll to Active";
      }
    } else if (!isNowScrollable) {
      //console.log(`BUTTON: DISABLED. Reason: Container is not scrollable (list is short).`);
      scrollButton.textContent = "Scroll to Active";
    } else {
      //console.log(`BUTTON: DISABLED. Reason: Default disabled state.`);
      scrollButton.textContent = "Scroll to Active";
    }

    scrollButton.classList.remove('bg-yellow-600', 'text-slate-900', 'hover:bg-yellow-700', 'border-yellow-500');
    scrollButton.classList.add('bg-slate-700', 'text-slate-500', 'cursor-not-allowed', 'border-slate-600');
  }

  console.groupEnd(); // End STATE_CHECK group
  return totalHeightToScroll;
}

/**
 * Button click handler: Scrolls DOWN to the Active Queue instantly.
 */
function handleScrollToActive() {
  console.log("ACTION: Scroll button clicked.");
  // 이제 scrollTarget은 initialScrollTop이 아니라, DOM을 기준으로 재계산된 정확한 값입니다.
  const totalHeightToScroll = updateScrollAndButtonState();

  // 버튼이 활성화된 상태일 때만 스크롤을 수행합니다.
  if (!scrollButton.disabled) {
    console.log(`SCROLL_ACTION: Performing scroll to ${totalHeightToScroll.toFixed(2)}px.`);
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
  console.log("RENDER: Starting table render.");

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

  // 1. Sort the entire list: Completed items first (by time_cleared), then Active items by time_created (oldest first).
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
      // Both are active items - sort by time_created (oldest first)
      return a.time_created - b.time_created;
    }
  });

  const completedItemsCount = waitlist.filter(item => getSortPriority(item.status) === 0).length;
  console.log(`RENDER: Sorted list. Total items: ${waitlist.length}, Completed items count: ${completedItemsCount}`);

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
      .filter(chat => chat.booking_list_id === item.booking_list_id)
      .sort((a, b) => a.dateTime - b.dateTime); // Sort by dateTime ascending

    // Build chat history HTML with elapsed time
    let chatHistoryHTML = '';
    if (chatHistory.length > 0) {
      const chatClass = statusPriority === 0 ? 'text-slate-400' : 'text-slate-400';
      const hasStatusMessage = item.status === 'Arrived' || item.status === 'Cancelled';

      chatHistoryHTML = chatHistory.map((chat, index) => {
        let elapsedTime;
        const isLastMessage = index === chatHistory.length - 1;

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
            const nextChat = chatHistory[index + 1];
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

        // Apply green color (#34d399) for "Q: Table is Ready. Coming?" message (same as Ready button)
        const messageChatClass = chat.qna.includes('Table is Ready') ? 'text-emerald-400' : chatClass;

        return `<div class="text-xs ${messageChatClass} leading-relaxed" ${dataAttr}>↳ [${elapsedTime}] ${chat.qna}</div>`; //arrow
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
        chatHistoryHTML += `<div class="text-xs ${statusColor} leading-relaxed">↳ ${item.status} @ ${timeString}</div>`;
      }
    }

    // Action Buttons - Generate using button definitions
    const buttons = getButtonsForStatus(item.status);
    let buttonHTMLs;

    // Check if this item is in Ask mode
    const isInAskMode = askModeItems.has(item.booking_number);
    //console.log(`RENDER: Item #${item.booking_number} - isInAskMode: ${isInAskMode}`);

    if (isInAskMode) {
      // Show question buttons + Exit button (with ask-mode-btn class for 2-per-row layout) - filtered by pax and q_level
      const filteredQuestions = getFilteredQuestions(item.pax, item.booking_number);
      const questionButtonsHTML = generateQuestionButtonsHTML(filteredQuestions, item.booking_number, item.customer_name, false);

      // Split the HTML string into individual button elements and add ask-mode-btn class
      buttonHTMLs = questionButtonsHTML.split('\n').map(btnHTML => {
        // Add ask-mode-btn class to each button for desktop 2-per-row layout
        return btnHTML.replace('flex-1', 'flex-1 ask-mode-btn');
      });

      //console.log(`RENDER: Generated ${buttonHTMLs.length} question buttons for #${item.booking_number} (pax: ${item.pax}, filtered from ${questionnaire.length})`);
    } else {
      // Show normal buttons
      buttonHTMLs = buttons.map(btnDef => generateButtonHTML(btnDef, item.booking_number, item.customer_name, false));
      //console.log(`RENDER: Generated ${buttonHTMLs.length} normal buttons for #${item.booking_number}`);
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

    tableHTML += `
                    <tr class="${rowClass} ${rowClickableClass}" data-item-id="${item.booking_number}" ${onclickAttr}>
                        <td class="px-2 py-2 whitespace-nowrap text-sm font-medium ${idClass} text-center">${item.booking_number}</td>
                        <td class="px-2 py-2 text-sm">
                            <div class="font-semibold ${nameClass}"><span class="${item.pax >= minPax_for_bigTable ? (statusPriority === 0 ? 'bg-white text-slate-800 px-1 py-0.5 rounded font-bold' : 'bg-yellow-400 text-slate-800 px-1 py-0.5 rounded font-bold') : (item.pax <= maxPax_for_smallTable ? (statusPriority === 0 ? 'border border-slate-100 px-1 py-0.5 rounded font-bold' : 'border border-amber-400 px-1 py-0.5 rounded font-bold') : '')}">${item.customer_name} <span class="${item.pax >= minPax_for_bigTable ? 'font-bold' : (item.pax <= maxPax_for_smallTable ? 'font-bold' : 'text-xs font-normal opacity-75')}">(Pax: <span class="${item.pax >= minPax_for_bigTable ? 'font-bold' : (item.pax <= maxPax_for_smallTable ? 'font-bold' : 'text-sm')}">${item.pax}</span>)</span></span></div>
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
  console.log("RENDER: Table HTML injected into DOM.");

  // Debug: Check for any row-selected classes on desktop
  if (window.innerWidth > 768) {
    // Force remove any inline styles or problematic classes
    const allRows = waitlistBody.querySelectorAll('tr');

    // Clean up mobile-related classes
    allRows.forEach((row) => {
      row.removeAttribute('style'); // Remove any inline styles
      row.classList.remove('row-selected'); // Remove row-selected if exists
    });
  }

  // Close any expanded mobile row when re-rendering
  expandedRowId = null;

  // NOTE: 데이터가 변경되어 렌더링이 발생하면, 버튼 상태와 스크롤 타겟을 즉시 업데이트합니다.
  updateScrollAndButtonState();
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
      const currentText = chatElement.textContent;
      const messageStart = currentText.indexOf(']') + 1;
      const messageText = currentText.substring(messageStart);

      // Update the entire text with new elapsed time
      chatElement.textContent = `↳ [${elapsedTime}]${messageText}`; //arrow
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
waitlistContainer.addEventListener('scroll', updateScrollAndButtonState);

// 2. Initialize data loading and setup after completion
async function startInitialization() {
  try {
    // Load all data first
    await getServerSideUpdate();
    
    // Initial scroll setup: Set position and initial button state after data is loaded and rendered
    // requestAnimationFrame을 사용하여 DOM이 렌더링된 후 정확한 위치로 이동합니다.
    requestAnimationFrame(() => {
  console.log("INIT: DOM rendered. Starting initial scroll/state calculation.");

  // 1. 초기 스크롤 목표 위치를 계산하고 동적 높이 설정을 업데이트합니다.
  const scrollTarget = updateScrollAndButtonState();
  const completedItemsCount = waitlist.filter(item => getSortPriority(item.status) === 0).length;

  const rows = waitlistBody.getElementsByTagName('tr');
  // NEW: Calculate row height based on a rendered row (must be done after render)
  if (rows.length > 0) {
    rowHeight = rows[0].offsetHeight;
    console.log(`INIT: Measured single rowHeight for update: ${rowHeight.toFixed(2)}px`);
  }

  console.log(`INIT: Calculated scrollTarget = ${scrollTarget.toFixed(2)}px. Completed items = ${completedItemsCount}`);

  // 2. 총 행 수가 displayedRows를 초과하고, Active Queue를 건너뛸 기록이 있고, 스크롤이 가능하며, 현재 Active Queue 위치에 있지 않은 경우 활성화
  const totalRows = waitlist.length;
  const shouldScrollToActive = totalRows > displayedRows && completedItemsCount > 0;
  console.log(`INIT: Total rows: ${totalRows}, displayedRows: ${displayedRows}, shouldScrollToActive: ${shouldScrollToActive}`);

  if (shouldScrollToActive) {
    // Disable hover temporarily during scroll
    waitlistContainer.classList.add('disable-hover');

    // 스크롤 위치를 즉시 설정합니다. (비헤이비어 'auto')
    waitlistContainer.scrollTop = scrollTarget;
    console.log(`INIT: Forced scroll to position: ${scrollTarget.toFixed(2)}px`);

    // Re-enable hover only when the user actually interacts (mousemove or window focus)
    const reenableHover = () => {
      waitlistContainer.classList.remove('disable-hover');
      console.log('INIT: Hover re-enabled after user interaction');
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
      console.log('INIT: Hover re-enabled by fallback after 8s');
      document.removeEventListener('mousemove', reenableHover);
      window.removeEventListener('focus', reenableHover);
    }, 8000);

    // 실제 스크롤된 위치를 다음 프레임에서 읽어서 정확한 값을 저장
    requestAnimationFrame(() => {
      // 더 정확한 스크롤을 위해 한 번 더 시도
      const actualScrollTop = waitlistContainer.scrollTop;
      if (Math.abs(actualScrollTop - scrollTarget) > 2) {
        console.log(`INIT: Adjusting scroll position. First attempt: ${actualScrollTop.toFixed(2)}px`);
        waitlistContainer.scrollTop = scrollTarget;

        // 조정 후 다시 한번 확인
        requestAnimationFrame(() => {
          initialScrollTop = waitlistContainer.scrollTop;
          console.log(`INIT: InitialScrollTop value recorded (final): ${initialScrollTop.toFixed(2)}px`);
          console.log(`INIT: Final difference: ${(scrollTarget - initialScrollTop).toFixed(2)}px`);
        });
      } else {
        initialScrollTop = actualScrollTop;
        console.log(`INIT: InitialScrollTop value recorded (actual): ${initialScrollTop.toFixed(2)}px`);
        console.log(`INIT: Difference between target and actual: ${(scrollTarget - initialScrollTop).toFixed(2)}px`);
      }
    });
  } else {
    initialScrollTop = 0; // Ensure it's 0 if no initial scroll occurred
    console.log("INIT: No completed items, skipping initial forced scroll.");
  }

  // 3. 스크롤 위치 설정 직후 버튼 상태를 업데이트하여 즉시 비활성화하고 텍스트를 변경합니다.
  updateScrollAndButtonState();
  console.log("INIT: Final button state check completed.");

    // 4. 초기 설정이 완료되었음을 플래그로 표시합니다. 
    isInitialScrollDone = true;
    console.log("INIT: isInitialScrollDone set to TRUE. Enabling dynamic button logic.");
    });
    
  } catch (error) {
    console.error('INIT: Error during initialization:', error);
    // Fallback: render with mock data if database loading fails
    renderWaitlist();
  }
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
    // Remove all row-selected classes
    document.querySelectorAll('.row-selected').forEach(row => {
      row.classList.remove('row-selected');
    });
    // Reset expanded row tracking
    expandedRowId = null;
    console.log('RESIZE: Switched to desktop, cleaned up mobile state');
  }
});