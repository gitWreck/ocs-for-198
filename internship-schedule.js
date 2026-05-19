const internshipScheduleFallback = [
  {
    schedule_year: 2026,
    date_label: "May 15",
    time_range: "",
    activity: "Final placement of students",
    note: "",
    start_date: "2026-05-15",
    end_date: "2026-05-15",
  },
  {
    schedule_year: 2026,
    date_label: "May 22",
    time_range: "8:30 AM - 12 NN",
    activity:
      "Onboarding Session for eligible FOR 198 enrollees, committee members, and FOR 198 FICs",
    note: "",
    start_date: "2026-05-22",
    end_date: "2026-05-22",
  },
  {
    schedule_year: 2026,
    date_label: "May 29",
    time_range: "",
    activity:
      "Consolidation of final workplan evaluation by the internship committee",
    note: "",
    start_date: "2026-05-29",
    end_date: "2026-05-29",
  },
  {
    schedule_year: 2026,
    date_label: "June 3",
    time_range: "",
    activity:
      "Deadline for student requirements submission\nUpdating of student checklist for OCS consent during enrollment",
    note: "",
    start_date: "2026-06-03",
    end_date: "2026-06-03",
  },
  {
    schedule_year: 2026,
    date_label: "June 4",
    time_range: "10 AM",
    activity: "General Registration\nOrientation with FICs",
    note: "",
    start_date: "2026-06-04",
    end_date: "2026-06-04",
  },
  {
    schedule_year: 2026,
    date_label: "June 8-11",
    time_range: "",
    activity: "Orientation meeting of FICs, HIs and students",
    note: "",
    start_date: "2026-06-08",
    end_date: "2026-06-11",
  },
  {
    schedule_year: 2026,
    date_label: "June 18 - July 14",
    time_range: "",
    activity:
      "Deployment to be decided by HIs, as long minimum of 160 working hours will be met",
    note: "or earlier than June 18",
    start_date: "2026-06-18",
    end_date: "2026-07-14",
  },
  {
    schedule_year: 2026,
    date_label: "July 15-17",
    time_range: "",
    activity: "Exit conference/presentation of outputs/post-eval",
    note: "",
    start_date: "2026-07-15",
    end_date: "2026-07-17",
  },
  {
    schedule_year: 2026,
    date_label: "TBA",
    time_range: "",
    activity: "College-wide exit conference",
    note: "",
    start_date: null,
    end_date: null,
  },
];

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isDateInScheduleRange(today, item) {
  if (!item.start_date || !item.end_date) {
    return false;
  }

  return today >= item.start_date && today <= item.end_date;
}

function renderInternshipSchedule(scheduleItems) {
  const tableBody = document.getElementById("schedule-table-body");

  if (!tableBody) {
    return;
  }

  const today = formatLocalDate(new Date());
  const fragment = document.createDocumentFragment();

  scheduleItems.forEach((item) => {
    const isToday = isDateInScheduleRange(today, item);
    const row = document.createElement("tr");

    if (isToday) {
      row.classList.add("schedule-today-row");
    }

    const dateCell = document.createElement("td");
    const dateText = document.createElement("span");
    dateText.className = "schedule-date";
    dateText.textContent = item.date_label;
    dateCell.appendChild(dateText);

    if (isToday) {
      const todayBadge = document.createElement("span");
      todayBadge.className = "schedule-today-badge";
      todayBadge.textContent = "Today";
      dateCell.appendChild(todayBadge);
    }

    row.appendChild(dateCell);

    const timeCell = document.createElement("td");
    const timeText = document.createElement("span");
    timeText.className = "schedule-time";
    timeText.textContent = item.time_range || "-";
    timeCell.appendChild(timeText);
    row.appendChild(timeCell);

    const activityCell = document.createElement("td");
    activityCell.className = "schedule-activity";
    activityCell.textContent = item.activity;
    row.appendChild(activityCell);

    const noteCell = document.createElement("td");
    noteCell.className = "schedule-note";
    noteCell.textContent = item.note || "-";
    row.appendChild(noteCell);

    fragment.appendChild(row);
  });

  tableBody.replaceChildren(fragment);
}

async function loadInternshipSchedule() {
  renderInternshipSchedule(internshipScheduleFallback);

  if (typeof supabaseClient === "undefined") {
    return;
  }

  const { data, error } = await supabaseClient
    .from("internship_schedule")
    .select(
      "schedule_year, date_label, time_range, activity, note, start_date, end_date, sort_order"
    )
    .eq("is_active", true)
    .order("schedule_year", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Internship schedule lookup error:", error);
    return;
  }

  if (Array.isArray(data) && data.length > 0) {
    renderInternshipSchedule(data);
  }
}

loadInternshipSchedule();
