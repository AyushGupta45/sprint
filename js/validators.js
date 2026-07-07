
// validators.js - Field level validation helpers

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).trim());
}

// Indian mobile number: starts with 6/7/8/9, exactly 10 digits
function validatePhone(phone) {
  const re = /^[6-9]\d{9}$/;
  return re.test(String(phone).trim());
}

function validateRequired(value) {
  return value !== undefined && value !== null && String(value).trim().length > 0;
}

// Returns { valid: bool, score: 0-4, label: 'Weak'|'Medium'|'Strong'|'Very Strong' }
function checkPasswordStrength(password) {
  let score = 0;
  if (!password) return { valid: false, score: 0, label: 'Weak' };
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  let label = 'Weak';
  if (score === 2) label = 'Medium';
  else if (score === 3) label = 'Strong';
  else if (score === 4) label = 'Very Strong';

  const valid = password.length >= 8 && score >= 3;
  return { valid, score, label };
}

function passwordsMatch(p1, p2) {
  return p1 === p2 && p1.length > 0;
}

// Applies red/green class + error message under an input field
function setFieldError(inputEl, message) {
  const wrapper = inputEl.closest('.form-group');
  if (!wrapper) return;
  let errorEl = wrapper.querySelector('.field-error');
  if (!errorEl) {
    errorEl = document.createElement('span');
    errorEl.className = 'field-error';
    wrapper.appendChild(errorEl);
  }
  if (message) {
    inputEl.classList.add('input-error');
    inputEl.classList.remove('input-valid');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  } else {
    inputEl.classList.remove('input-error');
    inputEl.classList.add('input-valid');
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }
}
