
import { useEffect, useMemo, useState } from "react";
import "./styles.css";

const STORAGE_KEY = "foundit-reports-v1";

const emptyForm = {
  title: "",
  type: "Lost",
  category: "",
  location: "",
  date: "",
  description: "",
  contact: "",
};

const categories = [
  "Electronics",
  "ID Card",
  "Books & Notes",
  "Keys",
  "Bags",
  "Clothing",
  "Accessories",
  "Other",
];

const categoryIcons = {
  Electronics: "💻",
  "ID Card": "🪪",
  "Books & Notes": "📚",
  Keys: "🔑",
  Bags: "🎒",
  Clothing: "👕",
  Accessories: "⌚",
  Other: "📦",
};

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function loadReports() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return [];

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Could not load reports:", error);
    return [];
  }
}

function formatDate(value) {
  if (!value) return "Date not provided";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function validate(form) {
  const errors = {};

  if (!form.title.trim()) {
    errors.title = "Please enter the item name.";
  }

  if (!form.category) {
    errors.category = "Please select a category.";
  }

  if (!form.location.trim()) {
    errors.location = "Please enter the location.";
  }

  if (!form.date) {
    errors.date = "Please select the date.";
  } else if (form.date > today()) {
    errors.date = "The date cannot be in the future.";
  }

  if (!form.description.trim()) {
    errors.description = "Please describe the item.";
  }

  if (!form.contact.trim()) {
    errors.contact = "Please enter a contact email.";
  } else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact.trim())
  ) {
    errors.contact = "Please enter a valid email address.";
  }

  return errors;
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function exportReports(reports) {
  if (!reports.length) {
    window.alert("There are no reports to export.");
    return;
  }

  const headers = [
    "Item",
    "Type",
    "Category",
    "Location",
    "Date",
    "Description",
    "Contact",
    "Status",
  ];

  const rows = reports.map((report) => [
    report.title,
    report.type,
    report.category,
    report.location,
    report.date,
    report.description,
    report.contact,
    report.status,
  ]);

  const csv = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "foundit-reports.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function App() {
  const [reports, setReports] = useState(loadReports);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("info");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [sort, setSort] = useState("newest");

  // Save reports whenever the list changes.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    } catch (error) {
      console.error("Could not save reports:", error);
      showNotice(
        "Could not save reports in this browser. Check available storage.",
        "error"
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports]);

  // Automatically dismiss floating notifications.
  useEffect(() => {
    if (!notice) return undefined;

    const timeoutId = window.setTimeout(() => {
      setNotice("");
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  function showNotice(message, type = "info") {
    setNoticeType(type);
    setNotice(message);
  }

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = reports.filter((report) => {
      const matchesSearch = [
        report.title,
        report.category,
        report.location,
        report.description,
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      );

      const matchesType =
        filter === "All" ||
        (filter === "Resolved"
          ? report.status === "Resolved"
          : report.type === filter && report.status !== "Resolved");

      const matchesCategory =
        categoryFilter === "All categories" ||
        report.category === categoryFilter;

      return matchesSearch && matchesType && matchesCategory;
    });

    return result.sort((a, b) => {
      const dateA = Number(a.createdAt) || 0;
      const dateB = Number(b.createdAt) || 0;

      return sort === "newest" ? dateB - dateA : dateA - dateB;
    });
  }, [reports, search, filter, categoryFilter, sort]);

  const lostCount = reports.filter(
    (report) => report.type === "Lost" && report.status !== "Resolved"
  ).length;

  const foundCount = reports.filter(
    (report) => report.type === "Found" && report.status !== "Resolved"
  ).length;

  const resolvedCount = reports.filter(
    (report) => report.status === "Resolved"
  ).length;

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  }

  function submitReport(event) {
    event.preventDefault();

    const validationErrors = validate(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      showNotice("Please correct the highlighted fields.", "error");
      return;
    }

    const newReport = {
      ...form,
      title: form.title.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
      contact: form.contact.trim(),
      id:
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      status: "Active",
      createdAt: Date.now(),
    };

    setReports((previous) => [newReport, ...previous]);
    setForm(emptyForm);
    setErrors({});

    showNotice(
      `${form.type} item report submitted successfully.`,
      "success"
    );

    document.getElementById("reports")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function toggleStatus(id) {
    const report = reports.find((item) => item.id === id);

    if (!report) return;

    const wasResolved = report.status === "Resolved";

    setReports((previous) =>
      previous.map((item) =>
        item.id === id
          ? {
              ...item,
              status: wasResolved ? "Active" : "Resolved",
            }
          : item
      )
    );

    showNotice(
      wasResolved
        ? "Report reopened successfully."
        : "Report marked as resolved.",
      wasResolved ? "info" : "success"
    );
  }

  function deleteReport(id) {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this report? This action cannot be undone."
    );

    if (!confirmed) return;

    setReports((previous) =>
      previous.filter((item) => item.id !== id)
    );

    showNotice("Report deleted successfully.", "delete");
  }

  function clearFilters() {
    setSearch("");
    setFilter("All");
    setCategoryFilter("All categories");
    setSort("newest");
  }

  function selectFilter(value) {
    setFilter(value);
  }

  return (
    <div className="app">
      {/* Floating notification: outside the form and report cards */}
      {notice && (
        <div
          className={`toast-notification toast-${noticeType}`}
          role="status"
          aria-live="polite"
        >
          <span className="toast-icon" aria-hidden="true">
            {noticeType === "success"
              ? "✓"
              : noticeType === "delete"
              ? "×"
              : noticeType === "error"
              ? "!"
              : "i"}
          </span>

          <span className="toast-message">{notice}</span>

          <button
            type="button"
            className="toast-close"
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#home" aria-label="FoundIt home">
            <span className="brand-icon">F</span>
            <span>
              <span className="brand-name">FoundIt</span>
              <span className="brand-tagline">Lost something? Find it.</span>
            </span>
          </a>

          <nav className="main-nav" aria-label="Main navigation">
            <a className="nav-link" href="#home">
              Home
            </a>
            <a className="nav-link" href="#report-form">
              Report an item
            </a>
            <a className="nav-button" href="#reports">
              Browse reports <span aria-hidden="true">→</span>
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero-section" id="home">
          <div className="hero-content">
            <span className="eyebrow">
              <span className="eyebrow-dot" />
              YOUR CAMPUS LOST-AND-FOUND PORTAL
            </span>

            <h1>
              Lost something?
              <br />
              <span>Let’s find it together.</span>
            </h1>

            <p className="hero-description">
              A simple place to report lost belongings, share items
              you’ve found, and help reunite people with what matters
              to them.
            </p>

            <div className="hero-actions">
              <a className="primary-button" href="#report-form">
                + Report an item
              </a>
              <a className="secondary-button" href="#reports">
                Browse reports <span aria-hidden="true">↓</span>
              </a>
            </div>

            <div className="hero-note">
              <span aria-hidden="true">♡</span>
              Small acts of help make a big difference.
            </div>
          </div>

          <div className="hero-illustration" aria-hidden="true">
            <div className="illustration-circle circle-one" />
            <div className="illustration-circle circle-two" />
            <div className="illustration-card">
              <div className="illustration-top">
                <span className="illustration-logo">F</span>
                <span className="illustration-dots">•••</span>
              </div>
              <div className="illustration-search">
                <span>⌕</span>
                <span>Search for an item...</span>
              </div>
              <div className="illustration-item">
                <span className="illustration-item-icon">🎒</span>
                <span>
                  <strong>Lost backpack</strong>
                  <small>Library · Today</small>
                </span>
                <span className="illustration-check">✓</span>
              </div>
              <div className="illustration-item">
                <span className="illustration-item-icon">🔑</span>
                <span>
                  <strong>Set of keys</strong>
                  <small>College canteen</small>
                </span>
                <span className="illustration-check">✓</span>
              </div>
              <div className="illustration-footer">
                <span />
                Helping things find their way home.
              </div>
            </div>
            <div className="floating-heart">♡</div>
            <div className="floating-sparkle">✦</div>
          </div>
        </section>

        <section className="stats-section" aria-label="Report statistics">
          <div className="stat-card">
            <span className="stat-icon lost-icon">⌕</span>
            <div>
              <span className="stat-label">Items reported lost</span>
              <strong className="stat-number">{lostCount}</strong>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon found-icon">✓</span>
            <div>
              <span className="stat-label">Items found</span>
              <strong className="stat-number">{foundCount}</strong>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon resolved-icon">♡</span>
            <div>
              <span className="stat-label">Reports resolved</span>
              <strong className="stat-number">{resolvedCount}</strong>
            </div>
          </div>
        </section>

        <section className="report-section" id="report-form">
          <div className="section-heading">
            <div>
              <span className="section-kicker">GET STARTED</span>
              <h2>Report an item</h2>
              <p>
                Share a few details to help the right person find their
                belongings.
              </p>
            </div>
            <span className="heading-decoration" aria-hidden="true">
              ✳
            </span>
          </div>

          <div className="form-card">
            <div className="form-card-heading">
              <span className="form-heading-icon" aria-hidden="true">
                +
              </span>
              <div>
                <h3>Create a report</h3>
                <p>Fields marked with * are required.</p>
              </div>
            </div>

            <form onSubmit={submitReport} noValidate>
              <fieldset className="type-fieldset">
                <legend>What would you like to report? *</legend>

                <div className="type-options">
                  <label
                    className={`type-option ${
                      form.type === "Lost" ? "type-option-selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value="Lost"
                      checked={form.type === "Lost"}
                      onChange={updateField}
                    />
                    <span className="type-option-icon" aria-hidden="true">
                      🔎
                    </span>
                    <span className="type-option-copy">
                      <strong>I lost something</strong>
                      <small>Help me find my item</small>
                    </span>
                    <span className="radio-indicator" />
                  </label>

                  <label
                    className={`type-option ${
                      form.type === "Found" ? "type-option-selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value="Found"
                      checked={form.type === "Found"}
                      onChange={updateField}
                    />
                    <span className="type-option-icon" aria-hidden="true">
                      🎁
                    </span>
                    <span className="type-option-copy">
                      <strong>I found something</strong>
                      <small>Help return it to its owner</small>
                    </span>
                    <span className="radio-indicator" />
                  </label>
                </div>
              </fieldset>

              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="title">Item name *</label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    placeholder="e.g. Black wireless earbuds"
                    value={form.title}
                    onChange={updateField}
                    aria-invalid={Boolean(errors.title)}
                  />
                  {errors.title && (
                    <span className="field-error">{errors.title}</span>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="category">Category *</label>
                  <select
                    id="category"
                    name="category"
                    value={form.category}
                    onChange={updateField}
                    aria-invalid={Boolean(errors.category)}
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {categoryIcons[category]} {category}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <span className="field-error">{errors.category}</span>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="location">
                    {form.type === "Lost"
                      ? "Where did you last see it? *"
                      : "Where did you find it? *"}
                  </label>
                  <input
                    id="location"
                    name="location"
                    type="text"
                    placeholder="e.g. Central library, second floor"
                    value={form.location}
                    onChange={updateField}
                    aria-invalid={Boolean(errors.location)}
                  />
                  {errors.location && (
                    <span className="field-error">{errors.location}</span>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="date">
                    {form.type === "Lost" ? "Date lost *" : "Date found *"}
                  </label>
                  <input
                    id="date"
                    name="date"
                    type="date"
                    max={today()}
                    value={form.date}
                    onChange={updateField}
                    aria-invalid={Boolean(errors.date)}
                  />
                  {errors.date && (
                    <span className="field-error">{errors.date}</span>
                  )}
                </div>

                <div className="form-field form-field-full">
                  <label htmlFor="description">Description *</label>
                  <textarea
                    id="description"
                    name="description"
                    rows="4"
                    placeholder="Describe the item, including its colour, brand, distinguishing marks, or other helpful details..."
                    value={form.description}
                    onChange={updateField}
                    aria-invalid={Boolean(errors.description)}
                  />
                  {errors.description && (
                    <span className="field-error">
                      {errors.description}
                    </span>
                  )}
                </div>

                <div className="form-field form-field-full">
                  <label htmlFor="contact">Contact email *</label>
                  <input
                    id="contact"
                    name="contact"
                    type="email"
                    placeholder="you@example.com"
                    value={form.contact}
                    onChange={updateField}
                    aria-invalid={Boolean(errors.contact)}
                  />
                  {errors.contact && (
                    <span className="field-error">{errors.contact}</span>
                  )}
                  <span className="field-hint">
                    {form.type === "Lost"
                      ? "Enter your email so someone who finds your item can contact you."
                      : "Enter your email so the item's owner can contact you."}
                  </span>
                </div>
              </div>

              <div className="form-footer">
                <p>
                  <span aria-hidden="true">🔒</span> Your contact details
                  will be visible on this report.
                </p>
                <button type="submit" className="primary-button submit-button">
                  Submit report <span aria-hidden="true">→</span>
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="reports-section" id="reports">
          <div className="section-heading reports-heading">
            <div>
              <span className="section-kicker">COMMUNITY BOARD</span>
              <h2>Browse reports</h2>
              <p>
                Search reports to see whether someone has found your item
                or reported something similar.
              </p>
            </div>
            <button
              type="button"
              className="export-button"
              onClick={() => exportReports(filteredReports)}
            >
              <span aria-hidden="true">↓</span> Export CSV
            </button>
          </div>

          <div className="reports-toolbar">
            <div className="search-box">
              <span className="search-icon" aria-hidden="true">
                ⌕
              </span>
              <input
                type="search"
                aria-label="Search reports"
                placeholder="Search item, category, location..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="clear-search"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <div className="filter-controls">
              <label className="filter-select">
                <span>Category</span>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  aria-label="Filter by category"
                >
                  <option>All categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-select">
                <span>Sort by</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  aria-label="Sort reports"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </label>
            </div>
          </div>

          <div className="report-tabs" role="group" aria-label="Report type">
            {["All", "Lost", "Found", "Resolved"].map((option) => (
              <button
                key={option}
                type="button"
                className={`report-tab ${
                  filter === option ? "report-tab-active" : ""
                }`}
                onClick={() => selectFilter(option)}
                aria-pressed={filter === option}
              >
                {option}
                {option === "All" && (
                  <span className="tab-count">{reports.length}</span>
                )}
              </button>
            ))}

            <button
              type="button"
              className="clear-filters-button"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>

          <div className="results-summary" aria-live="polite">
            <span>
              Showing <strong>{filteredReports.length}</strong>{" "}
              {filteredReports.length === 1 ? "report" : "reports"}
            </span>
            <span className="results-summary-note">
              Reports saved in this browser
            </span>
          </div>

          {filteredReports.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon" aria-hidden="true">
                🔎
              </span>
              <h3>
                {reports.length === 0
                  ? "No reports yet"
                  : "No matching reports"}
              </h3>
              <p>
                {reports.length === 0
                  ? "Be the first to report a lost or found item."
                  : "Try another search term or clear your filters."}
              </p>
              {reports.length === 0 ? (
                <a className="primary-button" href="#report-form">
                  Create the first report
                </a>
              ) : (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="reports-grid">
              {filteredReports.map((report) => (
                <article className="report-card" key={report.id}>
                  <div className="report-card-top">
                    <span
                      className={`report-type-badge ${
                        report.type === "Lost" ? "badge-lost" : "badge-found"
                      }`}
                    >
                      {report.type === "Lost" ? "⌕" : "✓"} {report.type}
                    </span>

                    <span
                      className={`status-badge ${
                        report.status === "Resolved"
                          ? "status-resolved"
                          : "status-active"
                      }`}
                    >
                      <span className="status-dot" />
                      {report.status}
                    </span>
                  </div>

                  <div className="report-title-row">
                    <span className="report-category-icon" aria-hidden="true">
                      {categoryIcons[report.category] || "📦"}
                    </span>
                    <h3>{report.title}</h3>
                  </div>

                  <p className="report-description">{report.description}</p>

                  <div className="report-metadata">
                    <div className="metadata-row">
                      <span className="metadata-icon" aria-hidden="true">
                        ⌖
                      </span>
                      <span>{report.location}</span>
                    </div>
                    <div className="metadata-row">
                      <span className="metadata-icon" aria-hidden="true">
                        ▦
                      </span>
                      <span>{report.category}</span>
                    </div>
                    <div className="metadata-row">
                      <span className="metadata-icon" aria-hidden="true">
                        ◷
                      </span>
                      <span>{formatDate(report.date)}</span>
                    </div>
                  </div>

                  <div className="report-contact">
                    <span className="contact-label">
                      {report.type === "Lost"
                        ? "Contact reporter"
                        : "Contact finder"}
                    </span>
                    <span className="contact-email">{report.contact}</span>
                  </div>

                  <div className="card-actions">
                    <button
                      type="button"
                      className={`action-button ${
                        report.status === "Resolved"
                          ? "reopen-action"
                          : "resolve-action"
                      }`}
                      onClick={() => toggleStatus(report.id)}
                      aria-label={
                        report.status === "Resolved"
                          ? `Reopen report: ${report.title}`
                          : `Mark report as resolved: ${report.title}`
                      }
                    >
                      <span aria-hidden="true">
                        {report.status === "Resolved" ? "↻" : "✓"}
                      </span>
                      {report.status === "Resolved"
                        ? "Reopen report"
                        : "Mark as resolved"}
                    </button>

                    <button
                      type="button"
                      className="action-button delete-action"
                      onClick={() => deleteReport(report.id)}
                      aria-label={`Delete report: ${report.title}`}
                    >
                      <span aria-hidden="true">⌫</span>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <a className="brand footer-brand" href="#home">
            <span className="brand-icon">F</span>
            <span>
              <span className="brand-name">FoundIt</span>
              <span className="brand-tagline">Lost something? Find it.</span>
            </span>
          </a>
          <p>Made with care for a more helpful campus community.</p>
          <a className="back-to-top" href="#home">
            Back to top ↑
          </a>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} FoundIt · Campus lost-and-found portal
        </div>
      </footer>
    </div>
  );
}

export default App;
