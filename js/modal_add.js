/**
 * modal_add.js
 * Handles the Add button functionality with a modal dialog
 * version 0.706
 */

const webBooking_ahead_minutes = 30; // Web Bookings can be made at least 30 minutes ahead
const webBooking_interval_minutes = 10; // Web Booking time slots interval

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
          <h2 id="modal-title" class="text-xl font-semibold text-slate-100">Add Web Booking</h2>
          <div onclick="toggleModalMode(event)" id="toggle-modal-mode" class="cursor-pointer flex items-center">
            <div class="toggle-switch-container w-12 h-6 bg-slate-600 rounded-full relative transition duration-200">
              <div class="toggle-switch absolute left-1 top-1 w-4 h-4 bg-slate-300 rounded-full transition-all duration-200" style="transform: translateX(0);"></div>
            </div>
          </div>
        </div>
        
        <!-- Content -->
        <div class="flex-1 p-6 overflow-y-auto">
          <div class="space-y-6">
            <!-- Web Booking Time (only visible in webBooking mode) -->
            <div id="webBooking-time-section" style="display: none;">
              <label class="block text-sm font-medium text-slate-300 mb-2">Web Booking Time</label>
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
            
            <!-- Name -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">Name</label>
              <input 
                type="text" 
                id="customer-name-input" 
                placeholder="Enter customer name"
                class="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
              />
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
                <button 
                  onclick="copyFromClipboard()" 
                  class="w-10 h-10 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600 flex items-center justify-center transition"
                  title="Paste from clipboard"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="4" width="8" height="4" rx="1" stroke="currentColor" stroke-width="2"/>
                    <path d="M8 6H6C4.89543 6 4 6.89543 4 8V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V8C20 6.89543 19.1046 6 18 6H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </button>
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
          <button id="submit-button" onclick="submitAddModal('submit-button')" class="px-4 py-2 rounded-lg bg-amber-400 text-slate-900 hover:bg-amber-500 transition font-medium">
            Submit
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
    resetModalForm();
  }
}

/**
 * Reset all modal form fields to default values
 */
function resetModalForm() {
  // Reset state variables
  modalPaxCount = 2;
  modalSeating = null;
  modalSplitTable = false;
  modalSharingTable = false;
  modalIsWebBooking = false;
  modalWebBookingTime = null;

  // Reset pax counter display
  const paxCounter = document.getElementById('pax-counter');
  if (paxCounter) {
    paxCounter.textContent = '2';
  }

  // Reset name input
  const nameInput = document.getElementById('customer-name-input');
  if (nameInput) {
    nameInput.value = '';
  }

  // Reset phone number input
  const phoneInput = document.getElementById('phone-number-input');
  if (phoneInput) {
    phoneInput.value = '';
    phoneInput.classList.remove('border-red-500', 'focus:ring-red-500');
    phoneInput.classList.add('border-slate-600', 'focus:ring-amber-400');
  }

  // Reset seating buttons
  const insideBtn = document.getElementById('toggle-inside');
  const outsideBtn = document.getElementById('toggle-outside');
  if (insideBtn && outsideBtn) {
    insideBtn.className = 'flex-1 px-4 py-2 rounded-lg bg-slate-700 text-slate-300 border border-slate-600 font-medium transition hover:bg-slate-600';
    outsideBtn.className = 'flex-1 px-4 py-2 rounded-lg bg-slate-700 text-slate-300 border border-slate-600 font-medium transition hover:bg-slate-600';
  }

  // Reset split table toggle
  const splitToggle = document.getElementById('toggle-split-table');
  if (splitToggle) {
    const stateText = splitToggle.querySelector('.toggle-state-text');
    const switchContainer = splitToggle.querySelector('.toggle-switch-container');
    const switchCircle = splitToggle.querySelector('.toggle-switch');

    if (stateText) stateText.textContent = 'No';
    if (switchContainer) {
      switchContainer.classList.add('bg-slate-600');
      switchContainer.classList.remove('bg-amber-400');
    }
    if (switchCircle) {
      switchCircle.classList.add('bg-slate-300');
      switchCircle.classList.remove('bg-slate-900');
      switchCircle.style.transform = 'translateX(0)';
    }
  }

  // Reset sharing table toggle
  const sharingToggle = document.getElementById('toggle-sharing-table');
  if (sharingToggle) {
    const stateText = sharingToggle.querySelector('.toggle-state-text');
    const switchContainer = sharingToggle.querySelector('.toggle-switch-container');
    const switchCircle = sharingToggle.querySelector('.toggle-switch');

    if (stateText) stateText.textContent = 'No';
    if (switchContainer) {
      switchContainer.classList.add('bg-slate-600');
      switchContainer.classList.remove('bg-amber-400');
    }
    if (switchCircle) {
      switchCircle.classList.add('bg-slate-300');
      switchCircle.classList.remove('bg-slate-900');
      switchCircle.style.transform = 'translateX(0)';
    }
  }

  // Reset modal mode to Waitlist
  const title = document.getElementById('modal-title');
  const modeToggleContainer = document.querySelector('#toggle-modal-mode .toggle-switch-container');
  const modeToggleCircle = document.querySelector('#toggle-modal-mode .toggle-switch');
  const timeSection = document.getElementById('webBooking-time-section');

  if (title) title.textContent = 'Add Web Booking Now';
  if (modeToggleContainer) {
    modeToggleContainer.classList.add('bg-slate-600');
    modeToggleContainer.classList.remove('bg-amber-400');
  }
  if (modeToggleCircle) {
    modeToggleCircle.classList.add('bg-slate-300');
    modeToggleCircle.classList.remove('bg-slate-900');
    modeToggleCircle.style.transform = 'translateX(0)';
  }
  if (timeSection) {
    timeSection.style.display = 'none';
  }
}

