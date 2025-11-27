/**
 * modal_add.js
 * Handles the Add button functionality with a modal dialog
 * version 0.705
 */

const reservation_ahead_minutes = 30; // Reservations can be made at least 30 minutes ahead
const reservation_interval_minutes = 10; // Reservation time slots interval

/**
 * Opens a modal dialog for adding new content
 */
function handleAdd() {
  console.log('ACTION: Add button clicked');
  
  // Check if dialog already exists
  let dialog = document.getElementById('add-modal-dialog');
  
  // Create dialog if it doesn't exist
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'add-modal-dialog';
    dialog.className = 'rounded-xl shadow-2xl border border-slate-700 bg-slate-800 p-0 backdrop:bg-black backdrop:bg-opacity-70';
    dialog.style.maxWidth = '90vw';
    dialog.style.maxHeight = '95vh';
    
    // Add custom style for hiding scrollbar
    const style = document.createElement('style');
    style.textContent = `
      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }
      .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `;
    document.head.appendChild(style);
    
    // Dialog content
    dialog.innerHTML = `
      <div class="flex flex-col h-full w-full min-w-[280px] max-w-[90vw]">
        <!-- Header -->
        <div class="flex justify-between items-center p-6 border-b border-slate-700">
          <h2 id="modal-title" class="text-xl font-semibold text-slate-100">Add Waitlist</h2>
          <div onclick="toggleModalMode(event)" id="toggle-modal-mode" class="cursor-pointer flex items-center">
            <div class="toggle-switch-container w-12 h-6 bg-slate-600 rounded-full relative transition duration-200">
              <div class="toggle-switch absolute left-1 top-1 w-4 h-4 bg-slate-300 rounded-full transition-all duration-200" style="transform: translateX(0);"></div>
            </div>
          </div>
        </div>
        
        <!-- Content -->
        <div class="flex-1 p-6 overflow-y-auto">
          <div class="space-y-6">
            <!-- Reservation Time (only visible in reservation mode) -->
            <div id="reservation-time-section" style="display: none;">
              <label class="block text-sm font-medium text-slate-300 mb-2">Reservation Time</label>
              <div class="flex gap-3 items-center justify-center">
                <!-- Hour Picker -->
                <div class="flex flex-col items-center">
                  <div class="relative w-16 h-24 overflow-hidden rounded-lg bg-slate-900 border border-slate-600">
                    <div class="absolute inset-0 pointer-events-none z-10">
                      <div class="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-slate-900 to-transparent"></div>
                      <div class="absolute top-6 left-0 right-0 h-12 border-y-2 border-amber-400"></div>
                      <div class="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-900 to-transparent"></div>
                    </div>
                    <div id="hour-picker" class="overflow-y-scroll h-full snap-y snap-mandatory scrollbar-hide" style="scroll-padding: 24px;">
                      <!-- Hour options will be populated dynamically -->
                    </div>
                  </div>
                </div>
                
                <span class="text-xl text-slate-100 font-bold">:</span>
                
                <!-- Minute Picker -->
                <div class="flex flex-col items-center">
                  <div id="minute-picker-container" class="relative w-16 h-24 overflow-hidden rounded-lg bg-slate-900 border border-slate-600 transition-colors">
                    <div class="absolute inset-0 pointer-events-none z-10">
                      <div class="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-slate-900 to-transparent"></div>
                      <div class="absolute top-6 left-0 right-0 h-12 border-y-2 border-amber-400"></div>
                      <div class="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-900 to-transparent"></div>
                    </div>
                    <div id="minute-picker" class="overflow-y-scroll h-full snap-y snap-mandatory scrollbar-hide" style="scroll-padding: 24px;">
                      <!-- Minute options will be populated dynamically -->
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Pax Counter and Seating Preference -->
            <div class="flex gap-6">
              <!-- Pax Counter -->
              <div class="w-[35%] flex-shrink-0">
                <label class="block text-sm font-medium text-slate-300 mb-2">Pax</label>
                <div class="flex items-center gap-1">
                  <button onclick="decrementPax()" class="w-10 h-10 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600 flex items-center justify-center transition">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                  </button>
                  <span id="pax-counter" class="text-2xl font-semibold text-slate-100 w-12 text-center">2</span>
                  <button onclick="incrementPax()" class="w-10 h-10 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600 flex items-center justify-center transition">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
              
              <!-- Seating Preference -->
              <div class="flex-1 min-w-0">
                <label class="block text-sm font-medium text-slate-300 mb-2">Seating Preference</label>
                <div class="flex gap-2">
                  <button onclick="toggleSeating('inside')" id="toggle-inside" class="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-slate-300 border border-slate-600 font-medium transition hover:bg-slate-600">
                    Inside
                  </button>
                  <button onclick="toggleSeating('outside')" id="toggle-outside" class="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-slate-300 border border-slate-600 font-medium transition hover:bg-slate-600">
                    Outside
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Phone Number -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
              <div class="flex gap-2">
                <div class="px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100 flex items-center font-medium">
                  +60
                </div>
                <input 
                  type="tel" 
                  id="phone-number-input" 
                  placeholder="12-345-6789"
                  oninput="updatePhoneDisplay()"
                  class="flex-1 px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                />
              </div>
            </div>
            
            <!-- Is Split Table Allowed Toggle -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">Is Split Table Allowed?</label>
              <div onclick="toggleSplitTable()" id="toggle-split-table" class="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 cursor-pointer flex items-center justify-between">
                <span class="toggle-state-text text-slate-300 font-medium">No</span>
                <div class="toggle-switch-container w-12 h-6 bg-slate-600 rounded-full relative transition duration-200">
                  <div class="toggle-switch absolute left-1 top-1 w-4 h-4 bg-slate-300 rounded-full transition-all duration-200" style="transform: translateX(0);"></div>
                </div>
              </div>
            </div>
            
            <!-- Is Sharing Table Allowed Toggle -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">Is Sharing Table Allowed?</label>
              <div onclick="toggleSharingTable()" id="toggle-sharing-table" class="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 cursor-pointer flex items-center justify-between">
                <span class="toggle-state-text text-slate-300 font-medium">No</span>
                <div class="toggle-switch-container w-12 h-6 bg-slate-600 rounded-full relative transition duration-200">
                  <div class="toggle-switch absolute left-1 top-1 w-4 h-4 bg-slate-300 rounded-full transition-all duration-200" style="transform: translateX(0);"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="flex justify-end gap-3 p-6 border-t border-slate-700">
          <button onclick="closeAddModal()" class="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition">
            Cancel
          </button>
          <button id="submit-button" onclick="submitAddModal()" class="px-4 py-2 rounded-lg bg-amber-400 text-slate-900 hover:bg-amber-500 transition font-medium">
            Add to Waitlist
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
  }
  
  // Show dialog
  dialog.showModal();
  
  // Close on backdrop click (only add listener once)
  if (!dialog.dataset.listenerAdded) {
    dialog.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        closeAddModal();
      }
    });
    dialog.dataset.listenerAdded = 'true';
  }
}

/**
 * Toggle split table allowed option
 */
function toggleSplitTable() {
  modalSplitTable = !modalSplitTable;
  const toggleBtn = document.getElementById('toggle-split-table');
  const stateText = toggleBtn.querySelector('.toggle-state-text');
  const switchContainer = toggleBtn.querySelector('.toggle-switch-container');
  const switchCircle = toggleBtn.querySelector('.toggle-switch');
  
  if (modalSplitTable) {
    stateText.textContent = 'Yes';
    switchContainer.classList.add('bg-amber-400');
    switchContainer.classList.remove('bg-slate-600');
    switchCircle.classList.add('bg-slate-900');
    switchCircle.classList.remove('bg-slate-300');
    switchCircle.style.transform = 'translateX(20px)';
  } else {
    stateText.textContent = 'No';
    switchContainer.classList.add('bg-slate-600');
    switchContainer.classList.remove('bg-amber-400');
    switchCircle.classList.add('bg-slate-300');
    switchCircle.classList.remove('bg-slate-900');
    switchCircle.style.transform = 'translateX(0)';
  }
}

/**
 * Toggle sharing table allowed option
 */
function toggleSharingTable() {
  modalSharingTable = !modalSharingTable;
  const toggleBtn = document.getElementById('toggle-sharing-table');
  const stateText = toggleBtn.querySelector('.toggle-state-text');
  const switchContainer = toggleBtn.querySelector('.toggle-switch-container');
  const switchCircle = toggleBtn.querySelector('.toggle-switch');
  
  if (modalSharingTable) {
    stateText.textContent = 'Yes';
    switchContainer.classList.add('bg-amber-400');
    switchContainer.classList.remove('bg-slate-600');
    switchCircle.classList.add('bg-slate-900');
    switchCircle.classList.remove('bg-slate-300');
    switchCircle.style.transform = 'translateX(20px)';
  } else {
    stateText.textContent = 'No';
    switchContainer.classList.add('bg-slate-600');
    switchContainer.classList.remove('bg-amber-400');
    switchCircle.classList.add('bg-slate-300');
    switchCircle.classList.remove('bg-slate-900');
    switchCircle.style.transform = 'translateX(0)';
  }
}

/**
 * Closes the add modal dialog
 */
function closeAddModal() {
  const dialog = document.getElementById('add-modal-dialog');
  if (dialog) {
    dialog.close();
  }
}

/**
 * Handles form submission from add modal
 */
function submitAddModal() {
  console.log('ACTION: Add modal submitted');
  
  // Get form values
  const pax = parseInt(document.getElementById('pax-counter').textContent);
  const phoneNumberInput = document.getElementById('phone-number-input');
  const phoneNumberRaw = phoneNumberInput.value.trim();
  const seating = modalSeating; // null, 'inside', or 'outside'
  const isSplitTableAllowed = modalSplitTable;
  const isSharingTableAllowed = modalSharingTable;
  const isReservation = modalIsReservation;
  
  // Validate phone number
  let digits = phoneNumberRaw.replace(/\D/g, '');
  
  // Remove leading zeros only if there are more digits after them
  const originalDigits = digits;
  if (digits.length > 1 && digits.startsWith('0')) {
    digits = digits.replace(/^0+/, '');
  }
  
  // Check if phone number is empty or invalid
  const isPhoneEmpty = phoneNumberRaw === '';
  const isPhoneInvalid = digits.length > 0 && !digits.startsWith('1') && originalDigits !== '0';
  const isPhoneTooShort = digits.length < 9; // Minimum 9 digits required (excluding leading 0)
  
  if (isPhoneEmpty || isPhoneInvalid || isPhoneTooShort) {
    // Highlight phone number input with error state
    phoneNumberInput.classList.remove('border-slate-600', 'focus:ring-amber-400');
    phoneNumberInput.classList.add('border-red-500', 'focus:ring-red-500');
    phoneNumberInput.focus();
    
    // Show visual feedback with a brief animation
    phoneNumberInput.classList.add('animate-pulse');
    setTimeout(() => {
      phoneNumberInput.classList.remove('animate-pulse');
    }, 1000);
    
    return; // Don't close modal
  }
  
  // Process phone number: remove non-digits, add prefix based on starting digit
  let phoneNumber = phoneNumberRaw.replace(/\D/g, ''); // Remove non-digits
  if (phoneNumber.startsWith('0')) {
    phoneNumber = '6' + phoneNumber;
  } else if (phoneNumber.startsWith('1')) {
    phoneNumber = '60' + phoneNumber;
  }
  
  // Format current time as yyyy-mm-dd hh:mm:ss
  const now = new Date();
  const timeCreated = formatDateTime(now);
  
  // Create badge array
  const badge = [];
  
  // Add seating preference badge
  if (seating === 'inside') {
    badge.push('In');
  } else if (seating === 'outside') {
    badge.push('Out');
  }
  
  // Add split table badge
  if (isSplitTableAllowed) {
    badge.push('Split');
  }
  
  // Add sharing table badge
  if (isSharingTableAllowed) {
    badge.push('Share');
  }
  
  // Create form data object
  const formData = {
    store_id: store_id,
    booking_from: 'WEB',
    pax: pax,
    customer_phone: phoneNumber,
    time_created: timeCreated
  };
  
  // Add badges as badge1, badge2, badge3, etc.
  badge.forEach((badgeText, index) => {
    formData[`badge${index + 1}`] = badgeText;
  });
  
  // Add dine_dateTime
  if (isReservation && modalReservationTime) {
    const dineDate = new Date(modalReservationTime);
    formData.dine_dateTime = formatDateTime(dineDate);
  } else {
    // For waitlist, dine_dateTime is same as time_created
    formData.dine_dateTime = timeCreated;
  }
  
  console.log('Form data:', formData);
  
  // TODO: Implement submission logic
  closeAddModal();
}

/**
 * Format Date object to yyyy-mm-dd hh:mm:ss
 */
function formatDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Modal state variables
let modalPaxCount = 2;
let modalSeating = null; // null, 'inside', or 'outside'
let modalSplitTable = false;
let modalSharingTable = false;
let modalIsReservation = false; // false = Waitlist, true = Reservation
let modalReservationTime = null; // Selected reservation time

/**
 * Increment pax counter
 */
function incrementPax() {
  modalPaxCount++;
  document.getElementById('pax-counter').textContent = modalPaxCount;
}

/**
 * Decrement pax counter (minimum 1)
 */
function decrementPax() {
  if (modalPaxCount > 1) {
    modalPaxCount--;
    document.getElementById('pax-counter').textContent = modalPaxCount;
  }
}

/**
 * Toggle between Waitlist and Reservation mode
 */
function toggleModalMode(event) {
  if (event) {
    event.stopPropagation();
  }
  
  modalIsReservation = !modalIsReservation;
  const title = document.getElementById('modal-title');
  const submitButton = document.getElementById('submit-button');
  const switchContainer = document.querySelector('#toggle-modal-mode .toggle-switch-container');
  const switchCircle = document.querySelector('#toggle-modal-mode .toggle-switch');
  const timeSection = document.getElementById('reservation-time-section');
  
  if (modalIsReservation) {
    title.textContent = 'Add Reservation';
    submitButton.textContent = 'Add to Reservation';
    switchContainer.classList.add('bg-amber-400');
    switchContainer.classList.remove('bg-slate-600');
    switchCircle.classList.add('bg-slate-900');
    switchCircle.classList.remove('bg-slate-300');
    switchCircle.style.transform = 'translateX(20px)';
    timeSection.style.display = 'block';
    populateReservationTimes();
  } else {
    title.textContent = 'Add Waitlist';
    submitButton.textContent = 'Add to Waitlist';
    switchContainer.classList.add('bg-slate-600');
    switchContainer.classList.remove('bg-amber-400');
    switchCircle.classList.add('bg-slate-300');
    switchCircle.classList.remove('bg-slate-900');
    switchCircle.style.transform = 'translateX(0)';
    timeSection.style.display = 'none';
  }
}

/**
 * Populate reservation time picker with scroll wheel style
 */
function populateReservationTimes() {
  const now = new Date();
  
  // Calculate minimum allowed reservation time (now + reservation_ahead_minutes)
  const minReservationTime = new Date(now.getTime() + reservation_ahead_minutes * 60000);
  
  // Round up to next interval
  const minMinutes = minReservationTime.getMinutes();
  const roundedMinutes = Math.ceil(minMinutes / reservation_interval_minutes) * reservation_interval_minutes;
  
  let startHour = minReservationTime.getHours();
  let startMinute = roundedMinutes;
  if (startMinute >= 60) {
    startHour = (startHour + 1) % 24;
    startMinute = startMinute % 60;
  }
  
  // Store minimum time for validation
  window.minReservationTime = minReservationTime;
  
  // Populate hour picker (24 hours starting from minimum hour)
  const hourPicker = document.getElementById('hour-picker');
  hourPicker.innerHTML = '';
  
  // Add padding items at top and bottom for better UX
  hourPicker.innerHTML += '<div class="h-6"></div>';
  
  for (let i = 0; i < 24; i++) {
    const hour = (startHour + i) % 24;
    const hourDiv = document.createElement('div');
    hourDiv.className = 'h-12 flex items-center justify-center text-slate-100 text-lg font-semibold snap-center cursor-pointer hover:text-amber-400 transition';
    hourDiv.textContent = hour.toString().padStart(2, '0');
    hourDiv.dataset.value = hour;
    hourPicker.appendChild(hourDiv);
  }
  
  hourPicker.innerHTML += '<div class="h-6"></div>';
  
  // Populate minute picker based on reservation_interval_minutes
  const minutePicker = document.getElementById('minute-picker');
  minutePicker.innerHTML = '';
  
  minutePicker.innerHTML += '<div class="h-6"></div>';
  
  // Generate minute options based on interval
  const minuteOptions = [];
  for (let min = 0; min < 60; min += reservation_interval_minutes) {
    minuteOptions.push(min);
  }
  
  minuteOptions.forEach(min => {
    const minDiv = document.createElement('div');
    minDiv.className = 'h-12 flex items-center justify-center text-slate-100 text-lg font-semibold snap-center cursor-pointer hover:text-amber-400 transition';
    minDiv.textContent = min.toString().padStart(2, '0');
    minDiv.dataset.value = min;
    minutePicker.appendChild(minDiv);
  });
  
  minutePicker.innerHTML += '<div class="h-6"></div>';
  
  // Set initial scroll positions
  hourPicker.scrollTop = 0;
  
  // Find the starting minute index
  let startMinuteIndex = minuteOptions.indexOf(startMinute);
  if (startMinuteIndex === -1) {
    startMinuteIndex = 0;
  }
  
  minutePicker.scrollTop = startMinuteIndex * 48; // 48px per item (h-12)
  
  // Add scroll event listeners to snap to center
  let hourScrollTimeout;
  hourPicker.addEventListener('scroll', () => {
    clearTimeout(hourScrollTimeout);
    hourScrollTimeout = setTimeout(() => {
      const scrollTop = hourPicker.scrollTop;
      const itemHeight = 48;
      const index = Math.round(scrollTop / itemHeight);
      hourPicker.scrollTo({ top: index * itemHeight, behavior: 'smooth' });
      updateReservationTime();
    }, 150);
  });
  
  let minuteScrollTimeout;
  minutePicker.addEventListener('scroll', () => {
    clearTimeout(minuteScrollTimeout);
    minuteScrollTimeout = setTimeout(() => {
      const scrollTop = minutePicker.scrollTop;
      const itemHeight = 48;
      const index = Math.round(scrollTop / itemHeight);
      minutePicker.scrollTo({ top: index * itemHeight, behavior: 'smooth' });
      updateReservationTime();
    }, 150);
  });
  
  // Initialize reservation time
  updateReservationTime();
}

/**
 * Update selected reservation time based on picker positions
 */
function updateReservationTime() {
  const hourPicker = document.getElementById('hour-picker');
  const minutePicker = document.getElementById('minute-picker');
  
  const hourIndex = Math.round(hourPicker.scrollTop / 48);
  const minuteIndex = Math.round(minutePicker.scrollTop / 48);
  
  const hourItems = hourPicker.querySelectorAll('div[data-value]');
  const minuteItems = minutePicker.querySelectorAll('div[data-value]');
  
  if (hourItems[hourIndex] && minuteItems[minuteIndex]) {
    const selectedHour = parseInt(hourItems[hourIndex].dataset.value);
    const selectedMinute = parseInt(minuteItems[minuteIndex].dataset.value);
    
    const now = new Date();
    const reservationDate = new Date(now);
    reservationDate.setHours(selectedHour, selectedMinute, 0, 0);
    
    // If selected time is in the past, add one day
    if (reservationDate < now) {
      reservationDate.setDate(reservationDate.getDate() + 1);
    }
    
    modalReservationTime = reservationDate.toISOString();
    
    // Validate: show red border if selected time is before minimum allowed time
    const minTime = window.minReservationTime;
    const minutePickerContainer = document.getElementById('minute-picker-container');
    
    if (minTime && reservationDate < minTime) {
      minutePickerContainer.classList.remove('border-slate-600');
      minutePickerContainer.classList.add('border-red-500');
    } else {
      minutePickerContainer.classList.remove('border-red-500');
      minutePickerContainer.classList.add('border-slate-600');
    }
  }
}

/**
 * Toggle seating preference (inside/outside)
 * Clicking the same preference again will deselect it
 */
function toggleSeating(preference) {
  const insideBtn = document.getElementById('toggle-inside');
  const outsideBtn = document.getElementById('toggle-outside');
  
  // If clicking the already selected preference, deselect it
  if (modalSeating === preference) {
    modalSeating = null;
    insideBtn.className = 'flex-1 px-4 py-2 rounded-lg bg-slate-700 text-slate-300 border border-slate-600 font-medium transition hover:bg-slate-600';
    outsideBtn.className = 'flex-1 px-4 py-2 rounded-lg bg-slate-700 text-slate-300 border border-slate-600 font-medium transition hover:bg-slate-600';
  } else {
    modalSeating = preference;
    
    if (preference === 'inside') {
      insideBtn.className = 'flex-1 px-4 py-2 rounded-lg bg-amber-400 text-slate-900 font-medium transition hover:bg-amber-500';
      outsideBtn.className = 'flex-1 px-4 py-2 rounded-lg bg-slate-700 text-slate-300 border border-slate-600 font-medium transition hover:bg-slate-600';
    } else {
      insideBtn.className = 'flex-1 px-4 py-2 rounded-lg bg-slate-700 text-slate-300 border border-slate-600 font-medium transition hover:bg-slate-600';
      outsideBtn.className = 'flex-1 px-4 py-2 rounded-lg bg-amber-400 text-slate-900 font-medium transition hover:bg-amber-500';
    }
  }
}

/**
 * Update phone number display with formatting (XX-XXX-XXXX or XX-XXXX-XXXX)
 */
function updatePhoneDisplay() {
  const input = document.getElementById('phone-number-input');
  const cursorPosition = input.selectionStart;
  const oldLength = input.value.length;
  
  // Remove all non-digits
  let digits = input.value.replace(/\D/g, '');
  
  // Store original digits before removing leading zeros
  const originalDigits = digits;
  
  // Remove leading zeros only if there are more digits after them
  if (digits.length > 1 && digits.startsWith('0')) {
    digits = digits.replace(/^0+/, '');
  }
  
  // Validate: if has digits and doesn't start with 1 (and original wasn't just '0'), show error
  if (digits.length > 0 && !digits.startsWith('1') && originalDigits !== '0') {
    input.classList.remove('border-slate-600', 'focus:ring-amber-400');
    input.classList.add('border-red-500', 'focus:ring-red-500');
  } else {
    input.classList.remove('border-red-500', 'focus:ring-red-500');
    input.classList.add('border-slate-600', 'focus:ring-amber-400');
  }
  
  // Limit to 10 digits
  digits = digits.substring(0, 10);
  
  // Format based on length
  let formatted = '';
  if (digits.length > 0) {
    formatted = digits.substring(0, 2);
    
    if (digits.length === 10) {
      // 10 digits: XX-XXXX-XXXX
      if (digits.length >= 3) {
        formatted += '-' + digits.substring(2, 6);
      }
      if (digits.length >= 7) {
        formatted += '-' + digits.substring(6, 10);
      }
    } else {
      // 9 or fewer digits: XX-XXX-XXXX
      if (digits.length >= 3) {
        formatted += '-' + digits.substring(2, 5);
      }
      if (digits.length >= 6) {
        formatted += '-' + digits.substring(5, 10);
      }
    }
  }
  
  // Update input value
  input.value = formatted;
  
  // Restore cursor position (adjust for added dashes)
  const newLength = formatted.length;
  const lengthDiff = newLength - oldLength;
  let newCursorPosition = cursorPosition + lengthDiff;
  
  // Adjust cursor to skip over dashes
  if (formatted[newCursorPosition - 1] === '-') {
    newCursorPosition++;
  }
  
  input.setSelectionRange(newCursorPosition, newCursorPosition);
}

/**
 * Toggle can split option
 */
function toggleCanSplit() {
  modalCanSplit = !modalCanSplit;
  const button = document.getElementById('toggle-can-split');
  button.dataset.canSplit = modalCanSplit;
  
  if (modalCanSplit) {
    button.innerHTML = `
      <span>Yes</span>
      <div class="w-12 h-6 bg-amber-400 rounded-full relative transition">
        <div class="absolute right-1 top-1 w-4 h-4 bg-slate-900 rounded-full transition-transform"></div>
      </div>
    `;
  } else {
    button.innerHTML = `
      <span>No</span>
      <div class="w-12 h-6 bg-slate-600 rounded-full relative transition">
        <div class="absolute left-1 top-1 w-4 h-4 bg-slate-300 rounded-full transition-transform"></div>
      </div>
    `;
  }
}
