const PORTAL_DATA_API_URL = "/api/portal-data";

function getStoredPortalUser() {
  try {
    const raw = sessionStorage.getItem("student_portal_user");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
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

async function fetchHiStatusRecords(idToken) {
  if (!idToken) {
    throw new Error("Google sign-in token is missing.");
  }

  const url = new URL(PORTAL_DATA_API_URL, window.location.origin);
  url.searchParams.set("action", "hi-status");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  const result = await response.json();

  if (!response.ok || !result || !result.success) {
    throw new Error(result?.message || "HI status lookup failed.");
  }

  return Array.isArray(result.records) ? result.records : [];
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

    const records = await fetchHiStatusRecords(storedUser.id_token);

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
