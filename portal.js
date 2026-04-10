const SUPABASE_URL = "https://nzqcmepeoplxpkmvhyvw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zc3HjgzA6LkNykZkKOoM8Q_6SqJBj0i";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const APPS_SCRIPT_UPLOAD_URL =
  "https://script.google.com/macros/s/AKfycbzAGBcOQUzyDR6ytw2VM8mHPAiKlT86_Y_9_VmqG-f2BKxmnAeyuLYgcTuCKhlE8etf/exec";

let companiesTable = null;

let loggedInUser = null;
let currentStudent = null;
let currentCompanies = [];
let selectedCompanies = [];
let selectedCvFile = null;
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

function getRemainingSlots(company) {
  return Math.max(Number(company.slots_remaining || 0), 0);
}

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
      "id, company_name, slots_total, slots_taken, slots_remaining, is_active"
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
    .select("id, student_id, cv_file_url, submitted_at, updated_at, status")
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

function renderCompanies(companies) {
  const rows = [];

  if (!companies.length) {
    rows.push([
      '<span class="text-muted">No available companies found.</span>',
      "",
      "",
      "",
      "",
    ]);
  } else {
    companies.forEach((company) => {
      const remaining = getRemainingSlots(company);
      const taken = Number(company.slots_taken || 0);
      const isFull = remaining <= 0;

      rows.push([
        `<span class="fw-semibold">${escapeHtml(company.company_name)}</span>`,
        escapeHtml(company.slots_total),
        escapeHtml(taken),
        escapeHtml(remaining),
        `<span class="${isFull ? "slot-badge-full" : "slot-badge-open"}">
          ${isFull ? "Full" : "Open"}
        </span>`,
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
        { orderable: false, targets: 4 },
        { className: "align-middle", targets: "_all" },
      ],
      createdRow: function (row, rowData, dataIndex) {
        const company = companies[dataIndex];

        if (!company) {
          $(row).removeClass("company-row").removeAttr("data-id");
          return;
        }

        const remaining = getRemainingSlots(company);
        const isFull = remaining <= 0;

        $(row).addClass("company-row").attr("data-id", company.id);

        if (isFull) {
          $(row).addClass("table-light");
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
  } else {
    const currentSearch = companiesTable.search();
    const currentOrder = companiesTable.order();
    const currentPage = companiesTable.page();

    companiesTable.clear();
    companiesTable.rows.add(rows);
    companiesTable.draw(false);

    companiesTable.search(currentSearch);
    companiesTable.order(currentOrder);
    companiesTable.page(currentPage).draw(false);

    companiesTable.rows().every(function (rowIdx) {
      const row = this.node();
      const company = companies[rowIdx];

      $(row).removeClass("company-row table-light").removeAttr("data-id");

      if (!company) return;

      const remaining = getRemainingSlots(company);
      const isFull = remaining <= 0;

      $(row).addClass("company-row").attr("data-id", company.id);

      if (isFull) {
        $(row).addClass("table-light");
      }
    });
  }
}

function renderSelectedCompanies() {
  $("#choice-1").text(selectedCompanies[0]?.company_name || "-");
  $("#choice-2").text(selectedCompanies[1]?.company_name || "-");
  $("#choice-3").text(selectedCompanies[2]?.company_name || "-");
}

function setSelectedCvFile(file) {
  selectedCvFile = file || null;
  $("#cv-file-name").text(
    selectedCvFile ? selectedCvFile.name : "No file selected"
  );
}

function openCompanyModal(companyId) {
  const company = currentCompanies.find(
    (item) => String(item.id) === String(companyId)
  );

  if (!company) return;

  const remaining = getRemainingSlots(company);

  $("#modal-company-id").val(company.id);
  $("#modal-company-name").text(company.company_name || "-");
  $("#modal-company-description").text("No description available.");
  $("#modal-company-address").text("-");
  $("#modal-company-slots").text(remaining);

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

  const remaining = getRemainingSlots(company);

  if (remaining <= 0) {
    showPortalMessage("warning", "This company is already full.");
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

async function uploadCvFile() {
  if (!selectedCvFile) {
    throw new Error("Please upload your CV file.");
  }

  if (
    !currentStudent ||
    !currentStudent.student_no ||
    !currentStudent.fullname
  ) {
    throw new Error("Student information is incomplete.");
  }

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = function () {
        try {
          const result = String(reader.result || "");
          const base64 = result.includes(",") ? result.split(",")[1] : result;

          if (!base64) {
            reject(new Error("Failed to read file content."));
            return;
          }

          resolve(base64);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = function () {
        reject(new Error("Failed to read the selected file."));
      };

      reader.readAsDataURL(file);
    });

  const base64File = await fileToBase64(selectedCvFile);

  const payload = {
    student_no: currentStudent.student_no,
    fullname: currentStudent.fullname,
    file_name: selectedCvFile.name,
    mime_type: selectedCvFile.type || "",
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
    throw new Error(result?.message || "Failed to upload CV file.");
  }

  if (!result || !result.success) {
    throw new Error(result?.message || "CV upload failed.");
  }

  if (!result.file_url) {
    throw new Error("Upload succeeded but no file URL was returned.");
  }

  return result.file_url;
}

async function refreshCompanies() {
  currentCompanies = await getCompanies();
  renderCompanies(currentCompanies);
}

function lockPortalAfterSubmission() {
  $("#save-preferences-btn").prop("disabled", true).text("Already Submitted");
  $("#cv-file").prop("disabled", true);
  $("#clear-choices-btn").prop("disabled", true);
  $(".company-card").css("pointer-events", "none").addClass("opacity-50");
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

  if (!selectedCvFile) {
    showPortalMessage("warning", "Please upload your CV file.");
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

    const cvFileUrl = await uploadCvFile();

    const companyIds = selectedCompanies.map((company) => Number(company.id));

    const { data, error } = await supabaseClient.rpc(
      "submit_student_preferences",
      {
        p_student_id: currentStudent.id,
        p_cv_file_url: cvFileUrl,
        p_company_ids: companyIds,
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

  const choices = await getStudentChoices(studentId);

  selectedCompanies = choices
    .map((choice) =>
      currentCompanies.find(
        (company) => String(company.id) === String(choice.company_id)
      )
    )
    .filter(Boolean);

  renderSelectedCompanies();

  $("#cv-file-name").text(
    submission.cv_file_url ? "CV already uploaded" : "No file selected"
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
    $("#portal-error-message").text("Failed to load portal.");
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

  $("#select-company-btn").on("click", function () {
    selectCompanyFromModal();
  });

  $("#clear-choices-btn").on("click", function () {
    clearSelectedCompanies();
  });

  $("#cv-file").on("change", function (event) {
    const file =
      event.target.files && event.target.files[0]
        ? event.target.files[0]
        : null;

    setSelectedCvFile(file);
  });

  $("#save-preferences-btn").on("click", function () {
    savePreferences();
  });

  $("#logout-btn").on("click", function () {
    logoutUser();
  });

  // ✅ ADD THIS HERE
  setInterval(() => {
    refreshCompanies();
  }, 3000);
});
