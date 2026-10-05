
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
  var confirmPassInput = document.getElementById('registerConfirmPassword');

  var termsInput = document.getElementById('acceptTerms');
  var termsError = document.getElementById('registerTermsError');

  var btn = document.getElementById('registerBtn');

  // -----------------------------------
  // Show field error
  // -----------------------------------
  function showFieldError(input, msg) {
    var field = input.closest('.login-field');

    if (!field) return;

    field.classList.add('login-field-error');
    input.classList.add('invalid');

    var errorEl = field.querySelector('.register-error');

    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    }
  }

  // -----------------------------------
  // Clear field error
  // -----------------------------------
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

  // -----------------------------------
  // Live validation while typing
  // -----------------------------------
  form.addEventListener('input', function (e) {

    var t = e.target;

    // NAME
    if (t.id === 'registerName') {

      clearFieldError(t);

      if (!/^[A-Za-zÀ-ÿ'\- ]{2,40}$/.test(t.value.trim())) {
        showFieldError(
          t,
          'Enter a valid full name (2-40 letters).'
        );
      }
    }

    // EMAIL
    else if (t.id === 'registerEmail') {

      clearFieldError(t);

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t.value.trim())) {
        showFieldError(
          t,
          'Enter a valid email address.'
        );
      }
    }

    // PASSWORD
    else if (t.id === 'registerPassword') {

      clearFieldError(t);

      if (t.value.length < 4) {
        showFieldError(
          t,
          'Password must be at least 4 characters.'
        );
      }

      // Also validate confirm password if user already entered it
      if (confirmPassInput.value !== '') {

        clearFieldError(confirmPassInput);

        if (confirmPassInput.value !== t.value) {
          showFieldError(
            confirmPassInput,
            'Passwords do not match.'
          );
        }
      }
    }

    // CONFIRM PASSWORD
    else if (t.id === 'registerConfirmPassword') {

      clearFieldError(t);

      if (t.value.length < 4) {

        showFieldError(
          t,
          'Confirm password must be at least 4 characters.'
        );

      } else if (t.value !== passInput.value) {

        showFieldError(
          t,
          'Passwords do not match.'
        );
      }
    }
  });


  // -----------------------------------
  // Submit validation
  // -----------------------------------
  form.addEventListener('submit', function (e) {

    e.preventDefault();

    var ok = true;

    // -----------------------------------
    // Terms validation
    // -----------------------------------
    if (!termsInput.checked) {

      if (termsError) {
        termsError.textContent =
          'Please accept the Terms of Service and Privacy Policy.';
      }

      termsInput.focus();

      ok = false;

    } else {

      if (termsError) {
        termsError.textContent = '';
      }
    }


    // -----------------------------------
    // Get values
    // -----------------------------------
    var name = nameInput.value.trim();
    var email = emailInput.value.trim();
    var pass = passInput.value;
    var confirmPass = confirmPassInput.value;


    // -----------------------------------
    // Name validation
    // -----------------------------------
    if (!/^[A-Za-zÀ-ÿ'\- ]{2,40}$/.test(name)) {

      showFieldError(
        nameInput,
        'Enter a valid full name (2-40 letters).'
      );

      ok = false;

    } else {

      clearFieldError(nameInput);
    }


    // -----------------------------------
    // Email validation
    // -----------------------------------
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {

      showFieldError(
        emailInput,
        'Enter a valid email address.'
      );

      ok = false;

    } else {

      clearFieldError(emailInput);
    }


    // -----------------------------------
    // Password validation
    // -----------------------------------
    if (pass.length < 4) {

      showFieldError(
        passInput,
        'Password must be at least 4 characters.'
      );

      ok = false;

    } else {

      clearFieldError(passInput);
    }


    // -----------------------------------
    // Confirm password validation
    // -----------------------------------
    if (confirmPass.length < 4) {

      showFieldError(
        confirmPassInput,
        'Confirm password must be at least 4 characters.'
      );

      ok = false;

    } else if (pass !== confirmPass) {

      showFieldError(
        confirmPassInput,
        'Passwords do not match.'
      );

      ok = false;

    } else {

      clearFieldError(confirmPassInput);
    }


    // -----------------------------------
    // Stop if validation failed
    // -----------------------------------
    if (!ok) {

      if (status) {
        status.className = 'login-status login-error';
        status.textContent =
          'Please fix the highlighted fields.';
      }

      return;
    }


    // -----------------------------------
    // Account creation
    // -----------------------------------
    status.className = 'login-status';
    window.location.hash = './login.html';

    btn.disabled = true;

    setTimeout(function () {

      var result = window.StacklyAuth.registerUser(
        email,
        pass
      );

      if (result.email) {

        status.className = 'login-status login-ok';

        status.innerHTML =
          '<span class="login-spinner"></span> Account created for <strong>' +
          window.StacklyAuth.deriveName(email) +
          '</strong>. Redirecting to dashboard...';

        setTimeout(function () {

          window.location.href = 'user-dashboard.html';

        }, 700);

      } else {

        status.className = 'login-status login-error';

        status.textContent =
          'This email is already registered. Try logging in instead.';
      }

      btn.disabled = false;

      btn.querySelector('span:last-child').textContent =
        'person_add';

    }, 500);
  });


  // -----------------------------------
  // Load saved values
  // -----------------------------------
  try {

    var savedName =
      localStorage.getItem('registerName');

    var savedEmail =
      localStorage.getItem('registerEmail');

    if (savedName && nameInput) {
      nameInput.value = savedName;
    }

    if (savedEmail && emailInput) {
      emailInput.value = savedEmail;
    }

  } catch (err) {}

})();
