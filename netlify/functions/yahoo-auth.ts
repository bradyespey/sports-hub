// netlify/functions/yahoo-auth.ts
// This is a helper function to get your initial OAuth tokens
// Run this once to get your refresh token, then save it as YAHOO_REFRESH_TOKEN

import { Handler } from '@netlify/functions';

const YAHOO_CLIENT_ID = process.env.YAHOO_CLIENT_ID;
const YAHOO_CLIENT_SECRET = process.env.YAHOO_CLIENT_SECRET;
const YAHOO_REDIRECT_URI = process.env.YAHOO_REDIRECT_URI || 'http://localhost:8888/.netlify/functions/yahoo-auth-callback';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'text/html',
  };

  // Step 1: Redirect to Yahoo authorization
  if (!event.queryStringParameters?.code) {
    const authUrl = new URL('https://api.login.yahoo.com/oauth2/request_auth');
    authUrl.searchParams.set('client_id', YAHOO_CLIENT_ID || '');
    authUrl.searchParams.set('redirect_uri', YAHOO_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('language', 'en-us');

    return {
      statusCode: 302,
      headers: {
        Location: authUrl.toString(),
      },
      body: '',
    };
  }

  // Step 2: Exchange code for tokens
  const code = event.queryStringParameters.code;
  const auth = Buffer.from(`${YAHOO_CLIENT_ID}:${YAHOO_CLIENT_SECRET}`).toString('base64');

  try {
    const response = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        redirect_uri: YAHOO_REDIRECT_URI,
        code: code,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const tokens = await response.json();

    return {
      statusCode: 200,
      headers,
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Yahoo OAuth Success</title>
          <style>
            body { font-family: system-ui; padding: 40px; max-width: 800px; margin: 0 auto; }
            pre { background: #f5f5f5; padding: 20px; border-radius: 8px; overflow-x: auto; }
            .success { color: #16a34a; font-size: 24px; margin-bottom: 20px; }
            .warning { color: #dc2626; margin: 20px 0; padding: 15px; background: #fee; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="success">✅ Yahoo OAuth Successful!</div>
          
          <p>Save these tokens securely:</p>
          <pre>${JSON.stringify(tokens, null, 2)}</pre>
          
          <div class="warning">
            <strong>⚠️ Important:</strong>
            <ol>
              <li>Add <code>YAHOO_REFRESH_TOKEN</code> to your .env.local file</li>
              <li>Add the same token to your Netlify environment variables</li>
              <li>Keep these tokens secret - never commit them to git</li>
              <li>The refresh token will be used to get new access tokens automatically</li>
            </ol>
          </div>
          
          <p>Copy this to your .env.local:</p>
          <pre>YAHOO_REFRESH_TOKEN=${tokens.refresh_token}</pre>
          
          <p>You can close this window now.</p>
        </body>
        </html>
      `,
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>OAuth Error</title>
          <style>
            body { font-family: system-ui; padding: 40px; max-width: 800px; margin: 0 auto; }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1 class="error">OAuth Error</h1>
          <pre>${error instanceof Error ? error.message : 'Unknown error'}</pre>
        </body>
        </html>
      `,
    };
  }
};
