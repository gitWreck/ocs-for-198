const ALLOWED_ACTIONS = new Set(["confirmed-hi", "hi-status"]);

function sendJson(response, status, payload) {
  response.status(status).json(payload);
}

function getBearerToken(request) {
  const authorization = request.headers.authorization || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
}

async function verifyGoogleIdToken(idToken) {
  const tokenInfoUrl = new URL("https://oauth2.googleapis.com/tokeninfo");
  tokenInfoUrl.searchParams.set("id_token", idToken);

  const response = await fetch(tokenInfoUrl.toString());

  if (!response.ok) {
    throw new Error("Invalid Google sign-in token.");
  }

  return response.json();
}

function getVerifiedEmail(tokenInfo) {
  const email = String(tokenInfo.email || "").trim().toLowerCase();
  const hostedDomain = String(tokenInfo.hd || "").trim().toLowerCase();
  const expectedClientId = process.env.GOOGLE_CLIENT_ID || "";

  if (expectedClientId && tokenInfo.aud !== expectedClientId) {
    throw new Error("Google sign-in token was issued for another client.");
  }

  if (!email) {
    throw new Error("Google sign-in token has no email.");
  }

  if (hostedDomain !== "up.edu.ph" && !email.endsWith("@up.edu.ph")) {
    throw new Error("Only UP Google accounts can access this data.");
  }

  return email;
}

async function callAppsScript(action, email) {
  const appsScriptUrl = process.env.APPS_SCRIPT_URL || "";
  const sharedSecret = process.env.APPS_SCRIPT_SHARED_SECRET || "";

  if (!appsScriptUrl || !sharedSecret) {
    throw new Error("Portal data API is not configured.");
  }

  const url = new URL(appsScriptUrl);
  url.searchParams.set("action", action);
  url.searchParams.set("email", email);
  url.searchParams.set("secret", sharedSecret);

  const response = await fetch(url.toString(), { redirect: "follow" });
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("Apps Script returned an invalid response.");
  }
}

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    sendJson(response, 405, {
      success: false,
      message: "Method not allowed.",
    });
    return;
  }

  const action = String(request.query.action || "").trim().toLowerCase();

  if (!ALLOWED_ACTIONS.has(action)) {
    sendJson(response, 400, {
      success: false,
      message: "Unsupported action.",
    });
    return;
  }

  try {
    const idToken = getBearerToken(request);

    if (!idToken) {
      sendJson(response, 401, {
        success: false,
        message: "Missing Google sign-in token.",
      });
      return;
    }

    const tokenInfo = await verifyGoogleIdToken(idToken);
    const email = getVerifiedEmail(tokenInfo);
    const payload = await callAppsScript(action, email);

    sendJson(response, payload && payload.success === false ? 400 : 200, payload);
  } catch (error) {
    sendJson(response, 500, {
      success: false,
      message: error && error.message ? error.message : "Portal data lookup failed.",
    });
  }
};
