const PORTAL_DATA_API_URL = "/api/portal-data";

function getConfirmedHiStoredPortalUser() {
  try {
    const raw = sessionStorage.getItem("student_portal_user");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function safeConfirmedHiDisplay(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value).trim();
}

function escapeConfirmedHiHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function resetConfirmedHiSection() {
  $("#confirmed-hi-loading").addClass("d-none");
  $("#confirmed-hi-error").addClass("d-none").text("");
  $("#confirmed-hi-empty").addClass("d-none");
  $("#confirmed-hi-content").addClass("d-none");
  $("#confirmed-hi-list").empty();
}

function showConfirmedHiLoading() {
  $("#confirmed-hi-loading").removeClass("d-none");
  $("#confirmed-hi-error").addClass("d-none").text("");
  $("#confirmed-hi-empty").addClass("d-none");
  $("#confirmed-hi-content").addClass("d-none");
}

function showConfirmedHiError(message) {
  $("#confirmed-hi-loading").addClass("d-none");
  $("#confirmed-hi-empty").addClass("d-none");
  $("#confirmed-hi-content").addClass("d-none");
  $("#confirmed-hi-error")
    .removeClass("d-none")
    .text(message || "Failed to load confirmed HI.");
}

function showConfirmedHiEmpty() {
  $("#confirmed-hi-loading").addClass("d-none");
  $("#confirmed-hi-error").addClass("d-none").text("");
  $("#confirmed-hi-content").addClass("d-none");
  $("#confirmed-hi-empty").removeClass("d-none");
}

function showConfirmedHiContent(records) {
  $("#confirmed-hi-list").html(
    records
      .map(
        (record) => `
          <div class="confirmed-hi-item">
            <div class="small text-muted mb-1">Confirmed HI</div>
            <div class="fw-semibold">${escapeConfirmedHiHtml(
              safeConfirmedHiDisplay(record.confirmedHi)
            )}</div>
            <div class="small text-muted mt-3 mb-1">Remarks</div>
            <div class="hi-remarks">${escapeConfirmedHiHtml(
              safeConfirmedHiDisplay(record.remarks)
            )}</div>
            </div>
            `
      )
      .join("")
  );

  $("#confirmed-hi-loading").addClass("d-none");
  $("#confirmed-hi-error").addClass("d-none").text("");
  $("#confirmed-hi-empty").addClass("d-none");
  $("#confirmed-hi-content").removeClass("d-none");
}

async function fetchConfirmedHiRecords(idToken) {
  if (!idToken) {
    throw new Error("Google sign-in token is missing.");
  }

  const url = new URL(PORTAL_DATA_API_URL, window.location.origin);
  url.searchParams.set("action", "confirmed-hi");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  const result = await response.json();

  if (!response.ok || !result || !result.success) {
    throw new Error(result?.message || "Confirmed HI lookup failed.");
  }

  return Array.isArray(result.records) ? result.records : [];
}

async function loadConfirmedHiModalData() {
  resetConfirmedHiSection();
  showConfirmedHiLoading();

  try {
    const storedUser = getConfirmedHiStoredPortalUser();

    if (!storedUser || !storedUser.email) {
      throw new Error("No logged-in user email found.");
    }

    const records = await fetchConfirmedHiRecords(storedUser.id_token);

    if (!records.length) {
      showConfirmedHiEmpty();
      return;
    }

    showConfirmedHiContent(records);
  } catch (error) {
    console.error("Confirmed HI modal load error:", error);
    showConfirmedHiError(error?.message || "Failed to load confirmed HI.");
  }
}

$(document).ready(function () {
  $("#hiStatusModal").on("show.bs.modal", async function () {
    await loadConfirmedHiModalData();
  });
});
