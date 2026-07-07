// app.js - Shared shell: topbar + role-based sidebar + notification bell
const NAV_ITEMS = {
  admin: [
    { label: "Dashboard", href: "dashboard.html", icon: "space_dashboard" },
    { label: "Students", href: "students.html", icon: "group" },
    { label: "Courses", href: "courses.html", icon: "menu_book" },
    {
      label: "Enrollments",
      href: "enrollments.html",
      icon: "assignment_turned_in",
    },
    { label: "Fees & Payments", href: "fees-payments.html", icon: "payments" },
    { label: "Reports", href: "reports.html", icon: "bar_chart" },
  ],
  faculty: [
    { label: "Dashboard", href: "dashboard.html", icon: "space_dashboard" },
    { label: "Students", href: "students.html", icon: "group" },
    { label: "Courses", href: "courses.html", icon: "menu_book" },
    {
      label: "Enrollments",
      href: "enrollments.html",
      icon: "assignment_turned_in",
    },
  ],
  student: [
    { label: "Dashboard", href: "dashboard.html", icon: "space_dashboard" },
    { label: "Course Catalog", href: "courses.html", icon: "menu_book" },
    {
      label: "My Enrollments",
      href: "enrollments.html",
      icon: "assignment_turned_in",
    },
    { label: "Fees & Payments", href: "fees-payments.html", icon: "payments" },
  ],
};

function renderShell(activePage) {
  const user = requireAuth();
  if (!user) return;

  const shell = document.getElementById("app-shell");
  if (!shell) return;

  const items = NAV_ITEMS[user.role] || [];
  const navHtml = items
    .map(
      (item) => `
    <a href="${item.href}" class="nav-item ${activePage === item.href ? "nav-item-active" : ""}">
      <span class="material-icons nav-icon">${item.icon}</span>
      <span class="nav-label">${item.label}</span>
    </a>
  `,
    )
    .join("");

  shell.innerHTML = `
    <header class="topbar">
      <div class="topbar-brand">
        <span class="material-icons brand-icon">school</span>
        <span class="brand-name">EduTrack</span>
      </div>
      <div class="topbar-right">
        <div class="notif-wrapper">
          <button id="notifBtn" class="icon-btn">
            <span class="material-icons">notifications</span>
            <span id="notifBadge" class="badge hidden">0</span>
          </button>
          <div id="notifDropdown" class="notif-dropdown hidden"></div>
        </div>
      </div>
    </header>
    <div class="app-body">
      <aside class="sidebar">
        <nav class="sidebar-nav">${navHtml}</nav>
        <button id="logoutBtn" type="button" class="user-chip">
          <div class="user-avatar">
            <span class="material-icons">person</span>
          </div>

          <div class="user-info">
            <span class="user-name">${user.name}</span>
            <span class="role-pill role-${user.role}">
              ${user.role.toUpperCase()}
            </span>
          </div>

          <span class="material-icons user-arrow">logout</span>
        </button>
      </aside>
      <main class="main-content" id="main-content"></main>
    </div>
  `;

  document.getElementById("logoutBtn").addEventListener("click", logout);
  setupNotifications(user);
  return user;
}

function setupNotifications(user) {
  const btn = document.getElementById("notifBtn");
  const dropdown = document.getElementById("notifDropdown");
  const badge = document.getElementById("notifBadge");

  function refresh() {
    const all = DB.get("notifications").filter(
      (n) => n.userId === user.id || n.userId === "all",
    );
    const unread = all.filter((n) => !n.read).length;
    badge.textContent = unread;
    badge.classList.toggle("hidden", unread === 0);
    dropdown.innerHTML = all.length
      ? all
          .slice()
          .reverse()
          .map(
            (n) => `
          <div class="notif-item ${n.read ? "notif-read" : "notif-unread"}" data-id="${n.id}">
            <span class="material-icons notif-icon">${n.type === "alert" ? "warning" : "info"}</span>
            <div class="notif-text">
              <p>${n.message}</p>
              <span class="notif-time">${new Date(n.timestamp).toLocaleString()}</span>
            </div>
          </div>
        `,
          )
          .join("")
      : `<div class="notif-empty">No notifications</div>`;

    dropdown.querySelectorAll(".notif-item").forEach((el) => {
      el.addEventListener("click", () => {
        DB.update("notifications", el.dataset.id, { read: true });
        refresh();
      });
    });
  }

  btn.addEventListener("click", () => {
    dropdown.classList.toggle("hidden");
    refresh();
  });
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  });
  refresh();
}

function pushNotification(userId, message, type = "info") {
  DB.add("notifications", {
    userId,
    message,
    type,
    read: false,
    timestamp: new Date().toISOString(),
  });
}

function formatCurrency(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

function formatDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN");
}

function statusPill(status) {
  const map = {
    Active: "pill-green",
    Paid: "pill-green",
    Enrolled: "pill-green",
    Pending: "pill-amber",
    Waitlisted: "pill-blue",
    "Due Soon": "pill-amber",
    Overdue: "pill-red",
    Cancelled: "pill-red",
    Completed: "pill-gray",
  };
  return `<span class="pill ${map[status] || "pill-gray"}">${status}</span>`;
}
