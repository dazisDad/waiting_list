// httpsRequest/sender.js
// Generalized HTTPS request handler that sends requests via sender.php

/**
 * Send an HTTPS request through the PHP proxy
 * @param {Object} inputDataSet - Request configuration
 * @param {string} inputDataSet.requestTo - Service identifier for bearer token lookup
 * @param {string} inputDataSet.url - Target URL for the request
 * @param {Object} inputDataSet.payload - Data to send in the request body (POST only)
 * @param {string} method - HTTP method ('POST' or 'GET'), defaults to 'POST'
 * @returns {Promise<Object>} Response data
 */
async function sendHttpsRequest(inputDataSet, method = 'POST') {
  console.log(`sendHttpsRequest (${method}): preparing request`, inputDataSet);

  try {
    const fetchOptions = {
      method: method,
      headers: { 'Content-Type': 'application/json' },
    };
    
    // Only add body for POST requests
    if (method === 'POST') {
      fetchOptions.body = JSON.stringify(inputDataSet);
    }

    const resp = await fetch('httpsRequest/sender.php', fetchOptions);

    const text = await resp.text();
    try {
      const data = JSON.parse(text);
      //console.log(`sendHttpsRequest (${method}): response`, data);
      return data;
    } catch (e) {
      console.log(`sendHttpsRequest (${method}): non-json response`, text);
      return { success: false, error: 'Invalid JSON response', rawResponse: text };
    }
  } catch (e) {
    console.error(`sendHttpsRequest (${method}): error`, e);
    return { success: false, error: e.message };
  }
}

// Expose the function globally for external use
window.sendHttpsRequest = sendHttpsRequest;
