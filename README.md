# Course Enrollment & Fee Tracking System (CEFTS)

Vanilla HTML/CSS/JS project. No frameworks. No backend — uses localStorage seeded from data/seed.json.

## Structure
- index.html — Login + Student Self-Registration
- pages/dashboard.html — role-based dashboard (Admin / Faculty / Student)
- pages/students.html — Admin CRUD, Faculty read-only
- pages/courses.html — Admin CRUD, Faculty view, Student catalog + enroll/waitlist
- pages/enrollments.html — Enrollments + Waitlist tabs
- pages/fees-payments.html — Invoices, Payment History, Record Payment, Fee Setup (Admin)
- pages/reports.html — Pending Fees + Course-wise Enrollment Report (Admin only)

## Demo Logins
- Admin: admin@edu.com / Admin@123
- Faculty: faculty@edu.com / Faculty@123
- Student: student@edu.com / Student@123

## Validations implemented
- Email format validation
- Phone: must start with 6/7/8/9 and be exactly 10 digits
- Password strength meter (length + uppercase + number + symbol)
- Confirm password match check
- Required field checks across all forms
- Prerequisite check, schedule conflict check, duplicate enrollment check, seat capacity/waitlist logic, overpayment check

## Styling
No CSS included yet. All elements use consistent class names (btn, btn-primary, form-group, data-table,
stat-card, pill, modal-overlay, tab-btn, card-grid, course-card, etc.) ready for a single global stylesheet.

## To run
Just open index.html in a browser (or serve via a simple local server for fetch() of seed.json to work
reliably, e.g. `npx serve` or VSCode Live Server).
