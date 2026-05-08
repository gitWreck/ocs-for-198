(function () {
  if (window.PORTAL_AVAILABLE !== false) return;

  document.title = "FOR 198 HI Portal - Temporarily Unavailable";
  sessionStorage.removeItem("student_portal_user");

  document.addEventListener("DOMContentLoaded", function () {
    document.body.innerHTML = `
      <main class="maintenance-page" aria-labelledby="maintenance-title">
        <div class="maintenance-banner" aria-hidden="true"></div>
        <section class="maintenance-content">
          <img class="maintenance-logo" src="CFNR-logo-final.png" alt="CFNR logo" />
          <div class="maintenance-status">Temporary Pause</div>
          <h1 id="maintenance-title">FOR 198 HI Portal is currently unavailable</h1>
          <p>
            Access to the portal has been temporarily paused while updates are
            being handled. Please check back later for availability.
          </p>
          <p class="maintenance-note">
            For urgent internship concerns, please contact the FOR 198 coordinator
            or the CFNR office through the usual official channels.
          </p>
        </section>
      </main>
    `;

    const style = document.createElement("style");
    style.textContent = `
      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        display: grid;
        place-items: center;
        min-height: 100vh;
        padding: 24px;
        background:
          linear-gradient(135deg, rgba(4, 84, 60, 0.08), transparent 42%),
          linear-gradient(315deg, rgba(139, 21, 57, 0.08), transparent 40%),
          #f6f8f5;
        color: #1f2937;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system,
          BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .maintenance-page {
        width: min(100%, 680px);
        border: 1px solid #dbe4dc;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 24px 70px rgba(15, 23, 42, 0.1);
        overflow: hidden;
      }

      .maintenance-banner {
        min-height: 12px;
        background: linear-gradient(90deg, #8b1539, #04543c);
      }

      .maintenance-content {
        padding: clamp(28px, 6vw, 52px);
        text-align: center;
      }

      .maintenance-logo {
        width: 88px;
        height: 88px;
        object-fit: contain;
        margin-bottom: 24px;
      }

      .maintenance-status {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 32px;
        padding: 6px 12px;
        border: 1px solid rgba(4, 84, 60, 0.2);
        border-radius: 999px;
        background: rgba(4, 84, 60, 0.08);
        color: #033b2a;
        font-size: 0.82rem;
        font-weight: 700;
        line-height: 1.2;
      }

      .maintenance-content h1 {
        margin: 18px 0 12px;
        color: #033b2a;
        font-size: clamp(2rem, 5vw, 3rem);
        line-height: 1.08;
        letter-spacing: 0;
      }

      .maintenance-content p {
        margin: 0 auto;
        max-width: 560px;
        color: #64748b;
        font-size: clamp(1rem, 2.4vw, 1.125rem);
        line-height: 1.65;
      }

      .maintenance-note {
        margin-top: 28px !important;
        padding-top: 22px;
        border-top: 1px solid #dbe4dc;
        color: #475569 !important;
        font-size: 0.95rem !important;
      }

      @media (max-width: 520px) {
        body {
          padding: 16px;
        }

        .maintenance-logo {
          width: 72px;
          height: 72px;
        }
      }
    `;
    document.head.appendChild(style);
  });
})();
