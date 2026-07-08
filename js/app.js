// app.js - Shared shell: topbar + role-based sidebar + notification bell
const NAV_ITEMS = {
  admin: [
    { label: "Dashboard", href: "dashboard.html", icon: "space_dashboard" },
    { label: "Students", href: "students.html", icon: "group" },
    { label: "Faculty", href: "students.html#faculty", icon: "badge" },
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
    { label: "My Profile", href: "students.html", icon: "person" },
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
    <div style="display:flex; flex-direction:column; height:100vh; overflow:hidden;">
      <div style="display:flex; flex:1; overflow:hidden;">
        <!-- SIDEBAR (Full height) -->
        <aside class="sidebar" style="height:100vh; flex-shrink:0;">
          <div class="sidebar-brand" style="display:flex; align-items:center; justify-content:center; gap:0.5rem; height:var(--topbar-height); padding:0 0.5rem; margin-bottom:1rem;">
            <span class="material-icons brand-icon" style="color:hsl(var(--primary)); font-size:2rem;">school</span>
            <div style="font-weight:800; font-size:1.75rem; letter-spacing:-0.03em; margin-left:0.25rem;"><span style="color:hsl(var(--primary));">Edu</span><span style="color:#ffffff;">Track</span></div>
          </div>
          <nav class="sidebar-nav">${navHtml}</nav>
          <div class="sidebar-footer" style="padding-top:1rem; border-top:1px solid rgba(255,255,255,0.08); display:flex; flex-direction:column; gap:0.75rem; margin-top:auto;">
            <div class="user-chip" style="cursor:default;">
              <div class="user-avatar">
                <span class="material-icons">person</span>
              </div>
              <div class="user-info">
                <span class="user-name">${user.name}</span>
                <span class="role-pill role-${user.role}">
                  ${user.role.toUpperCase()}
                </span>
              </div>
            </div>
            <button id="logoutBtn" type="button" style="display:flex; align-items:center; justify-content:center; gap:0.5rem; width:100%; padding:0.75rem 0.75rem; margin-top:0.25rem; background:transparent; border:none; border-top:1px solid rgba(255,255,255,0.08); color:rgba(255,255,255,0.6); cursor:pointer; font-size:0.8125rem; font-weight:500; border-radius:0 0 var(--radius) var(--radius); transition:all 0.15s;" onmouseover="this.style.backgroundColor=\\'rgba(255,255,255,0.05)\\'; this.style.color=\\'#ffffff\\'" onmouseout="this.style.backgroundColor=\\'transparent\\'; this.style.color=\\'rgba(255,255,255,0.6)\\'">
              <span class="material-icons" style="font-size:1.25rem; color:hsl(var(--warning));">logout</span>
              <span style="color:hsl(var(--warning));">Logout</span>
            </button>
          </div>
        </aside>

        <!-- RIGHT SIDE (Topbar + Main) -->
        <div style="flex:1; display:flex; flex-direction:column; min-width:0; background:hsl(var(--background));">
          <header class="topbar" style="border-bottom:1px solid hsl(var(--border)); height:var(--topbar-height); display:flex; align-items:center; padding:0 1.5rem; justify-content:space-between; background:hsl(var(--card)); box-shadow:none;">
            <div class="topbar-center" style="flex:1; display:flex; justify-content:start;">
              <div class="global-search" style="position:relative; width:100%; max-width:450px;">
                <span class="material-icons" style="position:absolute; left:0.875rem; top:50%; transform:translateY(-50%); color:hsl(var(--muted-foreground)); font-size:1.125rem; pointer-events:none;">search</span>
                <input type="text" placeholder="Search courses, students, or invoices..." class="form-control" style="padding-left:2.5rem; border-radius:10px; background-color:hsl(var(--secondary)); border-color:hsl(var(--border)); height:36px; font-size:0.8125rem; transition:all 0.2s;" onfocus="this.style.backgroundColor=\\'hsl(var(--background))\\'; this.style.borderColor=\\'hsl(var(--ring))\\'" onblur="this.style.backgroundColor=\\'hsl(var(--secondary))\\'; this.style.borderColor=\\'hsl(var(--border))\\'" onkeydown="if(event.key === \\'Enter\\') showToast(\\'Search feature coming soon in v2.0\\', \\'info\\')">
              </div>
            </div>
            <div class="topbar-right" style="display:flex; align-items:center; gap:1rem;">
              <div class="notif-wrapper">
                <button id="notifBtn" class="icon-btn">
                  <span class="material-icons">notifications</span>
                  <span id="notifBadge" class="badge hidden">0</span>
                </button>
                <div id="notifDropdown" class="notif-dropdown hidden"></div>
              </div>
            </div>
          </header>
          <main class="main-content" id="main-content" style="flex:1; overflow-y:auto;"></main>
        </div>
      </div>
    </div>
  `;

  document.getElementById("logoutBtn").addEventListener("click", function () {
    showConfirmModal("Logout", "Are you sure you want to logout?", () => {
      logout();
    });
  });
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

function formatInvoiceRef(e) {
  if (!e || !e.id) return "-";
  const numPart = String(e.id).replace(/\D/g, "");
  const year = e.enrollDate ? new Date(e.enrollDate).getFullYear() : new Date().getFullYear();
  return `INV-${year}-${numPart.padStart(4, "0")}`;
}

function formatReceiptRef(p) {
  if (!p || !p.id) return "-";
  const numPart = String(p.id).replace(/\D/g, "");
  const year = p.date ? new Date(p.date).getFullYear() : new Date().getFullYear();
  return `RCPT-${year}-${numPart.padStart(4, "0")}`;
}

function renderPagination(containerId, totalItems, currentPage, itemsPerPage = 6, onPageChange) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const current = Math.max(1, Math.min(currentPage, totalPages));

  const startIdx = totalItems === 0 ? 0 : (current - 1) * itemsPerPage + 1;
  const endIdx = Math.min(current * itemsPerPage, totalItems);

  let buttonsHtml = "";
  
  // Previous Button
  buttonsHtml += `
    <button class="btn btn-secondary btn-sm" ${current === 1 ? "disabled" : ""} id="${containerId}-prev" type="button">
      <span class="material-icons" style="font-size:1rem;vertical-align:middle;margin-right:2px">chevron_left</span>Prev
    </button>
  `;

  // Numbered pages
  for (let i = 1; i <= totalPages; i++) {
    buttonsHtml += `
      <button class="btn ${i === current ? "btn-primary" : "btn-secondary"} btn-sm pagination-num-btn" data-page="${i}" type="button">
        ${i}
      </button>
    `;
  }

  // Next Button
  buttonsHtml += `
    <button class="btn btn-secondary btn-sm" ${current === totalPages ? "disabled" : ""} id="${containerId}-next" type="button">
      Next<span class="material-icons" style="font-size:1rem;vertical-align:middle;margin-left:2px">chevron_right</span>
    </button>
  `;

  container.innerHTML = `
    <div class="pagination-container" style="display:flex;justify-content:space-between;align-items:center;margin-top:1rem;padding:0.5rem 0;flex-wrap:wrap;gap:0.75rem">
      <div class="pagination-info" style="font-size:0.8125rem;color:hsl(var(--muted-foreground))">
        Showing ${startIdx}–${endIdx} of ${totalItems} results
      </div>
      <div class="pagination-actions" style="display:flex;gap:0.25rem;align-items:center">
        ${buttonsHtml}
      </div>
    </div>
  `;

  // Event handlers
  const prevBtn = document.getElementById(`${containerId}-prev`);
  if (prevBtn) {
    prevBtn.addEventListener("click", () => onPageChange(current - 1));
  }
  const nextBtn = document.getElementById(`${containerId}-next`);
  if (nextBtn) {
    nextBtn.addEventListener("click", () => onPageChange(current + 1));
  }

  container.querySelectorAll(".pagination-num-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const page = Number(e.currentTarget.dataset.page);
      onPageChange(page);
    });
  });
}

function syncWaitlistForCourse(courseId) {
  var course = DB.getById('courses', courseId);
  if (!course) return;
  var activeCount = DB.get('enrollments').filter(function (e) {
    return e.courseId === courseId && e.status !== 'Cancelled';
  }).length;
  if (activeCount < course.capacity) {
    var waitlist = DB.get('waitlist')
      .filter(function (w) { return w.courseId === courseId; })
      .sort(function (a, b) { return a.position - b.position; });
    if (waitlist.length) {
      promoteWaitlistEntryGlobal(waitlist[0]);
    }
  }
}

function promoteWaitlistEntryGlobal(w) {
  var course = DB.getById('courses', w.courseId);
  DB.add('enrollments', {
    studentId: w.studentId,
    courseId: w.courseId,
    enrollDate: new Date().toISOString(),
    status: 'Active',
    totalFee: course.fee,
    paidAmount: 0,
  });
  DB.remove('waitlist', w.id);
  var studentUser = DB.get('users').find(function (u) { return u.studentId === w.studentId; });
  if (studentUser)
    pushNotification(
      studentUser.id,
      'Good news! You have been promoted from waitlist to ' + course.name + '.',
      'info'
    );
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
    Completed: "pill-gray",
  };
  return `<span class="pill ${map[status] || "pill-gray"}">${status}</span>`;
}

// ============================================================================
// Global UI Components (Toast & Custom Modals)
// ============================================================================

document.addEventListener("DOMContentLoaded", function() {
  if (!document.getElementById("toast-container")) {
    const toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  if (!document.getElementById("globalConfirmModal")) {
    const modalHtml = `
      <div id="globalConfirmModal" class="modal-overlay hidden" style="z-index: 9999;">
        <div class="modal-box" style="max-width: 400px; text-align: center; padding: 2rem;">
          <h3 id="gConfirmTitle" style="margin-bottom: 0.5rem; font-size: 1.25rem;">Confirm</h3>
          <p id="gConfirmMsg" style="color: hsl(var(--muted-foreground)); margin-bottom: 1.5rem; font-size: 0.875rem;"></p>
          <div style="display: flex; gap: 1rem; justify-content: center;">
            <button id="gConfirmCancelBtn" class="btn btn-secondary">Cancel</button>
            <button id="gConfirmOkBtn" class="btn btn-primary">Confirm</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);
  }

  if (!document.getElementById("globalAlertModal")) {
    const modalHtml = `
      <div id="globalAlertModal" class="modal-overlay hidden" style="z-index: 9999;">
        <div class="modal-box" style="max-width: 400px; text-align: center; padding: 2rem;">
          <h3 id="gAlertTitle" style="margin-bottom: 0.5rem; font-size: 1.25rem;">Alert</h3>
          <p id="gAlertMsg" style="color: hsl(var(--muted-foreground)); margin-bottom: 1.5rem; font-size: 0.875rem; white-space: pre-wrap;"></p>
          <div style="display: flex; justify-content: center;">
            <button id="gAlertOkBtn" class="btn btn-primary">OK</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);
  }
});

window.showToast = function(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="material-icons">${type === 'success' ? 'check_circle' : (type === 'error' ? 'error' : 'info')}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

window.showConfirmModal = function(title, message, onConfirm) {
  const modal = document.getElementById("globalConfirmModal");
  if (!modal) {
    if (confirm(title + "\\n" + message)) onConfirm();
    return;
  }
  document.getElementById("gConfirmTitle").innerText = title;
  document.getElementById("gConfirmMsg").innerText = message;
  modal.classList.remove("hidden");
  
  const okBtn = document.getElementById("gConfirmOkBtn");
  const cancelBtn = document.getElementById("gConfirmCancelBtn");
  
  // Clone to remove previous listeners
  const newOkBtn = okBtn.cloneNode(true);
  const newCancelBtn = cancelBtn.cloneNode(true);
  okBtn.replaceWith(newOkBtn);
  cancelBtn.replaceWith(newCancelBtn);
  
  newOkBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
    if (onConfirm) onConfirm();
  });
  newCancelBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
  });
};

window.showAlertModal = function(title, message, type="info", onClose=null) {
  const modal = document.getElementById("globalAlertModal");
  if (!modal) {
    alert(title + "\\n" + message);
    if (onClose) onClose();
    return;
  }
  document.getElementById("gAlertTitle").innerText = title;
  document.getElementById("gAlertMsg").innerText = message;
  modal.classList.remove("hidden");
  
  const okBtn = document.getElementById("gAlertOkBtn");
  const newOkBtn = okBtn.cloneNode(true);
  okBtn.replaceWith(newOkBtn);
  
  newOkBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
    if (onClose) onClose();
  });
};
