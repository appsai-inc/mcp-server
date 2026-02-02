/**
 * Parse SDK Client Setup
 *
 * Initializes Parse SDK for communicating with the Parse Server.
 */

import Parse from 'parse/node.js';

let initialized = false;

/**
 * Initialize Parse SDK with server configuration
 */
export function initializeParse() {
  if (initialized) return;

  const serverUrl = process.env.PARSE_SERVER_URL || 'https://internal.appsai.com/server';
  const appId = process.env.PARSE_APP_ID || 'Rv4CcqHMjTcjAzSDb6vVMnw0Yp99ZQ5Wrvh80PUI';

  Parse.initialize(appId);
  Parse.serverURL = serverUrl;

  initialized = true;
  console.error(`[Parse] Initialized with server: ${serverUrl}`);
}

/**
 * Run a Parse Cloud function
 */
export async function runCloudFunction<T = unknown>(
  functionName: string,
  params: Record<string, unknown>,
  sessionToken?: string
): Promise<T> {
  initializeParse();

  const options: Parse.Cloud.RunOptions = {};

  if (sessionToken) {
    options.sessionToken = sessionToken;
  }

  return Parse.Cloud.run(functionName, params, options) as Promise<T>;
}

/**
 * Validate an API key and get the associated user ID
 */
export async function validateAPIKey(apiKey: string): Promise<{ valid: boolean; userId?: string; error?: string }> {
  initializeParse();

  try {
    // No useMasterKey - the cloud function handles auth internally
    const result = await Parse.Cloud.run('validateMCPAPIKey', { apiKey }) as {
      valid: boolean;
      userId?: string;
      error?: string;
    };
    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { valid: false, error: message };
  }
}

export { Parse };
