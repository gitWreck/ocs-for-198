const CONFIRMED_HI_APPS_SCRIPT_URL =
  "https://script.google.com/a/macros/up.edu.ph/s/AKfycbwuRq6qd89LIQ2_mthURuwZtprGmNnZ1CmdPMqYMUhUhg2nzUIvX6oleWgAjMvy_SUg/exec";

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
            </div>
            `
        // <div class="small text-muted mt-3 mb-1">Remarks</div>
        // <div class="hi-remarks">${escapeConfirmedHiHtml(
        //   safeConfirmedHiDisplay(record.remarks)
        // )}</div>
      )
      .join("")
  );

  $("#confirmed-hi-loading").addClass("d-none");
  $("#confirmed-hi-error").addClass("d-none").text("");
  $("#confirmed-hi-empty").addClass("d-none");
  $("#confirmed-hi-content").removeClass("d-none");
}

function fetchConfirmedHiRecords() {
  if (
    !CONFIRMED_HI_APPS_SCRIPT_URL ||
    CONFIRMED_HI_APPS_SCRIPT_URL.includes("PASTE_")
  ) {
    return Promise.reject(
      new Error("Confirmed HI Apps Script URL is not configured.")
    );
  }

  const url = new URL(CONFIRMED_HI_APPS_SCRIPT_URL);
  url.searchParams.set("action", "confirmed-hi");
  const callbackName = `confirmedHiJsonp_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}`;
  url.searchParams.set("callback", callbackName);

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Confirmed HI lookup timed out."));
    }, 15000);

    function cleanup() {
      window.clearTimeout(timeoutId);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = function (result) {
      cleanup();

      if (!result || !result.success) {
        reject(new Error(result?.message || "Confirmed HI lookup failed."));
        return;
      }

      resolve(Array.isArray(result.records) ? result.records : []);
    };

    script.src = url.toString();
    script.async = true;
    script.onerror = function () {
      cleanup();
      reject(new Error("Failed to load confirmed HI data."));
    };

    document.body.appendChild(script);
  });
}

async function loadConfirmedHiModalData() {
  resetConfirmedHiSection();
  showConfirmedHiLoading();

  try {
    const storedUser = getConfirmedHiStoredPortalUser();

    if (!storedUser || !storedUser.email) {
      throw new Error("No logged-in user email found.");
    }

    const records = await fetchConfirmedHiRecords();

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
