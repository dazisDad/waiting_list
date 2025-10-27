

/**A "Dummy" Service worker registration is needed to enable notification in android chrome.
 * 
 * Reference 1: problem identification
 * https://stackoverflow.com/questions/69955497/problem-with-service-worker-javascript-on-mobile-browsers
 * 
 * Reference 2: source code
 * https://stackoverflow.com/questions/31512504/html5-notification-not-working-in-mobile-chrome/31787926#31787926
 * 
 * Reference 3: Service Worker Registration
 * https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification
 * 
 */


navigator.serviceWorker.register('sw.js');

// Notification permission
let notificationPermission;

// Check for permission
document.addEventListener('DOMContentLoaded', async () => {
    notificationPermission = await Notification.requestPermission();
    if (notificationPermission === "granted") {
        console.log("Permission Granted");
    } else {
        alert("Please grant permission manually to receive notifications.");
    }
    notify('New Order Monitoring','Start');
});

function notify(title, bodyText) {
    if (notificationPermission === 'granted') {
        navigator.serviceWorker.ready.then(function(registration) {
            registration.showNotification(title, {
                body: bodyText,
                icon: 'logo_round_white_small.png'
            });
        });
    }
}

let button = document.querySelector('button');
let evtSource = new EventSource('sse.php?tableName=history_bill');
let eventList = document.querySelector('ul');

evtSource.onopen = function() {
    const date = new Date();
    let currentTime = formatDate(date);
    console.log(`Connection to server opened. (${currentTime})`);
};

evtSource.onmessage = function(e) {
    handleNewMessage(e.data);
};

evtSource.onerror = function() {
    const date = new Date();
    let currentTime = formatDate(date);
    console.log(`EventSource failed. (${currentTime})`);
};

button.onclick = function() {
    console.log('Connection closed');
    evtSource.close();
    new Notification("Connection closed");
};

async function handleNewMessage(data) {
    let obj = JSON.parse(data);
    
    const date = new Date();
    let currentTime = formatDate(date);

    // Update UI
    let newElement = document.createElement("li");
    newElement.textContent = `#${obj.order_no} / RM${obj.bill_amount} / ${obj.time} (Pushed @ ${currentTime})`;
    eventList.appendChild(newElement);

    // Notify user
    notify("New Order Received", "Last Bill Amount: RM" + obj.bill_amount);

}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // 월은 0부터 시작하므로 1을 더함
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}/${month}/${day}, ${hours}:${minutes}:${seconds}`;
}


// Sync functionality removed: server-side sync endpoint and periodic client sync
// were intentionally deleted. Notifications and SSE handling remain intact.


