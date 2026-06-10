# Login Structure

Use this when creating a login page in a new project that should match the OCS
Portal theme. The login screen is a centered Bootstrap card split into two
columns:

- Left column: branded green banner with badge, page title, and short
  description.
- Right column: welcome text, sign-in provider, error area, and account note.

## Required Head Setup

Load Bootstrap first, then the login provider script if needed, then the theme
CSS.

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Project Portal - Login</title>

  <link
    href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
    rel="stylesheet"
  />

  <!-- Only needed when using Google Sign-In. -->
  <script src="https://accounts.google.com/gsi/client" async defer></script>

  <link href="ocs-theme/ocs-theme.css" rel="stylesheet" />
</head>
```

## Required Body Structure

Use `ocs-login-page` on the body. This applies the full-height soft background
and system font stack.

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

                <h1 class="ocs-portal-title mb-3">Project Portal</h1>
                <p class="ocs-portal-subtitle mb-0">
                  Access your records and submissions.
                </p>
              </div>
            </div>

            <div class="col-lg-7">
              <div class="ocs-login-content">
                <div class="mb-4 text-center text-lg-start">
                  <h2 class="ocs-welcome-title mb-2">Welcome</h2>
                  <p class="ocs-welcome-text mb-0">Sign in to continue.</p>
                </div>

                <div id="login-section" class="ocs-signin-box">
                  <!-- Sign-in provider goes here. -->
                </div>

                <div id="login-error-section" class="d-none mt-3">
                  <div class="alert alert-danger rounded-4 mb-0" id="login-error-message">
                    Unable to continue.
                  </div>
                </div>

                <div class="ocs-note-box mt-4">
                  Use the account linked to your record.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
```

## Google Sign-In Block

Place this inside `#login-section` when the project uses Google Sign-In.
Replace `YOUR_GOOGLE_CLIENT_ID` and make sure the callback function exists in
your login JavaScript.

```html
<div
  id="g_id_onload"
  data-client_id="YOUR_GOOGLE_CLIENT_ID"
  data-callback="handleCredentialResponse"
  data-auto_prompt="false"
></div>

<div class="d-flex justify-content-center justify-content-lg-start">
  <div
    class="g_id_signin"
    data-type="standard"
    data-size="large"
    data-theme="outline"
    data-text="sign_in_with"
    data-shape="pill"
    data-logo_alignment="left"
    data-width="280"
  ></div>
</div>
```

## Script Order

Put app scripts at the end of the body. Load libraries before the project's
login script.

```html
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="login.js"></script>
```

If the new project does not use jQuery or Supabase, remove those scripts and
keep only the login script that handles the chosen authentication provider.

## Class Reference

- `ocs-login-page`: full-page login background and font.
- `ocs-login-wrapper`: vertically centers the login card.
- `ocs-login-card`: white rounded card with soft shadow.
- `ocs-login-banner`: green branded left panel.
- `ocs-login-badge`: small pill label in the banner.
- `ocs-portal-title`: main product or portal name.
- `ocs-portal-subtitle`: short supporting description.
- `ocs-login-content`: right-side content padding.
- `ocs-welcome-title`: right-side heading.
- `ocs-welcome-text`: right-side supporting copy.
- `ocs-signin-box`: framed area for the authentication provider.
- `ocs-note-box`: muted helper note under the sign-in area.

## Current Project Compatibility

The theme CSS also supports the older class names from this project:

| New class | Compatible old class |
| --- | --- |
| `ocs-login-wrapper` | `login-wrapper` |
| `ocs-login-card` | `login-card` |
| `ocs-login-banner` | `login-banner` |
| `ocs-login-badge` | `login-badge` |
| `ocs-portal-title` | `portal-title` |
| `ocs-portal-subtitle` | `portal-subtitle` |
| `ocs-login-content` | `login-content` |
| `ocs-welcome-title` | `welcome-title` |
| `ocs-welcome-text` | `welcome-text` |
| `ocs-signin-box` | `signin-box` |
| `ocs-note-box` | `note-box` |

For new projects, prefer the `ocs-*` classes so the theme remains isolated from
project-specific styles.

