const SUPABASE_URL = "https://nzqcmepeoplxpkmvhyvw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zc3HjgzA6LkNykZkKOoM8Q_6SqJBj0i";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const APPS_SCRIPT_UPLOAD_URL =
  "https://script.google.com/macros/s/AKfycbwBIadfjjUq3fmgnT8thpamqbovcr4Ab7kSkQO0jYBjOQVi9w8H7gvXOstjSYlAtu7m/exec";

let companiesTable = null;

let loggedInUser = null;
let currentStudent = null;
let currentCompanies = [];
let selectedCompanies = [];
let selectedSubmittedFile = null;
let hasSubmitted = false;

let latestCompanies = [];
let mobileCompaniesFiltered = [];
let mobileCompaniesPage = 1;
const MOBILE_COMPANIES_PER_PAGE = 5;

let companyModalInstance = null;
let saveConfirmModalInstance = null;

function getStoredUser() {
  try {
    const raw = sessionStorage.getItem("student_portal_user");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showPortalMessage(type, message) {
  const $msg = $("#save-message");
  $msg
    .removeClass("d-none alert-success alert-danger alert-warning alert-info")
    .addClass(`alert-${type}`)
    .text(message);
}

function clearPortalMessage() {
  $("#save-message")
    .addClass("d-none")
    .removeClass("alert-success alert-danger alert-warning alert-info")
    .text("");
}

function logoutUser() {
  loggedInUser = null;
  currentStudent = null;
  currentCompanies = [];
  selectedCompanies = [];
  // selectedCvFile = null;

  selectedSubmittedFile = null;
  hasSubmitted = false;

  sessionStorage.removeItem("student_portal_user");
  window.location.href = "index.html";
}

// function getRemainingSlots(company) {
//   return Math.max(Number(company.slots_remaining || 0), 0);
// }

async function getStudentByEmail(email) {
  const { data, error } = await supabaseClient
    .from("students")
    .select("id, student_no, fullname, email")
    .ilike("email", String(email).trim())
    .maybeSingle();

  if (error) {
    console.error("Student lookup error:", error);
    throw error;
  }

  return data || null;
}

async function getCompanies() {
  const { data, error } = await supabaseClient
    .from("v_companies_with_slots")
    .select(
      "id, company_name, slots_total, other_requirements, total_applicants, is_active"
    )
    .eq("is_active", true)
    .order("company_name", { ascending: true });

  if (error) {
    console.error("Companies lookup error:", error);
    throw error;
  }

  return data || [];
}

async function getStudentSubmission(studentId) {
  const { data, error } = await supabaseClient
    .from("student_submissions")
    .select("id, student_id, status, file_url, submitted_at, updated_at")
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) {
    console.error("Submission lookup error:", error);
    throw error;
  }

  return data || null;
}

async function getStudentChoices(studentId) {
  const { data, error } = await supabaseClient
    .from("student_choices")
    .select("id, submission_id, student_id, company_id, choice_rank")
    .eq("student_id", studentId)
    .order("choice_rank", { ascending: true });

  if (error) {
    console.error("Choices lookup error:", error);
    throw error;
  }

  return data || [];
}

function renderStudentInfo(student) {
  $("#student-name").text(student.fullname || "-");
  $("#student-no").text(student.student_no || "-");
  $("#student-email").text(student.email || "-");
}

function renderCompaniesMobile(companies) {
  const $mobileList = $("#companies-mobile-list");
  const $pagination = $("#companies-mobile-pagination");

  mobileCompaniesFiltered = companies || [];

  const totalItems = mobileCompaniesFiltered.length;
  const totalPages = Math.max(
    1,
    Math.ceil(totalItems / MOBILE_COMPANIES_PER_PAGE)
  );

  if (mobileCompaniesPage > totalPages) {
    mobileCompaniesPage = totalPages;
  }

  const startIndex = (mobileCompaniesPage - 1) * MOBILE_COMPANIES_PER_PAGE;
  const endIndex = startIndex + MOBILE_COMPANIES_PER_PAGE;
  const pagedCompanies = mobileCompaniesFiltered.slice(startIndex, endIndex);

  $mobileList.empty();
  $pagination.empty();

  if (!totalItems) {
    $mobileList.html(`
      <div class="card border-0 shadow-sm rounded-4">
        <div class="card-body text-center text-muted py-4">
          No available HIs found.
        </div>
      </div>
    `);
    return;
  }

  pagedCompanies.forEach((company) => {
    const slots = Number(company.slots_total);
    const isDisabled = isNaN(slots) || slots <= 0;
    const applicants = Number(company.total_applicants || 0);
    const otherRequirements = company.other_requirements || "-";

    $mobileList.append(`
     <div class="card border-0 shadow-sm rounded-4 mb-3 company-card ${
       hasSubmitted || isDisabled ? "opacity-50" : ""
     }" data-id="${company.id}">
        <div class="card-body p-3">
          <div class="mb-3">
            <h6 class="fw-semibold mb-1">${escapeHtml(
              company.company_name
            )}</h6>
            <small class="text-muted">Host Institution</small>
          </div>

          <div class="row g-2 mb-3">
            <div class="col-6">
              <div class="border rounded-3 p-2 bg-light h-100">
                <div class="small text-muted">Total Slots</div>
                <div class="fw-semibold">${escapeHtml(
                  company.slots_total
                )}</div>
              </div>
            </div>
            <div class="col-6">
              <div class="border rounded-3 p-2 bg-light h-100">
                <div class="small text-muted">Applicants</div>
                <div class="fw-semibold">${escapeHtml(applicants)}</div>
              </div>
            </div>
          </div>

          <div class="border rounded-3 p-2 bg-light mb-3">
            <div class="small text-muted">Other Requirements</div>
            <div class="small fw-semibold">${escapeHtml(
              otherRequirements
            )}</div>
          </div>

          <button
            class="btn btn-sm w-100 slot-badge-open select-company-btn ${
              hasSubmitted || isDisabled ? "disabled" : ""
            }"
            data-id="${company.id}"
            ${hasSubmitted || isDisabled ? "disabled" : ""}
          >
            ${isDisabled ? "Not yet final" : "Select"}
          </button>
        </div>
      </div>
    `);
  });

  if (totalPages > 1) {
    const showingStart = totalItems ? startIndex + 1 : 0;
    const showingEnd = Math.min(endIndex, totalItems);

    $pagination.html(`
      <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap">
        <div class="small text-muted">
          Showing ${showingStart} to ${showingEnd} of ${totalItems} HIs
        </div>

        <div class="d-flex align-items-center gap-2">
          <button
            class="btn btn-sm btn-outline-secondary"
            id="mobile-companies-prev"
            ${mobileCompaniesPage === 1 ? "disabled" : ""}
          >
            Previous
          </button>

          <span class="small text-muted">
            Page ${mobileCompaniesPage} of ${totalPages}
          </span>

          <button
            class="btn btn-sm btn-outline-secondary"
            id="mobile-companies-next"
            ${mobileCompaniesPage === totalPages ? "disabled" : ""}
          >
            Next
          </button>
        </div>
      </div>
    `);
  }
}

function getCompaniesSearchKeyword() {
  return ($("#companies-search").val() || "").toLowerCase().trim();
}

function getFilteredCompanies(keyword = "") {
  if (!keyword) return [...latestCompanies];

  return latestCompanies.filter((company) =>
    [company.company_name, company.other_requirements]
      .join(" ")
      .toLowerCase()
      .includes(keyword)
  );
}

function isCompaniesMobileView() {
  return window.innerWidth <= 1080;
}

function syncCompaniesView(resetMobilePage = false) {
  const keyword = getCompaniesSearchKeyword();
  const filtered = getFilteredCompanies(keyword);

  if (isCompaniesMobileView()) {
    if (resetMobilePage) {
      mobileCompaniesPage = 1;
    }
    renderCompaniesMobile(filtered);
  } else if (companiesTable) {
    companiesTable.search(keyword).draw();
  }
}

function renderCompanies(companies) {
  latestCompanies = companies || [];

  const rows = [];

  if (!latestCompanies.length) {
    rows.push([
      '<span class="text-muted">No available HIs found.</span>',
      "",
      "",
      "",
      "",
    ]);
  } else {
    latestCompanies.forEach((company) => {
      // console.log("Rendering company:", company);

      const slots = Number(company.slots_total);
      const isDisabled = isNaN(slots) || slots <= 0;

      const applicants = isNaN(Number(company.total_applicants))
        ? 0
        : Number(company.total_applicants);
      const otherRequirements = company.other_requirements || "-";

      rows.push([
        `<span class="fw-semibold">${escapeHtml(company.company_name)}</span>`,
        escapeHtml(company.slots_total),
        escapeHtml(applicants),
        `<span class="requirements-cell">${escapeHtml(
          otherRequirements
        )}</span>`,
        `<button 
          class="btn btn-sm slot-badge-open select-company-btn ${
            isDisabled ? "disabled" : ""
          }"
          data-id="${company.id}"
          ${isDisabled ? "disabled" : ""}
        >
          ${isDisabled ? "Not yet final" : "Select"}
        </button>`,
      ]);
    });
  }

  if (!companiesTable) {
    companiesTable = $("#companies-table").DataTable({
      data: rows,
      pageLength: 10,
      lengthMenu: [5, 10, 25, 50],
      // order: [[0, "asc"]],
      order: [
        [0, "asc"],
        [1, "desc"],
      ],
      deferRender: true,
      columnDefs: [
        { orderable: false, targets: 4 },
        { className: "align-middle", targets: "_all" },
        { className: "text-start", targets: 3 },
      ],
      createdRow: function (row, rowData, dataIndex) {
        const company = latestCompanies[dataIndex];

        if (!company) {
          $(row).removeClass("company-row").removeAttr("data-id");
          return;
        }

        const slots = Number(company.slots_total);
        const isDisabled = isNaN(slots) || slots <= 0;

        if (isDisabled) {
          $(row)
            .removeClass("company-row")
            .addClass("opacity-50")
            .removeAttr("data-id");
        } else {
          $(row).addClass("company-row").attr("data-id", company.id);
        }
      },
      language: {
        search: "Search:",
        lengthMenu: "Show _MENU_ HIs",
        info: "Showing _START_ to _END_ of _TOTAL_ HIs",
        infoEmpty: "No HIs available",
        zeroRecords: "No matching HIs found",
        paginate: {
          first: "First",
          last: "Last",
          next: "Next",
          previous: "Previous",
        },
      },
    });
    // After DataTable init
    // $("#companies-table_filter").appendTo("#companies-table-search-wrap");
  } else {
    companiesTable.clear();
    companiesTable.rows.add(rows);
    companiesTable.draw(false);

    companiesTable.rows().every(function (rowIdx) {
      const row = this.node();
      const company = latestCompanies[rowIdx];

      $(row).removeClass("company-row").removeAttr("data-id");

      if (!company) return;

      $(row).addClass("company-row").attr("data-id", company.id);
    });
  }

  mobileCompaniesPage = 1;
  syncCompaniesView(true);
}

function renderSelectedCompanies() {
  $("#choice-1").text(selectedCompanies[0]?.company_name || "-");
  $("#choice-2").text(selectedCompanies[1]?.company_name || "-");
  $("#choice-3").text(selectedCompanies[2]?.company_name || "-");
}

function setSelectedFiles() {
  selectedSubmittedFile =
    document.getElementById("submitted-documents")?.files?.[0] || null;

  $("#submitted-documents-name").text(
    selectedSubmittedFile ? selectedSubmittedFile.name : "No file"
  );
}

function openCompanyModal(companyId) {
  const company = currentCompanies.find(
    (item) => String(item.id) === String(companyId)
  );

  if (!company) return;

  $("#modal-company-id").val(company.id);
  $("#modal-company-name").text(company.company_name || "-");
  $("#modal-company-requirements").text(company.other_requirements || "-");
  // $("#modal-company-address").text("-");
  $("#modal-company-slots").text(
    `${company.slots_total || 0} slot(s) • ${
      company.total_applicants || 0
    } applicant(s)`
  );

  if (!companyModalInstance) {
    const modalElement = document.getElementById("companyModal");
    companyModalInstance = new bootstrap.Modal(modalElement);
  }

  companyModalInstance.show();
}

function selectCompanyFromModal() {
  const companyId = $("#modal-company-id").val();

  const company = currentCompanies.find(
    (item) => String(item.id) === String(companyId)
  );

  if (!company) {
    showPortalMessage("danger", "Company not found.");
    return;
  }

  const alreadySelected = selectedCompanies.find(
    (item) => String(item.id) === String(company.id)
  );

  if (alreadySelected) {
    showPortalMessage("warning", "You already selected this company.");
    return;
  }

  if (selectedCompanies.length >= 3) {
    showPortalMessage("warning", "You can only select up to 3 companies.");
    return;
  }

  selectedCompanies.push(company);
  renderSelectedCompanies();
  clearPortalMessage();

  if (companyModalInstance) {
    companyModalInstance.hide();
  }
}

function clearSelectedCompanies() {
  selectedCompanies = [];
  renderSelectedCompanies();
  clearPortalMessage();
}

function unlockPortalForEditing() {
  $("#save-preferences-btn").prop("disabled", false).text("Save Preferences");
  $("#submitted-documents").prop("disabled", false).val("");
  $("#submitted-documents-name").text("No file");
  $("#clear-choices-btn")
    .prop("disabled", false)
    .text("Clear Choices");
  $(".company-row").css("pointer-events", "").removeClass("opacity-50");
  $(".company-card").css("pointer-events", "").removeClass("opacity-50");
  $("#select-company-btn").prop("disabled", false);

  selectedSubmittedFile = null;
  syncCompaniesView(false);
}

async function clearSubmittedPreferences() {
  if (!currentStudent || !loggedInUser?.email) {
    showPortalMessage("danger", "No student loaded.");
    return;
  }

  const confirmed = window.confirm(
    "Clear your submitted HI choices? You will need to upload your PDF and submit again."
  );

  if (!confirmed) return;

  $("#clear-choices-btn").prop("disabled", true).text("Clearing...");
  clearPortalMessage();

  try {
    const { error } = await supabaseClient.rpc("clear_student_preferences", {
      p_student_id: currentStudent.id,
      p_student_email: loggedInUser.email,
    });

    if (error) throw error;

    selectedCompanies = [];
    hasSubmitted = false;
    renderSelectedCompanies();
    await refreshCompanies();
    unlockPortalForEditing();

    showPortalMessage(
      "success",
      "Your submitted choices were cleared. You can submit new preferences now."
    );
  } catch (error) {
    console.error("Clear submitted preferences error:", error);
    showPortalMessage(
      "danger",
      error?.message || "Failed to clear submitted choices."
    );
    $("#clear-choices-btn")
      .prop("disabled", false)
      .text("Clear Submitted Choices");
  }
}

function handleClearChoices() {
  if (hasSubmitted) {
    clearSubmittedPreferences();
    return;
  }

  clearSelectedCompanies();
}

async function uploadSubmissionFile() {
  const submissionFile =
    document.getElementById("submitted-documents")?.files?.[0] || null;

  if (!submissionFile) {
    throw new Error("Please upload your processed PDF file.");
  }

  if (
    !currentStudent ||
    !currentStudent.student_no ||
    !currentStudent.fullname
  ) {
    throw new Error("Student information is incomplete.");
  }

  if (!loggedInUser || !loggedInUser.email) {
    throw new Error("Logged in user email is missing.");
  }

  const termYear =
    document.getElementById("term-year")?.textContent?.trim() || "";

  if (!termYear) {
    throw new Error("Term and Year is required.");
  }

  const allSelectedHIs = selectedCompanies
    .map((company) => company.company_name)
    .filter(Boolean)
    .join(", ");

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = function () {
        try {
          const result = String(reader.result || "");
          const base64 = result.includes(",") ? result.split(",")[1] : result;

          if (!base64) {
            reject(new Error(`Failed to read file content for ${file.name}.`));
            return;
          }

          resolve(base64);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = function () {
        reject(new Error(`Failed to read the selected file: ${file.name}`));
      };

      reader.readAsDataURL(file);
    });

  const base64File = await fileToBase64(submissionFile);

  const payload = {
    email: loggedInUser.email,
    term_year: termYear,
    student_no: currentStudent.student_no,
    fullname: currentStudent.fullname,
    all_selected_his: allSelectedHIs,
    file_name: submissionFile.name,
    mime_type: submissionFile.type || "",
    file_base64: base64File,
  };

  const response = await fetch(APPS_SCRIPT_UPLOAD_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.message || "Failed to upload submission file.");
  }

  if (!result || !result.success) {
    throw new Error(result?.message || "Submission file upload failed.");
  }

  if (!result.file_url) {
    throw new Error("Upload succeeded but no file URL was returned.");
  }

  return {
    file_url: result.file_url,
    file_id: result.file_id || null,
    file_name: result.file_name || submissionFile.name,
  };
}

