(function () {
'use strict';

var VALID_USERNAME = 'admin';
var VALID_PASSWORD = 'admin123';

var form = document.getElementById('loginForm');
var userEl = document.getElementById('username');
var passEl = document.getElementById('password');
var errorEl = document.getElementById('errorMsg');

if (sessionStorage.getItem('ttsUser')) {
window.location.replace('dashboard.html');
}

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