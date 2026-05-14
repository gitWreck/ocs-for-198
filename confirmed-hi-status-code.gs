const CONFIRMED_HI_SPREADSHEET_ID =
  "1cX2v8G6HX10tHdFNVF0eH8ME1RaL0BHdmg-AWy8qoxQ";
const CONFIRMED_HI_SHEET_NAME = "STUDENTS With CONFIRMED HIs";
const CONFIRMED_HI_ROUTE = "confirmed-hi";
const CONFIRMED_HI_HEADER_ALIASES = {
  email: ["email", "student email", "email address", "up mail"],
  confirmed_hi: ["confirmed hi"],
  remarks: ["remarks"],
};
const HI_STATUS_SPREADSHEET_ID =
  "1x1b4NjqOAg_rXEwwr5c8EuIhdm8xCUMkuxKlBMyd7Go";
const HI_STATUS_SHEET_NAME = "STATUS OF APPLICATION";
const HI_STATUS_ROUTE = "hi-status";

function normalizeConfirmedHiHeader(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getConfirmedHiHeaderIndex(headers, aliases) {
  const normalizedAliases = aliases.map(normalizeConfirmedHiHeader);

  return headers.findIndex((header) =>
    normalizedAliases.includes(normalizeConfirmedHiHeader(header))
  );
}

function getConfirmedHiHeaderIndexes(headers, aliases) {
  const normalizedAliases = aliases.map(normalizeConfirmedHiHeader);

  return headers.reduce((indexes, header, index) => {
    if (normalizedAliases.includes(normalizeConfirmedHiHeader(header))) {
      indexes.push(index);
    }

    return indexes;
  }, []);
}

function normalizeConfirmedHiEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function safeConfirmedHiText(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function getPortalApiSharedSecret() {
  return (
    PropertiesService.getScriptProperties().getProperty(
      "PORTAL_API_SHARED_SECRET"
    ) || ""
  );
}

function getAuthorizedPortalEmail(e) {
  const suppliedEmail = normalizeConfirmedHiEmail(
    e && e.parameter ? e.parameter.email : ""
  );
  const suppliedSecret = String(
    e && e.parameter ? e.parameter.secret || "" : ""
  );
  const expectedSecret = getPortalApiSharedSecret();

  if (suppliedEmail && expectedSecret && suppliedSecret === expectedSecret) {
    return {
      email: suppliedEmail,
    };
  }

  return {
    error: "Unauthorized Apps Script request.",
  };
}

function getConfirmedHiCallbackName(e) {
  const callback = String(
    e && e.parameter ? e.parameter.callback || e.parameter.prefix || "" : ""
  ).trim();

  if (!callback) {
    return "";
  }

  return /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback) ? callback : "";
}

function createConfirmedHiResponse(payload, callbackName) {
  if (callbackName) {
    return ContentService.createTextOutput(
      `${callbackName}(${JSON.stringify(payload)});`
    ).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function doGet(e) {
  const action = String(e && e.parameter ? e.parameter.action : "")
    .trim()
    .toLowerCase();
  const callbackName = getConfirmedHiCallbackName(e);

  if (action === CONFIRMED_HI_ROUTE) {
    return getConfirmedHiResponse(e, callbackName);
  }

  if (action === HI_STATUS_ROUTE) {
    return getHiStatusResponse(e, callbackName);
  }

  return createConfirmedHiResponse({
    success: false,
    message: "Unsupported action.",
  }, callbackName);
}

function getConfirmedHiResponse(e, callbackName) {
  try {
    const authorization = getAuthorizedPortalEmail(e);
    const email = authorization.email || "";

    if (!email) {
      return createConfirmedHiResponse({
        success: false,
        message:
          authorization.error || "Unable to authorize confirmed HI lookup.",
      }, callbackName);
    }

    const spreadsheet = SpreadsheetApp.openById(
      CONFIRMED_HI_SPREADSHEET_ID
    );
    const sheet = spreadsheet.getSheetByName(CONFIRMED_HI_SHEET_NAME);

    if (!sheet) {
      return createConfirmedHiResponse({
        success: false,
        message: "Confirmed HI sheet was not found.",
      }, callbackName);
    }

    const values = sheet.getDataRange().getValues();

    if (values.length < 2) {
      return createConfirmedHiResponse({
        success: true,
        records: [],
      }, callbackName);
    }

    const headers = values[0];
    const emailIndex = getConfirmedHiHeaderIndex(
      headers,
      CONFIRMED_HI_HEADER_ALIASES.email
    );
    const confirmedHiIndexes = getConfirmedHiHeaderIndexes(
      headers,
      CONFIRMED_HI_HEADER_ALIASES.confirmed_hi
    );
    const remarksIndex = getConfirmedHiHeaderIndex(
      headers,
      CONFIRMED_HI_HEADER_ALIASES.remarks
    );

    if (emailIndex < 0 || !confirmedHiIndexes.length) {
      return createConfirmedHiResponse({
        success: false,
        message: "Required confirmed HI columns were not found.",
      }, callbackName);
    }

    const records = values
      .slice(1)
      .filter(
        (row) =>
          normalizeConfirmedHiEmail(row[emailIndex]) === email
      )
      .map((row) => {
        const confirmedHiIndex =
          confirmedHiIndexes.length > 1
            ? confirmedHiIndexes[1]
            : confirmedHiIndexes[0];
        const confirmedHi = safeConfirmedHiText(row[confirmedHiIndex]);

        return {
          confirmedHi,
          remarks:
            remarksIndex >= 0 ? safeConfirmedHiText(row[remarksIndex]) : "",
        };
      })
      .filter((record) => record.confirmedHi);

    return createConfirmedHiResponse({
      success: true,
      records,
    }, callbackName);
  } catch (error) {
    return createConfirmedHiResponse({
      success: false,
      message:
        error && error.message
          ? error.message
          : "Confirmed HI lookup failed.",
    }, callbackName);
  }
}

function getHiStatusResponse(e, callbackName) {
  try {
    const authorization = getAuthorizedPortalEmail(e);
    const email = authorization.email || "";

    if (!email) {
      return createConfirmedHiResponse({
        success: false,
        message: authorization.error || "Unable to authorize HI status lookup.",
      }, callbackName);
    }

    const spreadsheet = SpreadsheetApp.openById(
      HI_STATUS_SPREADSHEET_ID
    );
    const sheet = spreadsheet.getSheetByName(HI_STATUS_SHEET_NAME);

    if (!sheet) {
      return createConfirmedHiResponse({
        success: false,
        message: "HI status sheet was not found.",
      }, callbackName);
    }

    const rows = sheet.getDataRange().getValues().slice(1);
    const records = rows
      .filter((row) => normalizeConfirmedHiEmail(row[3]) === email)
      .map((row) => ({
        fullname: safeConfirmedHiText(row[1]),
        email: safeConfirmedHiText(row[3]),
        "student number": safeConfirmedHiText(row[4]),
        "hi 1": safeConfirmedHiText(row[5]),
        "status 1": safeConfirmedHiText(row[6]),
        "remarks 1": safeConfirmedHiText(row[7]),
        "hi 2": safeConfirmedHiText(row[8]),
        "status 2": safeConfirmedHiText(row[9]),
        "remarks 2": safeConfirmedHiText(row[10]),
        "hi 3": safeConfirmedHiText(row[11]),
        "status 3": safeConfirmedHiText(row[12]),
        "remarks 3": safeConfirmedHiText(row[13]),
      }));

    return createConfirmedHiResponse({
      success: true,
      records,
    }, callbackName);
  } catch (error) {
    return createConfirmedHiResponse({
      success: false,
      message:
        error && error.message ? error.message : "HI status lookup failed.",
    }, callbackName);
  }
}