async function refreshCompanies() {
  currentCompanies = await getCompanies();
  renderCompanies(currentCompanies);
}

function lockPortalAfterSubmission() {
  $("#save-preferences-btn").prop("disabled", true).text("Already Submitted");
  $("#submitted-documents").prop("disabled", true);
  $("#clear-choices-btn")
    .prop("disabled", false)
    .text("Clear Submitted Choices");
  $(".company-row").css("pointer-events", "none").addClass("opacity-50");
  $(".company-card").css("pointer-events", "none").addClass("opacity-50");
  $(".select-company-btn").prop("disabled", true);
}

async function savePreferences() {
  $("#save-preferences-btn").prop("disabled", true).text("Saving...");

  try {
    const existingSubmission = await getStudentSubmission(currentStudent.id);

    if (existingSubmission) {
      showPortalMessage(
        "warning",
        "You have already submitted your preferences."
      );
      hasSubmitted = true;
      lockPortalAfterSubmission();
      return;
    }

    const uploadedFile = await uploadSubmissionFile();

    const { data: submission, error: submissionError } = await supabaseClient
      .from("student_submissions")
      .insert({
        student_id: currentStudent.id,
        status: "submitted",
        file_url: uploadedFile.file_url,
      })
      .select("id, student_id, status, file_url, submitted_at, updated_at")
      .single();

    if (submissionError) {
      console.error("Submission insert error:", submissionError);
      throw submissionError;
    }

    const choiceRows = selectedCompanies.map((company, index) => ({
      submission_id: submission.id,
      student_id: currentStudent.id,
      company_id: Number(company.id),
      choice_rank: index + 1,
    }));

    const { error: choicesError } = await supabaseClient
      .from("student_choices")
      .insert(choiceRows);

    if (choicesError) {
      console.error("Choices insert error:", choicesError);
      throw choicesError;
    }

    await refreshCompanies();

    hasSubmitted = true;
    lockPortalAfterSubmission();
    // closeSaveConfirmModal();
    // showPortalMessage("success", "Preferences submitted successfully.");

    setSaveModalSuccessState();
  } catch (error) {
    console.error("Save preferences error:", error);

    let message = error?.message || "Failed to save preferences.";

    if (
      String(error?.message || "").includes("uq_student_submissions_student_id")
    ) {
      message = "You have already submitted your preferences.";
      hasSubmitted = true;
      lockPortalAfterSubmission();
    }

    if (
      String(error?.message || "").includes(
        "uq_student_choices_student_company"
      )
    ) {
      message = "You selected the same company more than once.";
    }
    closeSaveConfirmModal();
    showPortalMessage("danger", message);
    $("#save-preferences-btn").prop("disabled", false).text("Save Preferences");

    $("#save-confirm-content").removeClass("d-none");
    $("#save-loading-content").addClass("d-none");
    $("#save-confirm-actions").removeClass("d-none");

    $("#confirm-save-btn").prop("disabled", false).text("Confirm Save");
    $("#save-cancel-btn").prop("disabled", false);
    $("#save-confirm-close-btn").prop("disabled", false);
  }
}

