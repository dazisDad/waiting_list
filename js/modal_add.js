/**
 * modal_add.js
 * Handles the Add button functionality with a modal dialog
 */

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
    dialog.style.maxHeight = '90vh';
    
    // Dialog content
    dialog.innerHTML = `
      <div class="flex flex-col h-full min-w-[400px]">
        <!-- Header -->
        <div class="flex justify-between items-center p-6 border-b border-slate-700">
          <h2 class="text-xl font-semibold text-slate-100">Add Waitlist</h2>
          <button onclick="closeAddModal()" class="text-slate-400 hover:text-slate-200 transition">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        
        <!-- Content -->
        <div class="flex-1 p-6 overflow-y-auto">
          <div class="space-y-6">
            <!-- Pax Counter and Seating Preference -->
            <div class="flex gap-6">
              <!-- Pax Counter -->
              <div class="w-[40%]">
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
              <div class="w-[60%]">
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
              <input 
                type="tel" 
                id="phone-number-input" 
                placeholder="Enter phone number"
                class="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
              />
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
          <button onclick="submitAddModal()" class="px-4 py-2 rounded-lg bg-amber-400 text-slate-900 hover:bg-amber-500 transition font-medium">
            Add to Waitlist
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
  }
  
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
      closeAddModal();
    }
  });
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
  const phoneNumber = document.getElementById('phone-number-input').value;
  const seating = modalSeating; // null, 'inside', or 'outside'
  const isSplitTableAllowed = document.getElementById('toggle-split-table').dataset.value === 'true';
  const isSharingTableAllowed = document.getElementById('toggle-sharing-table').dataset.value === 'true';
  
  console.log('Form data:', { pax, phoneNumber, seating, isSplitTableAllowed, isSharingTableAllowed });
  
  // TODO: Implement submission logic
  closeAddModal();
}

// Modal state variables
let modalPaxCount = 2;
let modalSeating = null; // null, 'inside', or 'outside'
let modalSplitTable = false;
let modalSharingTable = false;

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
