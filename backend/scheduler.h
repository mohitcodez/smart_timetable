#ifndef SCHEDULER_H
#define SCHEDULER_H

#include "graph.h"

/* Total available time slots = 5 days × 8 slots per day */
#define DAYS       5
#define SLOTS_PER_DAY 8
#define TOTAL_SLOTS (DAYS * SLOTS_PER_DAY)

/* Day names used when emitting JSON */
extern const char *DAY_NAMES[DAYS];

/*
 * TimetableEntry – one scheduled class session.
 * Produced by the coloring algorithms and serialised to JSON.
 */
typedef struct {
    int  session_id;
    int  day;          /* 0-4  (Monday … Friday)   */
    int  slot;         /* 0-7  (slot 1 … slot 8)   */
    int  room_id;
    int  subject_id;
    int  teacher_id;
    int  batch_id;
} TimetableEntry;

/* ------------------------------------------------------------------ */
/* Greedy graph coloring – O(V + E)                                    */
/* Assigns the smallest available color (= time slot) to every vertex. */
/* Returns the number of colors used.                                   */
int greedyColoring(Graph *g);

/* ------------------------------------------------------------------ */
/* Constraint check used by the backtracking scheduler                 */
/* Returns 1 if assigning color 'c' to node 'node' is safe.           */
int isSafe(const Graph *g, int node, int c);

/* ------------------------------------------------------------------ */
/* Backtracking scheduler – used when greedy produces > TOTAL_SLOTS   */
/* Returns 1 on success, 0 if no valid assignment exists.              */
int backtrackingSchedule(Graph *g, int node);

/* ------------------------------------------------------------------ */
/* Convert coloring result → TimetableEntry array.                     */
/* 'entries' must have at least g->V elements.                         */
/* Returns the number of entries written.                              */
int buildTimetable(const Graph *g, TimetableEntry *entries);

/* ------------------------------------------------------------------ */
/* Serialise TimetableEntry array to JSON on stdout.                   */
void outputJSON(const TimetableEntry *entries, int n,
                const char **subjectNames,
                const char **teacherNames,
                const char **roomNames,
                const char **batchNames);

#endif /* SCHEDULER_H */
