#ifndef SCHEDULER_H
#define SCHEDULER_H

#include "graph.h"

#define DAYS 5
#define SLOTS_PER_DAY 8
#define TOTAL_SLOTS (DAYS * SLOTS_PER_DAY)

extern const char *DAY_NAMES[DAYS];

typedef struct {
int session_id;
int day;
int slot;
int room_id;
int subject_id;
int teacher_id;
int batch_id;
} TimetableEntry;

int greedyColoring(Graph *g);

int isSafe(const Graph *g, int node, int c);

int backtrackingSchedule(Graph *g, int node);

int buildTimetable(const Graph *g, TimetableEntry *entries);

void outputJSON(const TimetableEntry *entries, int n,
const char **subjectNames,
const char **teacherNames,
const char **roomNames,
const char **batchNames);

#endif
