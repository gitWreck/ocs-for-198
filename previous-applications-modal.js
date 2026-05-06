function previousApplicationsEscapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function previousApplicationsSafeText(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value).trim();
}

function formatPreviousApplicationDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resetPreviousApplicationsModal() {
  $("#previous-applications-loading").addClass("d-none");
  $("#previous-applications-error").addClass("d-none").text("");
  $("#previous-applications-empty").addClass("d-none");
  $("#previous-applications-list").addClass("d-none").empty();
}

function showPreviousApplicationsLoading() {
  $("#previous-applications-loading").removeClass("d-none");
  $("#previous-applications-error").addClass("d-none").text("");
  $("#previous-applications-empty").addClass("d-none");
  $("#previous-applications-list").addClass("d-none").empty();
}

function showPreviousApplicationsError(message) {
  $("#previous-applications-loading").addClass("d-none");
  $("#previous-applications-empty").addClass("d-none");
  $("#previous-applications-list").addClass("d-none").empty();

  $("#previous-applications-error")
    .removeClass("d-none")
    .text(message || "Failed to load previous applications.");
}

function showPreviousApplicationsEmpty() {
  $("#previous-applications-loading").addClass("d-none");
  $("#previous-applications-error").addClass("d-none").text("");
  $("#previous-applications-list").addClass("d-none").empty();
  $("#previous-applications-empty").removeClass("d-none");
}

async function fetchPreviousSubmissions(studentId) {
  const { data, error } = await supabaseClient
    .from("student_submissions")
    .select(
      "id, student_id, status, file_url, is_active, submitted_at, updated_at, inactive_at"
    )
    .eq("student_id", studentId)
    .eq("is_active", false)
    .order("submitted_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function fetchPreviousChoices(submissionIds) {
  if (!submissionIds.length) return [];

  const { data, error } = await supabaseClient
    .from("student_choices")
    .select("id, submission_id, company_id, choice_rank")
    .in("submission_id", submissionIds)
    .order("choice_rank", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function fetchPreviousCompanies(companyIds) {
  const uniqueCompanyIds = [...new Set(companyIds.map(Number).filter(Boolean))];
  if (!uniqueCompanyIds.length) return new Map();

  const companyMap = new Map();

  (currentCompanies || []).forEach((company) => {
    companyMap.set(Number(company.id), company.company_name || "-");
  });

  const missingCompanyIds = uniqueCompanyIds.filter(
    (companyId) => !companyMap.has(companyId)
  );

  if (!missingCompanyIds.length) return companyMap;

  const { data, error } = await supabaseClient
    .from("companies")
    .select("id, company_name")
    .in("id", missingCompanyIds);

  if (error) throw error;

  (data || []).forEach((company) => {
    companyMap.set(Number(company.id), company.company_name || "-");
  });

  return companyMap;
}

function renderPreviousApplicationChoices(choices, companyMap) {
  if (!choices.length) {
    return `
      <div class="text-muted small">
        No choices found for this previous application.
      </div>
    `;
  }

  return choices
    .sort((a, b) => Number(a.choice_rank) - Number(b.choice_rank))
    .map((choice) => {
      const companyName =
        companyMap.get(Number(choice.company_id)) || "Unknown HI";

      return `
        <div class="previous-application-choice mb-2">
          <div class="small text-muted mb-1">Choice ${previousApplicationsEscapeHtml(
            choice.choice_rank
          )}</div>
          <div class="fw-semibold">${previousApplicationsEscapeHtml(
            companyName
          )}</div>
        </div>
      `;
    })
    .join("");
}

function renderPreviousApplications(submissions, choices, companyMap) {
  const choicesBySubmission = new Map();

  choices.forEach((choice) => {
    const key = Number(choice.submission_id);
    if (!choicesBySubmission.has(key)) choicesBySubmission.set(key, []);
    choicesBySubmission.get(key).push(choice);
  });

  const html = submissions
    .map((submission, index) => {
      const submissionChoices =
        choicesBySubmission.get(Number(submission.id)) || [];
      const fileUrl = previousApplicationsSafeText(submission.file_url);
      const fileLink =
        fileUrl === "-"
          ? "-"
          : `<a href="${previousApplicationsEscapeHtml(
              fileUrl
            )}" target="_blank" rel="noopener">Open submitted file</a>`;

      return `
        <div class="previous-application-item mb-3">
          <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
            <div>
              <div class="fw-bold">Previous Application ${index + 1}</div>
              <div class="small text-muted">
                Submitted: ${previousApplicationsEscapeHtml(
                  formatPreviousApplicationDate(submission.submitted_at)
                )}
              </div>
              <div class="small text-muted">
                Replaced: ${previousApplicationsEscapeHtml(
                  formatPreviousApplicationDate(submission.inactive_at)
                )}
              </div>
            </div>
            <span class="hi-status-badge hi-status-pending">
              ${previousApplicationsEscapeHtml(
                previousApplicationsSafeText(submission.status)
              )}
            </span>
          </div>

          <div class="mb-3">
            ${renderPreviousApplicationChoices(submissionChoices, companyMap)}
          </div>

          <div class="small">
            <span class="text-muted">Submitted file:</span>
            ${fileLink}
          </div>
        </div>
      `;
    })
    .join("");

  $("#previous-applications-loading").addClass("d-none");
  $("#previous-applications-error").addClass("d-none").text("");
  $("#previous-applications-empty").addClass("d-none");
  $("#previous-applications-list").removeClass("d-none").html(html);
}

async function loadPreviousApplicationsModalData() {
  resetPreviousApplicationsModal();
  showPreviousApplicationsLoading();

  try {
    if (!currentStudent || !currentStudent.id) {
      throw new Error("No student loaded.");
    }

    const submissions = await fetchPreviousSubmissions(currentStudent.id);

    if (!submissions.length) {
      showPreviousApplicationsEmpty();
      return;
    }

    const submissionIds = submissions.map((submission) => submission.id);
    const choices = await fetchPreviousChoices(submissionIds);
    const companyIds = choices.map((choice) => choice.company_id);
    const companyMap = await fetchPreviousCompanies(companyIds);

    renderPreviousApplications(submissions, choices, companyMap);
  } catch (error) {
    console.error("Previous applications modal load error:", error);
    showPreviousApplicationsError(
      error?.message || "Failed to load previous applications."
    );
  }
}

$(document).ready(function () {
  $("#previousApplicationsModal").on("show.bs.modal", async function () {
    await loadPreviousApplicationsModalData();
  });
});
