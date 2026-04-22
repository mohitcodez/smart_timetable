/**
 * login.js — Authentication for Smart Timetable System
 *
 * Simple credential check against hardcoded demo credentials.
 * In production this would be replaced by a real auth API call.
 */
(function () {
  'use strict';

  /* ── Credentials (demo only) ──────────────────────────────────── */
  var VALID_USERNAME = 'admin';
  var VALID_PASSWORD = 'admin123';

  /* ── DOM references ───────────────────────────────────────────── */
  var form     = document.getElementById('loginForm');
  var userEl   = document.getElementById('username');
  var passEl   = document.getElementById('password');
  var errorEl  = document.getElementById('errorMsg');

  /* Redirect if already logged in */
  if (sessionStorage.getItem('ttsUser')) {
    window.location.replace('dashboard.html');
  }

  /* ── Submit handler ───────────────────────────────────────────── */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorEl.style.display = 'none';

    var username = userEl.value.trim();
    var password = passEl.value;

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      sessionStorage.setItem('ttsUser', username);
      window.location.replace('dashboard.html');
    } else {
      errorEl.style.display = 'block';
      passEl.value = '';
      passEl.focus();
    }
  });
}());
