/**
 * timetable.js — JavaScript port of the DSATUR scheduling algorithm
 *
 * Models timetable scheduling as a Graph Coloring Problem:
 *   G = (V, E)
 *   V = class sessions (one per batch × subject × lecture)
 *   E = conflicts (same teacher OR same batch OR same room)
 *   Color = time slot (day + period combination)
 *
 * Algorithm: DSATUR (Degree of SATURation)
 *   At each step choose the uncolored vertex with the highest
 *   saturation (number of distinct colors in its neighbourhood).
 *   Ties broken by vertex degree.
 *   Complexity: O(V²)  — well-suited for V ≤ 256 sessions.
 *
 * If DSATUR needs more slots than TOTAL_SLOTS, a backtracking pass
 * is attempted on the remaining uncolored vertices.
 */
(function () {
  'use strict';

  var DAYS         = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  var SLOTS_PER_DAY = 8;   // periods 1-8
  var TOTAL_SLOTS  = DAYS.length * SLOTS_PER_DAY;  // 40

  /* ── Slot ↔ (day, period) helpers ─────────────────────────────── */
  function slotToDay(color)    { return DAYS[Math.floor(color / SLOTS_PER_DAY)]; }
  function slotToPeriod(color) { return (color % SLOTS_PER_DAY) + 1; }
  function slotToDayIndex(color){ return Math.floor(color / SLOTS_PER_DAY); }
  function slotToPeriodIndex(color) { return color % SLOTS_PER_DAY; }

  /* ── Build session list ───────────────────────────────────────── */
  function buildSessions(db) {
    var sessions = [];
    var roomMap  = {};   /* batch_id → room (smallest fitting) */
    var roomUsed = {};   /* room_id  → true  (already assigned) */

    /* Assign each batch a distinct room (first fit decreasing) */
    var sortedBatches = db.batches.slice().sort(function (a, b) {
      return b.student_count - a.student_count;
    });
    sortedBatches.forEach(function (batch) {
      var assigned = null;
      db.rooms.forEach(function (r) {
        if (!assigned && !roomUsed[r.room_id] && r.capacity >= batch.student_count)
          assigned = r;
      });
      /* fallback: any fitting room */
      if (!assigned) {
        db.rooms.forEach(function (r) {
          if (!assigned && r.capacity >= batch.student_count) assigned = r;
        });
      }
      /* last resort: largest room */
      if (!assigned) {
        var best = db.rooms.slice().sort(function (a, b) { return b.capacity - a.capacity; })[0];
        assigned = best;
      }
      if (assigned) {
        roomMap[batch.batch_id] = assigned;
        roomUsed[assigned.room_id] = true;
      }
    });

    /* Generate one session per lecture for each (subject × batch) */
    var id = 0;
    db.subjects.forEach(function (subj) {
      db.batches.forEach(function (batch) {
        for (var l = 0; l < subj.lectures_per_week; l++) {
          var room = roomMap[batch.batch_id] || db.rooms[0];
          sessions.push({
            id:         id++,
            teacher_id: subj.teacher_id,
            batch_id:   batch.batch_id,
            room_id:    room.room_id,
            subject_id: subj.subject_id,
            weekly_lectures: subj.lectures_per_week,
            lecture_index: l,
            color:      -1       /* unassigned */
          });
        }
      });
    });
    return sessions;
  }

  /* ── Conflict check ───────────────────────────────────────────── */
  function hasConflict(a, b) {
    return a.teacher_id === b.teacher_id ||
           a.batch_id   === b.batch_id   ||
           a.room_id    === b.room_id;
  }

  /* ── Build adjacency list ─────────────────────────────────────── */
  function buildGraph(sessions) {
    var adj = sessions.map(function () { return []; });
    for (var i = 0; i < sessions.length; i++) {
      for (var j = i + 1; j < sessions.length; j++) {
        if (hasConflict(sessions[i], sessions[j])) {
          adj[i].push(j);
          adj[j].push(i);
        }
      }
    }
    return adj;
  }

  function countNeighborColors(sessions, adj, idx) {
    var seen = {};
    var count = 0;
    var k;
    for (k = 0; k < adj[idx].length; k++) {
      var neighbor = adj[idx][k];
      var color = sessions[neighbor].color;
      if (color >= 0 && !seen[color]) {
        seen[color] = true;
        count++;
      }
    }
    return count;
  }

  function pickNextNode(sessions, adj) {
    var bestIndex = -1;
    var bestSaturation = -1;
    var bestDegree = -1;
    var i;

    for (i = 0; i < sessions.length; i++) {
      if (sessions[i].color !== -1) continue;

      var saturation = countNeighborColors(sessions, adj, i);
      var degree = adj[i].length;

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
    /* Spread each subject through the week as much as possible. */
    return Math.max(1, Math.ceil(session.weekly_lectures / DAYS.length));
  }

  function dayDistanceCircular(a, b) {
    var d = Math.abs(a - b);
    return Math.min(d, DAYS.length - d);
  }

  function getPlacementPenalty(sessions, idx, color, maxPerDay) {
    var session = sessions[idx];
    var dayIdx = slotToDayIndex(color);
    var periodIdx = slotToPeriodIndex(color);

    var sameSubjectSameDay = 0;
    var batchDayLoad = 0;
    var adjacentSameSubject = false;

    for (var i = 0; i < sessions.length; i++) {
      var other = sessions[i];
      if (i === idx || other.color < 0) continue;
      if (other.batch_id !== session.batch_id) continue;
      if (slotToDayIndex(other.color) !== dayIdx) continue;

      batchDayLoad++;

      if (other.subject_id === session.subject_id) {
        sameSubjectSameDay++;
        if (Math.abs(slotToPeriodIndex(other.color) - periodIdx) === 1) {
          adjacentSameSubject = true;
        }
      }
    }

    if (sameSubjectSameDay >= maxPerDay) return null;

    var preferredDay = session.lecture_index % DAYS.length;
    var spreadPenalty = dayDistanceCircular(dayIdx, preferredDay);

    return (sameSubjectSameDay * 100) +
           (batchDayLoad * 5) +
           (adjacentSameSubject ? 20 : 0) +
           (spreadPenalty * 3);
  }

  function chooseBestColor(sessions, idx, used, maxPerDay) {
    var bestColor = -1;
    var bestPenalty = Number.POSITIVE_INFINITY;
    var currentMaxColor = -1;

    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].color > currentMaxColor) currentMaxColor = sessions[i].color;
    }

    var searchLimit = Math.max(TOTAL_SLOTS - 1, currentMaxColor + 1);

    for (var color = 0; color <= searchLimit; color++) {
      if (used[color]) continue;

      var penalty = getPlacementPenalty(sessions, idx, color, maxPerDay);
      if (penalty === null) continue;

      if (penalty < bestPenalty || (penalty === bestPenalty && (bestColor === -1 || color < bestColor))) {
        bestPenalty = penalty;
        bestColor = color;
      }
    }

    return bestColor;
  }

  function pickSmallestColor(sessions, adj, idx) {
    var used = {};
    var k;

    for (k = 0; k < adj[idx].length; k++) {
      var neighbor = adj[idx][k];
      var color = sessions[neighbor].color;
      if (color >= 0) used[color] = true;
    }

    var baseLimit = getDailySubjectLimit(sessions[idx]);

    var selected = chooseBestColor(sessions, idx, used, baseLimit);
    if (selected !== -1) return selected;

    /* If strict distribution is impossible, relax by one session/day. */
    selected = chooseBestColor(sessions, idx, used, baseLimit + 1);
    if (selected !== -1) return selected;

    /* Last-resort fallback to preserve feasibility in extreme inputs. */
    selected = chooseBestColor(sessions, idx, used, Number.MAX_SAFE_INTEGER);
    if (selected !== -1) return selected;

    /* Defensive fallback (should rarely happen). */
    selected = 0;
    while (used[selected]) selected++;
    return selected;
  }

  /* ── DSATUR coloring ──────────────────────────────────────────── */
  function dsatur(sessions, adj) {
    var n = sessions.length;
    var colored = 0;

    while (colored < n) {
      var best = pickNextNode(sessions, adj);
      if (best === -1) break;

      sessions[best].color = pickSmallestColor(sessions, adj, best);
      colored++;
    }
  }

  /* ── Backtracking for overflow slots ─────────────────────────── */
  function isSafeColor(sessions, adj, idx, color, dailyLimitRelaxation) {
    for (var k = 0; k < adj[idx].length; k++) {
      if (sessions[adj[idx][k]].color === color) return false;
    }

    var maxPerDay = getDailySubjectLimit(sessions[idx]) + (dailyLimitRelaxation || 0);
    if (getPlacementPenalty(sessions, idx, color, maxPerDay) === null) return false;

    return true;
  }

  function backtrack(sessions, adj, idx, maxColor, dailyLimitRelaxation) {
    if (idx === sessions.length) return true;
    if (sessions[idx].color !== -1) {
      return backtrack(sessions, adj, idx + 1, maxColor, dailyLimitRelaxation);
    }

    for (var c = 0; c < maxColor; c++) {
      if (isSafeColor(sessions, adj, idx, c, dailyLimitRelaxation)) {
        sessions[idx].color = c;
        if (backtrack(sessions, adj, idx + 1, maxColor, dailyLimitRelaxation)) return true;
        sessions[idx].color = -1;
      }
    }
    return false;
  }

  /* ── Schedule: map colors → (day, slot) entries ──────────────── */
  function buildTimetable(sessions, db) {
    var result = [];

    function findById(arr, field, value) {
      var i;
      for (i = 0; i < arr.length; i++) {
        if (arr[i][field] === value) return arr[i];
      }
      return null;
    }

    sessions.forEach(function (s) {
      var subject = findById(db.subjects, 'subject_id', s.subject_id);
      var teacher = findById(db.teachers, 'teacher_id', s.teacher_id);
      var batch   = findById(db.batches, 'batch_id', s.batch_id);
      var room    = findById(db.rooms, 'room_id', s.room_id);
      result.push({
        day:     slotToDay(s.color),
        slot:    slotToPeriod(s.color),
        room:    room    ? room.room_name       : 'TBD',
        subject: subject ? subject.subject_name : 'Unknown',
        teacher: teacher ? teacher.teacher_name : 'Unknown',
        batch:   batch   ? batch.batch_name     : 'Unknown'
      });
    });
    /* Sort by day index then slot */
    result.sort(function (a, b) {
      var di = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
      return di !== 0 ? di : a.slot - b.slot;
    });
    return result;
  }

  /* ── Conflict validator ───────────────────────────────────────── */
  function validateTimetable(entries) {
    var conflicts = { teacher: 0, room: 0, batch: 0 };
    for (var i = 0; i < entries.length; i++) {
      for (var j = i + 1; j < entries.length; j++) {
        var a = entries[i], b = entries[j];
        if (a.day !== b.day || a.slot !== b.slot) continue;
        if (a.teacher === b.teacher) conflicts.teacher++;
        if (a.room    === b.room)    conflicts.room++;
        if (a.batch   === b.batch)   conflicts.batch++;
      }
    }
    return conflicts;
  }

  /* ── Render timetable grid ────────────────────────────────────── */
  function renderGrid(entries, db) {
    var wrapper = document.getElementById('timetableWrapper');
    if (!entries || !entries.length) {
      wrapper.innerHTML = '<div class="empty-state"><p>No timetable data.</p></div>';
      return;
    }

    /* Populate filter dropdowns */
    var filterBatch   = document.getElementById('filterBatch');
    var filterTeacher = document.getElementById('filterTeacher');
    filterBatch.innerHTML   = '<option value="">All Batches</option>'   + db.batches.map(function (b) { return '<option>' + b.batch_name + '</option>'; }).join('');
    filterTeacher.innerHTML = '<option value="">All Teachers</option>'  + db.teachers.map(function (t) { return '<option>' + t.teacher_name + '</option>'; }).join('');

    function applyFilters() {
      var fb = filterBatch.value;
      var ft = filterTeacher.value;
      var filtered = entries.filter(function (e) {
        return (!fb || e.batch === fb) && (!ft || e.teacher === ft);
      });
      drawTable(filtered);
    }

    filterBatch.onchange   = applyFilters;
    filterTeacher.onchange = applyFilters;

    /* Subject → color index for visual distinction */
    var subjectColorMap = {};
    var colorIdx = 0;
    entries.forEach(function (e) {
      if (!(e.subject in subjectColorMap)) subjectColorMap[e.subject] = colorIdx++ % 5;
    });

    function drawTable(data) {
      /* Build slot map: day → slot → array of entries */
      var slotMap = {};
      DAYS.forEach(function (d) {
        slotMap[d] = {};
        for (var p = 1; p <= SLOTS_PER_DAY; p++) slotMap[d][p] = [];
      });
      data.forEach(function (e) {
        if (slotMap[e.day] && slotMap[e.day][e.slot])
          slotMap[e.day][e.slot].push(e);
      });

      /* Determine which slots have at least one entry */
      var usedSlots = [];
      for (var p = 1; p <= SLOTS_PER_DAY; p++) {
        var any = DAYS.some(function (d) { return slotMap[d][p].length > 0; });
        if (any) usedSlots.push(p);
      }
      if (!usedSlots.length) {
        wrapper.innerHTML = '<div class="empty-state"><p>No entries match the current filter.</p></div>';
        return;
      }

      var html = '<div class="timetable-wrapper"><table class="timetable"><thead><tr>';
      html += '<th>Day \\ Slot</th>';
      usedSlots.forEach(function (p) { html += '<th>Slot ' + p + '</th>'; });
      html += '</tr></thead><tbody>';

      DAYS.forEach(function (day) {
        html += '<tr><th>' + day + '</th>';
        usedSlots.forEach(function (p) {
          var cellEntries = slotMap[day][p];
          if (!cellEntries.length) {
            html += '<td><div class="tt-cell tt-cell-empty"></div></td>';
          } else {
            html += '<td>';
            cellEntries.forEach(function (e) {
              var ci = subjectColorMap[e.subject] || 0;
              html += '<div class="tt-cell tt-cell-filled color-' + ci + '">' +
                      '<span class="tt-subject">' + esc(e.subject) + '</span>' +
                      '<span class="tt-teacher">' + esc(e.teacher) + '</span>' +
                      '<span class="tt-room">'    + esc(e.room)    + '</span>' +
                      '<span class="tt-batch">'   + esc(e.batch)   + '</span>' +
                      '</div>';
            });
            html += '</td>';
          }
        });
        html += '</tr>';
      });

      html += '</tbody></table></div>';
      wrapper.innerHTML = html;
    }

    drawTable(entries);
  }

  /* ── HTML escape helper ───────────────────────────────────────── */
  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ── Main generate handler ────────────────────────────────────── */
  document.getElementById('btnGenerate').addEventListener('click', function () {
    var db = window.app.db;

    if (!db.teachers.length || !db.rooms.length || !db.subjects.length || !db.batches.length) {
      window.app.showToast('Please add at least one teacher, room, subject, and batch.', 'error');
      return;
    }

    /* Animate progress bar */
    var wrap = document.getElementById('progressWrap');
    var bar  = document.getElementById('progressBar');
    wrap.style.display = 'block';
    bar.style.width    = '0%';
    setTimeout(function () { bar.style.width = '40%'; }, 50);

    /* Run algorithm asynchronously to allow UI to update */
    setTimeout(function () {
      bar.style.width = '70%';

      var sessions = buildSessions(db);
      var adj      = buildGraph(sessions);
      dsatur(sessions, adj);

      /* Check if all sessions fit within TOTAL_SLOTS */
      var maxColor = -1;
      var i;
      for (i = 0; i < sessions.length; i++) {
        if (sessions[i].color > maxColor) maxColor = sessions[i].color;
      }
      if (maxColor >= TOTAL_SLOTS) {
        /* Try backtracking with TOTAL_SLOTS constraint */
        sessions.forEach(function (s) { if (s.color >= TOTAL_SLOTS) s.color = -1; });
        var solved = backtrack(sessions, adj, 0, TOTAL_SLOTS, 0);
        if (!solved) {
          /* Mild relaxation to keep schedule possible for very dense inputs. */
          backtrack(sessions, adj, 0, TOTAL_SLOTS, 1);
        }

        maxColor = -1;
        for (i = 0; i < sessions.length; i++) {
          if (sessions[i].color > maxColor) maxColor = sessions[i].color;
        }
      }

      bar.style.width = '100%';

      var resultDiv = document.getElementById('generateResult');
      var unscheduledCount = sessions.filter(function (s) {
        return s.color < 0 || s.color >= TOTAL_SLOTS;
      }).length;

      if (unscheduledCount > 0) {
        resultDiv.innerHTML =
          '<div class="card" style="padding:20px;margin-top:16px;">' +
          '<p style="color:var(--danger);font-weight:700;margin-bottom:8px;">⚠ Could not place all sessions realistically.</p>' +
          '<p style="font-size:.875rem;color:var(--text-muted);">Unscheduled sessions: <strong>' + unscheduledCount + '</strong>. ' +
          'Try reducing weekly lectures or adding more available slots/resources.</p>' +
          '</div>';
        window.app.showToast('Could not schedule all sessions with current constraints.', 'error');
        setTimeout(function () { wrap.style.display = 'none'; bar.style.width = '0%'; }, 600);
        return;
      }

      var entries   = buildTimetable(sessions, db);
      var conflicts = validateTimetable(entries);

      /* Result summary */
      var slotsUsed = maxColor + 1;
      var totalConflicts = conflicts.teacher + conflicts.room + conflicts.batch;
      if (totalConflicts === 0) {
        resultDiv.innerHTML =
          '<div class="card" style="padding:20px;margin-top:16px;">' +
          '<p style="color:var(--success);font-weight:700;margin-bottom:8px;">✓ Timetable generated successfully!</p>' +
          '<p style="font-size:.875rem;color:var(--text-muted);">Sessions: <strong>' + sessions.length + '</strong> &nbsp;|&nbsp; ' +
          'Slots used: <strong>' + slotsUsed + '</strong> / ' + TOTAL_SLOTS + ' &nbsp;|&nbsp; ' +
          'Conflicts: <strong>0</strong></p>' +
          '<button class="btn btn-primary" style="margin-top:12px;" onclick="app.showSection(\'timetable\')">View Timetable →</button>' +
          '</div>';

        /* Store generated timetable */
        window.app.timetableData = entries;
        document.getElementById('btnExportTT').style.display = 'flex';
        renderGrid(entries, db);
        window.app.showToast('Timetable generated — ' + sessions.length + ' sessions scheduled!', 'success');
      } else {
        resultDiv.innerHTML =
          '<div class="card" style="padding:20px;margin-top:16px;">' +
          '<p style="color:var(--danger);font-weight:700;margin-bottom:8px;">⚠ Schedule has ' + totalConflicts + ' conflict(s).</p>' +
          '<p style="font-size:.875rem;color:var(--text-muted);">Try reducing lectures per week or adding more rooms / teachers.</p>' +
          '</div>';
        window.app.showToast('Scheduling completed with ' + totalConflicts + ' conflict(s).', 'error');
      }

      setTimeout(function () { wrap.style.display = 'none'; bar.style.width = '0%'; }, 600);
    }, 150);
  });

  /* ── Export JSON ──────────────────────────────────────────────── */
  document.getElementById('btnExportTT').addEventListener('click', function () {
    if (!window.app.timetableData) return;
    var json = JSON.stringify({ timetable: window.app.timetableData }, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href   = url;
    a.download = 'timetable.json';
    a.click();
    URL.revokeObjectURL(url);
  });

}());