function getSaveConfirmModalInstance() {
  if (!saveConfirmModalInstance) {
    const modalElement = document.getElementById("saveConfirmModal");
    saveConfirmModalInstance = new bootstrap.Modal(modalElement, {
      backdrop: "static",
      keyboard: false,
    });
  }

  return saveConfirmModalInstance;
}

function openSaveConfirmModal() {
  $("#save-confirm-content").removeClass("d-none");
  $("#save-loading-content").addClass("d-none");
  $("#save-confirm-actions").removeClass("d-none");

  $("#confirm-save-btn").prop("disabled", false).text("Confirm Save");
  $("#save-cancel-btn").prop("disabled", false);
  $("#save-confirm-close-btn").prop("disabled", false);

  getSaveConfirmModalInstance().show();
}

function setSaveModalLoadingState() {
  $("#save-confirm-content").addClass("d-none");
  $("#save-loading-content").removeClass("d-none");
  $("#save-confirm-actions").addClass("d-none");
}

function setSaveModalSuccessState() {
  $("#save-confirm-content").addClass("d-none");
  $("#save-loading-content").addClass("d-none");
  $("#save-confirm-actions").addClass("d-none");
  $("#save-success-content").removeClass("d-none");

  let seconds = 5;
  $("#logout-countdown").text(seconds);

  const interval = setInterval(() => {
    seconds--;
    $("#logout-countdown").text(seconds);

    if (seconds <= 0) {
      clearInterval(interval);
      logoutUser();
    }
  }, 1000);
}

