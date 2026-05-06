const HI_STATUS_SHEET_ID = "1x1b4NjqOAg_rXEwwr5c8EuIhdm8xCUMkuxKlBMyd7Go";
const HI_STATUS_SHEET_NAME = "STATUS OF APPLICATION";

const HI_STATUS_SHEET_URL = `https://docs.google.com/spreadsheets/d/${HI_STATUS_SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(
  HI_STATUS_SHEET_NAME
)}&tqx=out:json`;

function getStoredPortalUser() {
  try {
    const raw = sessionStorage.getItem("student_portal_user");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function safeDisplay(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value).trim();
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getStatusBadgeHtml(status) {
  const rawStatus = safeDisplay(status);

  if (rawStatus === "-") {
    return `<span class="hi-status-badge hi-status-pending">No Status</span>`;
  }

  const normalized = normalizeStatus(status);

  if (normalized === "accepted") {
    return `<span class="hi-status-badge hi-status-approved">Accepted</span>`;
  }

  // ✅ SHORTLISTED
  if (normalized === "shortlisted") {
    return `<span class="hi-status-badge hi-status-waitlisted">Shortlisted</span>`;
  }

  if (normalized === "waitlisted" || normalized === "waitlist") {
    return `<span class="hi-status-badge hi-status-waitlisted">Waitlisted</span>`;
  }

  if (normalized === "rejected") {
    return `<span class="hi-status-badge hi-status-rejected">Rejected</span>`;
  }

  return `<span class="hi-status-badge hi-status-pending">${escapeHtml(
    rawStatus
  )}</span>`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function resetHiStatusModal() {
  $("#hi-status-loading").addClass("d-none");
  $("#hi-status-error").addClass("d-none").text("");
  $("#hi-status-empty").addClass("d-none");
  $("#hi-status-content").addClass("d-none");
  $(".hi-status-list").empty();

  $("#hi-status-fullname").text("-");
  $("#hi-status-email").text("-");
  $("#hi-status-student-no").text("-");

  $("#hi1-name").text("-");
  $("#hi1-status-wrap").html("-");
  $("#hi1-remarks").text("-");

  $("#hi2-name").text("-");
  $("#hi2-status-wrap").html("-");
  $("#hi2-remarks").text("-");

  $("#hi3-name").text("-");
  $("#hi3-status-wrap").html("-");
  $("#hi3-remarks").text("-");
}

function showHiStatusLoading() {
  $("#hi-status-loading").removeClass("d-none");
  $("#hi-status-error").addClass("d-none").text("");
  $("#hi-status-empty").addClass("d-none");
  $("#hi-status-content").addClass("d-none");
}

function showHiStatusError(message) {
  $("#hi-status-loading").addClass("d-none");
  $("#hi-status-empty").addClass("d-none");
  $("#hi-status-content").addClass("d-none");

  $("#hi-status-error")
    .removeClass("d-none")
    .text(message || "Failed to load HI status.");
}

function showHiStatusEmpty() {
  $("#hi-status-loading").addClass("d-none");
  $("#hi-status-error").addClass("d-none").text("");
  $("#hi-status-content").addClass("d-none");
  $("#hi-status-empty").removeClass("d-none");
}

function renderHiStatusItemHtml(number, hiName, status, remarks) {
  return `
    <div class="hi-status-item mb-3">
      <div class="d-flex justify-content-between align-items-start gap-3 mb-2">
        <div>
          <div class="small text-muted mb-1">HI Choice ${number}</div>
          <div class="fw-semibold">${escapeHtml(safeDisplay(hiName))}</div>
        </div>
        ${getStatusBadgeHtml(status)}
      </div>
      <div class="small text-muted mb-1">Remarks</div>
      <div>${escapeHtml(safeDisplay(remarks))}</div>
    </div>
  `;
}

function renderHiApplicationHtml(record, index) {
  return `
    <div class="hi-application-record mb-4">
      <div class="fw-bold mb-3">Application ${index + 1}</div>
      ${renderHiStatusItemHtml(
        1,
        record["hi 1"],
        record["status 1"],
        record["remarks 1"]
      )}
      ${renderHiStatusItemHtml(
        2,
        record["hi 2"],
        record["status 2"],
        record["remarks 2"]
      )}
      ${renderHiStatusItemHtml(
        3,
        record["hi 3"],
        record["status 3"],
        record["remarks 3"]
      )}
    </div>
  `;
}

function showHiStatusContent(records) {
  console.log("records:", records);

  const firstRecord = records[0];

  $("#hi-status-fullname").text(safeDisplay(firstRecord.fullname));
  $("#hi-status-email").text(safeDisplay(firstRecord.email));
  $("#hi-status-student-no").text(safeDisplay(firstRecord["student number"]));

  $(".hi-status-list").html(
    records
      .map((record, index) => renderHiApplicationHtml(record, index))
      .join("")
  );

  $("#hi-status-loading").addClass("d-none");
  $("#hi-status-error").addClass("d-none").text("");
  $("#hi-status-empty").addClass("d-none");
  $("#hi-status-content").removeClass("d-none");
}

function parseGoogleSheetResponse(rawText) {
  const cleaned = rawText
    .replace("/*O_o*/", "")
    .replace("google.visualization.Query.setResponse(", "")
    .replace(/\);$/, "");

  return JSON.parse(cleaned);
}

function normalizeHeaderName(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
function convertSheetRowsToObjects(parsed) {
  const rows = parsed?.table?.rows || [];

  return rows.map((row) => {
    const cells = row.c || [];

    return {
      fullname: cells[1]?.v ?? "",
      email: cells[3]?.v ?? "",
      "student number": cells[4]?.v ?? "",

      "hi 1": cells[5]?.v ?? "",
      "status 1": cells[6]?.v ?? "",
      "remarks 1": cells[7]?.v ?? "",

      "hi 2": cells[8]?.v ?? "",
      "status 2": cells[9]?.v ?? "",
      "remarks 2": cells[10]?.v ?? "",

      "hi 3": cells[11]?.v ?? "",
      "status 3": cells[12]?.v ?? "",
      "remarks 3": cells[13]?.v ?? "",
    };
  });
}

function findStudentHiRecord(rows, email) {
  const normalizedTarget = normalizeEmail(email);
  return (
    rows.find((row) => normalizeEmail(row.email) === normalizedTarget) || null
  );
}

async function fetchHiStatusByEmail(email) {
  const normalizedEmail = normalizeEmail(email);

  const query = encodeURIComponent(
    `select * where lower(D) contains '${normalizedEmail}'`
  );

  const url = `https://docs.google.com/spreadsheets/d/${HI_STATUS_SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(
    HI_STATUS_SHEET_NAME
  )}&tq=${query}&tqx=out:json`;

  const response = await fetch(url);
  console.log("response:", response);

  if (!response.ok) {
    throw new Error("Failed to fetch filtered Google Sheet data.");
  }

  const rawText = await response.text();
  const parsed = parseGoogleSheetResponse(rawText);
  const rows = convertSheetRowsToObjects(parsed).filter(
    (row) => normalizeEmail(row.email) === normalizedEmail
  );

  console.log("rows:", rows);

  return rows;
}
async function loadHiStatusModalData() {
  resetHiStatusModal();
  showHiStatusLoading();

  try {
    const storedUser = getStoredPortalUser();

    if (!storedUser || !storedUser.email) {
      throw new Error("No logged-in user email found.");
    }

    console.log("storedUser:", storedUser);

    const records = await fetchHiStatusByEmail(storedUser.email);

    if (!records.length) {
      showHiStatusEmpty();
      return;
    }

    showHiStatusContent(records);
  } catch (error) {
    console.error("HI status modal load error:", error);
    showHiStatusError(error?.message || "Failed to load HI status.");
  }
}

$(document).ready(function () {
  $("#hiStatusModal").on("show.bs.modal", async function () {
    await loadHiStatusModalData();
  });
});
