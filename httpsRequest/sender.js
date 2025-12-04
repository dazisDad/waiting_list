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
    let url = 'httpsRequest/sender.php';
    const fetchOptions = {
      method: method,
      headers: { 'Content-Type': 'application/json' },
    };
    
    if (method === 'POST') {
      // POST: send inputDataSet in body
      fetchOptions.body = JSON.stringify(inputDataSet);
    } else if (method === 'GET') {
      // GET: send inputDataSet as URL-encoded query parameters
      const params = new URLSearchParams({
        data: JSON.stringify(inputDataSet)
      });
      url = `${url}?${params.toString()}`;
    }

    const resp = await fetch(url, fetchOptions);

    const text = await resp.text();
    try {
      const data = JSON.parse(text);
      if (!resp.ok) {
        console.error(`sendHttpsRequest (${method}): HTTP ${resp.status} error response:`, data);
      }
      //console.log(`sendHttpsRequest (${method}): response`, data);
      return data;
    } catch (e) {
      console.error(`sendHttpsRequest (${method}): non-json response (HTTP ${resp.status}):`, text);
      return { success: false, error: 'Invalid JSON response', rawResponse: text, status: resp.status };
    }
  } catch (e) {
    console.error(`sendHttpsRequest (${method}): error`, e);
    return { success: false, error: e.message };
  }
}

// Expose the function globally for external use
window.sendHttpsRequest = sendHttpsRequest;
