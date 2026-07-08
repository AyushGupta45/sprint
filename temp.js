
      let currentUser;
      let activeTab = "invoices";
      let currentInvoicesPage = 1;
      let currentPaymentsPage = 1;

      (async () => {
        await initSeed();
        currentUser = renderShell("fees-payments.html");
        if (!currentUser) return;
        if (currentUser.role === "faculty") {
          window.location.href = "dashboard.html";
          return;
        }
        renderFeesPage();
      })();

      function renderFeesPage() {
        const main = document.getElementById("main-content");
        const isAdmin = currentUser.role === "admin";

        main.innerHTML = `
        <div class="page-header">
            <h2 class="page-title">Fees &amp; Payments</h2>
          </div>
        <div class="tabs">
          <button class="tab-btn tab-active" data-tab="invoices">${isAdmin ? "Invoices" : "My Invoices"}</button>
          <button class="tab-btn" data-tab="payments">${isAdmin ? "Payment History" : "My Payments"}</button>
          ${isAdmin ? `<button class="tab-btn" data-tab="feesetup">Fee Setup</button>` : ""}
        </div>
        <div id="feeTabContent"></div>
      `;

        document.querySelectorAll(".tab-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            document
              .querySelectorAll(".tab-btn")
              .forEach((b) => b.classList.remove("tab-active"));
            btn.classList.add("tab-active");
            activeTab = btn.dataset.tab;
            currentInvoicesPage = 1;
            currentPaymentsPage = 1;
            renderFeeTabContent();
          });
        });

        setupPaymentModal();
        document
          .getElementById("closeInvoiceModal")
          .addEventListener("click", () =>
            document.getElementById("invoiceModal").classList.add("hidden"),
          );

        renderFeeTabContent();
      }

      function scopedEnrollments() {
        let enrollments = DB.get("enrollments").filter(
          (e) => e.status !== "Cancelled",
        );
        if (currentUser.role === "student")
          enrollments = enrollments.filter(
            (e) => e.studentId === currentUser.studentId,
          );
        return enrollments;
      }

      function renderFeeTabContent() {
        const wrap = document.getElementById("feeTabContent");
        const isAdmin = currentUser.role === "admin";

        if (activeTab === "invoices") {
          let enrollments = scopedEnrollments();
          if (typeof window.currentInvoiceFilter === 'undefined') window.currentInvoiceFilter = "All";
          if (typeof window.currentInvoiceSearch === 'undefined') window.currentInvoiceSearch = "";
          
          enrollments = enrollments.map(e => {
            const pending = e.totalFee - (e.paidAmount || 0);
            e._pending = pending;
            e._status = pending <= 0 ? "Paid" : (e.paidAmount > 0 ? "Pending" : "Overdue");
            return e;
          });

          if (window.currentInvoiceFilter !== "All") {
            enrollments = enrollments.filter(e => e._status === window.currentInvoiceFilter);
          }

          if (window.currentInvoiceSearch) {
             const q = window.currentInvoiceSearch.toLowerCase();
             enrollments = enrollments.filter(e => {
                const s = DB.getById("students", e.studentId);
                const c = DB.getById("courses", e.courseId);
                const ref = formatInvoiceRef(e).toLowerCase();
                return ref.includes(q) || (s && s.name.toLowerCase().includes(q)) || (c && c.name.toLowerCase().includes(q));
             });
          }

          // Sort: Pending/Overdue first, Paid last
          enrollments.sort((a, b) => {
            const aIsPaid = a._status === "Paid" ? 1 : 0;
            const bIsPaid = b._status === "Paid" ? 1 : 0;
            if (aIsPaid !== bIsPaid) return aIsPaid - bIsPaid;
            return new Date(b.enrollDate) - new Date(a.enrollDate);
          });

          let filterHTML = `
            <div style="display:flex;justify-content:space-between;margin-bottom:1rem;gap:1rem;align-items:center;flex-wrap:wrap">
              <div class="search-bar" style="max-width:300px;margin:0">
                <span class="material-icons search-icon">search</span>
                <input type="text" id="invoiceSearchInput" placeholder="Search invoices..." value="${window.currentInvoiceSearch}">
              </div>
          `;
          if (isAdmin) {
            filterHTML += `
              <div style="display:flex;gap:0.5rem;align-items:center">
                <label style="font-size:0.875rem;font-weight:500;color:hsl(var(--muted-foreground))">Filter:</label>
                <select id="invoiceFilterDropdown" class="form-control" style="width:auto;min-width:120px">
                  <option value="All" ${window.currentInvoiceFilter === 'All' ? 'selected' : ''}>All Invoices</option>
                  <option value="Overdue" ${window.currentInvoiceFilter === 'Overdue' ? 'selected' : ''}>Overdue</option>
                  <option value="Pending" ${window.currentInvoiceFilter === 'Pending' ? 'selected' : ''}>Pending</option>
                  <option value="Paid" ${window.currentInvoiceFilter === 'Paid' ? 'selected' : ''}>Paid</option>
                </select>
              </div>
            `;
          }
          filterHTML += `</div>`;

          if (!enrollments.length) {
            wrap.innerHTML = filterHTML + `<p class="empty-state">No invoices found.</p>`;
            document.getElementById("invoiceSearchInput").addEventListener("input", (e) => {
              window.currentInvoiceSearch = e.target.value;
              currentInvoicesPage = 1;
              renderFeeTabContent();
              const inp = document.getElementById("invoiceSearchInput");
              if (inp) { inp.focus(); inp.selectionStart = inp.selectionEnd = inp.value.length; }
            });
            if (isAdmin) {
              document.getElementById("invoiceFilterDropdown").addEventListener("change", (e) => {
                window.currentInvoiceFilter = e.target.value;
                currentInvoicesPage = 1;
                renderFeeTabContent();
              });
            }
            return;
          }
          const paginatedEnrollments = enrollments.slice((currentInvoicesPage - 1) * 6, currentInvoicesPage * 6);
          const rows = paginatedEnrollments
            .map((e) => {
              const student = DB.getById("students", e.studentId);
              const course = DB.getById("courses", e.courseId);
              const pending = e.totalFee - (e.paidAmount || 0);
              const status =
                pending <= 0
                  ? "Paid"
                  : e.paidAmount > 0
                    ? "Pending"
                    : "Overdue";
              const initials = student ? student.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "-";
              return `<tr>
            <td>${formatInvoiceRef(e)}</td>
            ${isAdmin ? `
            <td class="avatar-name-cell">
              <div class="avatar-circle">${initials}</div>
              <div class="avatar-details">
                <span>${student ? student.name : "-"}</span>
                <span class="avatar-subtext">${student ? student.email : "-"}</span>
              </div>
            </td>` : ""}
            <td>${course ? course.name : "-"}</td>
            <td>${formatCurrency(e.totalFee)}</td>
            <td>${formatCurrency(e.paidAmount || 0)}</td>
            <td>${formatCurrency(pending)}</td>
            <td>${statusPill(status)}</td>
            <td class="actions-cell">
              <button class="icon-btn view-invoice" data-id="${e.id}"><span class="material-icons">receipt_long</span></button>
              ${isAdmin && pending > 0 ? `<button class="btn btn-primary btn-sm record-payment-btn" data-id="${e.id}">Record Payment</button>` : ""}
              ${!isAdmin && currentUser.role === "student" && pending > 0 ? `<button class="btn btn-primary btn-sm student-pay-btn" data-id="${e.id}">Pay Now</button>` : ""}
            </td>
          </tr>`;
            })
            .join("");
          wrap.innerHTML = filterHTML + `
          <table class="data-table">
            <thead><tr><th>Invoice Ref</th>${isAdmin ? "<th>Student</th>" : ""}<th>Course</th><th>Total Fee</th><th>Paid</th><th>Pending</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div id="invoicesPagination"></div>
        `;

          document.getElementById("invoiceSearchInput").addEventListener("input", (e) => {
            window.currentInvoiceSearch = e.target.value;
            currentInvoicesPage = 1;
            renderFeeTabContent();
            const inp = document.getElementById("invoiceSearchInput");
            if (inp) { inp.focus(); inp.selectionStart = inp.selectionEnd = inp.value.length; }
          });

          if (isAdmin) {
            document.getElementById("invoiceFilterDropdown").addEventListener("change", (e) => {
              window.currentInvoiceFilter = e.target.value;
              currentInvoicesPage = 1;
              renderFeeTabContent();
            });
          }

          renderPagination("invoicesPagination", enrollments.length, currentInvoicesPage, 6, (newPage) => {
            currentInvoicesPage = newPage;
            renderFeeTabContent();
          });

          wrap
            .querySelectorAll(".view-invoice")
            .forEach((btn) =>
              btn.addEventListener("click", () => showInvoice(btn.dataset.id)),
            );
          wrap
            .querySelectorAll(".record-payment-btn")
            .forEach((btn) =>
              btn.addEventListener("click", () =>
                openPaymentModal(btn.dataset.id),
              ),
            );
          wrap
            .querySelectorAll(".student-pay-btn")
            .forEach((btn) =>
              btn.addEventListener("click", () =>
                openStudentPayModal(btn.dataset.id),
              ),
            );
        } else if (activeTab === "payments") {
          let payments = DB.get("payments");
          if (!isAdmin) {
            const myEnrollmentIds = scopedEnrollments().map((e) => e.id);
            payments = payments.filter((p) =>
              myEnrollmentIds.includes(p.enrollmentId),
            );
          }
          
          if (typeof window.currentPaymentSearch === 'undefined') window.currentPaymentSearch = "";
          if (window.currentPaymentSearch) {
             const q = window.currentPaymentSearch.toLowerCase();
             payments = payments.filter(p => {
                const e = DB.getById("enrollments", p.enrollmentId);
                const s = e ? DB.getById("students", e.studentId) : null;
                const c = e ? DB.getById("courses", e.courseId) : null;
                const ref = formatReceiptRef(p).toLowerCase();
                const extRef = (p.reference || "").toLowerCase();
                return ref.includes(q) || extRef.includes(q) || (s && s.name.toLowerCase().includes(q)) || (c && c.name.toLowerCase().includes(q));
             });
          }

          const topBarHTML = `
            <div style="display:flex;justify-content:space-between;margin-bottom:1rem;gap:1rem;align-items:center;flex-wrap:wrap">
              <div class="search-bar" style="max-width:300px;margin:0">
                <span class="material-icons search-icon">search</span>
                <input type="text" id="paymentSearchInput" placeholder="Search payments..." value="${window.currentPaymentSearch}">
              </div>
            </div>
          `;

          if (!payments.length) {
            wrap.innerHTML = topBarHTML + `<p class="empty-state">No payments recorded yet.</p>`;
            document.getElementById("paymentSearchInput").addEventListener("input", (e) => {
              window.currentPaymentSearch = e.target.value;
              currentPaymentsPage = 1;
              renderFeeTabContent();
              const inp = document.getElementById("paymentSearchInput");
              if (inp) { inp.focus(); inp.selectionStart = inp.selectionEnd = inp.value.length; }
            });
            return;
          }
          const reversedPayments = payments.slice().reverse();
          const paginatedPayments = reversedPayments.slice((currentPaymentsPage - 1) * 6, currentPaymentsPage * 6);
          const rows = paginatedPayments
            .map((p) => {
              const enrollment = DB.getById("enrollments", p.enrollmentId);
              const course = enrollment
                ? DB.getById("courses", enrollment.courseId)
                : null;
              const student = enrollment
                ? DB.getById("students", enrollment.studentId)
                : null;
              const initials = student ? student.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "-";
              return `<tr>
            <td>${formatReceiptRef(p)}</td>
            ${isAdmin ? `
            <td class="avatar-name-cell">
              <div class="avatar-circle">${initials}</div>
              <div class="avatar-details">
                <span>${student ? student.name : "-"}</span>
                <span class="avatar-subtext">${student ? student.email : "-"}</span>
              </div>
            </td>` : ""}
            <td>${course ? course.name : "-"}</td>
            <td>${formatDate(p.date)}</td>
            <td>${formatCurrency(p.amount)}</td>
            <td>${p.mode}</td>
            <td>${p.reference || "-"}</td>
            <td class="actions-cell"><button class="icon-btn view-receipt" data-id="${p.id}"><span class="material-icons">download</span></button></td>
          </tr>`;
            })
            .join("");
          wrap.innerHTML = topBarHTML + `
          <table class="data-table">
            <thead><tr><th>Receipt Ref</th>${isAdmin ? "<th>Student</th>" : ""}<th>Course</th><th>Date</th><th>Amount</th><th>Mode</th><th>Reference</th><th>Receipt</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div id="paymentsPagination"></div>
        `;

          document.getElementById("paymentSearchInput").addEventListener("input", (e) => {
            window.currentPaymentSearch = e.target.value;
            currentPaymentsPage = 1;
            renderFeeTabContent();
            const inp = document.getElementById("paymentSearchInput");
            if (inp) { inp.focus(); inp.selectionStart = inp.selectionEnd = inp.value.length; }
          });

          renderPagination("paymentsPagination", payments.length, currentPaymentsPage, 6, (newPage) => {
            currentPaymentsPage = newPage;
            renderFeeTabContent();
          });

          wrap
            .querySelectorAll(".view-receipt")
            .forEach((btn) =>
              btn.addEventListener("click", () => showReceipt(btn.dataset.id)),
            );
        } else if (activeTab === "feesetup") {
          let courses = DB.get("courses");
          if (typeof window.currentFeeSetupSearch === 'undefined') window.currentFeeSetupSearch = "";
          if (window.currentFeeSetupSearch) {
             const q = window.currentFeeSetupSearch.toLowerCase();
             courses = courses.filter(c => c.name.toLowerCase().includes(q));
          }
          const topBarHTML = `
            <div style="display:flex;justify-content:space-between;margin-bottom:1rem;gap:1rem;align-items:center;flex-wrap:wrap">
              <div class="search-bar" style="max-width:300px;margin:0">
                <span class="material-icons search-icon">search</span>
                <input type="text" id="feeSetupSearchInput" placeholder="Search courses..." value="${window.currentFeeSetupSearch}">
              </div>
            </div>
          `;
          const rows = courses
            .map(
              (c) => `
          <tr>
            <td>${c.name}</td>
            <td>${c.feePlanType}</td>
            <td>${formatCurrency(c.fee)}</td>
            <td>${c.installments && c.installments.length ? c.installments.map((i) => `#${i.no}: ${formatCurrency(i.amount)} (due ${formatDate(i.dueDate)})`).join("<br>") : "-"}</td>
            <td><button class="btn btn-secondary btn-sm edit-feeplan" data-id="${c.id}">Edit</button></td>
          </tr>
        `,
            )
            .join("");
          wrap.innerHTML = topBarHTML + `
          <table class="data-table">
            <thead><tr><th>Course</th><th>Plan Type</th><th>Base Fee</th><th>Installments</th><th>Actions</th></tr></thead>
            <tbody>${rows.length ? rows : '<tr><td colspan="5" class="empty-state">No courses found.</td></tr>'}</tbody>
          </table>
          <p class="hint-text">Edit fee plan type and base fee from the Courses page (Add/Edit Course form).</p>
        `;
          
          document.getElementById("feeSetupSearchInput").addEventListener("input", (e) => {
            window.currentFeeSetupSearch = e.target.value;
            renderFeeTabContent();
            const inp = document.getElementById("feeSetupSearchInput");
            if (inp) { inp.focus(); inp.selectionStart = inp.selectionEnd = inp.value.length; }
          });
          wrap
            .querySelectorAll(".edit-feeplan")
            .forEach((btn) =>
              btn.addEventListener(
                "click",
                () => (window.location.href = "courses.html"),
              ),
            );
        }
      }

      function openPaymentModal(enrollmentId) {
        const enrollment = DB.getById("enrollments", enrollmentId);
        document.getElementById("paymentForm").reset();
        document.getElementById("paymentFormError").classList.add("hidden");
        document.getElementById("paymentFormSuccess").classList.add("hidden");
        document.getElementById("payEnrollmentId").value = enrollmentId;
        
        document.getElementById("paySummaryTotal").textContent = formatCurrency(enrollment.totalFee);
        document.getElementById("paySummaryPaid").textContent = formatCurrency(enrollment.paidAmount || 0);
        
        const pending = enrollment.totalFee - (enrollment.paidAmount || 0);
        document.getElementById("paySummaryPending").textContent = formatCurrency(pending);
        
        document.getElementById("payAmount").value = pending;
        const hintEl = document.getElementById("payAmountHint");
        hintEl.textContent = `Pending balance is ${formatCurrency(pending)}`;
        hintEl.style.color = "hsl(var(--muted-foreground))";

        // Reset pills
        document.querySelectorAll('.pay-mode-pill').forEach(p => p.classList.remove('active', 'btn-primary'));
        document.querySelectorAll('.pay-mode-pill').forEach(p => {
            p.style.background = 'hsl(var(--background))';
            p.style.color = 'hsl(var(--foreground))';
        });
        const cashPill = document.querySelector('.pay-mode-pill[data-mode="Cash"]');
        if (cashPill) {
            cashPill.classList.add('active');
            cashPill.style.background = 'hsl(var(--primary))';
            cashPill.style.color = '#fff';
        }
        document.getElementById("payMode").value = "Cash";

        document.getElementById("adminMockGateway").style.display = "none";
        document.getElementById("adminMockUpi").style.display = "none";
        document.getElementById("adminMockCard").style.display = "none";
        document.getElementById("adminMockBank").style.display = "none";
        document.getElementById("adminMockOnline").style.display = "none";
        
        // Reset card fields
        document.getElementById("payCardNo").value = "";
        document.getElementById("payCardExpiry").value = "";
        document.getElementById("payCardCvv").value = "";
        document.getElementById("payCardHolder").value = "";
        document.querySelector("#adminMockCard .card-mockup-number").textContent = "•••• •••• •••• ••••";
        document.querySelector("#adminMockCard .card-mockup-name").textContent = "Student Name";
        document.querySelector("#adminMockCard .card-mockup-expiry").textContent = "MM/YY";

        document.getElementById("paymentModal").classList.remove("hidden");
      }

      function setupPaymentModal() {
        // Setup pill click handlers
        document.querySelectorAll('.pay-mode-pill').forEach(pill => {
          pill.addEventListener('click', (e) => {
            document.querySelectorAll('.pay-mode-pill').forEach(p => {
              p.classList.remove('active');
              p.style.background = 'hsl(var(--background))';
              p.style.color = 'hsl(var(--foreground))';
            });
            const clicked = e.currentTarget;
            clicked.classList.add('active');
            clicked.style.background = 'hsl(var(--primary))';
            clicked.style.color = '#fff';
            const mode = clicked.dataset.mode;
            document.getElementById('payMode').value = mode;

            // Show mock gateway if applicable
            const gw = document.getElementById("adminMockGateway");
            const upi = document.getElementById("adminMockUpi");
            const card = document.getElementById("adminMockCard");
            const bank = document.getElementById("adminMockBank");
            const online = document.getElementById("adminMockOnline");
            
            gw.style.display = "block";
            upi.style.display = "none";
            card.style.display = "none";
            bank.style.display = "none";
            online.style.display = "none";

            if (mode === "UPI") {
               upi.style.display = "flex";
            } else if (mode === "Card") {
               card.style.display = "block";
            } else if (mode === "Bank Transfer") {
               bank.style.display = "block";
            } else if (mode === "Online") {
               online.style.display = "block";
            } else {
               gw.style.display = "none"; // Cash
            }
          });
        });

        // Admin Card Live Input Observers
        const payCardNo = document.getElementById("payCardNo");
        payCardNo.addEventListener("input", () => {
          let val = payCardNo.value.replace(/\D/g, "");
          let formatted = "";
          for (let i = 0; i < val.length; i += 4) {
            if (i > 0) formatted += " ";
            formatted += val.substring(i, i + 4);
          }
          payCardNo.value = formatted.slice(0, 19);
          document.querySelector("#adminMockCard .card-mockup-number").textContent = payCardNo.value || "•••• •••• •••• ••••";
        });

        const payCardExpiry = document.getElementById("payCardExpiry");
        payCardExpiry.addEventListener("input", () => {
          let val = payCardExpiry.value.replace(/\D/g, "");
          if (val.length > 2) {
            payCardExpiry.value = val.substring(0, 2) + "/" + val.substring(2, 4);
          } else {
            payCardExpiry.value = val;
          }
          document.querySelector("#adminMockCard .card-mockup-expiry").textContent = payCardExpiry.value || "MM/YY";
        });

        const payCardHolder = document.getElementById("payCardHolder");
        payCardHolder.addEventListener("input", () => {
          document.querySelector("#adminMockCard .card-mockup-name").textContent = payCardHolder.value.toUpperCase() || "Student Name";
        });

        const payCardCvv = document.getElementById("payCardCvv");
        payCardCvv.addEventListener("input", () => {
          payCardCvv.value = payCardCvv.value.replace(/\D/g, "").slice(0, 3);
        });

        // Setup amount hint dynamically
        document.getElementById("payAmount").addEventListener("input", (e) => {
            const enrollmentId = document.getElementById("payEnrollmentId").value;
            const enrollment = DB.getById("enrollments", enrollmentId);
            const pending = enrollment.totalFee - (enrollment.paidAmount || 0);
            const amt = Number(e.target.value);
            const hintEl = document.getElementById("payAmountHint");
            if (amt > pending) {
                hintEl.textContent = `Warning: Amount exceeds pending balance of ${formatCurrency(pending)}.`;
                hintEl.style.color = "hsl(var(--destructive))";
            } else if (amt < pending) {
                hintEl.textContent = `Partial payment. Remaining balance will be ${formatCurrency(pending - amt)}.`;
                hintEl.style.color = "hsl(var(--warning))";
            } else {
                hintEl.textContent = `Full payment of pending balance.`;
                hintEl.style.color = "hsl(var(--success))";
            }
        });

        document.getElementById("closePaymentModal").addEventListener("click", () => document.getElementById("paymentModal").classList.add("hidden"));
        document.getElementById("cancelPaymentForm").addEventListener("click", () => document.getElementById("paymentModal").classList.add("hidden"));

        document.getElementById("paymentForm").addEventListener("submit", (e) => {
          e.preventDefault();
          const enrollmentId = document.getElementById("payEnrollmentId").value;
          const enrollment = DB.getById("enrollments", enrollmentId);
          const amount = Number(document.getElementById("payAmount").value);
          const pending = enrollment.totalFee - (enrollment.paidAmount || 0);
          const errorEl = document.getElementById("paymentFormError");
          const successEl = document.getElementById("paymentFormSuccess");

          errorEl.classList.add("hidden");
          successEl.classList.add("hidden");

          if (!amount || amount <= 0) return showFormErr(errorEl, "Enter a valid payment amount.");
          if (amount > pending) return showFormErr(errorEl, `Amount exceeds pending balance of ${formatCurrency(pending)}.`);

          DB.add("payments", {
            enrollmentId,
            amount,
            date: new Date().toISOString().split('T')[0],
            mode: document.getElementById("payMode").value,
            reference: "TRX" + Math.floor(Math.random() * 1000000000),
          });
          
          DB.update("enrollments", enrollmentId, {
            paidAmount: (enrollment.paidAmount || 0) + amount,
          });

          const studentUser = DB.get("users").find((u) => u.studentId === enrollment.studentId);
          if (studentUser) pushNotification(studentUser.id, `Payment of ${formatCurrency(amount)} received. Receipt generated.`, "info");

          showToast(`Payment of ${formatCurrency(amount)} recorded successfully!`, "success");
          document.getElementById("paymentModal").classList.add("hidden");
          renderFeeTabContent();
        });
      }

      function showInvoice(enrollmentId) {
        const e = DB.getById("enrollments", enrollmentId);
        const student = DB.getById("students", e.studentId);
        const course = DB.getById("courses", e.courseId);
        const pending = e.totalFee - (e.paidAmount || 0);
        document.getElementById("invoiceContent").innerHTML = `
        <div class="invoice-header"><h2>EduTrack Institute</h2><p>Invoice No: ${formatInvoiceRef(e)}</p><p>Date: ${formatDate(e.enrollDate)}</p></div>
        <p><strong>Student:</strong> ${student ? student.name : "-"}</p>
        <p><strong>Course:</strong> ${course ? course.name : "-"}</p>
        <table class="data-table">
          <thead><tr><th>Total Fee</th><th>Paid</th><th>Pending</th></tr></thead>
          <tbody><tr><td>${formatCurrency(e.totalFee)}</td><td>${formatCurrency(e.paidAmount || 0)}</td><td>${formatCurrency(pending)}</td></tr></tbody>
        </table>
        <button class="btn btn-primary" onclick="window.print()"><span class="material-icons">print</span> Print</button>
      `;
        document.getElementById("invoiceModal").classList.remove("hidden");
      }

      function showReceipt(paymentId) {
        const p = DB.getById("payments", paymentId);
        const e = DB.getById("enrollments", p.enrollmentId);
        const student = DB.getById("students", e.studentId);
        const course = DB.getById("courses", e.courseId);
        document.getElementById("invoiceContent").innerHTML = `
        <div class="invoice-header"><h2>EduTrack Institute</h2><p>Receipt No: ${formatReceiptRef(p)}</p><p>Date: ${formatDate(p.date)}</p></div>
        <p><strong>Student:</strong> ${student ? student.name : "-"}</p>
        <p><strong>Course:</strong> ${course ? course.name : "-"}</p>
        <p><strong>Amount Paid:</strong> ${formatCurrency(p.amount)}</p>
        <p><strong>Mode:</strong> ${p.mode}</p>
        <p><strong>Reference:</strong> ${p.reference || "-"}</p>
        <button class="btn btn-primary" onclick="window.print()"><span class="material-icons">print</span> Print</button>
      `;
        document.getElementById("invoiceModal").classList.remove("hidden");
      }

      // ====== Student Self-Pay (BUG 6) ======
      let activePayMethod = "upi";

      function openStudentPayModal(enrollmentId) {
        var enrollment = DB.getById("enrollments", enrollmentId);
        var pending = enrollment.totalFee - (enrollment.paidAmount || 0);
        document.getElementById("spEnrollmentId").value = enrollmentId;
        document.getElementById("spAmountDue").textContent = formatCurrency(pending);
        
        // Reset inputs
        document.getElementById("studentPayForm").reset();
        document.getElementById("spUpiId").value = "";
        document.getElementById("spCardNo").value = "";
        document.getElementById("spCardExpiry").value = "";
        document.getElementById("spCardCvv").value = "";
        document.getElementById("spCardHolder").value = "";

        // Reset Card Mockup text
        document.querySelector(".card-mockup-number").textContent = "•••• •••• •••• ••••";
        document.querySelector(".card-mockup-name").textContent = "Your Name";
        document.querySelector(".card-mockup-expiry").textContent = "MM/YY";

        // Reset Pills State to UPI
        activePayMethod = "UPI";
        document.querySelectorAll('.sp-pay-mode-pill').forEach(p => {
            p.classList.remove('active');
            p.style.background = 'hsl(var(--background))';
            p.style.color = 'hsl(var(--foreground))';
        });
        const spUpiPill = document.querySelector('.sp-pay-mode-pill[data-mode="UPI"]');
        if (spUpiPill) {
            spUpiPill.classList.add('active');
            spUpiPill.style.background = 'hsl(var(--primary))';
            spUpiPill.style.color = '#fff';
        }
        document.getElementById("spPayMode").value = "UPI";

        document.getElementById("spMockUpi").style.display = "flex";
        document.getElementById("spMockCard").style.display = "none";
        document.getElementById("spMockBank").style.display = "none";
        document.getElementById("spMockOnline").style.display = "none";

        // Clear error / success status
        document.getElementById("studentPayError").classList.add("hidden");
        document.getElementById("studentPaySuccess").classList.add("hidden");
        document.getElementById("spPayNowBtn").disabled = false;
        document.getElementById("spPayNowBtn").innerHTML = '<span class="material-icons">payments</span> Pay Now';
        document.getElementById("studentPayModal").classList.remove("hidden");
      }

      function setupStudentPayModal() {
        document.getElementById("closeStudentPayModal").addEventListener("click", function () {
          document.getElementById("studentPayModal").classList.add("hidden");
        });
        document.getElementById("cancelStudentPay").addEventListener("click", function () {
          document.getElementById("studentPayModal").classList.add("hidden");
        });

        // Pill Switching
        document.querySelectorAll(".sp-pay-mode-pill").forEach((pill) => {
          pill.addEventListener("click", (e) => {
            document.querySelectorAll(".sp-pay-mode-pill").forEach((p) => {
              p.classList.remove("active");
              p.style.background = "hsl(var(--background))";
              p.style.color = "hsl(var(--foreground))";
            });
            const clicked = e.currentTarget;
            clicked.classList.add("active");
            clicked.style.background = "hsl(var(--primary))";
            clicked.style.color = "#fff";
            
            activePayMethod = clicked.dataset.mode;
            document.getElementById('spPayMode').value = activePayMethod;
            
            const upi = document.getElementById("spMockUpi");
            const card = document.getElementById("spMockCard");
            const bank = document.getElementById("spMockBank");
            const online = document.getElementById("spMockOnline");
            
            upi.style.display = "none";
            card.style.display = "none";
            bank.style.display = "none";
            online.style.display = "none";

            if (activePayMethod === "UPI") {
              upi.style.display = "flex";
            } else if (activePayMethod === "Card") {
              card.style.display = "block";
            } else if (activePayMethod === "Bank Transfer") {
              bank.style.display = "block";
            } else if (activePayMethod === "Online") {
              online.style.display = "block";
            }
          });
        });

        // Card Live Input Observers
        const cardNoInput = document.getElementById("spCardNo");
        cardNoInput.addEventListener("input", () => {
          let val = cardNoInput.value.replace(/\D/g, "");
          let formatted = "";
          for (let i = 0; i < val.length; i += 4) {
            if (i > 0) formatted += " ";
            formatted += val.substring(i, i + 4);
          }
          cardNoInput.value = formatted.slice(0, 19);
          document.querySelector(".card-mockup-number").textContent = cardNoInput.value || "•••• •••• •••• ••••";
        });

        const cardExpiryInput = document.getElementById("spCardExpiry");
        cardExpiryInput.addEventListener("input", () => {
          let val = cardExpiryInput.value.replace(/\D/g, "");
          if (val.length > 2) {
            cardExpiryInput.value = val.substring(0, 2) + "/" + val.substring(2, 4);
          } else {
            cardExpiryInput.value = val;
          }
          document.querySelector(".card-mockup-expiry").textContent = cardExpiryInput.value || "MM/YY";
        });

        const cardHolderInput = document.getElementById("spCardHolder");
        cardHolderInput.addEventListener("input", () => {
          document.querySelector(".card-mockup-name").textContent = cardHolderInput.value.toUpperCase() || "Your Name";
        });

        const cardCvvInput = document.getElementById("spCardCvv");
        cardCvvInput.addEventListener("input", () => {
          cardCvvInput.value = cardCvvInput.value.replace(/\D/g, "").slice(0, 3);
        });

        document.getElementById("studentPayForm").addEventListener("submit", function (e) {
          e.preventDefault();
          var enrollmentId = document.getElementById("spEnrollmentId").value;
          var enrollment = DB.getById("enrollments", enrollmentId);
          var pending = enrollment.totalFee - (enrollment.paidAmount || 0);
          var payBtn = document.getElementById("spPayNowBtn");
          var errorEl = document.getElementById("studentPayError");
          var successEl = document.getElementById("studentPaySuccess");
          errorEl.classList.add("hidden");
          successEl.classList.add("hidden");

          // Form Validation
          if (activePayMethod === "upi") {
            const upiId = document.getElementById("spUpiId").value.trim();
            if (!upiId || !upiId.includes("@")) {
              errorEl.textContent = "Please enter a valid UPI ID (e.g. username@upi).";
              errorEl.classList.remove("hidden");
              return;
            }
          } else {
            const cardNo = cardNoInput.value.replace(/\s/g, "");
            const expiry = cardExpiryInput.value.trim();
            const cvv = cardCvvInput.value.trim();
            const holder = cardHolderInput.value.trim();
            if (cardNo.length < 16) {
              errorEl.textContent = "Please enter a valid 16-digit card number.";
              errorEl.classList.remove("hidden");
              return;
            }
            if (!expiry.includes("/") || expiry.length < 5) {
              errorEl.textContent = "Please enter a valid expiry date (MM/YY).";
              errorEl.classList.remove("hidden");
              return;
            }
            if (cvv.length < 3) {
              errorEl.textContent = "Please enter a valid 3-digit CVV.";
              errorEl.classList.remove("hidden");
              return;
            }
            if (!holder) {
              errorEl.textContent = "Please enter the card holder name.";
              errorEl.classList.remove("hidden");
              return;
            }
          }

          // Disable button and show loading
          payBtn.disabled = true;
          payBtn.innerHTML = '<span class="material-icons">hourglass_top</span> Processing payment...';

          setTimeout(function () {
            var success = Math.random() > 0.15;
            if (success) {
              // Add payment record
              var payment = DB.add("payments", {
                enrollmentId: enrollmentId,
                amount: pending,
                date: new Date().toISOString().split('T')[0],
                mode: "Online (Self-Pay)",
                reference: "ONLINE" + Date.now(),
              });
              // Update enrollment paid amount
              DB.update("enrollments", enrollmentId, {
                paidAmount: (enrollment.paidAmount || 0) + pending,
              });
              // Notify student
              var course = DB.getById("courses", enrollment.courseId);
              pushNotification(
                currentUser.id,
                "Payment of " + formatCurrency(pending) + " received for " + course.name + " (Online Self-Pay). Receipt generated.",
                "info"
              );
              // Show success and close
              showToast("Payment successful! Amount paid: " + formatCurrency(pending), "success");
              document.getElementById("studentPayModal").classList.add("hidden");
              renderFeeTabContent();
            } else {
              // Show failure — re-enable button and shake modal
              const modalBox = document.querySelector("#studentPayModal .modal-box");
              showToast("Payment failed. Please try again.", "error");
              payBtn.disabled = false;
              payBtn.innerHTML = '<span class="material-icons">payments</span> Pay Now';
              
              if (modalBox) {
                modalBox.classList.add("shake");
                setTimeout(function () {
                  modalBox.classList.remove("shake");
                }, 350);
              }
            }
          }, 2000);
        });
      }

      setupStudentPayModal();

      function showFormErr(el, msg) {
        el.textContent = msg;
        el.classList.remove("hidden");
      }
    