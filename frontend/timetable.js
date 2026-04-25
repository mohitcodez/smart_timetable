/**
* timetable.js - Smart Timetable Generator
*
* This file handles the scheduling algorithm that assigns class sessions to time slots.
* The scheduling works by treating each session as a vertex in a graph, and finding
* time slots such that no conflicting sessions are scheduled at the same time.
*
* Key concepts:
* - Sessions represent a single lecture for a subject in a batch
* - Conflicts occur when sessions share the same teacher, room, or batch
* - We use graph coloring (DSATUR algorithm) to find a valid schedule
*/

(function() {
'use strict';

// Days of the week that the timetable covers
var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Working hours - first slot starts at 8 AM
var DAY_START_HOUR = 8;

// How many teaching periods per day (8 AM to 6 PM = 10 hours)
var SLOTS_PER_DAY = 10;

// Total number of available slots in the week
var TOTAL_SLOTS = DAYS.length * SLOTS_PER_DAY; // 50 slots total

/**
* Convert a slot number (0-49) to the day name
*/
function slotToDay(slotNumber) {
return DAYS[Math.floor(slotNumber / SLOTS_PER_DAY)];
}

/**
* Convert a slot number to period number (1-10)
*/
function slotToPeriod(slotNumber) {
return (slotNumber % SLOTS_PER_DAY) + 1;
}

/**
* Get the day index (0-4) from a slot number
*/
function slotToDayIndex(slotNumber) {
return Math.floor(slotNumber / SLOTS_PER_DAY);
}

/**
* Format hour in 12-hour format with AM/PM
*/
function formatHour(hour24) {
var suffix = hour24 >= 12 ? 'PM' : 'AM';
var hour12 = hour24 % 12;
if (hour12 === 0) hour12 = 12;
return hour12 + ':00 ' + suffix;
}

/**
* Convert a period number to time range string
* Period 1 = 8:00 AM - 9:00 AM, etc.
*/
function slotToTimeRange(periodNumber) {
var startHour = DAY_START_HOUR + (periodNumber - 1);
var endHour = startHour + 1;
return formatHour(startHour) + ' - ' + formatHour(endHour);
}

/**
* Check if a teacher is available on a given day
* Availability can be "all" or a list like "Mon,Wed,Fri" or "Mon-Fri"
*/
function isTeacherAvailableOnDay(teacher, dayIndex) {
var availability = teacher.availability || 'all';

// If "all", teacher is available every day
if (availability.toLowerCase() === 'all') {
return true;
}

var dayName = DAYS[dayIndex];
var shortDay = dayName.substring(0, 3).toLowerCase();

// Handle ranges like "Mon-Fri"
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

// Handle comma-separated days like "Mon,Wed,Fri"
var availableDays = availability.split(',');
for (var i = 0; i < availableDays.length; i++) {
var day = availableDays[i].trim().toLowerCase();
if (day === shortDay || day === dayName.toLowerCase()) {
return true;
}
}

return false;
}

/**
* Build the list of all sessions that need to be scheduled.
* Each session represents one lecture of a subject for a batch.
* Uses priority queue approach: smallest suitable rooms are assigned first.
*/
function buildSessions(database) {
var sessions = [];

// Room assignment map: batch ID -> room object
var batchToRoom = {};

// Track which rooms are already assigned
var assignedRooms = {};

// First, sort batches by student count (smallest first for priority queue)
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

// For each batch, find the smallest room that fits all students
for (var b = 0; b < sortedBatches.length; b++) {
var batch = sortedBatches[b];
var assignedRoom = null;
var smallestFitting = null;

// Find smallest unassigned room that fits this batch
for (var r = 0; r < database.rooms.length; r++) {
var room = database.rooms[r];
if (!assignedRooms[room.room_id] && room.capacity >= batch.student_count) {
if (!smallestFitting || room.capacity < smallestFitting.capacity) {
smallestFitting = room;
}
}
}

// If no unassigned room fits, try any room that fits
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

// Last resort: use largest room
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

// Create sessions for each subject
var sessionId = 0;
for (var s = 0; s < database.subjects.length; s++) {
var subject = database.subjects[s];

// Find which batches take this subject
for (var bat = 0; bat < database.batches.length; bat++) {
var batchItem = database.batches[bat];

// Check if this batch should take this subject
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

// Create one session per lecture needed per week
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
color: -1 // -1 means not yet scheduled
});
}
}
}

return sessions;
}

/**
* Check if two sessions conflict with each other.
* Sessions conflict if they share the same teacher, batch, or room.
*/
function hasConflict(sessionA, sessionB) {
return sessionA.teacher_id === sessionB.teacher_id ||
sessionA.batch_id === sessionB.batch_id ||
sessionA.room_id === sessionB.room_id;
}