/**
 * Handles form submission from add modal
 */
async function submitAddModal(btnId) {
  console.log('ACTION: Add modal submitted with button', btnId);

  // Get form values
  const phoneNumberInput = document.getElementById('phone-number-input');
  const phoneNumberRaw = phoneNumberInput.value.trim();

  const pax = parseInt(document.getElementById('pax-counter').textContent);
  const customerNameRaw = document.getElementById('customer-name-input').value.trim();
  const customerName = customerNameRaw || 'Web User'; // Default to 'Web User' if empty
  const seating = modalSeating; // null, 'inside', or 'outside'
  const isSplitTableAllowed = modalSplitTable;
  const isSharingTableAllowed = modalSharingTable;
  const isWebBooking = modalIsWebBooking;

  let subscriber_id;
  let last_interaction_time = null;

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



  //console.log('GET_INFO: Calling createSubscriber with payload:', createSubscriberPayload);

  try {
    const getInfoByPhoneNumberResponse = await getInfoByPhoneNumber(btnId, phoneNumber);
    console.log('GET_INFO: getInfoByPhoneNumber response:', getInfoByPhoneNumberResponse);

    // Subscriber does not exist, create new subscriber
    if (getInfoByPhoneNumberResponse.data.length === 0) {

      const createSubscriberPayload = {
        whatsapp_phone: phoneNumber,
        opt_in_whatsapp: true,
        consent_phrase: `I agree to receive messages from ${trading_name} on WhatsApp.`,
      };

      const subscriberResponse = await createSubscriber(btnId, createSubscriberPayload);
      console.log('CREATE_SUBSCRIBER: createSubscriber response:', subscriberResponse);

      // Extract subscriber_id from response
      subscriber_id = subscriberResponse?.data?.id;
      console.log('CREATE_SUBSCRIBER: Created with subscriber_id:', subscriber_id);

      if (!subscriber_id) {
        console.error('CREATE_SUBSCRIBER: Failed to extract subscriber_id from response');
        return;
      }

      // Update whatsapp number in custom fields for new subscriber
      const updatePhoneNumber = await updateManyChatCustomFields(btnId, {
        subscriber_id,
        fields: [
          { field_id: 13974135, field_value: phoneNumber }
        ]
      });

      if (updatePhoneNumber && updatePhoneNumber.status === 'success') {
        console.log('✓ ManyChat API call successful - Phone in Custom fields updated for subscriber:', subscriber_id);
      }



      // Subscriber exists, retrieve subscriber info
    } else {
      subscriber_id = getInfoByPhoneNumberResponse.data[0].id;
      console.log('GET_INFO: Retrieved subscriber_id:', subscriber_id);

      const retrieved_custom_fields = getInfoByPhoneNumberResponse.data[0].custom_fields;
      //console.log('GET_INFO: Retrieved custom fields:', retrieved_custom_fields);

      const last_interaction = retrieved_custom_fields.find(field => field.name === 'last_interaction');
      last_interaction_time = last_interaction ? last_interaction.value : null;

      // Convert UTC time to local time and remove fractional seconds
      if (last_interaction_time) {
        // Remove fractional seconds (e.g., '2025-12-03 04:10:56.604861' -> '2025-12-03 04:10:56')
        last_interaction_time = last_interaction_time.split('.')[0];

        // Parse as UTC and convert to local time
        const utcDate = new Date(last_interaction_time + 'Z'); // Add 'Z' to indicate UTC

        // Format to 'YYYY-MM-DD HH:MM:SS' in local timezone
        const year = utcDate.getFullYear();
        const month = String(utcDate.getMonth() + 1).padStart(2, '0');
        const day = String(utcDate.getDate()).padStart(2, '0');
        const hours = String(utcDate.getHours()).padStart(2, '0');
        const minutes = String(utcDate.getMinutes()).padStart(2, '0');
        const seconds = String(utcDate.getSeconds()).padStart(2, '0');

        last_interaction_time = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      }

      console.log('GET_INFO: Retrieved last_interaction_time (local):', last_interaction_time);

    }

  } catch (error) {
    console.error('GET_INFO: createSubscriber error:', error);
    return;
  }

  // Format current time as yyyy-mm-dd hh:mm:ss
  const now = new Date();
  const timeCreated = formatDateTime(now);

  // Create badge array
  const badge = [];

  // Add seating preference badge
  if (seating === 'inside') {
    badge.push('IN');
  } else if (seating === 'outside') {
    badge.push('OUT');
  }

  // Add split table badge
  if (isSplitTableAllowed) {
    badge.push('SPLIT');
  }

  // Add sharing table badge
  if (isSharingTableAllowed) {
    badge.push('SHARE');
  }

  // Create form data object
  // formData structure 수정 시 local_receiver.php도 함께 수정 필요
  const formData = {
    booking_flow: 1.9,
    store_id: store_id,
    booking_from: 'WEB',
    subscriber_id: subscriber_id,
    customer_name: customerName,
    customer_phone: phoneNumber,
    pax: pax,
    time_created: timeCreated,
    status: 'Waiting',
    q_level: 100,
    ws_last_interaction: last_interaction_time,
  };

  // Add badges as badge1, badge2, badge3, etc.
  badge.forEach((badgeText, index) => {
    formData[`badge${index + 1}`] = badgeText;
  });

  // Add dine_dateTime
  if (isWebBooking && modalWebBookingTime) {
    const dineDate = new Date(modalWebBookingTime);
    formData.dine_dateTime = formatDateTime(dineDate);
  } else {
    // For waitlist, dine_dateTime is same as time_created
    formData.dine_dateTime = timeCreated;
  }

  console.log('Form data:', formData);

  // Send data to local_receiver.php
  fetch('webhook/local_receiver.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(formData)
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
        toastMsg('New record successfully inserted');
        closeAddModal();
      } else {
        // Handle failure case
        const phoneInput = document.getElementById('phone-number-input');

        // Reset phone number input
        phoneInput.value = '';

        // Highlight with error state
        phoneInput.classList.remove('border-slate-600', 'focus:ring-amber-400');
        phoneInput.classList.add('border-red-500', 'focus:ring-red-500');

        // Show error message in toast
        const errorMsg = data.false_reason || 'Failed to insert record';

        const originalPlaceholder = phoneInput.placeholder;
        // Show error state
        phoneInput.classList.remove('border-slate-600', 'focus:ring-amber-400');
        phoneInput.classList.add('border-red-500', 'focus:ring-red-500');
        phoneInput.placeholder = errorMsg;

        // Restore after 2 seconds
        setTimeout(() => {
          phoneInput.classList.remove('border-red-500', 'focus:ring-red-500');
          phoneInput.classList.add('border-slate-600', 'focus:ring-amber-400');
          phoneInput.placeholder = originalPlaceholder;
        }, 2000);

        // Focus the input
        phoneInput.focus();

        // Add animation
        phoneInput.classList.add('animate-pulse');
        setTimeout(() => {
          phoneInput.classList.remove('animate-pulse');
        }, 1000);
      }
    })
    .catch((error) => {
      console.error('Failed to insert record:', error);
      toastMsg('Failed to insert record');
    });

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
let modalIsWebBooking = false; // false = Waitlist, true = Web Booking
let modalWebBookingTime = null; // Selected webBooking time

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
 * Toggle between Waitlist and Web Booking mode
 */
