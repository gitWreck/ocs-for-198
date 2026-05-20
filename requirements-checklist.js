const REQUIREMENTS_CHECKLIST_API_URL = "/api/portal-data";
const REQUIRED_CSAR_UNITS = 60;

const requirementsChecklistFallback = [
  {
    name: "DAS Test c/o OCG",
    key: "mentalHealthTest",
    submitted: false,
  },
  {
    name: "Valid Medical Certificate",
    key: "validMedicalCertificate",
    submitted: false,
  },
  {
    name: "Valid Accident Insurance",
    key: "validAccidentInsurance",
    submitted: false,
  },
  {
    name: "Student's Pledge Form",
    key: "studentPledgeForm",
    submitted: false,
  },
  {
    name: "Joint Undertaking Form",
    key: "jointUndertakingForm",
    submitted: false,
  },
  {
    name: "Work Plan",
    key: "workPlan",
    submitted: false,
  },
];

const requirementsDetailFallback = [
  {
    label: "Attendance",
    value: null,
    groups: [
      {
        children: [
          {
            label: "Internship Fair (AM)",
            value: "",
          },
          {
            label: "Internship Fair (PM)",
            value: "",
          },
        ],
      },
      {
        children: [
          {
            label: "Onboarding Session",
            value: "",
          },
          {
            label: "Exit Conference",
            value: "",
          },
        ],
      },
    ],
    status: "default",
  },
  {
    label: "Units as of 1st Semester 2025-2026",
    value: "",
    note: "",
    status: "default",
  },
];

function renderRequirementsDetails(items) {
  const detailListElement = document.getElementById("requirements-detail-list");

  if (!detailListElement) {
    return;
  }

  const fragment = document.createDocumentFragment();
  const leftColumn = document.createElement("div");
  leftColumn.className = "requirements-detail-left";

  items.forEach((item, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = `requirements-detail-item ${
      item.status === "warning" ? "is-warning" : ""
    }`;

    wrapper.appendChild(createRequirementDetailRow(item.label, item.value));

    if (item.note) {
      const note = document.createElement("div");
      note.className = "requirements-detail-note mt-1";
      const warning = createRequirementWarningIcon();
      note.appendChild(warning);
      note.append(document.createTextNode(item.note));
      wrapper.appendChild(note);
    }

    if (Array.isArray(item.groups) && item.groups.length) {
      const sublist = document.createElement("div");
      sublist.className = "requirements-detail-sublist";

      item.groups.forEach((group) => {
        const subgroup = document.createElement("div");
        subgroup.className = "requirements-detail-subgroup";

        group.children.forEach((child) => {
          const subitem = createRequirementDetailRow(child.label, child.value);
          subitem.classList.add("requirements-detail-subitem");

          if (String(child.value || "").trim().toLowerCase() === "check") {
            subitem.classList.add("is-submitted");
          }

          subgroup.appendChild(subitem);
        });

        sublist.appendChild(subgroup);
      });

      wrapper.appendChild(sublist);
    }

    if (index === 0) {
      leftColumn.appendChild(wrapper);
      return;
    }

    fragment.appendChild(wrapper);
  });

  if (leftColumn.childElementCount) {
    fragment.prepend(leftColumn);
  }

  detailListElement.replaceChildren(fragment);
}

function createRequirementDetailRow(label, value) {
  const row = document.createElement("div");
  row.className = "requirements-detail-row";

  const labelElement = document.createElement("span");
  labelElement.className = "requirements-detail-label";
  labelElement.textContent = label;
  row.appendChild(labelElement);

  const valueElement = document.createElement("span");
  valueElement.className = "requirements-detail-value";

  if (value === null) {
    valueElement.textContent = "";
  } else if (value && String(value).trim().toLowerCase() === "check") {
    const check = document.createElement("span");
    check.className = "requirements-detail-check";
    check.textContent = "✓";
    valueElement.appendChild(check);
  } else if (value) {
    valueElement.textContent = value;
  } else {
    valueElement.appendChild(createRequirementWarningIcon());
  }

  row.appendChild(valueElement);

  return row;
}

function createRequirementWarningIcon() {
  const warning = document.createElement("span");
  warning.className = "requirements-detail-warning";
  warning.textContent = "!";
  return warning;
}

function renderRequirementsChecklistLoading() {
  const detailListElement = document.getElementById("requirements-detail-list");
  const checklistElement = document.getElementById("requirements-checklist-list");
  const summaryElement = document.getElementById(
    "requirements-checklist-summary"
  );

  if (summaryElement) {
    summaryElement.textContent = "Loading...";
  }

  const loadingMarkup = `
    <div class="requirements-loading text-center text-muted py-4">
      <div class="spinner-border spinner-border-sm mb-2" style="color: #04543c" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div class="small">Loading checklist...</div>
    </div>
  `;

  if (detailListElement) {
    detailListElement.innerHTML = loadingMarkup;
  }

  if (checklistElement) {
    checklistElement.innerHTML = loadingMarkup;
  }
}

