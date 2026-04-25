(function() {
'use strict';

var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

var DAY_START_HOUR = 8;

var SLOTS_PER_DAY = 10;

var TOTAL_SLOTS = DAYS.length * SLOTS_PER_DAY;

function slotToDay(slotNumber) {
return DAYS[Math.floor(slotNumber / SLOTS_PER_DAY)];
}

function slotToPeriod(slotNumber) {
return (slotNumber % SLOTS_PER_DAY) + 1;
}

function slotToDayIndex(slotNumber) {
return Math.floor(slotNumber / SLOTS_PER_DAY);
}

function formatHour(hour24) {
var suffix = hour24 >= 12 ? 'PM' : 'AM';
var hour12 = hour24 % 12;
if (hour12 === 0) hour12 = 12;
return hour12 + ':00 ' + suffix;
}

function slotToTimeRange(periodNumber) {
var startHour = DAY_START_HOUR + (periodNumber - 1);
var endHour = startHour + 1;
return formatHour(startHour) + ' - ' + formatHour(endHour);
}

function isTeacherAvailableOnDay(teacher, dayIndex) {
var availability = teacher.availability || 'all';

if (availability.toLowerCase() === 'all') {
return true;
}

var dayName = DAYS[dayIndex];
var shortDay = dayName.substring(0, 3).toLowerCase();

if (availability.indexOf('-') !== -1) {
var parts = availability.split('-');
if (parts.length === 2) {
var startDay = parts[0].trim().toLowerCase();
var endDay = parts[1].trim().toLowerCase();
var startIdx = -1;
var endIdx = -1;
for (var d = 0; d < DAYS.length; d++) {
if (DAYS[d].substring(0, 3).toLowerCase() === startDay) startIdx = d;
if (DAYS[d].substring(0, 3).toLowerCase() === endDay) endIdx = d;
}
if (startIdx !== -1 && endIdx !== -1) {
return dayIndex >= startIdx && dayIndex <= endIdx;
}
}
}

var availableDays = availability.split(',');
for (var i = 0; i < availableDays.length; i++) {
var day = availableDays[i].trim().toLowerCase();
if (day === shortDay || day === dayName.toLowerCase()) {
return true;
}
}

return false;
}

function buildSessions(database) {
var sessions = [];

var batchToRoom = {};

var assignedRooms = {};

var sortedBatches = database.batches.slice();
for (var i = 0; i < sortedBatches.length; i++) {
for (var j = i + 1; j < sortedBatches.length; j++) {
if (sortedBatches[i].student_count > sortedBatches[j].student_count) {
var temp = sortedBatches[i];
sortedBatches[i] = sortedBatches[j];
sortedBatches[j] = temp;
}
}
}

for (var b = 0; b < sortedBatches.length; b++) {
var batch = sortedBatches[b];
var assignedRoom = null;
var smallestFitting = null;

for (var r = 0; r < database.rooms.length; r++) {
var room = database.rooms[r];
if (!assignedRooms[room.room_id] && room.capacity >= batch.student_count) {
if (!smallestFitting || room.capacity < smallestFitting.capacity) {
smallestFitting = room;
}
}
}

if (!smallestFitting) {
for (var r2 = 0; r2 < database.rooms.length; r2++) {
var room2 = database.rooms[r2];
if (room2.capacity >= batch.student_count) {
if (!smallestFitting || room2.capacity < smallestFitting.capacity) {
smallestFitting = room2;
}
}
}
}

if (!smallestFitting && database.rooms.length > 0) {
var largest = database.rooms[0];
for (var l = 1; l < database.rooms.length; l++) {
if (database.rooms[l].capacity > largest.capacity) {
largest = database.rooms[l];
}
}
smallestFitting = largest;
}

if (smallestFitting) {
batchToRoom[batch.batch_id] = smallestFitting;
assignedRooms[smallestFitting.room_id] = true;
}
}

var sessionId = 0;
for (var s = 0; s < database.subjects.length; s++) {
var subject = database.subjects[s];

for (var bat = 0; bat < database.batches.length; bat++) {
var batchItem = database.batches[bat];

var batchMatches = true;
if (subject.batch_ids && subject.batch_ids.length > 0) {
batchMatches = false;
for (var bi = 0; bi < subject.batch_ids.length; bi++) {
if (subject.batch_ids[bi] === batchItem.batch_id) {
batchMatches = true;
break;
}
}
}

if (!batchMatches) continue;

for (var lec = 0; lec < subject.lectures_per_week; lec++) {
var assignedRoom = batchToRoom[batchItem.batch_id] || database.rooms[0];
sessions.push({
id: sessionId++,
teacher_id: subject.teacher_id,
batch_id: batchItem.batch_id,
room_id: assignedRoom.room_id,
subject_id: subject.subject_id,
weekly_lectures: subject.lectures_per_week,
lecture_index: lec,
color: -1
});
}
}
}

return sessions;
}

function hasConflict(sessionA, sessionB) {
return sessionA.teacher_id === sessionB.teacher_id ||
sessionA.batch_id === sessionB.batch_id ||
sessionA.room_id === sessionB.room_id;
}

function buildGraph(sessionList) {
var adjacency = [];
for (var i = 0; i < sessionList.length; i++) {
adjacency[i] = [];
}

for (var i = 0; i < sessionList.length; i++) {
for (var j = i + 1; j < sessionList.length; j++) {
if (hasConflict(sessionList[i], sessionList[j])) {
adjacency[i].push(j);
adjacency[j].push(i);
}
}
}

return adjacency;
}

function countNeighborColors(sessionList, adjacencyList, sessionIndex) {
var usedColors = {};
var count = 0;

for (var i = 0; i < adjacencyList[sessionIndex].length; i++) {
var neighborIdx = adjacencyList[sessionIndex][i];
var neighborColor = sessionList[neighborIdx].color;
if (neighborColor >= 0 && !usedColors[neighborColor]) {
usedColors[neighborColor] = true;
count++;
}
}

return count;
}

function pickNextNode(sessionList, adjacencyList) {
var bestIndex = -1;
var bestSaturation = -1;
var bestDegree = -1;

for (var i = 0; i < sessionList.length; i++) {
if (sessionList[i].color !== -1) continue;

var saturation = countNeighborColors(sessionList, adjacencyList, i);
var degree = adjacencyList[i].length;

if (saturation > bestSaturation ||
(saturation === bestSaturation && degree > bestDegree)) {
bestSaturation = saturation;
bestDegree = degree;
bestIndex = i;
}
}

return bestIndex;
}

function getDailySubjectLimit(session) {
return Math.max(1, Math.ceil(session.weekly_lectures / DAYS.length));
}

function dayDistanceCircular(dayA, dayB) {
var distance = Math.abs(dayA - dayB);
return Math.min(distance, DAYS.length - distance);
}

function getPlacementPenalty(sessionList, sessionIndex, colorToTry, maxPerDay) {
var session = sessionList[sessionIndex];
var dayIdx = slotToDayIndex(colorToTry);
var periodIdx = colorToTry % SLOTS_PER_DAY;

var sameSubjectSameDay = 0;
var batchDayLoad = 0;
var hasAdjacentSameSubject = false;

for (var i = 0; i < sessionList.length; i++) {
if (i === sessionIndex) continue;
var other = sessionList[i];
if (other.color < 0) continue;
if (other.batch_id !== session.batch_id) continue;

var otherDayIdx = slotToDayIndex(other.color);
if (otherDayIdx !== dayIdx) continue;

batchDayLoad++;

if (other.subject_id === session.subject_id) {
sameSubjectSameDay++;
var otherPeriodIdx = other.color % SLOTS_PER_DAY;
if (Math.abs(otherPeriodIdx - periodIdx) === 1) {
hasAdjacentSameSubject = true;
}
}
}

if (sameSubjectSameDay >= maxPerDay) {
return null;
}

var preferredDay = session.lecture_index % DAYS.length;
var spreadPenalty = dayDistanceCircular(dayIdx, preferredDay);

return (sameSubjectSameDay * 100) +
(batchDayLoad * 5) +
(hasAdjacentSameSubject ? 20 : 0) +
(spreadPenalty * 3);
}

function chooseBestColor(sessionList, sessionIndex, usedColors, maxPerDay, database) {
var bestColor = -1;
var bestPenalty = Number.POSITIVE_INFINITY;
var maxUsedColor = -1;

var session = sessionList[sessionIndex];
var teacher = null;
if (database) {
for (var ti = 0; ti < database.teachers.length; ti++) {
if (database.teachers[ti].teacher_id === session.teacher_id) {
teacher = database.teachers[ti];
break;
}
}
}

for (var i = 0; i < sessionList.length; i++) {
if (sessionList[i].color > maxUsedColor) {
maxUsedColor = sessionList[i].color;
}
}

var searchLimit = Math.max(TOTAL_SLOTS - 1, maxUsedColor + 1);

for (var color = 0; color <= searchLimit; color++) {
if (usedColors[color]) continue;

if (teacher && database) {
var dayIdx = slotToDayIndex(color);
if (!isTeacherAvailableOnDay(teacher, dayIdx)) {
continue;
}
}

var penalty = getPlacementPenalty(sessionList, sessionIndex, color, maxPerDay);
if (penalty === null) continue;

if (penalty < bestPenalty ||
(penalty === bestPenalty && (bestColor === -1 || color < bestColor))) {
bestPenalty = penalty;
bestColor = color;
}
}

return bestColor;
}

function pickSmallestColor(sessionList, adjacencyList, sessionIndex, database) {
var usedColors = {};

for (var i = 0; i < adjacencyList[sessionIndex].length; i++) {
var neighborIdx = adjacencyList[sessionIndex][i];
var neighborColor = sessionList[neighborIdx].color;
if (neighborColor >= 0) {
usedColors[neighborColor] = true;
}
}

var baseLimit = getDailySubjectLimit(sessionList[sessionIndex]);

var selected = chooseBestColor(sessionList, sessionIndex, usedColors, baseLimit, database);
if (selected !== -1) return selected;

selected = chooseBestColor(sessionList, sessionIndex, usedColors, baseLimit + 1, database);
if (selected !== -1) return selected;

selected = chooseBestColor(sessionList, sessionIndex, usedColors, Number.MAX_SAFE_INTEGER, database);
if (selected !== -1) return selected;

selected = 0;
while (usedColors[selected]) selected++;
return selected;
}

function isSafeColor(sessionList, adjacencyList, sessionIndex, colorToTry, dailyLimitRelaxation, database) {
var session = sessionList[sessionIndex];

for (var i = 0; i < adjacencyList[sessionIndex].length; i++) {
var neighbor = sessionList[adjacencyList[sessionIndex][i]];
if (neighbor.color === colorToTry) {
return false;
}
}

var teacher = null;
for (var t = 0; t < database.teachers.length; t++) {
if (database.teachers[t].teacher_id === session.teacher_id) {
teacher = database.teachers[t];
break;
}
}

if (teacher) {
var dayIdx = slotToDayIndex(colorToTry);
if (!isTeacherAvailableOnDay(teacher, dayIdx)) {
return false;
}
}

var maxPerDay = getDailySubjectLimit(session) + (dailyLimitRelaxation || 0);
if (getPlacementPenalty(sessionList, sessionIndex, colorToTry, maxPerDay) === null) {
return false;
}

return true;
}

function dsaturColor(sessionList, adjacencyList, database) {
var totalSessions = sessionList.length;
var coloredCount = 0;

while (coloredCount < totalSessions) {
var nextSession = pickNextNode(sessionList, adjacencyList);
if (nextSession === -1) break;

sessionList[nextSession].color = pickSmallestColor(sessionList, adjacencyList, nextSession, database);
coloredCount++;
}
}

function backtrackSearch(sessionList, adjacencyList, startIndex, maxColor, dailyRelaxation, database) {
if (startIndex === sessionList.length) {
return true;
}

if (sessionList[startIndex].color !== -1) {
return backtrackSearch(sessionList, adjacencyList, startIndex + 1, maxColor, dailyRelaxation, database);
}

for (var color = 0; color < maxColor; color++) {
if (isSafeColor(sessionList, adjacencyList, startIndex, color, dailyRelaxation, database)) {
sessionList[startIndex].color = color;
if (backtrackSearch(sessionList, adjacencyList, startIndex + 1, maxColor, dailyRelaxation, database)) {
return true;
}
sessionList[startIndex].color = -1;
}
}

return false;
}

function buildTimetable(sessionList, database) {
var entries = [];

function findByField(itemList, fieldName, value) {
for (var i = 0; i < itemList.length; i++) {
if (itemList[i][fieldName] === value) return itemList[i];
}
return null;
}

for (var i = 0; i < sessionList.length; i++) {
var session = sessionList[i];

var subject = findByField(database.subjects, 'subject_id', session.subject_id);
var teacher = findByField(database.teachers, 'teacher_id', session.teacher_id);
var batch = findByField(database.batches, 'batch_id', session.batch_id);
var room = findByField(database.rooms, 'room_id', session.room_id);

entries.push({
day: slotToDay(session.color),
slot: slotToPeriod(session.color),
room: room ? room.room_name : 'TBD',
subject: subject ? subject.subject_name : 'Unknown',
teacher: teacher ? teacher.teacher_name : 'Unknown',
batch: batch ? batch.batch_name : 'Unknown'
});
}

entries.sort(function(a, b) {
var dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
if (dayDiff !== 0) return dayDiff;
return a.slot - b.slot;
});

return entries;
}

function validateTimetable(entries) {
var conflicts = { teacher: 0, room: 0, batch: 0 };

for (var i = 0; i < entries.length; i++) {
for (var j = i + 1; j < entries.length; j++) {
var a = entries[i];
var b = entries[j];

if (a.day !== b.day || a.slot !== b.slot) continue;

if (a.teacher === b.teacher) conflicts.teacher++;
if (a.room === b.room) conflicts.room++;
if (a.batch === b.batch) conflicts.batch++;
}
}

return conflicts;
}

function renderTimetableGrid(entries, database) {
var wrapper = document.getElementById('timetableWrapper');

if (!entries || entries.length === 0) {
wrapper.innerHTML = '<div class="empty-state"><p>No timetable data.</p></div>';
return;
}

var filterBatch = document.getElementById('filterBatch');
var filterTeacher = document.getElementById('filterTeacher');

filterBatch.innerHTML = '<option value="">All Batches</option>';
for (var i = 0; i < database.batches.length; i++) {
filterBatch.innerHTML += '<option>' + database.batches[i].batch_name + '</option>';
}

filterTeacher.innerHTML = '<option value="">All Teachers</option>';
for (var ti = 0; ti < database.teachers.length; ti++) {
filterTeacher.innerHTML += '<option>' + database.teachers[ti].teacher_name + '</option>';
}

function applyFilters() {
var batchFilter = filterBatch.value;
var teacherFilter = filterTeacher.value;

var filtered = entries.filter(function(entry) {
var batchMatch = !batchFilter || entry.batch === batchFilter;
var teacherMatch = !teacherFilter || entry.teacher === teacherFilter;
return batchMatch && teacherMatch;
});

drawTable(filtered);
}

filterBatch.onchange = applyFilters;
filterTeacher.onchange = applyFilters;

var subjectColorMap = {};
var colorIdx = 0;
for (var si = 0; si < entries.length; si++) {
if (!(entries[si].subject in subjectColorMap)) {
subjectColorMap[entries[si].subject] = colorIdx++ % 5;
}
}

function drawTable(data) {
var slotMap = {};
for (var di = 0; di < DAYS.length; di++) {
slotMap[DAYS[di]] = {};
for (var pi = 1; pi <= SLOTS_PER_DAY; pi++) {
slotMap[DAYS[di]][pi] = [];
}
}

for (var ei = 0; ei < data.length; ei++) {
var entry = data[ei];
if (slotMap[entry.day] && slotMap[entry.day][entry.slot]) {
slotMap[entry.day][entry.slot].push(entry);
}
}

if (data.length === 0) {
wrapper.innerHTML = '<div class="empty-state"><p>No entries match the current filter.</p></div>';
return;
}

var periodNumbers = [];
for (var p = 1; p <= SLOTS_PER_DAY; p++) {
periodNumbers.push(p);
}

var html = '<div class="timetable-wrapper"><table class="timetable"><thead><tr>';
html += '<th>Day \ Slot</th>';
for (var pi = 0; pi < periodNumbers.length; pi++) {
html += '<th>' + slotToTimeRange(periodNumbers[pi]) + '</th>';
}
html += '</tr></thead><tbody>';

for (var di = 0; di < DAYS.length; di++) {
html += '<tr><th>' + DAYS[di] + '</th>';
for (var pi = 0; pi < periodNumbers.length; pi++) {
var cellEntries = slotMap[DAYS[di]][periodNumbers[pi]];
if (cellEntries.length === 0) {
html += '<td><div class="tt-cell tt-cell-empty"></div></td>';
} else {
html += '<td>';
for (var ci = 0; ci < cellEntries.length; ci++) {
var e = cellEntries[ci];
var colorIndex = subjectColorMap[e.subject] || 0;
html += '<div class="tt-cell tt-cell-filled color-' + colorIndex + '">' +
'<span class="tt-subject">' + escHtml(e.subject) + '</span>' +
'<span class="tt-teacher">' + escHtml(e.teacher) + '</span>' +
'<span class="tt-room">' + escHtml(e.room) + '</span>' +
'<span class="tt-batch">' + escHtml(e.batch) + '</span>' +
'</div>';
}
html += '</td>';
}
}
html += '</tr>';
}

html += '</tbody></table></div>';
wrapper.innerHTML = html;
}

drawTable(entries);
}

function escHtml(str) {
return String(str)
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;');
}

document.getElementById('btnGenerate').addEventListener('click', function() {
var database = window.app.db;

if (!database.teachers.length || !database.rooms.length ||
!database.subjects.length || !database.batches.length) {
window.app.showToast('Please add at least one teacher, room, subject, and batch.', 'error');
return;
}

var progressWrap = document.getElementById('progressWrap');
var progressBar = document.getElementById('progressBar');
progressWrap.style.display = 'block';
progressBar.style.width = '0%';

setTimeout(function() {
progressBar.style.width = '40%';

var sessions = buildSessions(database);
var adjacency = buildGraph(sessions);

dsaturColor(sessions, adjacency, database);

var maxColor = -1;
for (var i = 0; i < sessions.length; i++) {
if (sessions[i].color > maxColor) {
maxColor = sessions[i].color;
}
}

if (maxColor >= TOTAL_SLOTS) {
sessions.forEach(function(s) {
if (s.color >= TOTAL_SLOTS) s.color = -1;
});
var solved = backtrackSearch(sessions, adjacency, 0, TOTAL_SLOTS, 0, database);
if (!solved) {
backtrackSearch(sessions, adjacency, 0, TOTAL_SLOTS, 1, database);
}

maxColor = -1;
for (var mc = 0; mc < sessions.length; mc++) {
if (sessions[mc].color > maxColor) {
maxColor = sessions[mc].color;
}
}
}

progressBar.style.width = '100%';

var unscheduledCount = 0;
for (var u = 0; u < sessions.length; u++) {
if (sessions[u].color < 0 || sessions[u].color >= TOTAL_SLOTS) {
unscheduledCount++;
}
}

var resultDiv = document.getElementById('generateResult');

if (unscheduledCount > 0) {
resultDiv.innerHTML =
'<div class="card" style="padding:20px;margin-top:16px;">' +
'<p style="color:var(--danger);font-weight:700;margin-bottom:8px;">Could not schedule all sessions.</p>' +
'<p style="font-size:.875rem;color:var(--text-muted);">Unscheduled: <strong>' + unscheduledCount + '</strong>. ' +
'Try reducing lectures or adding more resources.</p>' +
'</div>';
window.app.showToast('Could not schedule all sessions.', 'error');
setTimeout(function() { progressWrap.style.display = 'none'; progressBar.style.width = '0%'; }, 600);
return;
}

var entries = buildTimetable(sessions, database);
var conflicts = validateTimetable(entries);

var slotsUsed = maxColor + 1;
var totalConflicts = conflicts.teacher + conflicts.room + conflicts.batch;

if (totalConflicts === 0) {
resultDiv.innerHTML =
'<div class="card" style="padding:20px;margin-top:16px;">' +
'<p style="color:var(--success);font-weight:700;margin-bottom:8px;">Timetable generated successfully!</p>' +
'<p style="font-size:.875rem;color:var(--text-muted);">Sessions: <strong>' + sessions.length + '</strong> | ' +
'Slots used: <strong>' + slotsUsed + '</strong> / ' + TOTAL_SLOTS + ' | ' +
'Conflicts: <strong>0</strong></p>' +
'<button class="btn btn-primary" style="margin-top:12px;" onclick="app.showSection(\'timetable\')">View Timetable</button>' +
'</div>';

window.app.timetableData = entries;
document.getElementById('btnExportTT').style.display = 'flex';
renderTimetableGrid(entries, database);
window.app.showToast('Timetable generated - ' + sessions.length + ' sessions scheduled!', 'success');
} else {
resultDiv.innerHTML =
'<div class="card" style="padding:20px;margin-top:16px;">' +
'<p style="color:var(--danger);font-weight:700;margin-bottom:8px;">Schedule has ' + totalConflicts + ' conflict(s).</p>' +
'<p style="font-size:.875rem;color:var(--text-muted);">Try reducing lectures or adding more rooms/teachers.</p>' +
'</div>';
window.app.showToast('Scheduling completed with conflicts.', 'error');
}

setTimeout(function() { progressWrap.style.display = 'none'; progressBar.style.width = '0%'; }, 600);
}, 150);
});

document.getElementById('btnExportTT').addEventListener('click', function() {
if (!window.app.timetableData) return;

var jsonData = JSON.stringify({ timetable: window.app.timetableData }, null, 2);
var blob = new Blob([jsonData], { type: 'application/json' });
var downloadUrl = URL.createObjectURL(blob);
var link = document.createElement('a');
link.href = downloadUrl;
link.download = 'timetable.json';
link.click();
URL.revokeObjectURL(downloadUrl);
});

})();