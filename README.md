# Smart Timetable Management System

A **Design and Analysis of Algorithms (DAA)** project that automatically generates
conflict-free academic timetables using **Graph Coloring** (DSATUR algorithm).

---

## Features

- **Admin Login** — simple session-based authentication
- **Teacher / Room / Subject / Batch CRUD** — full in-browser management with localStorage persistence
- **Automatic Timetable Generation** — DSATUR graph coloring with backtracking fallback
- **Conflict Validation** — guarantees no teacher / room / batch conflicts
- **Visual Timetable Grid** — filterable by batch or teacher
- **Export** — download the generated timetable as JSON
- **C Backend** — standalone CLI tool that reads JSON input and outputs a schedule

---

## Project Structure

```
smart-timetable-system/
├── frontend/
│   ├── index.html       ← Login page
│   ├── dashboard.html   ← Admin dashboard (Teachers / Rooms / Subjects / Batches / Timetable)
│   ├── style.css        ← Complete stylesheet
│   ├── app.js           ← CRUD logic, navigation, modal handling
│   ├── login.js         ← Authentication
│   └── timetable.js     ← JS scheduling engine (DSATUR + backtracking) + grid renderer
├── backend/
│   ├── graph.h / graph.c      ← Adjacency-matrix graph structure
│   ├── scheduler.h / scheduler.c ← DSATUR coloring & backtracking
│   ├── parser.h / parser.c    ← Lightweight JSON parser
│   └── main.c                 ← Entry point; reads JSON → outputs timetable JSON
├── data/
│   └── sample_data.json  ← Example input (5 teachers, 4 rooms, 5 subjects, 3 batches)
├── docs/
│   └── algorithm.md      ← Detailed algorithm documentation
└── README.md
```

---

## Quick Start (Frontend Only — no server needed)

```bash
# Open the login page directly in a browser:
open frontend/index.html
# or on Linux:
xdg-open frontend/index.html
```

Demo credentials: **username** `admin` / **password** `admin123`

---

## Building the C Backend

### Requirements

- GCC (any recent version) or Clang
- POSIX-compatible system (Linux / macOS / WSL)

### Compile

```bash
cd backend
gcc -Wall -Wextra -o scheduler main.c graph.c scheduler.c parser.c
```

### Run

```bash
./scheduler ../data/sample_data.json
```

The scheduler outputs a JSON timetable to stdout:

```json
{
  "timetable": [
    {
      "day":     "Monday",
      "slot":    1,
      "room":    "R101",
      "subject": "Mathematics",
      "teacher": "Dr. Sharma",
      "batch":   "CSE-A"
    }
  ]
}
```

---

## Input Format (`data/sample_data.json`)

```json
{
  "teachers": [
    { "teacher_id": 0, "teacher_name": "Dr. Sharma", "availability": "all" }
  ],
  "rooms": [
    { "room_id": 0, "room_name": "R101", "capacity": 60 }
  ],
  "subjects": [
    { "subject_id": 0, "subject_name": "Mathematics", "teacher_id": 0, "lectures_per_week": 2 }
  ],
  "batches": [
    { "batch_id": 0, "batch_name": "CSE-A", "student_count": 55 }
  ]
}
```

---

## Scheduling Algorithm

Scheduling is modelled as a **Graph Coloring Problem**:

```
G = (V, E)
  V = class sessions (one node per required lecture)
  E = conflict edges (same teacher OR same batch OR same room)
  Color = time slot (day × period)
```

### Algorithms Implemented

| Algorithm | When Used | Complexity |
|-----------|-----------|-----------|
| **DSATUR** (Degree of SATURation) | Primary | O(V²) |
| **Backtracking** | Overflow sessions only | O(k^n) worst-case |

### Constraints Enforced

| Constraint | Mechanism |
|------------|-----------|
| Teacher teaches one class at a time | Teacher-conflict edges |
| Room hosts one class at a time | Room-conflict edges |
| Batch attends one subject at a time | Batch-conflict edges |
| Room capacity ≥ batch size | First-fit room assignment |
| Lectures per week fulfilled | One session per required lecture |

See [docs/algorithm.md](docs/algorithm.md) for full details.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES5) |
| Backend  | C (C99) — standalone CLI |
| Storage  | Browser `localStorage` (frontend), JSON files (backend) |

No frameworks. No dependencies.

---

## License

MIT
