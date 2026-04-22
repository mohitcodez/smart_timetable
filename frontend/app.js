/**
 * app.js — Core application logic for Smart Timetable Dashboard
 *
 * Handles:
 *  - Session guard (redirect to login if not authenticated)
 *  - Sidebar navigation
 *  - CRUD operations for Teachers, Rooms, Subjects, Batches
 *  - localStorage persistence
 *  - Toast notifications
 *  - Modal open / close
 */
(function () {
  'use strict';

  /* ── Auth guard ───────────────────────────────────────────────── */
  var currentUser = sessionStorage.getItem('ttsUser');
  if (!currentUser) { window.location.replace('index.html'); return; }

  document.getElementById('topbarUser').textContent    = currentUser;
  document.getElementById('topbarAvatar').textContent  = currentUser.charAt(0).toUpperCase();

  document.getElementById('btnLogout').addEventListener('click', function () {
    sessionStorage.removeItem('ttsUser');
    window.location.replace('index.html');
  });

  /* ── Data store ───────────────────────────────────────────────── */
  var KEYS = { teachers: 'tts_teachers', rooms: 'tts_rooms', subjects: 'tts_subjects', batches: 'tts_batches' };

  function load(key) {
    var raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      return JSON.parse(raw) || [];
    } catch (e) {
      return [];
    }
  }
  function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

  var db = {
    teachers: load(KEYS.teachers),
    rooms:    load(KEYS.rooms),
    subjects: load(KEYS.subjects),
    batches:  load(KEYS.batches)
  };

  /* Seed defaults if empty */
  if (!db.teachers.length) {
    db.teachers = [
      { teacher_id: 1, teacher_name: 'Dr. Sharma',  subjects: 'Mathematics',      availability: 'all' },
      { teacher_id: 2, teacher_name: 'Prof. Gupta',  subjects: 'Physics',          availability: 'all' },
      { teacher_id: 3, teacher_name: 'Ms. Verma',    subjects: 'Chemistry',        availability: 'all' },
      { teacher_id: 4, teacher_name: 'Mr. Singh',    subjects: 'Computer Science', availability: 'all' },
      { teacher_id: 5, teacher_name: 'Dr. Mehta',    subjects: 'English',          availability: 'all' }
    ];
    save(KEYS.teachers, db.teachers);
  }
  if (!db.rooms.length) {
    db.rooms = [
      { room_id: 1, room_name: 'R101',  capacity: 60 },
      { room_id: 2, room_name: 'R102',  capacity: 50 },
      { room_id: 3, room_name: 'R103',  capacity: 40 },
      { room_id: 4, room_name: 'Lab-A', capacity: 30 }
    ];
    save(KEYS.rooms, db.rooms);
  }
  if (!db.subjects.length) {
    db.subjects = [
      { subject_id: 1, subject_name: 'Mathematics',      teacher_id: 1, lectures_per_week: 2 },
      { subject_id: 2, subject_name: 'Physics',          teacher_id: 2, lectures_per_week: 2 },
      { subject_id: 3, subject_name: 'Chemistry',        teacher_id: 3, lectures_per_week: 2 },
      { subject_id: 4, subject_name: 'Computer Science', teacher_id: 4, lectures_per_week: 2 },
      { subject_id: 5, subject_name: 'English',          teacher_id: 5, lectures_per_week: 1 }
    ];
    save(KEYS.subjects, db.subjects);
  }
  if (!db.batches.length) {
    db.batches = [
      { batch_id: 1, batch_name: 'CSE-A', student_count: 55 },
      { batch_id: 2, batch_name: 'CSE-B', student_count: 48 },
      { batch_id: 3, batch_name: 'ECE-A', student_count: 35 }
    ];
    save(KEYS.batches, db.batches);
  }

  /* ── Utilities ────────────────────────────────────────────────── */
  function nextId(arr, field) {
    var maxId = 0;
    var i;
    for (i = 0; i < arr.length; i++) {
      if (arr[i][field] > maxId) maxId = arr[i][field];
    }
    return maxId + 1;
  }

  function findById(arr, field, id) {
    var i;
    for (i = 0; i < arr.length; i++) {
      if (arr[i][field] === id) return arr[i];
    }
    return null;
  }

  function removeById(arr, field, id) {
    var result = [];
    var i;
    for (i = 0; i < arr.length; i++) {
      if (arr[i][field] !== id) result.push(arr[i]);
    }
    return result;
  }

  /* ── Toast ────────────────────────────────────────────────────── */
  var toastEl    = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg, type) {
    type = type || 'info';
    toastEl.textContent = msg;
    toastEl.className   = 'toast ' + type;
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 3000);
  }

  /* ── Modal ────────────────────────────────────────────────────── */
  function openModal(id)  { document.getElementById(id).classList.add('open'); }
  function closeModal(id) { document.getElementById(id).classList.remove('open'); }

  document.querySelectorAll('[data-close]').forEach(function (btn) {
    btn.addEventListener('click', function () { closeModal(btn.dataset.close); });
  });
  document.querySelectorAll('.modal-overlay').forEach(function (ov) {
    ov.addEventListener('click', function (e) {
      if (e.target === ov) closeModal(ov.id);
    });
  });

  /* ── Sidebar navigation ───────────────────────────────────────── */
  var sectionTitles = {
    dashboard: 'Dashboard',
    teachers:  'Teachers',
    rooms:     'Rooms',
    subjects:  'Subjects',
    batches:   'Student Batches',
    generate:  'Generate Timetable',
    timetable: 'View Timetable'
  };

  function showSection(name) {
    document.querySelectorAll('.section').forEach(function (s) { s.classList.remove('active'); });
    document.querySelectorAll('.nav-item').forEach(function (n) { n.classList.remove('active'); });
    var sec = document.getElementById('sec-' + name);
    if (sec) sec.classList.add('active');
    var nav = document.querySelector('[data-section="' + name + '"]');
    if (nav) nav.classList.add('active');
    document.getElementById('pageTitle').textContent = sectionTitles[name] || '';
    updateStats();
  }

  document.querySelectorAll('.nav-item').forEach(function (item) {
    item.addEventListener('click', function () {
      showSection(item.dataset.section);
    });
  });

  /* ── Stats ────────────────────────────────────────────────────── */
  function updateStats() {
    document.getElementById('stat-teachers').textContent = db.teachers.length;
    document.getElementById('stat-rooms').textContent    = db.rooms.length;
    document.getElementById('stat-subjects').textContent = db.subjects.length;
    document.getElementById('stat-batches').textContent  = db.batches.length;
  }
  updateStats();

  /* ── TEACHERS CRUD ────────────────────────────────────────────── */
  var BADGE_COLORS = ['badge-blue','badge-green','badge-orange','badge-sky','badge-purple'];
  function badgeClass(i) { return BADGE_COLORS[i % BADGE_COLORS.length]; }

  function renderTeachers() {
    var tbody = document.getElementById('teachersBody');
    if (!db.teachers.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><p>No teachers added yet.</p></td></tr>';
      return;
    }
    tbody.innerHTML = db.teachers.map(function (t, i) {
      return '<tr>' +
        '<td><span class="badge ' + badgeClass(i) + '">#' + t.teacher_id + '</span></td>' +
        '<td><strong>' + esc(t.teacher_name) + '</strong></td>' +
        '<td>' + esc(t.subjects || '—') + '</td>' +
        '<td>' + esc(t.availability || 'all') + '</td>' +
        '<td><button class="btn btn-secondary" style="padding:4px 10px;font-size:.78rem;" onclick="app.editTeacher(' + t.teacher_id + ')">Edit</button> ' +
            '<button class="btn btn-danger"    style="padding:4px 10px;font-size:.78rem;" onclick="app.deleteTeacher(' + t.teacher_id + ')">Delete</button></td>' +
        '</tr>';
    }).join('');
  }

  function openTeacherModal(teacher) {
    document.getElementById('modalTeacherTitle').textContent = teacher ? 'Edit Teacher' : 'Add Teacher';
    document.getElementById('tEditId').value        = teacher ? teacher.teacher_id : '';
    document.getElementById('tName').value          = teacher ? teacher.teacher_name : '';
    document.getElementById('tSubjects').value      = teacher ? (teacher.subjects || '') : '';
    document.getElementById('tAvailability').value  = teacher ? (teacher.availability || 'all') : 'all';
    openModal('modalTeacher');
  }

  document.getElementById('btnAddTeacher').addEventListener('click', function () { openTeacherModal(null); });

  document.getElementById('btnSaveTeacher').addEventListener('click', function () {
    var name = document.getElementById('tName').value.trim();
    if (!name) { showToast('Teacher name is required.', 'error'); return; }
    var editId = parseInt(document.getElementById('tEditId').value, 10);
    var subj   = document.getElementById('tSubjects').value.trim();
    var avail  = document.getElementById('tAvailability').value.trim() || 'all';
    if (editId) {
      var t = db.teachers.find(function (x) { return x.teacher_id === editId; });
      if (t) { t.teacher_name = name; t.subjects = subj; t.availability = avail; }
    } else {
      db.teachers.push({ teacher_id: nextId(db.teachers, 'teacher_id'), teacher_name: name, subjects: subj, availability: avail });
    }
    save(KEYS.teachers, db.teachers);
    closeModal('modalTeacher');
    renderTeachers();
    updateStats();
    showToast(editId ? 'Teacher updated.' : 'Teacher added.', 'success');
  });

  function editTeacher(id) {
    var t = findById(db.teachers, 'teacher_id', id);
    if (t) openTeacherModal(t);
  }
  function deleteTeacher(id) {
    if (!confirm('Delete this teacher?')) return;
    db.teachers = removeById(db.teachers, 'teacher_id', id);
    save(KEYS.teachers, db.teachers);
    renderTeachers();
    updateStats();
    showToast('Teacher deleted.', 'info');
  }

  /* ── ROOMS CRUD ───────────────────────────────────────────────── */
  function renderRooms() {
    var tbody = document.getElementById('roomsBody');
    if (!db.rooms.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><p>No rooms added yet.</p></td></tr>';
      return;
    }
    tbody.innerHTML = db.rooms.map(function (r, i) {
      return '<tr>' +
        '<td><span class="badge ' + badgeClass(i) + '">#' + r.room_id + '</span></td>' +
        '<td><strong>' + esc(r.room_name) + '</strong></td>' +
        '<td>' + r.capacity + ' students</td>' +
        '<td><button class="btn btn-secondary" style="padding:4px 10px;font-size:.78rem;" onclick="app.editRoom(' + r.room_id + ')">Edit</button> ' +
            '<button class="btn btn-danger"    style="padding:4px 10px;font-size:.78rem;" onclick="app.deleteRoom(' + r.room_id + ')">Delete</button></td>' +
        '</tr>';
    }).join('');
  }

  function openRoomModal(room) {
    document.getElementById('modalRoomTitle').textContent = room ? 'Edit Room' : 'Add Room';
    document.getElementById('rEditId').value   = room ? room.room_id : '';
    document.getElementById('rName').value     = room ? room.room_name : '';
    document.getElementById('rCapacity').value = room ? room.capacity : '';
    openModal('modalRoom');
  }

  document.getElementById('btnAddRoom').addEventListener('click', function () { openRoomModal(null); });

  document.getElementById('btnSaveRoom').addEventListener('click', function () {
    var name = document.getElementById('rName').value.trim();
    var cap  = parseInt(document.getElementById('rCapacity').value, 10);
    if (!name || isNaN(cap) || cap < 1) { showToast('Please fill in all room fields correctly.', 'error'); return; }
    var editId = parseInt(document.getElementById('rEditId').value, 10);
    if (editId) {
      var r = db.rooms.find(function (x) { return x.room_id === editId; });
      if (r) { r.room_name = name; r.capacity = cap; }
    } else {
      db.rooms.push({ room_id: nextId(db.rooms, 'room_id'), room_name: name, capacity: cap });
    }
    save(KEYS.rooms, db.rooms);
    closeModal('modalRoom');
    renderRooms();
    updateStats();
    showToast(editId ? 'Room updated.' : 'Room added.', 'success');
  });

  function editRoom(id) {
    var r = findById(db.rooms, 'room_id', id);
    if (r) openRoomModal(r);
  }
  function deleteRoom(id) {
    if (!confirm('Delete this room?')) return;
    db.rooms = removeById(db.rooms, 'room_id', id);
    save(KEYS.rooms, db.rooms);
    renderRooms();
    updateStats();
    showToast('Room deleted.', 'info');
  }

  /* ── SUBJECTS CRUD ────────────────────────────────────────────── */
  function populateTeacherSelect() {
    var sel = document.getElementById('sTeacher');
    sel.innerHTML = db.teachers.map(function (t) {
      return '<option value="' + t.teacher_id + '">' + esc(t.teacher_name) + '</option>';
    }).join('');
  }

  function renderSubjects() {
    var tbody = document.getElementById('subjectsBody');
    if (!db.subjects.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><p>No subjects added yet.</p></td></tr>';
      return;
    }
    tbody.innerHTML = db.subjects.map(function (s, i) {
      var teacher = findById(db.teachers, 'teacher_id', s.teacher_id);
      return '<tr>' +
        '<td><span class="badge ' + badgeClass(i) + '">#' + s.subject_id + '</span></td>' +
        '<td><strong>' + esc(s.subject_name) + '</strong></td>' +
        '<td>' + (teacher ? esc(teacher.teacher_name) : '<em>Unknown</em>') + '</td>' +
        '<td><span class="badge badge-blue">' + s.lectures_per_week + ' / week</span></td>' +
        '<td><button class="btn btn-secondary" style="padding:4px 10px;font-size:.78rem;" onclick="app.editSubject(' + s.subject_id + ')">Edit</button> ' +
            '<button class="btn btn-danger"    style="padding:4px 10px;font-size:.78rem;" onclick="app.deleteSubject(' + s.subject_id + ')">Delete</button></td>' +
        '</tr>';
    }).join('');
  }

  function openSubjectModal(subject) {
    populateTeacherSelect();
    document.getElementById('modalSubjectTitle').textContent = subject ? 'Edit Subject' : 'Add Subject';
    document.getElementById('sEditId').value   = subject ? subject.subject_id : '';
    document.getElementById('sName').value     = subject ? subject.subject_name : '';
    document.getElementById('sLectures').value = subject ? subject.lectures_per_week : 2;
    if (subject) document.getElementById('sTeacher').value = subject.teacher_id;
    openModal('modalSubject');
  }

  document.getElementById('btnAddSubject').addEventListener('click', function () { openSubjectModal(null); });

  document.getElementById('btnSaveSubject').addEventListener('click', function () {
    var name   = document.getElementById('sName').value.trim();
    var tid    = parseInt(document.getElementById('sTeacher').value, 10);
    var lec    = parseInt(document.getElementById('sLectures').value, 10);
    if (!name || isNaN(tid) || isNaN(lec) || lec < 1) { showToast('Please fill in all subject fields.', 'error'); return; }
    var editId = parseInt(document.getElementById('sEditId').value, 10);
    if (editId) {
      var s = db.subjects.find(function (x) { return x.subject_id === editId; });
      if (s) { s.subject_name = name; s.teacher_id = tid; s.lectures_per_week = lec; }
    } else {
      db.subjects.push({ subject_id: nextId(db.subjects, 'subject_id'), subject_name: name, teacher_id: tid, lectures_per_week: lec });
    }
    save(KEYS.subjects, db.subjects);
    closeModal('modalSubject');
    renderSubjects();
    updateStats();
    showToast(editId ? 'Subject updated.' : 'Subject added.', 'success');
  });

  function editSubject(id) {
    var s = findById(db.subjects, 'subject_id', id);
    if (s) openSubjectModal(s);
  }
  function deleteSubject(id) {
    if (!confirm('Delete this subject?')) return;
    db.subjects = removeById(db.subjects, 'subject_id', id);
    save(KEYS.subjects, db.subjects);
    renderSubjects();
    updateStats();
    showToast('Subject deleted.', 'info');
  }

  /* ── BATCHES CRUD ─────────────────────────────────────────────── */
  function renderBatches() {
    var tbody = document.getElementById('batchesBody');
    if (!db.batches.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><p>No batches added yet.</p></td></tr>';
      return;
    }
    tbody.innerHTML = db.batches.map(function (b, i) {
      return '<tr>' +
        '<td><span class="badge ' + badgeClass(i) + '">#' + b.batch_id + '</span></td>' +
        '<td><strong>' + esc(b.batch_name) + '</strong></td>' +
        '<td>' + b.student_count + ' students</td>' +
        '<td><button class="btn btn-secondary" style="padding:4px 10px;font-size:.78rem;" onclick="app.editBatch(' + b.batch_id + ')">Edit</button> ' +
            '<button class="btn btn-danger"    style="padding:4px 10px;font-size:.78rem;" onclick="app.deleteBatch(' + b.batch_id + ')">Delete</button></td>' +
        '</tr>';
    }).join('');
  }

  function openBatchModal(batch) {
    document.getElementById('modalBatchTitle').textContent = batch ? 'Edit Batch' : 'Add Batch';
    document.getElementById('bEditId').value = batch ? batch.batch_id : '';
    document.getElementById('bName').value   = batch ? batch.batch_name : '';
    document.getElementById('bCount').value  = batch ? batch.student_count : '';
    openModal('modalBatch');
  }

  document.getElementById('btnAddBatch').addEventListener('click', function () { openBatchModal(null); });

  document.getElementById('btnSaveBatch').addEventListener('click', function () {
    var name  = document.getElementById('bName').value.trim();
    var count = parseInt(document.getElementById('bCount').value, 10);
    if (!name || isNaN(count) || count < 1) { showToast('Please fill in all batch fields.', 'error'); return; }
    var editId = parseInt(document.getElementById('bEditId').value, 10);
    if (editId) {
      var b = db.batches.find(function (x) { return x.batch_id === editId; });
      if (b) { b.batch_name = name; b.student_count = count; }
    } else {
      db.batches.push({ batch_id: nextId(db.batches, 'batch_id'), batch_name: name, student_count: count });
    }
    save(KEYS.batches, db.batches);
    closeModal('modalBatch');
    renderBatches();
    updateStats();
    showToast(editId ? 'Batch updated.' : 'Batch added.', 'success');
  });

  function editBatch(id) {
    var b = findById(db.batches, 'batch_id', id);
    if (b) openBatchModal(b);
  }
  function deleteBatch(id) {
    if (!confirm('Delete this batch?')) return;
    db.batches = removeById(db.batches, 'batch_id', id);
    save(KEYS.batches, db.batches);
    renderBatches();
    updateStats();
    showToast('Batch deleted.', 'info');
  }

  /* ── HTML escape ──────────────────────────────────────────────── */
  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Initial render ───────────────────────────────────────────── */
  renderTeachers();
  renderRooms();
  renderSubjects();
  renderBatches();

  /* ── Public API (used by inline onclick in HTML) ──────────────── */
  window.app = {
    showSection:   showSection,
    db:            db,
    editTeacher:   editTeacher,
    deleteTeacher: deleteTeacher,
    editRoom:      editRoom,
    deleteRoom:    deleteRoom,
    editSubject:   editSubject,
    deleteSubject: deleteSubject,
    editBatch:     editBatch,
    deleteBatch:   deleteBatch,
    showToast:     showToast
  };

}());