function closeSaveConfirmModal() {
  if (saveConfirmModalInstance) {
    saveConfirmModalInstance.hide();
  }
}

async function preloadExistingSubmission(studentId) {
  const submission = await getStudentSubmission(studentId);

  if (!submission) return;

  hasSubmitted = true;

  const choices = await getStudentChoices(studentId);

  selectedCompanies = choices
    .sort((a, b) => a.choice_rank - b.choice_rank)
    .map((choice) =>
      currentCompanies.find(
        (company) => String(company.id) === String(choice.company_id)
      )
    )
    .filter(Boolean);

  renderSelectedCompanies();

  $("#submitted-documents-name").text(
    submission.file_url ? "Already uploaded" : "No file"
  );

  lockPortalAfterSubmission();
  showPortalMessage("info", "You have already submitted your preferences.");
}

async function loadPortal(email) {
  $("#loading-section").removeClass("d-none");
  $("#portal-section").addClass("d-none");
  $("#not-found-section").addClass("d-none");
  $("#portal-error-section").addClass("d-none");
  clearPortalMessage();

  try {
    const student = await getStudentByEmail(email);

    if (!student) {
      $("#loading-section").addClass("d-none");
      $("#not-found-section").removeClass("d-none");
      return;
    }

    currentStudent = student;
    renderStudentInfo(student);

    currentCompanies = await getCompanies();
    renderCompanies(currentCompanies);
    renderSelectedCompanies();

    await preloadExistingSubmission(student.id);

    $("#loading-section").addClass("d-none");
    $("#portal-section").removeClass("d-none");
  } catch (error) {
    console.error("Portal load error:", error);
    $("#loading-section").addClass("d-none");
    $("#portal-error-message").text(error?.message || "Failed to load portal.");
    $("#portal-error-section").removeClass("d-none");
  }
}

