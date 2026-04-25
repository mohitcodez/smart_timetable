(function() {
'use strict';

var currentUser = sessionStorage.getItem('ttsUser');
if (!currentUser) {
window.location.replace('index.html');
return;
}

document.getElementById('topbarUser').textContent = currentUser;
document.getElementById('topbarAvatar').textContent = currentUser.charAt(0).toUpperCase();

document.getElementById('btnLogout').addEventListener('click', function() {
sessionStorage.removeItem('ttsUser');
window.location.replace('index.html');
});

var STORAGE_KEYS = {
teachers: 'tts_teachers',
rooms: 'tts_rooms',
subjects: 'tts_subjects',
batches: 'tts_batches'
};

var SEED_VERSION_KEY = 'tts_sample_seed_version';
var CURRENT_SEED_VERSION = window.TTS_SAMPLE_DATA_VERSION || 'embedded-sample';

function loadData(key) {
var raw = localStorage.getItem(key);
if (!raw) return [];
try {
return JSON.parse(raw) || [];
} catch (error) {
return [];
}
}

function saveData(key, data) {
localStorage.setItem(key, JSON.stringify(data));
}

function copyObject(obj) {
return JSON.parse(JSON.stringify(obj));
}

var database = {
teachers: loadData(STORAGE_KEYS.teachers),
rooms: loadData(STORAGE_KEYS.rooms),
subjects: loadData(STORAGE_KEYS.subjects),
batches: loadData(STORAGE_KEYS.batches)
};

function saveAllData() {
saveData(STORAGE_KEYS.teachers, database.teachers);
saveData(STORAGE_KEYS.rooms, database.rooms);
saveData(STORAGE_KEYS.subjects, database.subjects);
saveData(STORAGE_KEYS.batches, database.batches);
}

function normalizeSampleData(rawData) {
var sample = copyObject(rawData || {});
var teacherSubjects = {};

sample.teachers = sample.teachers || [];
sample.rooms = sample.rooms || [];
sample.subjects = sample.subjects || [];
sample.batches = sample.batches || [];

for (var i = 0; i < sample.teachers.length; i++) {
var teacherId = sample.teachers[i].teacher_id;
teacherSubjects[teacherId] = [];
}

for (var j = 0; j < sample.subjects.length; j++) {
var subject = sample.subjects[j];
var teacherId = subject.teacher_id;
if (!teacherSubjects[teacherId]) {
teacherSubjects[teacherId] = [];
}
teacherSubjects[teacherId].push(subject.subject_name);
}

sample.teachers = sample.teachers.map(function(teacher) {
var copy = copyObject(teacher);
if (!copy.subjects) {
copy.subjects = (teacherSubjects[copy.teacher_id] || []).join(', ');
}
return copy;
});

return sample;
}

function loadSampleData() {
if (!window.TTS_SAMPLE_DATA) return false;

var sample = normalizeSampleData(window.TTS_SAMPLE_DATA);
database.teachers = sample.teachers;
database.rooms = sample.rooms;
database.subjects = sample.subjects;
database.batches = sample.batches;
saveAllData();
localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION);
return true;
}

if (window.TTS_SAMPLE_DATA && localStorage.getItem(SEED_VERSION_KEY) !== CURRENT_SEED_VERSION) {
loadSampleData();
}

if (database.teachers.length === 0) {
database.teachers = [
{ teacher_id: 1, teacher_name: 'Dr. Sharma', subjects: 'Mathematics', availability: 'all' },
{ teacher_id: 2, teacher_name: 'Prof. Gupta', subjects: 'Physics', availability: 'all' },
{ teacher_id: 3, teacher_name: 'Ms. Verma', subjects: 'Chemistry', availability: 'all' },
{ teacher_id: 4, teacher_name: 'Mr. Singh', subjects: 'Computer Science', availability: 'all' },
{ teacher_id: 5, teacher_name: 'Dr. Mehta', subjects: 'English', availability: 'all' }
];
saveData(STORAGE_KEYS.teachers, database.teachers);
}

if (database.rooms.length === 0) {
database.rooms = [
{ room_id: 1, room_name: 'R101', capacity: 60 },
{ room_id: 2, room_name: 'R102', capacity: 50 },
{ room_id: 3, room_name: 'R103', capacity: 40 },
{ room_id: 4, room_name: 'Lab-A', capacity: 30 }
];
saveData(STORAGE_KEYS.rooms, database.rooms);
}

if (database.subjects.length === 0) {
database.subjects = [
{ subject_id: 1, subject_name: 'Mathematics', teacher_id: 1, lectures_per_week: 2 },
{ subject_id: 2, subject_name: 'Physics', teacher_id: 2, lectures_per_week: 2 },
{ subject_id: 3, subject_name: 'Chemistry', teacher_id: 3, lectures_per_week: 2 },
{ subject_id: 4, subject_name: 'Computer Science', teacher_id: 4, lectures_per_week: 2 },
{ subject_id: 5, subject_name: 'English', teacher_id: 5, lectures_per_week: 1 }
];
saveData(STORAGE_KEYS.subjects, database.subjects);
}

if (database.batches.length === 0) {
database.batches = [
{ batch_id: 1, batch_name: 'CSE-A', student_count: 55 },
{ batch_id: 2, batch_name: 'CSE-B', student_count: 48 },
{ batch_id: 3, batch_name: 'ECE-A', student_count: 35 }
];
saveData(STORAGE_KEYS.batches, database.batches);
}

function getNextId(itemList, idField) {
var maxId = 0;
for (var i = 0; i < itemList.length; i++) {
if (itemList[i][idField] > maxId) {
maxId = itemList[i][idField];
}
}
return maxId + 1;
}

function findById(itemList, fieldName, id) {
for (var i = 0; i < itemList.length; i++) {
if (itemList[i][fieldName] === id) {
return itemList[i];
}
}
return null;
}

function removeById(itemList, fieldName, id) {
var result = [];
for (var i = 0; i < itemList.length; i++) {
if (itemList[i][fieldName] !== id) {
result.push(itemList[i]);
}
}
return result;
}

var toastElement = document.getElementById('toast');
var toastTimeout = null;

function showToast(message, type) {
type = type || 'info';
toastElement.textContent = message;
toastElement.className = 'toast ' + type;
toastElement.offsetHeight;
toastElement.classList.add('show');

if (toastTimeout) clearTimeout(toastTimeout);
toastTimeout = setTimeout(function() {
toastElement.classList.remove('show');
}, 3000);
}

function openModal(modalId) {
document.getElementById(modalId).classList.add('open');
}

function closeModal(modalId) {
document.getElementById(modalId).classList.remove('open');
}

var closeButtons = document.querySelectorAll('[data-close]');
for (var i = 0; i < closeButtons.length; i++) {
closeButtons[i].addEventListener('click', function() {
closeModal(this.dataset.close);
});
}

var modalOverlays = document.querySelectorAll('.modal-overlay');
for (var j = 0; j < modalOverlays.length; j++) {
modalOverlays[j].addEventListener('click', function(event) {
if (event.target === this) {
closeModal(this.id);
}
});
}

var sectionTitles = {
dashboard: 'Dashboard',
teachers: 'Teachers',
rooms: 'Rooms',
subjects: 'Subjects',
batches: 'Student Batches',
generate: 'Generate Timetable',
timetable: 'View Timetable'
};

function showSection(sectionName) {
var allSections = document.querySelectorAll('.section');
for (var i = 0; i < allSections.length; i++) {
allSections[i].classList.remove('active');
}

var allNavItems = document.querySelectorAll('.nav-item');
for (var j = 0; j < allNavItems.length; j++) {
allNavItems[j].classList.remove('active');
}

var targetSection = document.getElementById('sec-' + sectionName);
if (targetSection) {
targetSection.classList.add('active');
}

var targetNav = document.querySelector('[data-section="' + sectionName + '"]');
if (targetNav) {
targetNav.classList.add('active');
}

document.getElementById('pageTitle').textContent = sectionTitles[sectionName] || '';
updateStats();
}

var navItems = document.querySelectorAll('.nav-item');
for (var k = 0; k < navItems.length; k++) {
navItems[k].addEventListener('click', function() {
showSection(this.dataset.section);
});
}

function updateStats() {
document.getElementById('stat-teachers').textContent = database.teachers.length;
document.getElementById('stat-rooms').textContent = database.rooms.length;
document.getElementById('stat-subjects').textContent = database.subjects.length;
document.getElementById('stat-batches').textContent = database.batches.length;
}
updateStats();

var BADGE_COLORS = ['badge-blue', 'badge-green', 'badge-orange', 'badge-sky', 'badge-purple'];

function getBadgeColor(index) {
return BADGE_COLORS[index % BADGE_COLORS.length];
}

function escapeHtml(text) {
return String(text)
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;');
}

function renderTeachers() {
var tbody = document.getElementById('teachersBody');
if (database.teachers.length === 0) {
tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><p>No teachers added yet.</p></td></tr>';
return;
}

var html = '';
for (var i = 0; i < database.teachers.length; i++) {
var teacher = database.teachers[i];
html += '<tr>' +
'<td><span class="badge ' + getBadgeColor(i) + '">#' + teacher.teacher_id + '</span></td>' +
'<td><strong>' + escapeHtml(teacher.teacher_name) + '</strong></td>' +
'<td>' + escapeHtml(teacher.subjects || '—') + '</td>' +
'<td>' + escapeHtml(teacher.availability || 'all') + '</td>' +
'<td>' +
'<button class="btn btn-secondary" style="padding:4px 10px;font-size:.78rem;" onclick="app.editTeacher(' + teacher.teacher_id + ')">Edit</button> ' +
'<button class="btn btn-danger" style="padding:4px 10px;font-size:.78rem;" onclick="app.deleteTeacher(' + teacher.teacher_id + ')">Delete</button>' +
'</td>' +
'</tr>';
}
tbody.innerHTML = html;
}

function openTeacherModal(teacher) {
document.getElementById('modalTeacherTitle').textContent = teacher ? 'Edit Teacher' : 'Add Teacher';
document.getElementById('tEditId').value = teacher ? teacher.teacher_id : '';
document.getElementById('tName').value = teacher ? teacher.teacher_name : '';
document.getElementById('tSubjects').value = teacher ? (teacher.subjects || '') : '';
document.getElementById('tAvailability').value = teacher ? (teacher.availability || 'all') : 'all';
openModal('modalTeacher');
}

document.getElementById('btnAddTeacher').addEventListener('click', function() {
openTeacherModal(null);
});

document.getElementById('btnSaveTeacher').addEventListener('click', function() {
var name = document.getElementById('tName').value.trim();
if (!name) {
showToast('Teacher name is required.', 'error');
return;
}

var editId = parseInt(document.getElementById('tEditId').value, 10);
var subjects = document.getElementById('tSubjects').value.trim();
var availability = document.getElementById('tAvailability').value.trim() || 'all';

if (editId) {
for (var i = 0; i < database.teachers.length; i++) {
if (database.teachers[i].teacher_id === editId) {
database.teachers[i].teacher_name = name;
database.teachers[i].subjects = subjects;
database.teachers[i].availability = availability;
break;
}
}
} else {
database.teachers.push({
teacher_id: getNextId(database.teachers, 'teacher_id'),
teacher_name: name,
subjects: subjects,
availability: availability
});
}

saveData(STORAGE_KEYS.teachers, database.teachers);
closeModal('modalTeacher');
renderTeachers();
updateStats();
showToast(editId ? 'Teacher updated.' : 'Teacher added.', 'success');
});

function editTeacher(id) {
var teacher = findById(database.teachers, 'teacher_id', id);
if (teacher) {
openTeacherModal(teacher);
}
}

function deleteTeacher(id) {
if (!confirm('Delete this teacher?')) return;
database.teachers = removeById(database.teachers, 'teacher_id', id);
saveData(STORAGE_KEYS.teachers, database.teachers);
renderTeachers();
updateStats();
showToast('Teacher deleted.', 'info');
}

function renderRooms() {
var tbody = document.getElementById('roomsBody');
if (database.rooms.length === 0) {
tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><p>No rooms added yet.</p></td></tr>';
return;
}

var html = '';
for (var i = 0; i < database.rooms.length; i++) {
var room = database.rooms[i];
html += '<tr>' +
'<td><span class="badge ' + getBadgeColor(i) + '">#' + room.room_id + '</span></td>' +
'<td><strong>' + escapeHtml(room.room_name) + '</strong></td>' +
'<td>' + room.capacity + ' students</td>' +
'<td>' +
'<button class="btn btn-secondary" style="padding:4px 10px;font-size:.78rem;" onclick="app.editRoom(' + room.room_id + ')">Edit</button> ' +
'<button class="btn btn-danger" style="padding:4px 10px;font-size:.78rem;" onclick="app.deleteRoom(' + room.room_id + ')">Delete</button>' +
'</td>' +
'</tr>';
}
tbody.innerHTML = html;
}

function openRoomModal(room) {
document.getElementById('modalRoomTitle').textContent = room ? 'Edit Room' : 'Add Room';
document.getElementById('rEditId').value = room ? room.room_id : '';
document.getElementById('rName').value = room ? room.room_name : '';
document.getElementById('rCapacity').value = room ? room.capacity : '';
openModal('modalRoom');
}

document.getElementById('btnAddRoom').addEventListener('click', function() {
openRoomModal(null);
});

document.getElementById('btnSaveRoom').addEventListener('click', function() {
var name = document.getElementById('rName').value.trim();
var capacity = parseInt(document.getElementById('rCapacity').value, 10);

if (!name || isNaN(capacity) || capacity < 1) {
showToast('Please fill in all room fields correctly.', 'error');
return;
}

var editId = parseInt(document.getElementById('rEditId').value, 10);

if (editId) {
for (var i = 0; i < database.rooms.length; i++) {
if (database.rooms[i].room_id === editId) {
database.rooms[i].room_name = name;
database.rooms[i].capacity = capacity;
break;
}
}
} else {
database.rooms.push({
room_id: getNextId(database.rooms, 'room_id'),
room_name: name,
capacity: capacity
});
}

saveData(STORAGE_KEYS.rooms, database.rooms);
closeModal('modalRoom');
renderRooms();
updateStats();
showToast(editId ? 'Room updated.' : 'Room added.', 'success');
});

function editRoom(id) {
var room = findById(database.rooms, 'room_id', id);
if (room) {
openRoomModal(room);
}
}

function deleteRoom(id) {
if (!confirm('Delete this room?')) return;
database.rooms = removeById(database.rooms, 'room_id', id);
saveData(STORAGE_KEYS.rooms, database.rooms);
renderRooms();
updateStats();
showToast('Room deleted.', 'info');
}

function populateTeacherDropdown() {
var select = document.getElementById('sTeacher');
var html = '';
for (var i = 0; i < database.teachers.length; i++) {
var teacher = database.teachers[i];
html += '<option value="' + teacher.teacher_id + '">' + escapeHtml(teacher.teacher_name) + '</option>';
}
select.innerHTML = html;
}

function renderSubjects() {
var tbody = document.getElementById('subjectsBody');
if (database.subjects.length === 0) {
tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><p>No subjects added yet.</p></td></tr>';
return;
}

var html = '';
for (var i = 0; i < database.subjects.length; i++) {
var subject = database.subjects[i];
var teacher = findById(database.teachers, 'teacher_id', subject.teacher_id);
html += '<tr>' +
'<td><span class="badge ' + getBadgeColor(i) + '">#' + subject.subject_id + '</span></td>' +
'<td><strong>' + escapeHtml(subject.subject_name) + '</strong></td>' +
'<td>' + (teacher ? escapeHtml(teacher.teacher_name) : '<em>Unknown</em>') + '</td>' +
'<td><span class="badge badge-blue">' + subject.lectures_per_week + ' / week</span></td>' +
'<td>' +
'<button class="btn btn-secondary" style="padding:4px 10px;font-size:.78rem;" onclick="app.editSubject(' + subject.subject_id + ')">Edit</button> ' +
'<button class="btn btn-danger" style="padding:4px 10px;font-size:.78rem;" onclick="app.deleteSubject(' + subject.subject_id + ')">Delete</button>' +
'</td>' +
'</tr>';
}
tbody.innerHTML = html;
}

function openSubjectModal(subject) {
populateTeacherDropdown();
document.getElementById('modalSubjectTitle').textContent = subject ? 'Edit Subject' : 'Add Subject';
document.getElementById('sEditId').value = subject ? subject.subject_id : '';
document.getElementById('sName').value = subject ? subject.subject_name : '';
document.getElementById('sLectures').value = subject ? subject.lectures_per_week : 2;
if (subject) {
document.getElementById('sTeacher').value = subject.teacher_id;
}
openModal('modalSubject');
}

document.getElementById('btnAddSubject').addEventListener('click', function() {
openSubjectModal(null);
});

document.getElementById('btnSaveSubject').addEventListener('click', function() {
var name = document.getElementById('sName').value.trim();
var teacherId = parseInt(document.getElementById('sTeacher').value, 10);
var lectures = parseInt(document.getElementById('sLectures').value, 10);

if (!name || isNaN(teacherId) || isNaN(lectures) || lectures < 1) {
showToast('Please fill in all subject fields.', 'error');
return;
}

var editId = parseInt(document.getElementById('sEditId').value, 10);

if (editId) {
for (var i = 0; i < database.subjects.length; i++) {
if (database.subjects[i].subject_id === editId) {
database.subjects[i].subject_name = name;
database.subjects[i].teacher_id = teacherId;
database.subjects[i].lectures_per_week = lectures;
break;
}
}
} else {
database.subjects.push({
subject_id: getNextId(database.subjects, 'subject_id'),
subject_name: name,
teacher_id: teacherId,
lectures_per_week: lectures
});
}

saveData(STORAGE_KEYS.subjects, database.subjects);
closeModal('modalSubject');
renderSubjects();
updateStats();
showToast(editId ? 'Subject updated.' : 'Subject added.', 'success');
});

function editSubject(id) {
var subject = findById(database.subjects, 'subject_id', id);
if (subject) {
openSubjectModal(subject);
}
}

function deleteSubject(id) {
if (!confirm('Delete this subject?')) return;
database.subjects = removeById(database.subjects, 'subject_id', id);
saveData(STORAGE_KEYS.subjects, database.subjects);
renderSubjects();
updateStats();
showToast('Subject deleted.', 'info');
}

function renderBatches() {
var tbody = document.getElementById('batchesBody');
if (database.batches.length === 0) {
tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><p>No batches added yet.</p></td></tr>';
return;
}

var html = '';
for (var i = 0; i < database.batches.length; i++) {
var batch = database.batches[i];
html += '<tr>' +
'<td><span class="badge ' + getBadgeColor(i) + '">#' + batch.batch_id + '</span></td>' +
'<td><strong>' + escapeHtml(batch.batch_name) + '</strong></td>' +
'<td>' + batch.student_count + ' students</td>' +
'<td>' +
'<button class="btn btn-secondary" style="padding:4px 10px;font-size:.78rem;" onclick="app.editBatch(' + batch.batch_id + ')">Edit</button> ' +
'<button class="btn btn-danger" style="padding:4px 10px;font-size:.78rem;" onclick="app.deleteBatch(' + batch.batch_id + ')">Delete</button>' +
'</td>' +
'</tr>';
}
tbody.innerHTML = html;
}

function openBatchModal(batch) {
document.getElementById('modalBatchTitle').textContent = batch ? 'Edit Batch' : 'Add Batch';
document.getElementById('bEditId').value = batch ? batch.batch_id : '';
document.getElementById('bName').value = batch ? batch.batch_name : '';
document.getElementById('bCount').value = batch ? batch.student_count : '';
openModal('modalBatch');
}

document.getElementById('btnAddBatch').addEventListener('click', function() {
openBatchModal(null);
});

document.getElementById('btnSaveBatch').addEventListener('click', function() {
var name = document.getElementById('bName').value.trim();
var count = parseInt(document.getElementById('bCount').value, 10);

if (!name || isNaN(count) || count < 1) {
showToast('Please fill in all batch fields.', 'error');
return;
}

var editId = parseInt(document.getElementById('bEditId').value, 10);

if (editId) {
for (var i = 0; i < database.batches.length; i++) {
if (database.batches[i].batch_id === editId) {
database.batches[i].batch_name = name;
database.batches[i].student_count = count;
break;
}
}
} else {
database.batches.push({
batch_id: getNextId(database.batches, 'batch_id'),
batch_name: name,
student_count: count
});
}

saveData(STORAGE_KEYS.batches, database.batches);
closeModal('modalBatch');
renderBatches();
updateStats();
showToast(editId ? 'Batch updated.' : 'Batch added.', 'success');
});

function editBatch(id) {
var batch = findById(database.batches, 'batch_id', id);
if (batch) {
openBatchModal(batch);
}
}

function deleteBatch(id) {
if (!confirm('Delete this batch?')) return;
database.batches = removeById(database.batches, 'batch_id', id);
saveData(STORAGE_KEYS.batches, database.batches);
renderBatches();
updateStats();
showToast('Batch deleted.', 'info');
}

function parseCSVFile(text) {
var lines = text.trim().split('\n');
var result = [];

for (var i = 0; i < lines.length; i++) {
var values = lines[i].split(',');
var cleaned = [];
for (var j = 0; j < values.length; j++) {
cleaned.push(values[j].trim());
}
result.push(cleaned);
}

return result;
}

function showPreviewTable(previewId, data, headers) {
var previewDiv = document.getElementById(previewId);
if (data.length === 0) {
previewDiv.innerHTML = '<p class="import-errors">No valid data found in file.</p>';
return;
}

var html = '<table><tr>';
for (var h = 0; h < headers.length; h++) {
html += '<th>' + headers[h] + '</th>';
}
html += '</tr>';

var maxRows = Math.min(data.length, 5);
for (var i = 0; i < maxRows; i++) {
html += '<tr>';
for (var j = 0; j < data[i].length; j++) {
html += '<td>' + escapeHtml(data[i][j]) + '</td>';
}
html += '</tr>';
}

if (data.length > 5) {
html += '<tr><td colspan="' + headers.length + '">... and ' + (data.length - 5) + ' more rows</td></tr>';
}

html += '</table>';
previewDiv.innerHTML = html;
}

var pendingTeachersImport = null;
var pendingRoomsImport = null;
var pendingSubjectsImport = null;

document.getElementById('btnImportTeachers').addEventListener('click', function() {
document.getElementById('fileImportTeachers').value = '';
document.getElementById('importTeachersPreview').innerHTML = '';
pendingTeachersImport = null;
openModal('modalImportTeachers');
});

document.getElementById('fileImportTeachers').addEventListener('change', function(e) {
var file = e.target.files[0];
if (!file) return;

var reader = new FileReader();
reader.onload = function(event) {
var data = parseCSVFile(event.target.result);

if (data.length < 2) {
document.getElementById('importTeachersPreview').innerHTML =
'<p class="import-errors">File must have header row and at least one data row.</p>';
return;
}

var headerRow = data[0];
if (headerRow.length < 2 || headerRow[0].toLowerCase().indexOf('teacher') === -1) {
document.getElementById('importTeachersPreview').innerHTML =
'<p class="import-errors">Header should contain: teacher_name, subjects, availability</p>';
return;
}

pendingTeachersImport = data.slice(1);
showPreviewTable('importTeachersPreview', pendingTeachersImport,
['Teacher Name', 'Subjects', 'Availability']);
};
reader.readAsText(file);
});

document.getElementById('btnConfirmImportTeachers').addEventListener('click', function() {
if (!pendingTeachersImport || pendingTeachersImport.length === 0) {
showToast('Please select a valid CSV file first.', 'error');
return;
}

var imported = 0;
var errors = [];

for (var i = 0; i < pendingTeachersImport.length; i++) {
var row = pendingTeachersImport[i];
if (row.length < 2) {
errors.push('Row ' + (i + 1) + ': Not enough columns');
continue;
}

var teacherName = row[0];
var subjects = row[1] || '';
var availability = row[2] || 'all';

if (!teacherName) {
errors.push('Row ' + (i + 1) + ': Missing teacher name');
continue;
}

database.teachers.push({
teacher_id: getNextId(database.teachers, 'teacher_id'),
teacher_name: teacherName,
subjects: subjects,
availability: availability
});
imported++;
}

saveData(STORAGE_KEYS.teachers, database.teachers);
closeModal('modalImportTeachers');
renderTeachers();
updateStats();

if (errors.length > 0) {
showToast('Imported ' + imported + ' teachers. ' + errors.length + ' errors.', 'warning');
} else {
showToast('Successfully imported ' + imported + ' teachers.', 'success');
}
});

document.getElementById('btnImportRooms').addEventListener('click', function() {
document.getElementById('fileImportRooms').value = '';
document.getElementById('importRoomsPreview').innerHTML = '';
pendingRoomsImport = null;
openModal('modalImportRooms');
});

document.getElementById('fileImportRooms').addEventListener('change', function(e) {
var file = e.target.files[0];
if (!file) return;

var reader = new FileReader();
reader.onload = function(event) {
var data = parseCSVFile(event.target.result);

if (data.length < 2) {
document.getElementById('importRoomsPreview').innerHTML =
'<p class="import-errors">File must have header row and at least one data row.</p>';
return;
}

var headerRow = data[0];
if (headerRow.length < 2 || headerRow[0].toLowerCase().indexOf('room') === -1) {
document.getElementById('importRoomsPreview').innerHTML =
'<p class="import-errors">Header should contain: room_name, capacity</p>';
return;
}

pendingRoomsImport = data.slice(1);
showPreviewTable('importRoomsPreview', pendingRoomsImport,
['Room Name', 'Capacity']);
};
reader.readAsText(file);
});

document.getElementById('btnConfirmImportRooms').addEventListener('click', function() {
if (!pendingRoomsImport || pendingRoomsImport.length === 0) {
showToast('Please select a valid CSV file first.', 'error');
return;
}

var imported = 0;
var errors = [];

for (var i = 0; i < pendingRoomsImport.length; i++) {
var row = pendingRoomsImport[i];
if (row.length < 2) {
errors.push('Row ' + (i + 1) + ': Not enough columns');
continue;
}

var roomName = row[0];
var capacity = parseInt(row[1], 10);

if (!roomName) {
errors.push('Row ' + (i + 1) + ': Missing room name');
continue;
}

if (isNaN(capacity) || capacity < 1) {
errors.push('Row ' + (i + 1) + ': Invalid capacity');
continue;
}

database.rooms.push({
room_id: getNextId(database.rooms, 'room_id'),
room_name: roomName,
capacity: capacity
});
imported++;
}

saveData(STORAGE_KEYS.rooms, database.rooms);
closeModal('modalImportRooms');
renderRooms();
updateStats();

if (errors.length > 0) {
showToast('Imported ' + imported + ' rooms. ' + errors.length + ' errors.', 'warning');
} else {
showToast('Successfully imported ' + imported + ' rooms.', 'success');
}
});

document.getElementById('btnImportSubjects').addEventListener('click', function() {
document.getElementById('fileImportSubjects').value = '';
document.getElementById('importSubjectsPreview').innerHTML = '';
pendingSubjectsImport = null;
openModal('modalImportSubjects');
});

document.getElementById('fileImportSubjects').addEventListener('change', function(e) {
var file = e.target.files[0];
if (!file) return;

var reader = new FileReader();
reader.onload = function(event) {
var data = parseCSVFile(event.target.result);

if (data.length < 2) {
document.getElementById('importSubjectsPreview').innerHTML =
'<p class="import-errors">File must have header row and at least one data row.</p>';
return;
}

var headerRow = data[0];
if (headerRow.length < 2 || headerRow[0].toLowerCase().indexOf('subject') === -1) {
document.getElementById('importSubjectsPreview').innerHTML =
'<p class="import-errors">Header should contain: subject_name, teacher_name, lectures_per_week</p>';
return;
}

pendingSubjectsImport = data.slice(1);
showPreviewTable('importSubjectsPreview', pendingSubjectsImport,
['Subject Name', 'Teacher', 'Lectures/Week']);
};
reader.readAsText(file);
});

document.getElementById('btnConfirmImportSubjects').addEventListener('click', function() {
if (!pendingSubjectsImport || pendingSubjectsImport.length === 0) {
showToast('Please select a valid CSV file first.', 'error');
return;
}

var imported = 0;
var errors = [];

for (var i = 0; i < pendingSubjectsImport.length; i++) {
var row = pendingSubjectsImport[i];
if (row.length < 3) {
errors.push('Row ' + (i + 1) + ': Not enough columns');
continue;
}

var subjectName = row[0];
var teacherName = row[1];
var lecturesStr = row[2];

if (!subjectName) {
errors.push('Row ' + (i + 1) + ': Missing subject name');
continue;
}

var teacher = null;
for (var t = 0; t < database.teachers.length; t++) {
if (database.teachers[t].teacher_name.toLowerCase() === teacherName.toLowerCase()) {
teacher = database.teachers[t];
break;
}
}

if (!teacher) {
errors.push('Row ' + (i + 1) + ': Teacher "' + teacherName + '" not found');
continue;
}

var lectures = parseInt(lecturesStr, 10);
if (isNaN(lectures) || lectures < 1) {
errors.push('Row ' + (i + 1) + ': Invalid lectures count');
continue;
}

database.subjects.push({
subject_id: getNextId(database.subjects, 'subject_id'),
subject_name: subjectName,
teacher_id: teacher.teacher_id,
lectures_per_week: lectures
});
imported++;
}

saveData(STORAGE_KEYS.subjects, database.subjects);
closeModal('modalImportSubjects');
renderSubjects();
updateStats();

if (errors.length > 0) {
showToast('Imported ' + imported + ' subjects. ' + errors.length + ' errors.', 'warning');
} else {
showToast('Successfully imported ' + imported + ' subjects.', 'success');
}
});

function resetTimetableView() {
var wrapper = document.getElementById('timetableWrapper');
var exportBtn = document.getElementById('btnExportTT');
var filterBatch = document.getElementById('filterBatch');
var filterTeacher = document.getElementById('filterTeacher');
var resultDiv = document.getElementById('generateResult');

if (window.app) window.app.timetableData = null;
if (exportBtn) exportBtn.style.display = 'none';
if (resultDiv) resultDiv.innerHTML = '';
if (filterBatch) filterBatch.innerHTML = '<option value="">All Batches</option>';
if (filterTeacher) filterTeacher.innerHTML = '<option value="">All Teachers</option>';
if (wrapper) {
wrapper.innerHTML =
'<div class="empty-state">' +
'<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
'<p>No timetable generated yet. Go to <strong>Generate Timetable</strong> first.</p>' +
'</div>';
}
}

function refreshAllViews() {
renderTeachers();
renderRooms();
renderSubjects();
renderBatches();
updateStats();
}

refreshAllViews();

window.app = {
showSection: showSection,
db: database,
editTeacher: editTeacher,
deleteTeacher: deleteTeacher,
editRoom: editRoom,
deleteRoom: deleteRoom,
editSubject: editSubject,
deleteSubject: deleteSubject,
editBatch: editBatch,
deleteBatch: deleteBatch,
showToast: showToast,

reloadProjectSampleData: function() {
if (!loadSampleData()) {
showToast('Project sample data is not available.', 'error');
return;
}
resetTimetableView();
refreshAllViews();
showToast('Project sample data loaded.', 'success');
}
};

})();