// httpsRequest/sender.js
// Generalized HTTPS request handler that sends requests via sender.php

/**
 * Send an HTTPS request through the PHP proxy
 * @param {Object} inputDataSet - Request configuration
 * @param {string} inputDataSet.requestTo - Service identifier for bearer token lookup
 * @param {string} inputDataSet.url - Target URL for the request
 * @param {Object} inputDataSet.payload - Data to send in the request body
 * @returns {Promise<Object>} Response data
 */
async function sendHttpsRequest(inputDataSet) {
  console.log('sendHttpsRequest: preparing request', inputDataSet);

  try {
    const resp = await fetch('httpsRequest/sender.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputDataSet),
    });

    const text = await resp.text();
    try {
      const data = JSON.parse(text);
      console.log('sendHttpsRequest: response', data);
      return data;
    } catch (e) {
      console.log('sendHttpsRequest: non-json response', text);
      return { success: false, error: 'Invalid JSON response', rawResponse: text };
    }
  } catch (e) {
    console.error('sendHttpsRequest: error', e);
    return { success: false, error: e.message };
  }
}
// Expose the function globally for external use
window.sendHttpsRequest = sendHttpsRequest;