function toggleModalMode(event) {
  if (event) {
    event.stopPropagation();
  }

  modalIsWebBooking = !modalIsWebBooking;
  const title = document.getElementById('modal-title');
  const switchContainer = document.querySelector('#toggle-modal-mode .toggle-switch-container');
  const switchCircle = document.querySelector('#toggle-modal-mode .toggle-switch');
  const timeSection = document.getElementById('webBooking-time-section');

  if (modalIsWebBooking) {
    title.textContent = 'Add Web Booking Ahead';
    switchContainer.classList.add('bg-amber-400');
    switchContainer.classList.remove('bg-slate-600');
    switchCircle.classList.add('bg-slate-900');
    switchCircle.classList.remove('bg-slate-300');
    switchCircle.style.transform = 'translateX(20px)';
    timeSection.style.display = 'block';
    populateWebBookingTimes();
  } else {
    title.textContent = 'Add Web Booking Now';
    switchContainer.classList.add('bg-slate-600');
    switchContainer.classList.remove('bg-amber-400');
    switchCircle.classList.add('bg-slate-300');
    switchCircle.classList.remove('bg-slate-900');
    switchCircle.style.transform = 'translateX(0)';
    timeSection.style.display = 'none';
  }
}

/**
 * Populate webBooking time picker with scroll wheel style
 */
