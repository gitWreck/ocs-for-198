# OCS Portal Theme

Portable theme files for projects that should look like the FOR 198 HI Portal.
Copy this `ocs-theme` folder into a new project and load `ocs-theme.css` after
Bootstrap.

## Dependencies

Use these before the theme CSS:

```html
<link
  href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
  rel="stylesheet"
/>
<link
  href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
  rel="stylesheet"
/>
```

Optional, only when using DataTables:

```html
<link
  href="https://cdn.datatables.net/1.13.8/css/dataTables.bootstrap5.min.css"
  rel="stylesheet"
/>
```

Then add the theme:

```html
<link href="ocs-theme/ocs-theme.css" rel="stylesheet" />
```

## Theme Character

- Primary palette: CFNR green `#04543c` and maroon `#8b1539`.
- Backgrounds: very light green/maroon page gradients, white content cards.
- Components: Bootstrap-compatible cards, buttons, badges, modals, tables, and
  login layout.
- Shape: soft rounded cards around `1rem` to `1.5rem`, pill badges/buttons for
  compact labels.
- Shadows: subtle blue-gray shadows for cards and raised action buttons.

## Core Classes

Use these classes with Bootstrap markup:

```html
<body class="ocs-app">
  <nav class="navbar navbar-expand-lg ocs-navbar shadow-sm">
    <div class="container-fluid px-4 px-xxl-5">
      <span class="navbar-brand">Project Portal</span>
      <button class="btn btn-sm ocs-btn-logout" type="button">
        <i class="bi bi-box-arrow-right"></i>
        <span class="ocs-btn-logout-label">Logout</span>
      </button>
    </div>
  </nav>

  <main class="container-fluid px-4 px-xxl-5 py-4 py-lg-5">
    <section class="card ocs-hero-card rounded-4 shadow-sm mb-4">
      <div class="card-body p-4 p-lg-5">
        <h1 class="h3 fw-bold mb-2">Portal Title</h1>
        <p class="mb-0 opacity-75">Short page description.</p>
      </div>
    </section>

    <section class="card ocs-card">
      <div class="card-body p-4">
        <div class="ocs-section-title mb-1">Section Title</div>
        <div class="ocs-section-subtitle mb-4">Supporting text</div>

        <div class="mb-3">
          <div class="ocs-info-label">Label</div>
          <div class="ocs-info-value">Value</div>
        </div>

        <button class="btn ocs-btn-primary">Primary Action</button>
        <button class="btn ocs-btn-secondary">Secondary Action</button>
      </div>
    </section>
  </main>
</body>
```

For login pages, see [LOGIN_STRUCTURE.md](LOGIN_STRUCTURE.md) for the full
page structure, script order, and Google Sign-In notes. Basic structure:

```html
<body class="ocs-login-page">
  <div class="container">
    <div class="row justify-content-center align-items-center ocs-login-wrapper py-4 py-md-5">
      <div class="col-12 col-lg-10 col-xl-9">
        <div class="card ocs-login-card">
          <div class="row g-0">
            <div class="col-lg-5 d-flex">
              <div class="ocs-login-banner w-100">
                <div class="ocs-login-badge mb-3">Student Access Portal</div>
                <h1 class="ocs-portal-title mb-3">Portal Name</h1>
                <p class="ocs-portal-subtitle mb-0">Short description.</p>
              </div>
            </div>
            <div class="col-lg-7">
              <div class="ocs-login-content">
                <h2 class="ocs-welcome-title mb-2">Welcome</h2>
                <p class="ocs-welcome-text">Sign in to continue.</p>
                <div class="ocs-signin-box">Login provider goes here.</div>
                <div class="ocs-note-box mt-4">Use your registered account.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
```

For API setup, see [API_STRUCTURE.md](API_STRUCTURE.md). It documents the
frontend-to-API contract and the Apps Script response shape needed by the theme
and portal components.

## Customization

Change colors and spacing by overriding CSS variables after loading the theme:

```html
<style>
  :root {
    --ocs-green: #04543c;
    --ocs-maroon: #8b1539;
    --ocs-radius-card: 1.25rem;
  }
</style>
```

The file also includes aliases for the current project's variable/class names:
`--portal-*`, `--brand-*`, `.portal-card`, `.btn-portal-primary`,
`.login-card`, and related classes.
