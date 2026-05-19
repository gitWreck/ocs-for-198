const requirementsChecklistFallback = [
  {
    name: "Mental Health Test c/o OCG",
    submitted: true,
  },
  {
    name: "Valid Medical Certificate",
    submitted: true,
  },
  {
    name: "Valid Accident Insurance",
    submitted: false,
  },
  {
    name: "Student's Pledge Form",
    submitted: true,
  },
  {
    name: "Notarized Consent of Parent/Guardian Form",
    submitted: false,
  },
  {
    name: "Work Plan",
    submitted: false,
  },
];

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

function loadRequirementsChecklist() {
  renderRequirementsChecklist(requirementsChecklistFallback);
}

function positionStudentChecklistCard() {
  const assignedHiCard = document.getElementById("assigned-hi-card");
  const checklistCard = document.getElementById("student-checklist-card");
  const availableHisCard = document.querySelector(
    ".portal-disabled-section.mb-4"
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
