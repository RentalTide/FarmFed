const https = require('https');

const ONFLEET_API_BASE = 'onfleet.com';
const ONFLEET_API_PATH = '/api/v2';

/**
 * Check whether the OnFleet integration is configured.
 * Returns true if ONFLEET_API_KEY env var is set and non-empty.
 */
const isConfigured = () => {
  return !!process.env.ONFLEET_API_KEY;
};

/**
 * Make an authenticated request to the OnFleet REST API.
 *
 * Uses Basic auth with the API key (base64 of "API_KEY:").
 * Follows the same https pattern as geocode.js.
 *
 * @param {string} method - HTTP method (GET, POST, DELETE)
 * @param {string} path - API path after /api/v2 (e.g. "/tasks")
 * @param {Object|null} body - JSON body for POST/PUT requests
 * @returns {Promise<Object>} Parsed JSON response
 */
const onfleetRequest = (method, path, body) => {
  const apiKey = process.env.ONFLEET_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error('ONFLEET_API_KEY is not configured'));
  }

  const authToken = Buffer.from(`${apiKey}:`).toString('base64');
  const postData = body ? JSON.stringify(body) : null;

  const options = {
    hostname: ONFLEET_API_BASE,
    path: `${ONFLEET_API_PATH}${path}`,
    method,
    headers: {
      Authorization: `Basic ${authToken}`,
      'Content-Type': 'application/json',
      ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) {
            const err = new Error(json.message?.message || json.message || 'OnFleet API error');
            err.statusCode = res.statusCode;
            err.response = json;
            reject(err);
          } else {
            resolve(json);
          }
        } catch (e) {
          reject(new Error('Failed to parse OnFleet API response'));
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
};

/**
 * Create a delivery task in OnFleet.
 *
 * @param {Object} params
 * @param {Object} params.destination - { address: { number, street, city, state, postalCode, country }, location: [lng, lat] }
 * @param {Array} params.recipients - [{ name, phone }]
 * @param {string} [params.notes] - Task notes
 * @param {Array} [params.metadata] - [{ name, type, value }]
 * @returns {Promise<Object>} Created task object
 */
const createTask = ({ destination, recipients, notes, metadata }) => {
  const body = {
    destination,
    recipients,
    ...(notes ? { notes } : {}),
    ...(metadata ? { metadata } : {}),
  };
  return onfleetRequest('POST', '/tasks', body);
};

/**
 * Get a task by ID.
 *
 * @param {string} taskId - OnFleet task ID
 * @returns {Promise<Object>} Task object
 */
const getTask = taskId => {
  return onfleetRequest('GET', `/tasks/${taskId}`, null);
};

/**
 * Delete a task by ID.
 *
 * @param {string} taskId - OnFleet task ID
 * @returns {Promise<Object>} Deletion confirmation
 */
const deleteTask = taskId => {
  return onfleetRequest('DELETE', `/tasks/${taskId}`, null);
};

module.exports = { isConfigured, onfleetRequest, createTask, getTask, deleteTask };