function getRequirementsChecklistStoredPortalUser() {
  try {
    const raw = sessionStorage.getItem("student_portal_user");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

async function fetchRequirementsChecklistRecord(idToken) {
  if (!idToken) {
    throw new Error("Google sign-in token is missing.");
  }

  const url = new URL(REQUIREMENTS_CHECKLIST_API_URL, window.location.origin);
  url.searchParams.set("action", "requirements-checklist");

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
    throw new Error(result?.message || "Requirements checklist lookup failed.");
  }

  const records = Array.isArray(result.records) ? result.records : [];
  return records[0] || null;
}

function mapRequirementsDetailRecord(record) {
  if (!record) {
    return requirementsDetailFallback;
  }

  const csarUnits = Number(record.csarUnits);
  const hasCsarUnits = Number.isFinite(csarUnits) && csarUnits > 0;
  const hasEnoughUnits = hasCsarUnits && csarUnits >= REQUIRED_CSAR_UNITS;

  return [
    {
      label: "Attendance",
      value: null,
      groups: [
        {
          children: [
            {
              label: "Internship Fair (AM)",
              value: record.am ? "check" : "",
            },
            {
              label: "Internship Fair (PM)",
              value: record.pm ? "check" : "",
            },
          ],
        },
        {
          children: [
            {
              label: "Onboarding Session",
              value: record.onboardingSession ? "check" : "",
            },
            {
              label: "Exit Conference",
              value: record.exitConference ? "check" : "",
            },
          ],
        },
      ],
      status: "default",
    },
    {
      label: "Units as of 1st Semester 2025-2026",
      value: hasCsarUnits ? `${csarUnits} units` : "",
      note: hasCsarUnits && !hasEnoughUnits ? "less than required units" : "",
      status: hasCsarUnits && !hasEnoughUnits ? "warning" : "default",
    },
  ];
}

function mapRequirementsChecklistRecord(record) {
  if (!record) {
    return requirementsChecklistFallback;
  }

  return requirementsChecklistFallback.map((item) => ({
    ...item,
    submitted: item.key ? record[item.key] === true : item.submitted,
  }));
}

function renderRequirementsChecklist(items) {
  const listElement = document.getElementById("requirements-checklist-list");
  const summaryElement = document.getElementById(
    "requirements-checklist-summary"
  );

  if (!listElement || !summaryElement) {
    return;
  }

  const submittedCount = items.filter((item) => item.submitted).length;
  summaryElement.textContent = `${submittedCount}/${items.length} submitted`;

  const fragment = document.createDocumentFragment();

  items.forEach((item) => {
    const wrapper = document.createElement("div");
    wrapper.className = `requirement-checklist-item ${
      item.submitted ? "is-submitted" : "is-pending"
    }`;

    const row = document.createElement("div");
    row.className = "d-flex align-items-start gap-3";

    const check = document.createElement("span");
    check.className = `requirement-check ${
      item.submitted ? "is-submitted" : "is-pending"
    }`;
    check.textContent = item.submitted ? "✓" : "!";

    const content = document.createElement("div");
    content.className = "min-w-0";

    const title = document.createElement("div");
    title.className = "requirement-title";
    title.textContent = item.name;

    const status = document.createElement("div");
    status.className = "requirement-status mt-1";
    status.textContent = item.submitted ? "Submitted" : "Pending";

    content.appendChild(title);
    content.appendChild(status);
    row.appendChild(check);
    row.appendChild(content);
    wrapper.appendChild(row);
    fragment.appendChild(wrapper);
  });

  listElement.replaceChildren(fragment);
}

async function loadRequirementsChecklist() {
  renderRequirementsChecklistLoading();

  try {
    const storedUser = getRequirementsChecklistStoredPortalUser();

    if (!storedUser?.id_token) {
      renderRequirementsDetails(requirementsDetailFallback);
      renderRequirementsChecklist(requirementsChecklistFallback);
      return;
    }

    const record = await fetchRequirementsChecklistRecord(storedUser.id_token);

    renderRequirementsDetails(mapRequirementsDetailRecord(record));
    renderRequirementsChecklist(mapRequirementsChecklistRecord(record));
  } catch (error) {
    console.error("Requirements checklist load error:", error);
    renderRequirementsDetails(requirementsDetailFallback);
    renderRequirementsChecklist(requirementsChecklistFallback);
  }
}

function positionStudentChecklistCard() {
  const assignedHiCard = document.getElementById("assigned-hi-card");
  const checklistCard = document.getElementById("student-checklist-card");
  const availableHisCard = document.getElementById(
    "application-workflow-available-his-card"
  );

  if (!assignedHiCard || !checklistCard || !availableHisCard) {
    return;
  }

  if (window.innerWidth < 1200) {
    assignedHiCard.insertAdjacentElement("afterend", checklistCard);
    return;
  }

  availableHisCard.insertAdjacentElement("beforebegin", checklistCard);
}

document.addEventListener("DOMContentLoaded", function () {
  loadRequirementsChecklist();
  positionStudentChecklistCard();
});

window.addEventListener("resize", positionStudentChecklistCard);