$(document).ready(function () {
  const storedUser = getStoredUser();

  if (!storedUser || !storedUser.email) {
    window.location.href = "index.html";
    return;
  }

  loggedInUser = storedUser;
  loadPortal(loggedInUser.email);

  $(document).on("click", ".company-row", function () {
    if ($(this).hasClass("opacity-50")) return;
    const companyId = $(this).attr("data-id");
    openCompanyModal(companyId);
  });

  $(document).on("click", ".company-card", function (e) {
    // if ($(e.target).closest(".select-company-btn").length) return;
    e.stopPropagation();
    if ($(this).hasClass("opacity-50")) return;

    const companyId = $(this).attr("data-id");
    openCompanyModal(companyId);
  });

  $(document).on("click", "#mobile-companies-prev", function () {
    if (mobileCompaniesPage > 1) {
      mobileCompaniesPage--;
      renderCompaniesMobile(mobileCompaniesFiltered);
    }
  });

  $(document).on("click", "#mobile-companies-next", function () {
    const totalPages = Math.max(
      1,
      Math.ceil(mobileCompaniesFiltered.length / MOBILE_COMPANIES_PER_PAGE)
    );

    if (mobileCompaniesPage < totalPages) {
      mobileCompaniesPage++;
      renderCompaniesMobile(mobileCompaniesFiltered);
    }
  });

  $("#select-company-btn").on("click", function () {
    selectCompanyFromModal();
  });

  $("#clear-choices-btn").on("click", function () {
    handleClearChoices();
  });

  $("#submitted-documents").on("change", function () {
    setSelectedFiles();
  });

  $("#save-preferences-btn").on("click", function () {
    // savePreferences();

    if (!currentStudent) {
      showPortalMessage("danger", "No student loaded.");
      return;
    }

    if (!selectedCompanies.length) {
      showPortalMessage("warning", "Please select at least 1 company.");
      return;
    }

    if (selectedCompanies.length > 3) {
      showPortalMessage("warning", "You can only select up to 3 companies.");
      return;
    }

    const submissionFile =
      document.getElementById("submitted-documents")?.files?.[0] || null;

    if (!submissionFile) {
      showPortalMessage("warning", "Please upload your processed PDF file.");
      return;
    }

    openSaveConfirmModal();
  });

  $("#confirm-save-btn").on("click", async function () {
    setSaveModalLoadingState();
    await savePreferences();
  });

  $("#logout-btn").on("click", function () {
    logoutUser();
  });

  $(document).on("input", "#companies-search", function () {
    syncCompaniesView(true);
  });

  $(window).on("resize", function () {
    syncCompaniesView(false);
  });

  // setInterval(() => {
  //   refreshCompanies();
  // }, 5000);
});
