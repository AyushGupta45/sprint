// charts.js - Chart.js visualizations for EduTrack CEFTS
// Uses Neutral theme colors: --primary, --secondary, --success, --warning, --destructive

const CHART_COLORS = {
  primary: 'hsl(222.2, 47.4%, 11.2%)',
  primaryForeground: 'hsl(210, 40%, 98%)',
  secondary: 'hsl(210, 40%, 96.1%)',
  mutedForeground: 'hsl(215.4, 16.3%, 46.9%)',
  border: 'hsl(214.3, 31.8%, 91.4%)',
  success: 'hsl(142, 71%, 45%)',
  warning: 'hsl(38, 92%, 50%)',
  destructive: 'hsl(0, 84.2%, 60.2%)',
};

// Global chart options helper
const getCommonOptions = (isDark = false) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        font: { family: 'Inter', size: 11 },
        color: CHART_COLORS.mutedForeground,
        usePointStyle: true,
        padding: 15
      }
    },
    tooltip: {
      backgroundColor: CHART_COLORS.primary,
      titleColor: CHART_COLORS.primaryForeground,
      bodyColor: CHART_COLORS.primaryForeground,
      borderColor: CHART_COLORS.border,
      borderWidth: 1,
      padding: 10,
      cornerRadius: 6,
      bodyFont: { family: 'Inter' },
      titleFont: { family: 'Inter', weight: 'bold' }
    }
  }
});

// 1. Admin Charts
function initAdminCharts() {
  const enrollments = DB.get('enrollments');
  const payments = DB.get('payments');
  const courses = DB.get('courses');

  // --- Chart A: Enrollment Trend (Last 8 Weeks) ---
  const enrollmentCanvas = document.getElementById('enrollmentTrendChart');
  if (enrollmentCanvas) {
    // Determine max date in database to keep the dashboard populated
    let maxDate = new Date();
    if (enrollments.length > 0) {
      const dates = enrollments.map(e => new Date(e.enrollDate)).filter(d => !isNaN(d));
      if (dates.length > 0) {
        maxDate = new Date(Math.max(...dates));
      }
    }

    // Build 8 weekly buckets ending at maxDate
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

    new Chart(enrollmentCanvas, {
      type: 'line',
      data: {
        labels: weeks.map(w => w.label),
        datasets: [{
          label: 'Enrollments',
          data: weeks.map(w => w.count),
          borderColor: CHART_COLORS.primary,
          backgroundColor: 'rgba(15, 23, 42, 0.05)',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointBackgroundColor: CHART_COLORS.primary
        }]
      },
      options: {
        ...getCommonOptions(),
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: CHART_COLORS.mutedForeground, font: { family: 'Inter', size: 10 } }
          },
          y: {
            grid: { color: CHART_COLORS.border },
            ticks: { 
              color: CHART_COLORS.mutedForeground, 
              font: { family: 'Inter', size: 10 },
              stepSize: 1
            },
            beginAtZero: true
          }
        }
      }
    });
  }

  // --- Chart B: Fee Collection Overview (Paid vs Pending) ---
  const feeCanvas = document.getElementById('feeCollectionChart');
  if (feeCanvas) {
    const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);
    const totalFeeExpected = enrollments.reduce((s, e) => s + Number(e.totalFee), 0);
    const pending = Math.max(0, totalFeeExpected - totalCollected);

    new Chart(feeCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Paid', 'Pending'],
        datasets: [{
          data: [totalCollected, pending],
          backgroundColor: [CHART_COLORS.success, CHART_COLORS.warning],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        ...getCommonOptions(),
        cutout: '65%',
        plugins: {
          ...getCommonOptions().plugins,
          tooltip: {
            ...getCommonOptions().plugins.tooltip,
            callbacks: {
              label: function(context) {
                return ' ' + context.label + ': ₹' + context.raw.toLocaleString('en-IN');
              }
            }
          }
        }
      }
    });
  }

  // --- Chart C: Top Courses by Enrollment ---
  const topCoursesCanvas = document.getElementById('topCoursesChart');
  if (topCoursesCanvas) {
    const counts = {};
    courses.forEach(c => { counts[c.id] = { name: c.name, count: 0 }; });
    enrollments.forEach(e => {
      if (e.status !== 'Cancelled' && counts[e.courseId]) {
        counts[e.courseId].count++;
      }
    });

    const sorted = Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    new Chart(topCoursesCanvas, {
      type: 'bar',
      data: {
        labels: sorted.map(x => x.name),
        datasets: [{
          label: 'Students Enrolled',
          data: sorted.map(x => x.count),
          backgroundColor: CHART_COLORS.primary,
          borderRadius: 4
        }]
      },
      options: {
        ...getCommonOptions(),
        indexAxis: 'y',
        scales: {
          x: {
            grid: { color: CHART_COLORS.border },
            ticks: { color: CHART_COLORS.mutedForeground, stepSize: 1 },
            beginAtZero: true
          },
          y: {
            grid: { display: false },
            ticks: { color: CHART_COLORS.mutedForeground, font: { family: 'Inter', size: 10 } }
          }
        }
      }
    });
  }
}

