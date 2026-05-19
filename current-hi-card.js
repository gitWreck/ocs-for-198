const CURRENT_HI_CARD_API_URL = "/api/portal-data";
const ASSIGNED_HI_SCHEDULES_GDOCS_URL =
  "https://docs.google.com/document/d/1BEHx2Ub-kjBbyBkbRZKTlNjghePPtSUhiH22gUGAYZE/edit?tab=t.0";
const CURRENT_HI_FALLBACK = {
  hiName: "No data",
  remarks: "",
  fic: "",
  section: "",
};

function getCurrentHiStoredPortalUser() {
  try {
    const raw = sessionStorage.getItem("student_portal_user");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function setCurrentHiCardState({
  hiName,
  remarks,
  fic,
  section,
  isError = false,
}) {
  const hiNameElement = document.getElementById("current-hi-name");
  const remarksElement = document.getElementById("current-hi-remarks");
  const ficElement = document.getElementById("current-hi-fic");
  const sectionElement = document.getElementById("current-hi-section");

  if (!hiNameElement || !remarksElement || !ficElement || !sectionElement) {
    return;
  }

  hiNameElement.textContent = hiName || "No data";
  remarksElement.textContent = remarks || "-";
  ficElement.textContent = fic || "-";
  sectionElement.textContent = section || "-";

  hiNameElement.classList.toggle("current-hi-error", isError);
  remarksElement.classList.toggle("current-hi-error", isError);
  ficElement.classList.toggle("current-hi-placeholder", !fic);
  sectionElement.classList.toggle("current-hi-placeholder", !section);
}

function setCurrentHiCardLoadingState() {
  const hiNameElement = document.getElementById("current-hi-name");
  const remarksElement = document.getElementById("current-hi-remarks");
  const ficElement = document.getElementById("current-hi-fic");
  const sectionElement = document.getElementById("current-hi-section");

  if (!hiNameElement || !remarksElement || !ficElement || !sectionElement) {
    return;
  }

  hiNameElement.innerHTML = `
    <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
    Loading assigned HI...
  `;
  remarksElement.textContent = "-";
  ficElement.textContent = "-";
  sectionElement.textContent = "-";

  hiNameElement.classList.remove("current-hi-error");
  remarksElement.classList.remove("current-hi-error");
  ficElement.classList.add("current-hi-placeholder");
  sectionElement.classList.add("current-hi-placeholder");
}

function setupAssignedHiScheduleLink() {
  const scheduleLink = document.getElementById("assigned-hi-schedule-link");

  if (!scheduleLink) {
    return;
  }

  if (ASSIGNED_HI_SCHEDULES_GDOCS_URL) {
    scheduleLink.href = ASSIGNED_HI_SCHEDULES_GDOCS_URL;
    scheduleLink.classList.remove("disabled");
    scheduleLink.removeAttribute("aria-disabled");
    return;
  }

  scheduleLink.href = "#";
  scheduleLink.classList.add("disabled");
  scheduleLink.setAttribute("aria-disabled", "true");
}

async function fetchPortalDataRecords(idToken, action) {
  if (!idToken) {
    throw new Error("Google sign-in token is missing.");
  }

  const url = new URL(CURRENT_HI_CARD_API_URL, window.location.origin);
  url.searchParams.set("action", action);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  const rawText = await response.text();
  let result = null;

  try {
    result = JSON.parse(rawText);
  } catch (error) {
    throw new Error("Portal data API returned an invalid response.");
  }

  if (!response.ok || !result || !result.success) {
    throw new Error(result?.message || "Portal data lookup failed.");
  }

  return Array.isArray(result.records) ? result.records : [];
}

async function fetchFicSectionRecords(idToken) {
  return fetchPortalDataRecords(idToken, "fic-section");
}

async function loadCurrentHiCard() {
  setCurrentHiCardLoadingState();

  try {
    const storedUser = getCurrentHiStoredPortalUser();

    if (!storedUser || !storedUser.email) {
      setCurrentHiCardState({
        ...CURRENT_HI_FALLBACK,
        isError: true,
      });
      return;
    }

    if (!storedUser.id_token) {
      setCurrentHiCardState({
        ...CURRENT_HI_FALLBACK,
        isError: true,
      });
      return;
    }

    const ficSectionRecords = await fetchFicSectionRecords(storedUser.id_token);
    const ficSectionRecord = ficSectionRecords[0] || null;

    if (!ficSectionRecord) {
      setCurrentHiCardState({
        ...CURRENT_HI_FALLBACK,
      });
      return;
    }

    setCurrentHiCardState({
      hiName: ficSectionRecord.hiName || "No data",
      remarks: ficSectionRecord.remarks || "-",
      fic: ficSectionRecord?.ficName || "",
      section: ficSectionRecord?.sectionId || "",
    });
  } catch (error) {
    console.error("Current HI card load error:", error);
    setCurrentHiCardState({
      ...CURRENT_HI_FALLBACK,
      isError: true,
    });
  }
}

document.addEventListener("DOMContentLoaded", function () {
  setupAssignedHiScheduleLink();
  loadCurrentHiCard();
});
