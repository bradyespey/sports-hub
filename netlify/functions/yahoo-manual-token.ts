// netlify/functions/yahoo-manual-token.ts
// Alternative manual token exchange when redirect URI doesn't work

import { Handler } from '@netlify/functions';

const YAHOO_CLIENT_ID = process.env.YAHOO_CLIENT_ID;
const YAHOO_CLIENT_SECRET = process.env.YAHOO_CLIENT_SECRET;

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'text/html',
  };

  const code = event.queryStringParameters?.code;

  // If no code provided, show instructions
  if (!code) {
    const authUrl = `https://api.login.yahoo.com/oauth2/request_auth?client_id=${YAHOO_CLIENT_ID}&redirect_uri=oob&response_type=code&language=en-us`;
    
    return {
      statusCode: 200,
      headers,
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Manual Yahoo OAuth</title>
          <style>
            body { font-family: system-ui; padding: 40px; max-width: 800px; margin: 0 auto; }
            .step { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .button { display: inline-block; padding: 12px 24px; background: #6001d2; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
            input { width: 100%; padding: 10px; margin: 10px 0; font-size: 16px; }
            button { padding: 12px 24px; background: #16a34a; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; }
          </style>
        </head>
        <body>
          <h1>Yahoo OAuth - Manual Token Setup</h1>
          
          <div class="step">
            <h3>Step 1: Authorize</h3>
            <p>Click this button to authorize with Yahoo:</p>
            <a href="${authUrl}" target="_blank" class="button">Authorize Yahoo Fantasy Access</a>
          </div>

          <div class="step">
            <h3>Step 2: Copy Code</h3>
            <p>After authorizing, Yahoo will show you a code. Copy the entire code.</p>
          </div>

          <div class="step">
            <h3>Step 3: Exchange Code for Token</h3>
            <form onsubmit="event.preventDefault(); window.location.href='?code=' + document.getElementById('code').value;">
              <input type="text" id="code" placeholder="Paste authorization code here" />
              <button type="submit">Get Refresh Token</button>
            </form>
          </div>
        </body>
        </html>
      `,
    };
  }

  // Exchange code for tokens
  try {
    const auth = Buffer.from(`${YAHOO_CLIENT_ID}:${YAHOO_CLIENT_SECRET}`).toString('base64');
    
    const response = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        redirect_uri: 'oob',
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
            pre { background: #f5f5f5; padding: 20px; border-radius: 8px; overflow-x: auto; word-wrap: break-word; }
            .success { color: #16a34a; font-size: 24px; margin-bottom: 20px; }
            .warning { color: #dc2626; margin: 20px 0; padding: 15px; background: #fee; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="success">✅ Success!</div>
          
          <p>Add this to your .env file:</p>
          <pre>YAHOO_REFRESH_TOKEN=${tokens.refresh_token}</pre>
          
          <div class="warning">
            <strong>Next steps:</strong>
            <ol>
              <li>Copy the YAHOO_REFRESH_TOKEN above</li>
              <li>Add it to your .env file</li>
              <li>Add it to Netlify environment variables</li>
              <li>Restart: npm run dev:netlify</li>
            </ol>
          </div>
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
          <title>Error</title>
          <style>
            body { font-family: system-ui; padding: 40px; max-width: 800px; margin: 0 auto; }
            .error { color: #dc2626; }
            pre { background: #fee; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1 class="error">Error</h1>
          <pre>${error instanceof Error ? error.message : 'Unknown error'}</pre>
          <p><a href="?">Try again</a></p>
        </body>
        </html>
      `,
    };
  }
};