// 2. Faculty Charts
function initFacultyCharts(user) {
  const seatsCanvas = document.getElementById('facultySeatsChart');
  if (seatsCanvas) {
    const courses = DB.get('courses').filter(c => c.facultyId === user.id);
    const courseIds = courses.map(c => c.id);
    const enrollments = DB.get('enrollments').filter(e => courseIds.includes(e.courseId) && e.status !== 'Cancelled');

    const totalCapacity = courses.reduce((s, c) => s + Number(c.capacity), 0);
    const seatsFilled = enrollments.length;
    const seatsAvailable = Math.max(0, totalCapacity - seatsFilled);

    new Chart(seatsCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Seats Filled', 'Seats Available'],
        datasets: [{
          data: [seatsFilled, seatsAvailable],
          backgroundColor: [CHART_COLORS.primary, CHART_COLORS.secondary],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        ...getCommonOptions(),
        cutout: '70%'
      }
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

    new Chart(studentCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Paid', 'Pending'],
        datasets: [{
          data: [paid, pending],
          backgroundColor: [CHART_COLORS.success, CHART_COLORS.warning],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        ...getCommonOptions(),
        cutout: '70%',
        plugins: {
          ...getCommonOptions().plugins,
          tooltip: {
            ...getCommonOptions().plugins.tooltip,
            callbacks: {
              label: function(context) {
                return ' ' + context.label + ': ₹' + context.raw.toLocaleString('en-IN');
              }
            }
          }
        }
      }
    });
  }
}

// 4. Reports Charts
function initPendingFeesAgingChart() {
  const agingCanvas = document.getElementById('pendingFeesAgingChart');
  if (agingCanvas) {
    const enrollments = DB.get('enrollments').filter(e => e.status !== 'Cancelled');
    const defaulters = enrollments.filter(e => e.totalFee - (e.paidAmount || 0) > 0);

    let dueSoonTotal = 0;
    let overdueTotal = 0;

    defaulters.forEach(e => {
      const pending = e.totalFee - (e.paidAmount || 0);
      const daysSince = Math.floor((Date.now() - new Date(e.enrollDate)) / (1000 * 60 * 60 * 24));
      if (daysSince > 30) {
        overdueTotal += pending;
      } else {
        dueSoonTotal += pending;
      }
    });

    new Chart(agingCanvas, {
      type: 'pie',
      data: {
        labels: ['Due Soon (≤ 30 days)', 'Overdue (> 30 days)'],
        datasets: [{
          data: [dueSoonTotal, overdueTotal],
          backgroundColor: [CHART_COLORS.warning, CHART_COLORS.destructive],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        ...getCommonOptions(),
        plugins: {
          ...getCommonOptions().plugins,
          tooltip: {
            ...getCommonOptions().plugins.tooltip,
            callbacks: {
              label: function(context) {
                return ' ' + context.label + ': ₹' + context.raw.toLocaleString('en-IN');
              }
            }
          }
        }
      }
    });
  }
}

function initCourseEnrollmentReportChart() {
  const reportCanvas = document.getElementById('courseEnrollmentReportChart');
  if (reportCanvas) {
    const courses = DB.get('courses');
    const labels = courses.map(c => c.name);
    
    const enrolledData = [];
    const capacityData = [];
    const waitlistData = [];

    courses.forEach(c => {
      const enrolledCount = DB.get('enrollments').filter(e => e.courseId === c.id && e.status !== 'Cancelled').length;
      const waitlistCount = DB.get('waitlist').filter(w => w.courseId === c.id).length;
      
      enrolledData.push(enrolledCount);
      capacityData.push(c.capacity);
      waitlistData.push(waitlistCount);
    });

    new Chart(reportCanvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Enrolled',
            data: enrolledData,
            backgroundColor: CHART_COLORS.primary,
            borderRadius: 4
          },
          {
            label: 'Capacity',
            data: capacityData,
            backgroundColor: CHART_COLORS.secondary,
            borderRadius: 4
          },
          {
            label: 'Waitlist',
            data: waitlistData,
            backgroundColor: CHART_COLORS.warning,
            borderRadius: 4
          }
        ]
      },
      options: {
        ...getCommonOptions(),
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: CHART_COLORS.mutedForeground, font: { family: 'Inter', size: 10 } }
          },
          y: {
            grid: { color: CHART_COLORS.border },
            ticks: { color: CHART_COLORS.mutedForeground, stepSize: 1 },
            beginAtZero: true
          }
        }
      }
    });
  }
}
