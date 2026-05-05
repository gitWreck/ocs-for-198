const SUPABASE_URL = "https://nzqcmepeoplxpkmvhyvw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zc3HjgzA6LkNykZkKOoM8Q_6SqJBj0i";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const APPS_SCRIPT_UPLOAD_URL =
  "https://script.google.com/macros/s/AKfycbzwA4q5BnOAbjPj1LJCZozFLX64_0tTM90ygFS1vqkI21lu7hBdofu5xOYyr-pk_ya6sw/exec";

let companiesTable = null;

let loggedInUser = null;
let currentStudent = null;
let currentCompanies = [];
let selectedCompanies = [];
let selectedCvFile = null;
let hasSubmitted = false;

let latestCompanies = [];
let mobileCompaniesFiltered = [];
let mobileCompaniesPage = 1;
const MOBILE_COMPANIES_PER_PAGE = 5;

let companyModalInstance = null;

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
  selectedCvFile = null;

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
    .select("id, company_name, slots_total, total_applicants, is_active")
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
    .select("id, student_id, submitted_at, updated_at, status")
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
    const applicants = Number(company.total_applicants || 0);

    $mobileList.append(`
      <div class="card border-0 shadow-sm rounded-4 mb-3 company-card" data-id="${
        company.id
      }">
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

          <button
            class="btn btn-sm w-100 slot-badge-open select-company-btn"
            data-id="${company.id}"
          >
            Select
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
    String(company.company_name || "")
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
    ]);
  } else {
    latestCompanies.forEach((company) => {
      const applicants = Number(company.total_applicants || 0);

      rows.push([
        `<span class="fw-semibold">${escapeHtml(company.company_name)}</span>`,
        escapeHtml(company.slots_total),
        escapeHtml(applicants),
        `<button 
          class="btn btn-sm slot-badge-open select-company-btn"
          data-id="${company.id}"
        >
          Select
        </button>`,
      ]);
    });
  }

  if (!companiesTable) {
    companiesTable = $("#companies-table").DataTable({
      data: rows,
      pageLength: 10,
      lengthMenu: [5, 10, 25, 50],
      order: [[0, "asc"]],
      deferRender: true,
      columnDefs: [
        { orderable: false, targets: 3 },
        { className: "align-middle", targets: "_all" },
      ],
      createdRow: function (row, rowData, dataIndex) {
        const company = latestCompanies[dataIndex];

        if (!company) {
          $(row).removeClass("company-row").removeAttr("data-id");
          return;
        }

        $(row).addClass("company-row").attr("data-id", company.id);
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
  selectedApplicationLetterFile =
    document.getElementById("application-letter")?.files?.[0] || null;

  selectedCvFile = document.getElementById("cv-file")?.files?.[0] || null;

  selectedTcgFile = document.getElementById("tcg-file")?.files?.[0] || null;

  $("#application-letter-name").text(
    selectedApplicationLetterFile
      ? selectedApplicationLetterFile.name
      : "No file"
  );

  $("#cv-file-name").text(selectedCvFile ? selectedCvFile.name : "No file");

  $("#tcg-file-name").text(selectedTcgFile ? selectedTcgFile.name : "No file");
}

function openCompanyModal(companyId) {
  const company = currentCompanies.find(
    (item) => String(item.id) === String(companyId)
  );

  if (!company) return;

  $("#modal-company-id").val(company.id);
  $("#modal-company-name").text(company.company_name || "-");
  // $("#modal-company-description").text("No description available.");
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

async function uploadFiles() {
  const applicationLetterFile =
    document.getElementById("application-letter")?.files?.[0] || null;
  const cvFile = document.getElementById("cv-file")?.files?.[0] || null;
  const tcgFile = document.getElementById("tcg-file")?.files?.[0] || null;

  if (!applicationLetterFile || !cvFile || !tcgFile) {
    throw new Error("Please upload your Application Letter, CV, and TCG.");
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

  if (!selectedCompanies || !selectedCompanies.length) {
    throw new Error("Please select at least 1 company.");
  }

  const termYear =
    document.getElementById("term-year")?.textContent?.trim() || "";

  if (!termYear) {
    throw new Error("Term and Year is required.");
  }

  const choice1 = selectedCompanies[0]?.company_name || "";
  const choice2 = selectedCompanies[1]?.company_name || "";
  const choice3 = selectedCompanies[2]?.company_name || "";

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

  const documentFiles = [
    {
      label: "application_letter",
      file: applicationLetterFile,
    },
    {
      label: "cv",
      file: cvFile,
    },
    {
      label: "tcg",
      file: tcgFile,
    },
  ];

  const uploadedFiles = [];

  for (let i = 0; i < selectedCompanies.length; i++) {
    const company = selectedCompanies[i];
    const choiceNumber = i + 1;

    if (!company || !company.company_name) {
      continue;
    }

    for (const item of documentFiles) {
      const base64File = await fileToBase64(item.file);

      const payload = {
        email: loggedInUser.email,
        term_year: termYear,
        student_no: currentStudent.student_no,
        fullname: currentStudent.fullname,

        choice_1: choice1,
        choice_2: choice2,
        choice_3: choice3,

        company_name: company.company_name,
        choice_number: choiceNumber,
        document_type: item.label,

        file_name: item.file.name,
        mime_type: item.file.type || "",
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
        throw new Error(
          result?.message ||
            `Failed to upload ${item.label.replaceAll("_", " ")} for ${
              company.company_name
            }.`
        );
      }

      if (!result || !result.success) {
        throw new Error(
          result?.message ||
            `${item.label.replaceAll("_", " ")} upload failed for ${
              company.company_name
            }.`
        );
      }

      if (!result.file_url) {
        throw new Error(
          `Upload succeeded but no file URL was returned for ${item.label.replaceAll(
            "_",
            " "
          )} - ${company.company_name}.`
        );
      }

      uploadedFiles.push({
        choice_number: choiceNumber,
        company_name: company.company_name,
        type: item.label,
        file_url: result.file_url,
        file_id: result.file_id || null,
        file_name: result.file_name || item.file.name,
      });
    }
  }

  return uploadedFiles;
}

async function refreshCompanies() {
  currentCompanies = await getCompanies();
  renderCompanies(currentCompanies);
}

function lockPortalAfterSubmission() {
  $("#save-preferences-btn").prop("disabled", true).text("Already Submitted");
  $("#application-letter").prop("disabled", true);
  $("#cv-file").prop("disabled", true);
  $("#tcg-file").prop("disabled", true);
  $("#clear-choices-btn").prop("disabled", true);
  $(".company-row").css("pointer-events", "none").addClass("opacity-50");
}

async function savePreferences() {
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

  const applicationLetterFile =
    document.getElementById("application-letter")?.files?.[0] || null;
  const cvFile = document.getElementById("cv-file")?.files?.[0] || null;
  const tcgFile = document.getElementById("tcg-file")?.files?.[0] || null;

  if (!applicationLetterFile || !cvFile || !tcgFile) {
    showPortalMessage(
      "warning",
      "Please upload your Application Letter, CV, and TCG."
    );
    return;
  }

  $("#save-preferences-btn").prop("disabled", true).text("Saving...");

  try {
    const existingSubmission = await getStudentSubmission(currentStudent.id);

    if (existingSubmission) {
      showPortalMessage(
        "warning",
        "You have already submitted your preferences."
      );
      lockPortalAfterSubmission();
      return;
    }

    const uploadedFiles = await uploadFiles();

    if (!uploadedFiles || !uploadedFiles.length) {
      throw new Error("No files were uploaded.");
    }

    const companyIds = selectedCompanies.map((company) => Number(company.id));

    const choiceFiles = selectedCompanies.map((company, index) => {
      const choiceNumber = index + 1;

      const applicationLetter = uploadedFiles.find(
        (file) =>
          Number(file.choice_number) === choiceNumber &&
          file.type === "application_letter"
      );

      const cv = uploadedFiles.find(
        (file) =>
          Number(file.choice_number) === choiceNumber && file.type === "cv"
      );

      const tcg = uploadedFiles.find(
        (file) =>
          Number(file.choice_number) === choiceNumber && file.type === "tcg"
      );

      return {
        choice_rank: choiceNumber,
        company_id: Number(company.id),
        company_name: company.company_name,
        application_letter_url: applicationLetter?.file_url || null,
        cv_file_url: cv?.file_url || null,
        tcg_file_url: tcg?.file_url || null,
      };
    });

    const { data, error } = await supabaseClient.rpc(
      "submit_student_preferences",
      {
        p_student_id: currentStudent.id,
        p_company_ids: companyIds,
        p_choice_files: choiceFiles,
      }
    );

    if (error) {
      console.error("Submit preferences RPC error:", error);
      throw error;
    }

    if (data && data.success === false) {
      throw new Error(data.message || "Failed to save preferences.");
    }

    await refreshCompanies();

    showPortalMessage(
      "success",
      data?.message || "Preferences saved successfully."
    );

    lockPortalAfterSubmission();
  } catch (error) {
    console.error("Save preferences error:", error);
    showPortalMessage(
      "danger",
      error?.message || "Failed to save preferences."
    );
    $("#save-preferences-btn").prop("disabled", false).text("Save Preferences");
  }
}

async function preloadExistingSubmission(studentId) {
  const submission = await getStudentSubmission(studentId);

  if (!submission) return;

  hasSubmitted = true; // ✅ ADD THIS
  const choices = await getStudentChoices(studentId);

  selectedCompanies = choices
    .map((choice) =>
      currentCompanies.find(
        (company) => String(company.id) === String(choice.company_id)
      )
    )
    .filter(Boolean);

  renderSelectedCompanies();

  $("#application-letter-name").text("Already uploaded");
  $("#cv-file-name").text("Already uploaded");
  $("#tcg-file-name").text("Already uploaded");

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
    if ($(e.target).closest(".select-company-btn").length) return;
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
    clearSelectedCompanies();
  });

  $("#application-letter, #cv-file, #tcg-file").on("change", function () {
    setSelectedFiles();
  });

  $("#save-preferences-btn").on("click", function () {
    savePreferences();
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
