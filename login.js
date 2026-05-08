let loggedInUser = null;

function handleCredentialResponse(response) {
  try {
    const userData = parseJwt(response.credential);

    loggedInUser = {
      email: userData.email || "",
      name: userData.name || "",
      picture: userData.picture || "",
    };

    if (!loggedInUser.email) {
      showLoginError("Unable to get your Google email.");
      return;
    }

    sessionStorage.setItem("student_portal_user", JSON.stringify(loggedInUser));

    window.location.href = "portal.html";
  } catch (error) {
    console.error("Login error:", error);
    showLoginError("Failed to sign in. Please try again.");
  }
}

function parseJwt(token) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join("")
  );

  return JSON.parse(jsonPayload);
}

function getStoredUser() {
  try {
    const raw = sessionStorage.getItem("student_portal_user");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function showLoginError(message) {
  $("#login-error-message").text(message || "Unable to continue.");
  $("#login-error-section").removeClass("d-none");
}

$(document).ready(function () {
  if (window.PORTAL_AVAILABLE === false) return;

  const storedUser = getStoredUser();

  if (storedUser && storedUser.email) {
    window.location.href = "portal.html";
  }
});
