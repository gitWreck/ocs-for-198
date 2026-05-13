const SUPABASE_URL = "https://nzqcmepeoplxpkmvhyvw.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56cWNtZXBlb3BseHBrbXZoeXZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTc3MzE0OCwiZXhwIjoyMDkxMzQ5MTQ4fQ.iQoCXIpvMEwYFIa4FBQm_RlEG-DYV9juxqYeF3jDsMA";
const TABLE_NAME = "companies";
const SHEET_NAME = "List of HIs";
const DEFAULT_COLUMNS = {
  id: 1,
  company_name: 2,
  slots_total: 3,
  slots_remaining: 4,
  other_requirements: 10,
};
function normalizeHeader(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getColumnByHeader(headers, aliases, fallbackColumn) {
  const normalizedAliases = aliases.map(normalizeHeader);
  const index = headers.findIndex((header) =>
    normalizedAliases.includes(normalizeHeader(header))
  );

  return index >= 0 ? index + 1 : fallbackColumn;
}

function getSheetColumns(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  return {
    id: getColumnByHeader(headers, ["id", "company id"], DEFAULT_COLUMNS.id),
    company_name: getColumnByHeader(
      headers,
      ["company name", "hi name", "host institution", "host institution name"],
      DEFAULT_COLUMNS.company_name
    ),
    slots_total: getColumnByHeader(
      headers,
      ["total slots", "slots total", "slots_total"],
      DEFAULT_COLUMNS.slots_total
    ),
    slots_remaining: getColumnByHeader(
      headers,
      [
        "number of remaining slots",
        "remaining slots",
        "slots remaining",
        "slots_remaining",
      ],
      DEFAULT_COLUMNS.slots_remaining
    ),
    other_requirements: getColumnByHeader(
      headers,
      ["other requirements", "other_requirements", "requirements"],
      DEFAULT_COLUMNS.other_requirements
    ),
  };
}

function onEdit(e) {
  Logger.log("onEdit triggered");

  if (!e) return;
  if (e.authMode === ScriptApp.AuthMode.LIMITED) {
    Logger.log("Simple onEdit skipped. Use an installable on-edit trigger.");
    return;
  }

  const sheet = e.source.getActiveSheet();
  Logger.log("Sheet: " + sheet.getName());

  if (sheet.getName() !== SHEET_NAME) return;

  const startRow = e.range.getRow();
  const endRow = startRow + e.range.getNumRows() - 1;
  const startCol = e.range.getColumn();
  const endCol = startCol + e.range.getNumColumns() - 1;
  Logger.log(`Rows: ${startRow}-${endRow}, Cols: ${startCol}-${endCol}`);

  if (endRow === 1) return;
  SpreadsheetApp.flush();

  Logger.log("Passed conditions -> syncing row");

  for (let row = Math.max(startRow, 2); row <= endRow; row++) {
    syncEditedRow(row);
  }
}

function syncEditedRow(row) {
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const values = sheet
    .getRange(row, 1, 1, sheet.getLastColumn())
    .getValues()[0];
  const columns = getSheetColumns(sheet);
  const getValue = (column) => values[column - 1];

  const id = getValue(columns.id);

  const rowData = {
    company_name: getValue(columns.company_name),
    slots_total: Number(getValue(columns.slots_total)) || 0,
    slots_remaining: Number(getValue(columns.slots_remaining)) || 0,
    other_requirements: getValue(columns.other_requirements) || "",
  };

  Logger.log("Row Data:");
  Logger.log(JSON.stringify({ id, ...rowData }));

  if (!rowData.company_name) return;

  let url;
  let method;

  if (id) {
    // Existing row: update by id
    url = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?id=eq.${id}`;
    method = "patch";
  } else {
    // New row: insert without id
    url = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}`;
    method = "post";
  }

  const options = {
    method,
    contentType: "application/json",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "return=representation",
    },
    payload: JSON.stringify(rowData),
    muteHttpExceptions: true,
  };

  const res = UrlFetchApp.fetch(url, options);

  Logger.log("Response Code: " + res.getResponseCode());
  Logger.log("Response Body: " + res.getContentText());

  if (res.getResponseCode() < 200 || res.getResponseCode() >= 300) {
    throw new Error("Supabase sync failed: " + res.getContentText());
  }

  const data = JSON.parse(res.getContentText() || "[]");

  // If new row, write generated id back to column A
  if (!id && data.length > 0 && data[0].id) {
    sheet.getRange(row, columns.id).setValue(data[0].id);
  }
}

function testSync() {
  syncEditedRow(2); // test row 2
}

function pullFromSupabase() {
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  const url = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?select=*`;

  const res = UrlFetchApp.fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  const data = JSON.parse(res.getContentText());

  // Get existing sheet data
  const range = sheet.getDataRange();
  const values = range.getValues();
  const columns = getSheetColumns(sheet);

  // Build map: id -> row index
  const idMap = {};
  for (let i = 1; i < values.length; i++) {
    const id = values[i][columns.id - 1];
    if (id) idMap[id] = i + 1; // actual sheet row
  }

  data.forEach((row) => {
    if (idMap[row.id]) {
      // ✅ Update existing row
      const sheetRow = idMap[row.id];

      sheet.getRange(sheetRow, columns.company_name).setValue(row.company_name);
      sheet.getRange(sheetRow, columns.slots_total).setValue(row.slots_total);
      sheet
        .getRange(sheetRow, columns.slots_remaining)
        .setValue(row.slots_remaining);
      sheet
        .getRange(sheetRow, columns.other_requirements)
        .setValue(row.other_requirements || "");
    } else {
      // Append new row
      const newRow = Array(
        Math.max(
          sheet.getLastColumn(),
          columns.id,
          columns.company_name,
          columns.slots_total,
          columns.slots_remaining,
          columns.other_requirements
        )
      ).fill("");
      newRow[columns.id - 1] = row.id;
      newRow[columns.company_name - 1] = row.company_name;
      newRow[columns.slots_total - 1] = row.slots_total;
      newRow[columns.slots_remaining - 1] = row.slots_remaining;
      newRow[columns.other_requirements - 1] = row.other_requirements || "";
      sheet.appendRow(newRow);
    }
  });
}
