// seed.js - Loads seed.json into localStorage on first run
function cleanupStudentLegacyFields() {
  const students = DB.get("students");
  if (!students.length) return;

  let changed = false;
  const cleaned = students.map((student) => {
    if (!("emergencyName" in student) && !("emergencyPhone" in student)) {
      return student;
    }

    changed = true;
    const { emergencyName, emergencyPhone, ...rest } = student;
    return rest;
  });

  if (changed) {
    DB.set("students", cleaned);
  }
}

async function initSeed() {
  if (localStorage.getItem("seeded") === "true") {
    cleanupStudentLegacyFields();
    return;
  }
  try {
    const res = await fetch("../data/seed.json").catch(() =>
      fetch("data/seed.json"),
    );
    const data = await res.json();
    Object.keys(data).forEach((key) => {
      localStorage.setItem(key, JSON.stringify(data[key]));
    });
    localStorage.setItem("seeded", "true");
    cleanupStudentLegacyFields();
  } catch (e) {
    console.error("Seeding failed", e);
  }
}

// Utility to reset all data (useful during dev/testing)
function resetSeed() {
  localStorage.removeItem("seeded");
  DB.COLLECTIONS.forEach((c) => localStorage.removeItem(c));
  location.reload();
}
