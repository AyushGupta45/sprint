// auth.js - login/signup/session/role-guard

function login(email, password) {
  const users = DB.get("users");
  const user = users.find(
    (u) =>
      u.email.toLowerCase() === email.toLowerCase() && u.password === password,
  );
  if (!user) return null;
  sessionStorage.setItem("currentUser", JSON.stringify(user));
  return user;
}

function logout() {
  sessionStorage.removeItem("currentUser");
  window.location.href = "../index.html";
}

function getCurrentUser() {
  const raw = sessionStorage.getItem("currentUser");
  return raw ? JSON.parse(raw) : null;
}

// Redirect to login if not authenticated; optionally restrict to allowedRoles
function requireAuth(allowedRoles) {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "../index.html";
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    alert("You do not have access to this page.");
    window.location.href = "dashboard.html";
    return null;
  }
  return user;
}

// Student self-registration (US-001)
function signupStudent({ name, email, phone, password, dob, gender, address }) {
  const users = DB.get("users");
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, message: "Email already registered." };
  }
  const student = DB.add("students", {
    name,
    email,
    phone,
    dob,
    gender,
    address,
    notes: "",
    status: "Active",
  });
  const user = DB.add("users", {
    name,
    email,
    phone,
    password,
    role: "student",
    studentId: student.id,
  });
  return { success: true, user };
}
