# API Structure

Use this when moving the portal theme and frontend structure to another project
with a different Google Apps Script. The important part is the API contract, not
the exact Apps Script code from this repository.

## Recommended Request Flow

Keep this split in the next project:

1. Browser signs in with Google and stores the Google ID token in
   `sessionStorage.student_portal_user`.
2. Frontend calls the local API route `/api/portal-data?action=...` with
   `Authorization: Bearer GOOGLE_ID_TOKEN`.
3. Local API route verifies the Google token and extracts the verified email.
4. Local API route calls your Apps Script with `action`, `email`, and a shared
   secret.
5. Apps Script returns JSON in the common response format below.

This keeps the Apps Script secret out of the browser. The browser should never
send the shared secret directly.

## Environment Variables

The local API route needs these values:

```env
APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
APPS_SCRIPT_SHARED_SECRET=replace-with-a-long-random-secret
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

Do not commit real secrets to the next project.

## Frontend Read API

All portal read components call the same local endpoint:

```http
GET /api/portal-data?action=ACTION_NAME
Authorization: Bearer GOOGLE_ID_TOKEN
```

Supported actions used by this portal:

| Action | Used by | Purpose |
| --- | --- | --- |
| `fic-section` | `current-hi-card.js` | Assigned HI, remarks, faculty-in-charge, and section |
| `requirements-checklist` | `requirements-checklist.js` | Student requirement completion and attendance/unit details |
| `hi-status` | `hi-status-modal.js` | HI application choices, statuses, and remarks |
| `confirmed-hi` | `confirmed-hi-modal.js` | Final confirmed HI and remarks |

## Common JSON Response

Every Apps Script action should return JSON:

```json
{
  "success": true,
  "records": []
}
```

For errors:

```json
{
  "success": false,
  "message": "Readable error message."
}
```

The frontend expects `records` to be an array. Return an empty array when there
is no matching data.

## Apps Script Request Contract

Your Apps Script web app should accept a `GET` request with these query
parameters:

| Parameter | Required | Description |
| --- | --- | --- |
| `action` | Yes | One of the supported action names |
| `email` | Yes | Verified user email from the local API route |
| `secret` | Yes | Shared secret matching `APPS_SCRIPT_SHARED_SECRET` |

Example Apps Script routing skeleton:

```js
const SHARED_SECRET = "replace-with-the-same-secret-as-env";

function doGet(e) {
  try {
    const action = String(e.parameter.action || "").trim().toLowerCase();
    const email = String(e.parameter.email || "").trim().toLowerCase();
    const secret = String(e.parameter.secret || "");

    if (secret !== SHARED_SECRET) {
      return jsonResponse({
        success: false,
        message: "Unauthorized request.",
      });
    }

    if (!email) {
      return jsonResponse({
        success: false,
        message: "Missing email.",
      });
    }

    if (action === "fic-section") {
      return jsonResponse({ success: true, records: getFicSection(email) });
    }

    if (action === "requirements-checklist") {
      return jsonResponse({ success: true, records: getRequirements(email) });
    }

    if (action === "hi-status") {
      return jsonResponse({ success: true, records: getHiStatus(email) });
    }

    if (action === "confirmed-hi") {
      return jsonResponse({ success: true, records: getConfirmedHi(email) });
    }

    return jsonResponse({
      success: false,
      message: "Unsupported action.",
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      message: error && error.message ? error.message : "Request failed.",
    });
  }
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## Required Record Shapes

Your Apps Script can read from any spreadsheet or database, but return these
field names so the existing frontend works without edits.

### `fic-section`

Return one record for the signed-in student:

```json
{
  "success": true,
  "records": [
    {
      "hiName": "Host Institution Name",
      "remarks": "Optional remarks",
      "ficName": "Faculty Name",
      "sectionId": "FOR 198 A"
    }
  ]
}
```

### `requirements-checklist`

Return one record. Boolean values must be real booleans, not `"TRUE"` strings,
unless the frontend mapper is updated.

```json
{
  "success": true,
  "records": [
    {
      "mentalHealthTest": true,
      "validMedicalCertificate": false,
      "validAccidentInsurance": true,
      "studentPledgeForm": true,
      "jointUndertakingForm": false,
      "workPlan": false,
      "am": true,
      "pm": true,
      "onboardingSession": false,
      "exitConference": false,
      "csarUnits": 62
    }
  ]
}
```

### `hi-status`

Return one or more application records. The current frontend uses these exact
keys, including spaces:

```json
{
  "success": true,
  "records": [
    {
      "fullname": "Student Name",
      "email": "student@up.edu.ph",
      "student number": "2026-00000",
      "hi 1": "First Host Institution",
      "status 1": "Accepted",
      "remarks 1": "Optional remarks",
      "hi 2": "Second Host Institution",
      "status 2": "Waitlisted",
      "remarks 2": "",
      "hi 3": "Third Host Institution",
      "status 3": "Rejected",
      "remarks 3": ""
    }
  ]
}
```

Recognized statuses are `Accepted`, `Shortlisted`, `Waitlisted`, and
`Rejected`. Other values still render as a neutral badge.

### `confirmed-hi`

Return one or more confirmed placement records:

```json
{
  "success": true,
  "records": [
    {
      "confirmedHi": "Confirmed Host Institution",
      "remarks": "Optional remarks"
    }
  ]
}
```

## Submission Upload API

The current application also has a separate direct Apps Script endpoint for file
submission uploads. This is different from `/api/portal-data`.

Frontend request:

```http
POST YOUR_APPS_SCRIPT_UPLOAD_URL
Content-Type: text/plain;charset=utf-8
```

Request body:

```json
{
  "email": "student@up.edu.ph",
  "term_year": "2026 Midyear",
  "student_no": "2026-00000",
  "fullname": "Student Name",
  "all_selected_his": ["HI One", "HI Two", "HI Three"],
  "file_name": "document.pdf",
  "mime_type": "application/pdf",
  "file_base64": "BASE64_FILE_CONTENT"
}
```

Expected response:

```json
{
  "success": true,
  "file_url": "https://drive.google.com/...",
  "file_id": "google-drive-file-id",
  "file_name": "document.pdf"
}
```

If your next project does not upload files through Apps Script, remove or
replace the upload function in the portal JavaScript and keep `/api/portal-data`
only for read-only portal data.

## Local API Route Checklist

When creating the next project's API route, keep these behaviors:

- Accept only `GET` for `/api/portal-data`.
- Allow only the supported action names.
- Read the Google ID token from the `Authorization` header.
- Verify the token with Google and check `aud` against `GOOGLE_CLIENT_ID`.
- Restrict emails to the domain your project allows.
- Call Apps Script server-side with `action`, verified `email`, and `secret`.
- Return the Apps Script JSON directly to the frontend.

