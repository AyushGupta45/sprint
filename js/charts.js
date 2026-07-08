// js/charts.js - EduTrack CEFTS Chart Visualizations
// Palette: Teal-Emerald primary, Amber accent, Semantic status colors

const CHART_COLORS = {
  primary: '#0F9D8C',          // teal-emerald
  primaryMuted: 'rgba(15, 157, 140, 0.10)',
  secondary: '#F1F5F9',
  foreground: '#14324A',       // dark navy
  mutedForeground: '#5B7285',  // soft navy
  border: '#E2E8F0',
  brandDark: '#14324A',
  brandMuted: '#8BA3B5',
  brandLight: '#C9D6DF',
};

const getCommonOptions = () => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        font: { family: 'Inter', size: 11, weight: '500' },
        color: CHART_COLORS.mutedForeground,
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 15
      }
    },
    tooltip: {
      backgroundColor: CHART_COLORS.foreground,
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: CHART_COLORS.border,
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
      bodyFont: { family: 'Inter', size: 12 },
      titleFont: { family: 'Inter', size: 12, weight: 'bold' },
      displayColors: true,
      boxWidth: 8,
      boxHeight: 8,
      boxPadding: 4,
    }
  }
});

function getWeeklyBuckets(enrollments, maxDate) {
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const end = new Date(maxDate.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    weeks.push({
      start,
      end,
      label: `${start.toLocaleDateString('en-IN', {month:'short', day:'numeric'})}`,
      count: 0
    });
  }
  enrollments.forEach(e => {
    if (e.status === 'Cancelled') return;
    const d = new Date(e.enrollDate);
    for (const w of weeks) {
      if (d >= w.start && d < w.end) {
        w.count++;
        break;
      }
    }
  });
  return weeks;
}

function renderAnimatedChart(canvas, config) {
  if (!window.IntersectionObserver) {
    return new Chart(canvas, config);
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        new Chart(canvas, config);
        observer.unobserve(canvas);
      }
    });
  }, { threshold: 0.1 });
  observer.observe(canvas);
}

