// Set Tailwind primary color
const root = document.documentElement;
root.style.setProperty('--tw-color-primary', '#18b067');
root.style.setProperty('--tw-color-primary-dark', '#159659');

const authorisedUsers = ['donkaslab@gmail.com', 'donkaslab.mobile@gmail.com'];
const refreshInterval = 30000; // 30초
const isDisplayCopyBtn = true;
const phoneNumber = '601169873700'; // Whatsapp number with country code
let currentUrl = '';
let currentCode = ''; // Store the current encrypted timestamp code
let countdownInterval = null;

// 세션 관리 객체
/*
window.onload = function () {
  // session.check()를 호출하고 Promise를 기다림
  session.check().then(data => {
    // 데이터가 성공적으로 로드되었고, 사용자 정보가 있을 경우
    if (data && data.user) {
      const profile = data.user;

      // profile 객체 확인
      console.log('로드된 프로필:', profile);

      // 특정 이메일이 아닐 경우 로그아웃
      if (!authorisedUsers.includes(profile.email)) {
        console.log('User Does Not Match. Logging out...');
        session.logout(true);
      } else {
        // 특정 이메일일 경우에 메시지 표시
        console.log(`Authorised: ${profile.email}`); // 콘솔에 메시지 출력
        startQrApp();
      }
    } else {
      // 데이터 로드 실패 (세션이 유효하지 않음)
      console.log('Failed to load session data. Redirecting to login...');
      // check() 함수 내에서 이미 리다이렉션이 발생하지만, 안전을 위해 추가
      window.location.href = 'auth';
    }
  }).catch(error => {
    // 네트워크 오류 등 예외 처리
    console.error('An error occurred during session check:', error);
    session.logout(true);
  });
};
*/


/**
 * QR Code Generation and Refresh
 */
function generateAndRefreshQR() {
  const timestamp = Math.floor(Date.now() / 1000); // Get current time in seconds (not milliseconds)
  const randomString = Math.random().toString(36).substring(2, 8); // Generate a 6-character random string

  // Create shorter code: convert timestamp to base36 + random string
  const shortTimestamp = timestamp.toString(36); // Convert to base36 (much shorter - about 6-7 chars)
  const encryptedTimestamp = `${shortTimestamp}-${randomString}`.toUpperCase(); // Shorter format
  
  // Store current code globally for copy functionality
  currentCode = encryptedTimestamp;

  // WhatsApp message format
  const whatsappMessage = `Hey, Donkas Lab, put me in the waitlist queue (Send without changes: ${encryptedTimestamp})`;

  // WhatsApp URL format (use api.whatsapp.com for universal link that works on both mobile and desktop)
  
  currentUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(whatsappMessage)}`;

  // QR code generation
  const qrCanvas = document.getElementById('qr-code-canvas');
  const qr = new QRious({
    element: qrCanvas,
    value: currentUrl,
    size: 256,
  });

  // Start countdown timer
  startCountdownTimer();

  // Reset countdown bar animation
  const countdownBar = document.getElementById('countdown-bar');
  countdownBar.style.animation = 'none'; // Temporarily disable animation
  void countdownBar.offsetWidth; // Trigger reflow to apply the change
  countdownBar.style.animation = 'countdown ' + (refreshInterval / 1000) + 's linear'; // Re-enable with new duration
};

/**
 * Countdown Timer Display
 */
function startCountdownTimer() {
  // Clear any existing countdown interval
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  let remainingSeconds = Math.floor(refreshInterval / 1000);
  const timerDisplay = document.getElementById('last-updated');

  // Update display immediately
  timerDisplay.textContent = `QR will refresh in: ${remainingSeconds}s`;

  // Update every second
  countdownInterval = setInterval(() => {
    remainingSeconds--;

    if (remainingSeconds > 0) {
      timerDisplay.textContent = `QR will refresh in: ${remainingSeconds}s`;
    } else {
      timerDisplay.textContent = `QR will refresh in: 0s`;
      clearInterval(countdownInterval);
    }
  }, 1000);
}

/**
 * Copy Button Creation
 */
function copyButton() {
  // 동적으로 버튼과 상태 메시지 생성
  const qrSection = document.getElementById('qr-code-section');

  // Copy Code Button
  const copyBtn = document.createElement('button');
  copyBtn.id = 'copy-btn';
  copyBtn.className = 'mt-6 px-6 py-3 bg-[--tw-color-primary] text-white font-semibold rounded-lg shadow-md hover:bg-[--tw-color-primary-dark] transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[--tw-color-primary] focus:ring-opacity-50 tracking-wide';
  copyBtn.textContent = 'Copy Code';
  qrSection.appendChild(copyBtn);

  // Copy Status Message
  const statusMessage = document.createElement('p');
  statusMessage.id = 'copy-status';
  statusMessage.className = 'mt-2 text-sm text-green-600 opacity-0 transition-opacity duration-300 tracking-wide';
  statusMessage.textContent = 'Code copied to clipboard!';
  qrSection.appendChild(statusMessage);

  // Add event listener for the copy button
  copyBtn.addEventListener('click', () => {
    // Create a temporary textarea element to hold the code
    const tempTextarea = document.createElement('textarea');
    tempTextarea.value = currentCode;
    document.body.appendChild(tempTextarea);
    tempTextarea.select();

    try {
      // Copy the code to the clipboard
      document.execCommand('copy');

      // Show a success message
      statusMessage.classList.remove('opacity-0');
      setTimeout(() => {
        statusMessage.classList.add('opacity-0');
      }, 2000); // Hide the message after 2 seconds
    } catch (err) {
      console.error('Failed to copy text:', err);
      // Optionally show an error message
    } finally {
      document.body.removeChild(tempTextarea);
    }
  });
}

function startQrApp() {
  // Start QR code generation and refresh
  generateAndRefreshQR();
  setInterval(generateAndRefreshQR, refreshInterval); // Refresh QR code every n seconds
  (isDisplayCopyBtn) ? copyButton() : null; // Display copy button if enabled
}

// Start the QR app on page load
startQrApp();