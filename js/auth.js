// auth.js - login/signup/session/role-guard

function generatePassword() {
  var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var pwd = '';
  for (var i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

function login(email, password) {
  const users = DB.get("users");
  // Check if email exists at all
  var matchedEmail = users.find(function (u) {
    return u.email.toLowerCase() === email.toLowerCase();
  });
  if (!matchedEmail) return null;
  // Check password
  var user = users.find(function (u) {
    return u.email.toLowerCase() === email.toLowerCase() && u.password === password;
  });
  if (!user) return null;
  // Block inactive accounts
  if (user.status === 'Inactive') {
    return { blocked: true, message: 'Your account has been deactivated. Contact admin.' };
  }
  sessionStorage.setItem("currentUser", JSON.stringify(user));
  return user;
}

function logout() {
  sessionStorage.removeItem("currentUser");
  var isInPages = window.location.pathname.indexOf('/pages/') !== -1;
  window.location.href = isInPages ? 'login.html' : 'pages/login.html';
}

function getCurrentUser() {
  const raw = sessionStorage.getItem("currentUser");
  return raw ? JSON.parse(raw) : null;
}

// Redirect to login if not authenticated; optionally restrict to allowedRoles
function requireAuth(allowedRoles) {
  var isInPages = window.location.pathname.indexOf('/pages/') !== -1;
  var loginUrl = isInPages ? 'login.html' : 'pages/login.html';
  var user = getCurrentUser();
  if (!user) {
    window.location.href = loginUrl;
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (window.showAlertModal) {
      window.showAlertModal("Access Denied", "You do not have access to this page.", "error", () => {
        window.location.href = "dashboard.html";
      });
    } else {
      alert("You do not have access to this page.");
      window.location.href = "dashboard.html";
    }
    return null;
  }
  return user;
}

// Handle bfcache restore — if user navigates back after logout, re-check auth
window.addEventListener('pageshow', function (event) {
  if (event.persisted) {
    var u = getCurrentUser();
    if (!u) {
      var inPages = window.location.pathname.indexOf('/pages/') !== -1;
      window.location.href = inPages ? 'login.html' : 'pages/login.html';
    }
  }
});

// Student self-registration (US-001)
function signupStudent({ name, email, phone, password, dob, gender, address }) {
  const users = DB.get("users");
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, message: "Email already registered." };
  }
  var user = DB.add("users", {
    name,
    email,
    phone,
    password,
    role: "student",
  });
  var student = DB.add("students", {
    userId: user.id,
    name,
    email,
    phone,
    dob,
    gender,
    address,
    emergencyName: "",
    emergencyPhone: "",
    notes: "",
    status: "Active",
  });
  DB.update("users", user.id, { studentId: student.id });
  return { success: true, user };
}