/**
* Build an adjacency list showing which sessions conflict with each other.
* Two sessions are neighbors if they conflict.
*/
function buildGraph(sessionList) {
var adjacency = [];
for (var i = 0; i < sessionList.length; i++) {
adjacency[i] = [];
}

// Check every pair of sessions
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

/**
* Count how many different colors (time slots) are used by neighbors of a session.
* This is called "saturation" in the DSATUR algorithm.
*/
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

/**
* Pick the next uncolored session to schedule.
* Choose the one with highest saturation (most different colors used by neighbors).
* Ties are broken by which session has more conflicts.
*/
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

/**
* Get the maximum number of lectures of a subject that should be scheduled on one day.
* This helps spread subjects across the week.
*/
function getDailySubjectLimit(session) {
return Math.max(1, Math.ceil(session.weekly_lectures / DAYS.length));
}

/**
* Calculate distance between two day indices, accounting for wrap-around.
*/
function dayDistanceCircular(dayA, dayB) {
var distance = Math.abs(dayA - dayB);
return Math.min(distance, DAYS.length - distance);
}

/**
* Check if it's okay to place a session at a particular time slot.
* Returns a penalty score (lower is better) or null if impossible.
*/
function getPlacementPenalty(sessionList, sessionIndex, colorToTry, maxPerDay) {
var session = sessionList[sessionIndex];
var dayIdx = slotToDayIndex(colorToTry);
var periodIdx = colorToTry % SLOTS_PER_DAY;

var sameSubjectSameDay = 0;
var batchDayLoad = 0;
var hasAdjacentSameSubject = false;

// Check against already-placed sessions
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

// Can't exceed daily limit for this subject
if (sameSubjectSameDay >= maxPerDay) {
return null;
}

// Prefer spreading lectures across the week
var preferredDay = session.lecture_index % DAYS.length;
var spreadPenalty = dayDistanceCircular(dayIdx, preferredDay);

return (sameSubjectSameDay * 100) +
(batchDayLoad * 5) +
(hasAdjacentSameSubject ? 20 : 0) +
(spreadPenalty * 3);
}

/**
* Find the best time slot for a session among available slots.
* Considers teacher availability, daily limits, and spreading.
*/
function chooseBestColor(sessionList, sessionIndex, usedColors, maxPerDay, database) {
var bestColor = -1;
var bestPenalty = Number.POSITIVE_INFINITY;
var maxUsedColor = -1;

// Get the session and its teacher
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

// Find the highest color number currently in use
for (var i = 0; i < sessionList.length; i++) {
if (sessionList[i].color > maxUsedColor) {
maxUsedColor = sessionList[i].color;
}
}

// Search up to the current max color plus some buffer
var searchLimit = Math.max(TOTAL_SLOTS - 1, maxUsedColor + 1);

// Check each possible color
for (var color = 0; color <= searchLimit; color++) {
if (usedColors[color]) continue;

// Check teacher availability for this color's day
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

/**
* Pick a color (time slot) for a session, trying to be smart about placement.
* Uses a priority approach: prefer slots with least conflicts.
*/
function pickSmallestColor(sessionList, adjacencyList, sessionIndex, database) {
var usedColors = {};

// Mark colors used by neighboring sessions
for (var i = 0; i < adjacencyList[sessionIndex].length; i++) {
var neighborIdx = adjacencyList[sessionIndex][i];
var neighborColor = sessionList[neighborIdx].color;
if (neighborColor >= 0) {
usedColors[neighborColor] = true;
}
}

// Get the ideal daily limit for this subject
var baseLimit = getDailySubjectLimit(sessionList[sessionIndex]);

// Try to find a slot that respects the daily limit and teacher availability
var selected = chooseBestColor(sessionList, sessionIndex, usedColors, baseLimit, database);
if (selected !== -1) return selected;

// Relax the limit slightly and try again
selected = chooseBestColor(sessionList, sessionIndex, usedColors, baseLimit + 1, database);
if (selected !== -1) return selected;

// Last resort - ignore daily limits but still check teacher availability
selected = chooseBestColor(sessionList, sessionIndex, usedColors, Number.MAX_SAFE_INTEGER, database);
if (selected !== -1) return selected;

// Truly last resort - just pick any available color (may violate teacher availability)
selected = 0;
while (usedColors[selected]) selected++;
return selected;
}

/**
* Check if a color is safe to use - no conflicts with neighbors.
* Also considers teacher availability for the day.
*/
function isSafeColor(sessionList, adjacencyList, sessionIndex, colorToTry, dailyLimitRelaxation, database) {
var session = sessionList[sessionIndex];

// Check if any neighbor already uses this color
for (var i = 0; i < adjacencyList[sessionIndex].length; i++) {
var neighbor = sessionList[adjacencyList[sessionIndex][i]];
if (neighbor.color === colorToTry) {
return false;
}
}

// Check teacher availability on this day
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

// Check daily subject limit
var maxPerDay = getDailySubjectLimit(session) + (dailyLimitRelaxation || 0);
if (getPlacementPenalty(sessionList, sessionIndex, colorToTry, maxPerDay) === null) {
return false;
}

return true;
}

/**
* DSATUR greedy graph coloring algorithm.
* Repeatedly picks the uncolored vertex with highest saturation and colors it.
*/
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

/**
* Backtracking search to improve the schedule when initial coloring doesn't fit.
* Tries to reassign colors within the available slots.
*/
function backtrackSearch(sessionList, adjacencyList, startIndex, maxColor, dailyRelaxation, database) {
// All sessions colored means success
if (startIndex === sessionList.length) {
return true;
}

// Already colored - skip ahead
if (sessionList[startIndex].color !== -1) {
return backtrackSearch(sessionList, adjacencyList, startIndex + 1, maxColor, dailyRelaxation, database);
}

// Try each possible color
for (var color = 0; color < maxColor; color++) {
if (isSafeColor(sessionList, adjacencyList, startIndex, color, dailyRelaxation, database)) {
sessionList[startIndex].color = color;
if (backtrackSearch(sessionList, adjacencyList, startIndex + 1, maxColor, dailyRelaxation, database)) {
return true;
}
// Backtrack
sessionList[startIndex].color = -1;
}
}

return false;
}

/**
* Convert colored sessions into a list of timetable entries with readable times.
*/
function buildTimetable(sessionList, database) {
var entries = [];

// Helper to find an item by ID
function findByField(itemList, fieldName, value) {
for (var i = 0; i < itemList.length; i++) {
if (itemList[i][fieldName] === value) return itemList[i];
}
return null;
}

// Convert each session to an entry
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

// Sort by day then by slot
entries.sort(function(a, b) {
var dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
if (dayDiff !== 0) return dayDiff;
return a.slot - b.slot;
});

return entries;
}

/**
* Check for scheduling conflicts in the final timetable.
* Returns counts of teacher, room, and batch conflicts.
*/
function validateTimetable(entries) {
var conflicts = { teacher: 0, room: 0, batch: 0 };

for (var i = 0; i < entries.length; i++) {
for (var j = i + 1; j < entries.length; j++) {
var a = entries[i];
var b = entries[j];

// Only check same time slots
if (a.day !== b.day || a.slot !== b.slot) continue;

if (a.teacher === b.teacher) conflicts.teacher++;
if (a.room === b.room) conflicts.room++;
if (a.batch === b.batch) conflicts.batch++;
}
}

return conflicts;
}

/**
* Render the timetable as an HTML grid.
*/
function renderTimetableGrid(entries, database) {
var wrapper = document.getElementById('timetableWrapper');

if (!entries || entries.length === 0) {
wrapper.innerHTML = '<div class="empty-state"><p>No timetable data.</p></div>';
return;
}

// Set up filter dropdowns
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

// Filter change handler
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

// Build subject color map for visual distinction
var subjectColorMap = {};
var colorIdx = 0;
for (var si = 0; si < entries.length; si++) {
if (!(entries[si].subject in subjectColorMap)) {
subjectColorMap[entries[si].subject] = colorIdx++ % 5;
}
}

// Draw the table
function drawTable(data) {
var slotMap = {};
for (var di = 0; di < DAYS.length; di++) {
slotMap[DAYS[di]] = {};
for (var pi = 1; pi <= SLOTS_PER_DAY; pi++) {
slotMap[DAYS[di]][pi] = [];
}
}

// Populate the slot map
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

// Build period numbers
var periodNumbers = [];
for (var p = 1; p <= SLOTS_PER_DAY; p++) {
periodNumbers.push(p);
}

// Build HTML table
var html = '<div class="timetable-wrapper"><table class="timetable"><thead><tr>';
html += '<th>Day \\ Slot</th>';
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

/**
* Escape HTML special characters for safe display.
*/
function escHtml(str) {
return String(str)
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;');
}

/**
* Main function to generate the timetable.
* Called when user clicks the generate button.
*/
document.getElementById('btnGenerate').addEventListener('click', function() {
var database = window.app.db;

// Make sure all required data exists
if (!database.teachers.length || !database.rooms.length ||
!database.subjects.length || !database.batches.length) {
window.app.showToast('Please add at least one teacher, room, subject, and batch.', 'error');
return;
}

// Show progress bar
var progressWrap = document.getElementById('progressWrap');
var progressBar = document.getElementById('progressBar');
progressWrap.style.display = 'block';
progressBar.style.width = '0%';

setTimeout(function() {
progressBar.style.width = '40%';

// Build sessions and graph
var sessions = buildSessions(database);
var adjacency = buildGraph(sessions);

// Run DSATUR coloring
dsaturColor(sessions, adjacency, database);

// Find the maximum color used
var maxColor = -1;
for (var i = 0; i < sessions.length; i++) {
if (sessions[i].color > maxColor) {
maxColor = sessions[i].color;
}
}

// If too many slots used, try backtracking
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

// Count unscheduled sessions
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

// Build final timetable
var entries = buildTimetable(sessions, database);
var conflicts = validateTimetable(entries);

// Show results
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

/**
* Export timetable as JSON file.
*/
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