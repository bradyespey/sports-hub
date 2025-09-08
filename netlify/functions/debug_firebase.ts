import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed", headers };
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY || "";
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      hasPrivateKey: !!privateKey,
      privateKeyLength: privateKey.length,
      startsWithBegin: privateKey.includes("-----BEGIN PRIVATE KEY-----"),
      endsWithEnd: privateKey.includes("-----END PRIVATE KEY-----"),
      hasLiteralNewlines: privateKey.includes("\\n"),
      hasActualNewlines: privateKey.includes("\n"),
      firstChars: privateKey.substring(0, 50),
      lastChars: privateKey.substring(privateKey.length - 50),
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.substring(0, 20) + "..."
    }),
    headers: { 
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  };
};

export default handler;