function populateWebBookingTimes() {
  const now = new Date();

  // Calculate minimum allowed webBooking time (now + webBooking_ahead_minutes)
  const minWebBookingTime = new Date(now.getTime() + webBooking_ahead_minutes * 60000);

  // Round up to next interval
  const minMinutes = minWebBookingTime.getMinutes();
  const roundedMinutes = Math.ceil(minMinutes / webBooking_interval_minutes) * webBooking_interval_minutes;

  let startHour = minWebBookingTime.getHours();
  let startMinute = roundedMinutes;
  if (startMinute >= 60) {
    startHour = (startHour + 1) % 24;
    startMinute = startMinute % 60;
  }

  // Store minimum time for validation
  window.minWebBookingTime = minWebBookingTime;

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

  // Populate minute picker based on webBooking_interval_minutes
  const minutePicker = document.getElementById('minute-picker');
  minutePicker.innerHTML = '';

  minutePicker.innerHTML += '<div class="h-6"></div>';

  // Generate minute options based on interval
  const minuteOptions = [];
  for (let min = 0; min < 60; min += webBooking_interval_minutes) {
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
      updateWebBookingTime();
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
      updateWebBookingTime();
    }, 150);
  });

  // Initialize webBooking time
  updateWebBookingTime();
}

/**
 * Update selected webBooking time based on picker positions
 */
function updateWebBookingTime() {
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
    const webBookingDate = new Date(now);
    webBookingDate.setHours(selectedHour, selectedMinute, 0, 0);

    // If selected time is in the past, add one day
    if (webBookingDate < now) {
      webBookingDate.setDate(webBookingDate.getDate() + 1);
    }

    modalWebBookingTime = webBookingDate.toISOString();

    // Validate: show red border if selected time is before minimum allowed time
    const minTime = window.minWebBookingTime;
    const minutePickerContainer = document.getElementById('minute-picker-container');

    if (minTime && webBookingDate < minTime) {
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
 * Copy phone number from clipboard +
 */
async function copyFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    const phoneInput = document.getElementById('phone-number-input');

    // Validate if the text contains valid phone number characters (digits, +, -, spaces)
    const phonePattern = /^[\d\s+\-()]+$/;

    if (!phonePattern.test(text.trim())) {
      // Save original placeholder
      const originalPlaceholder = phoneInput.placeholder;

      // Show error state
      phoneInput.classList.remove('border-slate-600', 'focus:ring-amber-400');
      phoneInput.classList.add('border-red-500', 'focus:ring-red-500');
      phoneInput.placeholder = 'Copied phone invalid';

      // Restore after 2 seconds
      setTimeout(() => {
        phoneInput.classList.remove('border-red-500', 'focus:ring-red-500');
        phoneInput.classList.add('border-slate-600', 'focus:ring-amber-400');
        phoneInput.placeholder = originalPlaceholder;
      }, 2000);

      return;
    }

    // Process the phone number: remove all non-digits
    let cleanedNumber = text.replace(/\D/g, '');

    // Remove leading 6 if present
    if (cleanedNumber.startsWith('6')) {
      cleanedNumber = cleanedNumber.substring(1);
    }

    // Set the cleaned number to input
    phoneInput.value = cleanedNumber;

    // Trigger the input event to format the phone number
    updatePhoneDisplay();

    // Focus the input
    phoneInput.focus();
  } catch (err) {
    console.error('Failed to read clipboard:', err);
    const phoneInput = document.getElementById('phone-number-input');
    const originalPlaceholder = phoneInput.placeholder;

    phoneInput.classList.remove('border-slate-600', 'focus:ring-amber-400');
    phoneInput.classList.add('border-red-500', 'focus:ring-red-500');
    phoneInput.placeholder = 'Failed to read clipboard';

    setTimeout(() => {
      phoneInput.classList.remove('border-red-500', 'focus:ring-red-500');
      phoneInput.classList.add('border-slate-600', 'focus:ring-amber-400');
      phoneInput.placeholder = originalPlaceholder;
    }, 2000);
  }
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