// 1. Admin Charts
function initAdminCharts() {
  const enrollments = DB.get('enrollments');
  const payments = DB.get('payments');
  const courses = DB.get('courses');
  const users = DB.get('users');

  let maxDate = new Date();
  if (enrollments.length > 0) {
    const dates = enrollments.map(e => new Date(e.enrollDate)).filter(d => !isNaN(d));
    if (dates.length > 0) maxDate = new Date(Math.max(...dates));
  }

  // --- Enrollment Trend (Line Chart - Teal) ---
  const enrollmentCanvas = document.getElementById('enrollmentTrendChart');
  if (enrollmentCanvas) {
    const weeks = getWeeklyBuckets(enrollments, maxDate);
    const ctx = enrollmentCanvas.getContext('2d');
    let gradient = null;
    if (ctx) {
      gradient = ctx.createLinearGradient(0, 0, 0, 200);
      gradient.addColorStop(0, 'rgba(15, 157, 140, 0.15)');
      gradient.addColorStop(1, 'rgba(15, 157, 140, 0.00)');
    }
    renderAnimatedChart(enrollmentCanvas, {
      type: 'line',
      data: {
        labels: weeks.map(w => w.label),
        datasets: [{
          label: 'Enrollments',
          data: weeks.map(w => w.count),
          borderColor: CHART_COLORS.primary,
          backgroundColor: gradient || CHART_COLORS.primaryMuted,
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: CHART_COLORS.primary,
          pointBorderColor: '#fff',
          pointBorderWidth: 1.5,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        ...getCommonOptions(),
        scales: {
          x: { grid: { display: false }, ticks: { color: CHART_COLORS.mutedForeground, font: { family: 'Inter', size: 10 } } },
          y: { grid: { color: CHART_COLORS.border, drawBorder: false }, ticks: { color: CHART_COLORS.mutedForeground, font: { family: 'Inter', size: 10 }, stepSize: 1 }, beginAtZero: true }
        }
      }
    });
  }

  // --- Fee Collection (Doughnut - Green/Amber/Red) ---
  const feeCanvas = document.getElementById('feeCollectionChart');
  if (feeCanvas) {
    const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);
    const totalFeeExpected = enrollments.reduce((s, e) => s + Number(e.totalFee), 0);
    let pendingAmt = 0, overdueAmt = 0;
    enrollments.forEach(e => {
      if (e.status === 'Cancelled') return;
      const outstanding = Number(e.totalFee) - Number(e.paidAmount || 0);
      if (outstanding <= 0) return;
      const daysSince = Math.floor((Date.now() - new Date(e.enrollDate)) / (1000 * 60 * 60 * 24));
      if (daysSince > 30) overdueAmt += outstanding;
      else pendingAmt += outstanding;
    });
    renderAnimatedChart(feeCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Paid', 'Pending', 'Overdue'],
        datasets: [{ data: [totalCollected, pendingAmt, overdueAmt], backgroundColor: [CHART_COLORS.primary, CHART_COLORS.brandMuted, CHART_COLORS.brandDark], borderWidth: 2, borderColor: '#fff', hoverOffset: 4 }]
      },
      options: { ...getCommonOptions(), cutout: '72%', plugins: { ...getCommonOptions().plugins, tooltip: { ...getCommonOptions().plugins.tooltip, callbacks: { label: function(ctx) { return ' ' + ctx.label + ': ₹' + ctx.raw.toLocaleString('en-IN'); } } } } },
      plugins: [{ id: 'centerText', beforeDraw(chart) {
        const { ctx, chartArea: { top, left, width, height } } = chart; ctx.restore();
        const cx = left + width / 2, cy = top + height / 2;
        ctx.font = `bold ${(height / 150).toFixed(2)}em Inter`; ctx.textBaseline = 'middle'; ctx.fillStyle = CHART_COLORS.foreground;
        const text = "₹" + Number(totalFeeExpected).toLocaleString('en-IN');
        ctx.fillText(text, cx - ctx.measureText(text).width / 2, cy - 10);
        ctx.font = `600 ${(height / 220).toFixed(2)}em Inter`; ctx.fillStyle = CHART_COLORS.mutedForeground;
        const label = "TOTAL BILLING"; ctx.fillText(label, cx - ctx.measureText(label).width / 2, cy + 15); ctx.save();
      }}]
    });
  }

  // --- Top Courses (Bar - Teal) ---
  const topCoursesCanvas = document.getElementById('topCoursesChart');
  if (topCoursesCanvas) {
    const counts = {}; courses.forEach(c => { counts[c.id] = { name: c.name, count: 0 }; });
    enrollments.forEach(e => { if (e.status !== 'Cancelled' && counts[e.courseId]) counts[e.courseId].count++; });
    const sorted = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
    renderAnimatedChart(topCoursesCanvas, {
      type: 'bar',
      data: { labels: sorted.map(x => x.name), datasets: [{ label: 'Enrolled Students', data: sorted.map(x => x.count), backgroundColor: CHART_COLORS.primary, borderRadius: 6, barThickness: 16 }] },
      options: { ...getCommonOptions(), indexAxis: 'y', scales: {
        x: { grid: { color: CHART_COLORS.border, drawBorder: false }, ticks: { color: CHART_COLORS.mutedForeground, stepSize: 1, font: { family: 'Inter', size: 10 } }, beginAtZero: true },
        y: { grid: { display: false }, ticks: { color: CHART_COLORS.mutedForeground, font: { family: 'Inter', size: 10 } } }
      }}
    });
  }

  // --- Seat Utilization (Gauge - Teal/Secondary) ---
  const seatCanvas = document.getElementById('seatUtilizationChart');
  if (seatCanvas) {
    const totalCap = courses.reduce((s, c) => s + Number(c.capacity || 0), 0);
    const totalEnr = enrollments.filter(e => e.status !== 'Cancelled').length;
    const rate = totalCap > 0 ? Math.round((totalEnr / totalCap) * 100) : 0;
    const gaugeColor = CHART_COLORS.primary;
    renderAnimatedChart(seatCanvas, {
      type: 'doughnut',
      data: { labels: ['Occupied', 'Available'], datasets: [{ data: [totalEnr, Math.max(0, totalCap - totalEnr)], backgroundColor: [gaugeColor, CHART_COLORS.secondary], borderWidth: 0, hoverOffset: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, circumference: 180, rotation: 270, cutout: '76%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx) { return ' ' + ctx.label + ': ' + ctx.raw + ' seats'; } } } } },
      plugins: [{ id: 'gaugeText', beforeDraw(chart) {
        const { ctx, chartArea: { top, bottom, left, width, height } } = chart; ctx.restore();
        const cx = left + width / 2;
        ctx.font = "bold 1.6em Inter"; ctx.textBaseline = 'middle'; ctx.fillStyle = CHART_COLORS.foreground;
        const text = `${rate}%`; ctx.fillText(text, cx - ctx.measureText(text).width / 2, bottom - 15);
        ctx.font = "600 0.75em Inter"; ctx.fillStyle = CHART_COLORS.mutedForeground;
        const label = "SEATS FILLED"; ctx.fillText(label, cx - ctx.measureText(label).width / 2, bottom + 5); ctx.save();
      }}]
    });
  }

  // --- Role Distribution (Students teal, Faculty violet) ---
  const roleCanvas = document.getElementById('roleDistributionChart');
  if (roleCanvas) {
    const studentCount = DB.get('students').length;
    const facultyCount = users.filter(u => u.role === 'faculty').length;
    renderAnimatedChart(roleCanvas, {
      type: 'doughnut',
      data: { labels: ['Students', 'Faculty'], datasets: [{ data: [studentCount, facultyCount], backgroundColor: [CHART_COLORS.primary, CHART_COLORS.brandDark], borderWidth: 2, borderColor: '#fff', hoverOffset: 4 }] },
      options: { ...getCommonOptions(), cutout: '72%' }
    });
  }
}

// 2. Faculty Charts
function initFacultyCharts(user) {
  const courses = DB.get('courses').filter(c => c.facultyId === user.id);
  const courseIds = courses.map(c => c.id);
  const enrollments = DB.get('enrollments');

  const seatsCanvas = document.getElementById('facultySeatsChart');
  if (seatsCanvas && courses.length > 0) {
    const labels = courses.map(c => c.name);
    const filledData = [], capacityData = [];
    courses.forEach(c => {
      filledData.push(enrollments.filter(e => e.courseId === c.id && e.status !== 'Cancelled').length);
      capacityData.push(c.capacity);
    });
    renderAnimatedChart(seatsCanvas, {
      type: 'bar',
      data: { labels, datasets: [
        { label: 'Filled Seats', data: filledData, backgroundColor: CHART_COLORS.primary, borderRadius: 4, barThickness: 12 },
        { label: 'Capacity', data: capacityData, backgroundColor: CHART_COLORS.secondary, borderRadius: 4, barThickness: 12 }
      ]},
      options: { ...getCommonOptions(), indexAxis: 'y', scales: {
        x: { grid: { color: CHART_COLORS.border, drawBorder: false }, ticks: { color: CHART_COLORS.mutedForeground, stepSize: 2, font: { family: 'Inter', size: 10 } }, beginAtZero: true },
        y: { grid: { display: false }, ticks: { color: CHART_COLORS.mutedForeground, font: { family: 'Inter', size: 10 } } }
      }}
    });
  }

  const studentTrendCanvas = document.getElementById('facultyStudentsTrendChart');
  if (studentTrendCanvas && courses.length > 0) {
    let maxDate = new Date();
    const myEnrollments = enrollments.filter(e => courseIds.includes(e.courseId));
    if (myEnrollments.length > 0) {
      const dates = myEnrollments.map(e => new Date(e.enrollDate)).filter(d => !isNaN(d));
      if (dates.length > 0) maxDate = new Date(Math.max(...dates));
    }
    const weeks = getWeeklyBuckets(myEnrollments, maxDate);
    renderAnimatedChart(studentTrendCanvas, {
      type: 'line',
      data: { labels: weeks.map(w => w.label), datasets: [{
        label: 'Enrollments', data: weeks.map(w => w.count),
        borderColor: CHART_COLORS.primary, backgroundColor: 'rgba(15, 157, 140, 0.08)',
        fill: true, tension: 0.35, borderWidth: 2, pointBackgroundColor: CHART_COLORS.primary,
        pointBorderColor: '#fff', pointBorderWidth: 1, pointRadius: 3, pointHoverRadius: 5
      }]},
      options: { ...getCommonOptions(), scales: {
        x: { grid: { display: false }, ticks: { color: CHART_COLORS.mutedForeground, font: { family: 'Inter', size: 9 } } },
        y: { grid: { color: CHART_COLORS.border, drawBorder: false }, ticks: { color: CHART_COLORS.mutedForeground, font: { family: 'Inter', size: 9 }, stepSize: 1 }, beginAtZero: true }
      }}
    });
  }
}

// 3. Student Charts
function initStudentCharts(user) {
  const studentCanvas = document.getElementById('studentPaymentChart');
  if (studentCanvas) {
    const enrollments = DB.get('enrollments').filter(e => e.studentId === user.studentId && e.status !== 'Cancelled');
    const totalFee = enrollments.reduce((s, e) => s + Number(e.totalFee), 0);
    const paid = enrollments.reduce((s, e) => s + Number(e.paidAmount || 0), 0);
    const pending = Math.max(0, totalFee - paid);
    const paidPct = totalFee > 0 ? Math.round((paid / totalFee) * 100) : 0;
    renderAnimatedChart(studentCanvas, {
      type: 'doughnut',
      data: { labels: ['Paid', 'Pending'], datasets: [{ data: [paid, pending], backgroundColor: [CHART_COLORS.primary, CHART_COLORS.brandMuted], borderWidth: 2, borderColor: '#fff', hoverOffset: 4 }] },
      options: { ...getCommonOptions(), cutout: '72%', plugins: { ...getCommonOptions().plugins, tooltip: { ...getCommonOptions().plugins.tooltip, callbacks: { label: function(ctx) { return ' ' + ctx.label + ': ₹' + ctx.raw.toLocaleString('en-IN'); } } } } },
      plugins: [{ id: 'centerText', beforeDraw(chart) {
        const { ctx, chartArea: { top, left, width, height } } = chart; ctx.restore();
        const cx = left + width / 2, cy = top + height / 2;
        ctx.font = `bold ${(height / 120).toFixed(2)}em Inter`; ctx.textBaseline = 'middle'; ctx.fillStyle = CHART_COLORS.foreground;
        const text = `${paidPct}%`; ctx.fillText(text, cx - ctx.measureText(text).width / 2, cy); ctx.save();
      }}]
    });
  }
}

// 4. Reports Charts
function initPendingFeesAgingChart() {
  const agingCanvas = document.getElementById('pendingFeesAgingChart');
  if (agingCanvas) {
    const enrollments = DB.get('enrollments').filter(e => e.status !== 'Cancelled');
    const defaulters = enrollments.filter(e => e.totalFee - (e.paidAmount || 0) > 0);
    let dueSoonTotal = 0, overdueTotal = 0;
    defaulters.forEach(e => {
      const pending = e.totalFee - (e.paidAmount || 0);
      const daysSince = Math.floor((Date.now() - new Date(e.enrollDate)) / (1000 * 60 * 60 * 24));
      if (daysSince > 30) overdueTotal += pending; else dueSoonTotal += pending;
    });
    renderAnimatedChart(agingCanvas, {
      type: 'doughnut',
      data: { labels: ['Due Soon (≤ 30 days)', 'Overdue (> 30 days)'], datasets: [{ data: [dueSoonTotal, overdueTotal], backgroundColor: [CHART_COLORS.brandMuted, CHART_COLORS.brandDark], borderWidth: 2, borderColor: '#fff', hoverOffset: 4 }] },
      options: { ...getCommonOptions(), cutout: '72%', plugins: { ...getCommonOptions().plugins, tooltip: { ...getCommonOptions().plugins.tooltip, callbacks: { label: function(ctx) { return ' ' + ctx.label + ': ₹' + ctx.raw.toLocaleString('en-IN'); } } } } },
      plugins: [{ id: 'centerText', beforeDraw(chart) {
        const { ctx, chartArea: { top, left, width, height } } = chart; ctx.restore();
        const cx = left + width / 2, cy = top + height / 2;
        ctx.font = `bold ${(height / 150).toFixed(2)}em Inter`; ctx.textBaseline = 'middle'; ctx.fillStyle = CHART_COLORS.foreground;
        const text = "₹" + Number(dueSoonTotal + overdueTotal).toLocaleString('en-IN');
        ctx.fillText(text, cx - ctx.measureText(text).width / 2, cy - 10);
        ctx.font = `600 ${(height / 220).toFixed(2)}em Inter`; ctx.fillStyle = CHART_COLORS.mutedForeground;
        const label = "PENDING TOTAL"; ctx.fillText(label, cx - ctx.measureText(label).width / 2, cy + 15); ctx.save();
      }}]
    });
  }
}

function initCourseEnrollmentReportChart() {
  const reportCanvas = document.getElementById('courseEnrollmentReportChart');
  if (reportCanvas) {
    const courses = DB.get('courses');
    const labels = courses.map(c => c.name);
    const enrolledData = [], capacityData = [], waitlistData = [];
    courses.forEach(c => {
      enrolledData.push(DB.get('enrollments').filter(e => e.courseId === c.id && e.status !== 'Cancelled').length);
      capacityData.push(c.capacity);
      waitlistData.push(DB.get('waitlist').filter(w => w.courseId === c.id).length);
    });
    renderAnimatedChart(reportCanvas, {
      type: 'bar',
      data: { labels, datasets: [
        { label: 'Enrolled', data: enrolledData, backgroundColor: CHART_COLORS.primary, borderRadius: 4, barThickness: 12 },
        { label: 'Waitlist', data: waitlistData, backgroundColor: CHART_COLORS.brandDark, borderRadius: 4, barThickness: 12 },
        { label: 'Capacity', data: capacityData, backgroundColor: CHART_COLORS.border, borderRadius: 4, barThickness: 12 }
      ]},
      options: { ...getCommonOptions(), scales: {
        x: { grid: { display: false }, ticks: { color: CHART_COLORS.mutedForeground, font: { family: 'Inter', size: 10 } } },
        y: { grid: { color: CHART_COLORS.border, drawBorder: false }, ticks: { color: CHART_COLORS.mutedForeground, stepSize: 2, font: { family: 'Inter', size: 10 } }, beginAtZero: true }
      }}
    });
  }
}

function initPaymentModeBreakdownChart() {
  const canvas = document.getElementById('paymentModeChart');
  if (!canvas) return;
  const payments = DB.get('payments');
  const modesMap = {};
  payments.forEach(p => { const m = p.mode || 'Other'; modesMap[m] = (modesMap[m] || 0) + Number(p.amount); });
  const labels = Object.keys(modesMap);
  const data = Object.values(modesMap);
  const bgPalette = ['#0F9D8C', '#8b5cf6', '#f59e0b', '#3b82f6', '#ec4899'];
  renderAnimatedChart(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: bgPalette.slice(0, labels.length), borderWidth: 2, borderColor: '#fff', hoverOffset: 4 }] },
    options: { ...getCommonOptions(), cutout: '72%', plugins: { ...getCommonOptions().plugins, tooltip: { ...getCommonOptions().plugins.tooltip, callbacks: { label: function(ctx) { return ' ' + ctx.label + ': ₹' + ctx.raw.toLocaleString('en-IN'); } } } } }
  });
}
