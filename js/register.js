/**
 * STACKLY ENERGY — REGISTER PAGE VALIDATION + AUTH
 */
(function () {
  'use strict';

  var form = document.getElementById('registerForm');
  if (!form) return;

  var status = document.getElementById('registerStatus');
  var nameInput = document.getElementById('registerName');
  var emailInput = document.getElementById('registerEmail');
  var passInput = document.getElementById('registerPassword');
  var termsInput = document.getElementById('acceptTerms');
  var termsError = document.getElementById('registerTermsError');
  var nameError = document.getElementById('registerNameError');
  var emailError = document.getElementById('registerEmailError');
  var passError = document.getElementById('registerPasswordError');
  var btn = document.getElementById('registerBtn');

  function showFieldError(input, msg) {
    var field = input.closest('.login-field');
    var icon = field ? field.querySelector('.input-icon') : null;
    field.classList.add('login-field-error');
    input.classList.add('invalid');

    if (msg) {
      var errorEl = field ? field.querySelector('.register-error') : null;
      if (errorEl) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
      }
    }
  }

  function clearFieldError(input) {
    var field = input.closest('.login-field');
    if (field) {
      field.classList.remove('login-field-error');
      input.classList.remove('invalid');
      var errorEl = field.querySelector('.register-error');
      if (errorEl) {
        errorEl.style.display = 'none';
        errorEl.textContent = '';
      }
    }
  }

  form.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'registerName') {
      clearFieldError(t);
      if (!/^[A-Za-zÀ-ÿ'\- ]{2,40}$/.test(t.value.trim())) {
        showFieldError(t, 'Enter a valid full name (2-40 letters).');
      }
    } else if (t.id === 'registerEmail') {
      clearFieldError(t);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t.value.trim())) {
        showFieldError(t, 'Enter a valid email address.');
      }
    } else if (t.id === 'registerPassword') {
      clearFieldError(t);
      if (t.value.length < 4) {
        showFieldError(t, 'Password must be at least 4 characters.');
      }
    }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!termsInput.checked) {
      if (termsError) termsError.textContent = 'Please accept the Terms of Service and Privacy Policy.';
      termsInput.focus();
      return;
    }
    termsError.textContent = '';

    var name = nameInput.value.trim();
    var email = emailInput.value.trim();
    var pass = passInput.value;

    var ok = true;

    if (!/^[A-Za-zÀ-ÿ'\- ]{2,40}$/.test(name)) {
      showFieldError(nameInput, 'Enter a valid full name (2-40 letters).');
      ok = false;
    } else {
      clearFieldError(nameInput);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      showFieldError(emailInput, 'Enter a valid email address.');
      ok = false;
    } else {
      clearFieldError(emailInput);
    }

    if (pass.length < 4) {
      showFieldError(passInput, 'Password must be at least 4 characters.');
      ok = false;
    } else {
      clearFieldError(passInput);
    }

    if (!ok) {
      if (status) {
        status.className = 'login-status login-error';
        status.textContent = 'Please fix the highlighted fields.';
      }
      return;
    }

    status.className = 'login-status';
    status.textContent = 'Creating account...';

    btn.disabled = true;
   window.location.href = './login.html';

    setTimeout(function () {
      var result = window.StacklyAuth.registerUser(email, pass);

      if (result.email) {
        status.className = 'login-status login-ok';
        status.innerHTML = '<span class="login-spinner"></span> Account created for <strong>' + window.StacklyAuth.deriveName(email) + '</strong>. Redirecting to dashboard...';

        setTimeout(function () {
          window.location.href = 'user-dashboard.html';
        }, 700);
      } else {
        status.className = 'login-status login-error';
        status.textContent = 'This email is already registered. Try logging in instead.';
      }

      btn.disabled = false;
      btn.querySelector('span:last-child').textContent = 'person_add';
    }, 500);
  });

  try {
    var savedName = localStorage.getItem('registerName');
    var savedEmail = localStorage.getItem('registerEmail');
    if (savedName && nameInput) nameInput.value = savedName;
    if (savedEmail && emailInput) emailInput.value = savedEmail;
  } catch (err) {}
})();
