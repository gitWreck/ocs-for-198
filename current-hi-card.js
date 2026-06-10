const CURRENT_HI_CARD_API_URL = "/api/portal-data";
const ASSIGNED_HI_SCHEDULES_GDOCS_URL =
  "https://docs.google.com/document/d/1BEHx2Ub-kjBbyBkbRZKTlNjghePPtSUhiH22gUGAYZE/edit?tab=t.0";
const CURRENT_HI_FALLBACK = {
  hiName: "No data",
  remarks: "",
  fic: "",
  section: "",
};
const OFFICIAL_ENROLLMENT_FALLBACK = {
  courseNo: "No data",
  section: "No data",
  status: "No record found",
  officiallyEnrolled: false,
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

function setOfficialEnrollmentCardState({
  courseNo,
  section,
  status,
  officiallyEnrolled = false,
  isError = false,
}) {
  const courseNoElement = document.getElementById(
    "official-enrollment-course-no"
  );
  const sectionElement = document.getElementById("official-enrollment-section");
  const statusElement = document.getElementById("official-enrollment-status");

  if (!courseNoElement || !sectionElement || !statusElement) {
    return;
  }

  courseNoElement.textContent = courseNo || "No data";
  sectionElement.textContent = section || "No data";
  statusElement.textContent = status || "No record found";
  statusElement.classList.toggle("is-enrolled", officiallyEnrolled && !isError);
  statusElement.classList.toggle("is-pending", !officiallyEnrolled && !isError);
  statusElement.classList.toggle("is-error", isError);
}

function setOfficialEnrollmentCardLoadingState() {
  const courseNoElement = document.getElementById(
    "official-enrollment-course-no"
  );
  const sectionElement = document.getElementById("official-enrollment-section");
  const statusElement = document.getElementById("official-enrollment-status");

  if (!courseNoElement || !sectionElement || !statusElement) {
    return;
  }

  courseNoElement.innerHTML = `
    <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
    Loading...
  `;
  sectionElement.textContent = "Loading...";
  statusElement.textContent = "Loading...";
  statusElement.classList.remove("is-enrolled", "is-error");
  statusElement.classList.add("is-pending");
}

async function fetchPortalDataPayload(idToken, action) {
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

  return result;
}

async function fetchPortalDataRecords(idToken, action) {
  const result = await fetchPortalDataPayload(idToken, action);
  return Array.isArray(result.records) ? result.records : [];
}

async function fetchFicSectionRecords(idToken) {
  return fetchPortalDataRecords(idToken, "fic-section");
}

async function fetchOfficialEnrollmentPayload(idToken) {
  return fetchPortalDataPayload(idToken, "official-enrollment");
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

async function loadOfficialEnrollmentCard() {
  setOfficialEnrollmentCardLoadingState();

  try {
    const storedUser = getCurrentHiStoredPortalUser();

    if (!storedUser || !storedUser.email || !storedUser.id_token) {
      setOfficialEnrollmentCardState({
        ...OFFICIAL_ENROLLMENT_FALLBACK,
        status: "Unable to verify",
        isError: true,
      });
      return;
    }

    const enrollmentPayload = await fetchOfficialEnrollmentPayload(
      storedUser.id_token
    );
    const enrollmentRecords = Array.isArray(enrollmentPayload.records)
      ? enrollmentPayload.records
      : [];
    const enrollmentRecord =
      enrollmentRecords.find((record) =>
        ["officially enrolled", "finalized"].includes(
          String(record.status || "").trim().toLowerCase()
        )
      ) ||
      enrollmentRecords[0] ||
      null;

    if (!enrollmentRecord) {
      setOfficialEnrollmentCardState(OFFICIAL_ENROLLMENT_FALLBACK);
      return;
    }

    setOfficialEnrollmentCardState({
      courseNo: enrollmentRecord.courseNo || "No data",
      section: enrollmentRecord.section || "No data",
      status: enrollmentRecord.status || "No status",
      officiallyEnrolled: Boolean(enrollmentPayload.officiallyEnrolled),
    });
  } catch (error) {
    console.error("Official enrollment card load error:", error);
    setOfficialEnrollmentCardState({
      ...OFFICIAL_ENROLLMENT_FALLBACK,
      status: "Lookup failed",
      isError: true,
    });
  }
}

document.addEventListener("DOMContentLoaded", function () {
  setupAssignedHiScheduleLink();
  loadOfficialEnrollmentCard();
  loadCurrentHiCard();
});
