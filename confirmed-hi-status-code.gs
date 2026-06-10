const CONFIRMED_HI_SPREADSHEET_ID =
  "1cX2v8G6HX10tHdFNVF0eH8ME1RaL0BHdmg-AWy8qoxQ";
const CONFIRMED_HI_SHEET_NAME = "STUDENTS With CONFIRMED HIs";
const CONFIRMED_HI_ROUTE = "confirmed-hi";
const CONFIRMED_HI_HEADER_ALIASES = {
  email: ["email", "student email", "email address", "up mail"],
  confirmed_hi: ["confirmed hi"],
  remarks: ["remarks"],
};
const FIC_SECTION_SHEET_NAME = "FIC HI Sectioning";
const FIC_SECTION_ROUTE = "fic-section";
const FIC_SECTION_HEADER_ALIASES = {
  email: ["email address"],
  hi_name: ["hi_name", "hi name"],
  remarks: ["remarks"],
  section_id: ["section_id", "section id"],
  fic_name: ["fic_name", "fic name"],
};
const REQUIREMENTS_CHECKLIST_SHEET_NAME =
  "FOR 198 List of students (OCS and FIC Checklist)";
const REQUIREMENTS_CHECKLIST_ROUTE = "requirements-checklist";
const REQUIREMENTS_CHECKLIST_HEADER_ALIASES = {
  email: ["email", "student email", "email address", "up mail"],
  csar_units: [
    "csar units as of 1st sem 25 26",
    "csar units as of 1st semester 2025 2026",
  ],
  am: ["am"],
  pm: ["pm"],
  onboarding_session: ["attendance to onboarding session"],
  exit_conference: ["attendance to exit conference"],
  mental_health_test: [
    "das test c o ocg",
    "mental heath test c o ocg",
    "mental health test c o ocg",
  ],
  valid_medical_certificate: ["valid medical certificate"],
  valid_accident_insurance: ["valid accident insurance"],
  student_pledge_form: ["student s pledge form", "students pledge form"],
  joint_undertaking_form: [
    "joint undertaking form",
    "notarized consent of parent guardian form",
  ],
  work_plan: ["work plan"],
};
const AMIS_ENROLLS_SHEET_NAME = "AMIS ENROLLS";
const OFFICIAL_ENROLLMENT_ROUTE = "official-enrollment";
const OFFICIAL_ENROLLMENT_HEADER_ALIASES = {
  email: ["email"],
  course_no: ["course no"],
  section: ["section"],
  status: ["status"],
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

  if (action === FIC_SECTION_ROUTE) {
    return getFicSectionResponse(e, callbackName);
  }

  if (action === REQUIREMENTS_CHECKLIST_ROUTE) {
    return getRequirementsChecklistResponse(e, callbackName);
  }

  if (action === OFFICIAL_ENROLLMENT_ROUTE) {
    return getOfficialEnrollmentResponse(e, callbackName);
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

function getFicSectionResponse(e, callbackName) {
  try {
    const authorization = getAuthorizedPortalEmail(e);
    const email = authorization.email || "";

    if (!email) {
      return createConfirmedHiResponse({
        success: false,
        message:
          authorization.error || "Unable to authorize FIC section lookup.",
      }, callbackName);
    }

    const spreadsheet = SpreadsheetApp.openById(
      CONFIRMED_HI_SPREADSHEET_ID
    );
    const sheet = spreadsheet.getSheetByName(FIC_SECTION_SHEET_NAME);

    if (!sheet) {
      return createConfirmedHiResponse({
        success: false,
        message: "FIC HI Sectioning sheet was not found.",
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
      FIC_SECTION_HEADER_ALIASES.email
    );
    const hiNameIndex = getConfirmedHiHeaderIndex(
      headers,
      FIC_SECTION_HEADER_ALIASES.hi_name
    );
    const remarksIndex = getConfirmedHiHeaderIndex(
      headers,
      FIC_SECTION_HEADER_ALIASES.remarks
    );
    const sectionIdIndex = getConfirmedHiHeaderIndex(
      headers,
      FIC_SECTION_HEADER_ALIASES.section_id
    );
    const ficNameIndex = getConfirmedHiHeaderIndex(
      headers,
      FIC_SECTION_HEADER_ALIASES.fic_name
    );

    if (emailIndex < 0 || sectionIdIndex < 0 || ficNameIndex < 0) {
      return createConfirmedHiResponse({
        success: false,
        message: "Required FIC section columns were not found.",
      }, callbackName);
    }

    const records = values
      .slice(1)
      .filter(
        (row) =>
          normalizeConfirmedHiEmail(row[emailIndex]) === email
      )
      .map((row) => ({
        hiName: hiNameIndex >= 0 ? safeConfirmedHiText(row[hiNameIndex]) : "",
        remarks:
          remarksIndex >= 0 ? safeConfirmedHiText(row[remarksIndex]) : "",
        sectionId: safeConfirmedHiText(row[sectionIdIndex]),
        ficName: safeConfirmedHiText(row[ficNameIndex]),
      }))
      .filter(
        (record) =>
          record.hiName || record.remarks || record.sectionId || record.ficName
      );

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
          : "FIC section lookup failed.",
    }, callbackName);
  }
}

function getRequiredChecklistHeaderIndex(headers, key) {
  return getConfirmedHiHeaderIndex(
    headers,
    REQUIREMENTS_CHECKLIST_HEADER_ALIASES[key]
  );
}

function parseRequirementsChecklistBoolean(value) {
  if (value === true) {
    return true;
  }

  const normalized = String(value || "").trim().toLowerCase();
  return ["true", "yes", "y", "1", "check", "checked"].includes(normalized);
}

function getRequirementsChecklistResponse(e, callbackName) {
  try {
    const authorization = getAuthorizedPortalEmail(e);
    const email = authorization.email || "";

    if (!email) {
      return createConfirmedHiResponse({
        success: false,
        message:
          authorization.error ||
          "Unable to authorize requirements checklist lookup.",
      }, callbackName);
    }

    const spreadsheet = SpreadsheetApp.openById(
      CONFIRMED_HI_SPREADSHEET_ID
    );
    const sheet = spreadsheet.getSheetByName(REQUIREMENTS_CHECKLIST_SHEET_NAME);

    if (!sheet) {
      return createConfirmedHiResponse({
        success: false,
        message: "Requirements checklist sheet was not found.",
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
    const indexes = {
      email: getRequiredChecklistHeaderIndex(headers, "email"),
      csarUnits: getRequiredChecklistHeaderIndex(headers, "csar_units"),
      am: getRequiredChecklistHeaderIndex(headers, "am"),
      pm: getRequiredChecklistHeaderIndex(headers, "pm"),
      onboardingSession: getRequiredChecklistHeaderIndex(
        headers,
        "onboarding_session"
      ),
      exitConference: getRequiredChecklistHeaderIndex(
        headers,
        "exit_conference"
      ),
      mentalHealthTest: getRequiredChecklistHeaderIndex(
        headers,
        "mental_health_test"
      ),
      validMedicalCertificate: getRequiredChecklistHeaderIndex(
        headers,
        "valid_medical_certificate"
      ),
      validAccidentInsurance: getRequiredChecklistHeaderIndex(
        headers,
        "valid_accident_insurance"
      ),
      studentPledgeForm: getRequiredChecklistHeaderIndex(
        headers,
        "student_pledge_form"
      ),
      jointUndertakingForm: getRequiredChecklistHeaderIndex(
        headers,
        "joint_undertaking_form"
      ),
      workPlan: getRequiredChecklistHeaderIndex(headers, "work_plan"),
    };

    const missingRequiredIndexes = Object.keys(indexes).filter(
      (key) => indexes[key] < 0
    );

    if (missingRequiredIndexes.length) {
      return createConfirmedHiResponse({
        success: false,
        message:
          "Required requirements checklist columns were not found: " +
          missingRequiredIndexes.join(", "),
      }, callbackName);
    }

    const records = values
      .slice(1)
      .filter(
        (row) =>
          normalizeConfirmedHiEmail(row[indexes.email]) === email
      )
      .map((row) => ({
        csarUnits: Number(row[indexes.csarUnits]) || 0,
        am: parseRequirementsChecklistBoolean(row[indexes.am]),
        pm: parseRequirementsChecklistBoolean(row[indexes.pm]),
        onboardingSession: parseRequirementsChecklistBoolean(
          row[indexes.onboardingSession]
        ),
        exitConference: parseRequirementsChecklistBoolean(
          row[indexes.exitConference]
        ),
        mentalHealthTest: parseRequirementsChecklistBoolean(
          row[indexes.mentalHealthTest]
        ),
        validMedicalCertificate:
          parseRequirementsChecklistBoolean(
            row[indexes.validMedicalCertificate]
          ),
        validAccidentInsurance: parseRequirementsChecklistBoolean(
          row[indexes.validAccidentInsurance]
        ),
        studentPledgeForm: parseRequirementsChecklistBoolean(
          row[indexes.studentPledgeForm]
        ),
        jointUndertakingForm: parseRequirementsChecklistBoolean(
          row[indexes.jointUndertakingForm]
        ),
        workPlan: parseRequirementsChecklistBoolean(row[indexes.workPlan]),
      }));

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
          : "Requirements checklist lookup failed.",
    }, callbackName);
  }
}

function isOfficialEnrollmentStatus(value) {
  const normalizedStatus = normalizeConfirmedHiHeader(value);
  return ["officially enrolled", "finalized"].includes(normalizedStatus);
}

function getOfficialEnrollmentResponse(e, callbackName) {
  try {
    const authorization = getAuthorizedPortalEmail(e);
    const email = authorization.email || "";

    if (!email) {
      return createConfirmedHiResponse({
        success: false,
        message:
          authorization.error ||
          "Unable to authorize official enrollment lookup.",
      }, callbackName);
    }

    const spreadsheet = SpreadsheetApp.openById(
      CONFIRMED_HI_SPREADSHEET_ID
    );
    const sheet = spreadsheet.getSheetByName(AMIS_ENROLLS_SHEET_NAME);

    if (!sheet) {
      return createConfirmedHiResponse({
        success: false,
        message: "AMIS ENROLLS sheet was not found.",
      }, callbackName);
    }

    const values = sheet.getDataRange().getValues();

    if (values.length < 2) {
      return createConfirmedHiResponse({
        success: true,
        officiallyEnrolled: false,
        records: [],
      }, callbackName);
    }

    const headers = values[0];
    const indexes = {
      email: getConfirmedHiHeaderIndex(
        headers,
        OFFICIAL_ENROLLMENT_HEADER_ALIASES.email
      ),
      courseNo: getConfirmedHiHeaderIndex(
        headers,
        OFFICIAL_ENROLLMENT_HEADER_ALIASES.course_no
      ),
      section: getConfirmedHiHeaderIndex(
        headers,
        OFFICIAL_ENROLLMENT_HEADER_ALIASES.section
      ),
      status: getConfirmedHiHeaderIndex(
        headers,
        OFFICIAL_ENROLLMENT_HEADER_ALIASES.status
      ),
    };

    const missingRequiredIndexes = Object.keys(indexes).filter(
      (key) => indexes[key] < 0
    );

    if (missingRequiredIndexes.length) {
      return createConfirmedHiResponse({
        success: false,
        message:
          "Required official enrollment columns were not found: " +
          missingRequiredIndexes.join(", "),
      }, callbackName);
    }

    const records = values
      .slice(1)
      .filter(
        (row) =>
          normalizeConfirmedHiEmail(row[indexes.email]) === email
      )
      .map((row) => ({
        courseNo: safeConfirmedHiText(row[indexes.courseNo]),
        section: safeConfirmedHiText(row[indexes.section]),
        status: safeConfirmedHiText(row[indexes.status]),
      }))
      .filter(
        (record) => record.courseNo || record.section || record.status
      );

    return createConfirmedHiResponse({
      success: true,
      officiallyEnrolled: records.some((record) =>
        isOfficialEnrollmentStatus(record.status)
      ),
      records,
    }, callbackName);
  } catch (error) {
    return createConfirmedHiResponse({
      success: false,
      message:
        error && error.message
          ? error.message
          : "Official enrollment lookup failed.",
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
