#include "graph.h"
#include "scheduler.h"
#include "parser.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void buildNameTables(const InputData *d,
const char **subjectNames,
const char **teacherNames,
const char **roomNames,
const char **batchNames,
int tableSize)
{
int i;
for (i = 0; i < tableSize; i++) {
subjectNames[i] = NULL;
teacherNames[i] = NULL;
roomNames[i] = NULL;
batchNames[i] = NULL;
}
for (i = 0; i < d->subject_count; i++) {
int id = d->subjects[i].subject_id;
if (id >= 0 && id < tableSize)
subjectNames[id] = d->subjects[i].subject_name;
}
for (i = 0; i < d->teacher_count; i++) {
int id = d->teachers[i].teacher_id;
if (id >= 0 && id < tableSize)
teacherNames[id] = d->teachers[i].teacher_name;
}
for (i = 0; i < d->room_count; i++) {
int id = d->rooms[i].room_id;
if (id >= 0 && id < tableSize)
roomNames[id] = d->rooms[i].room_name;
}
for (i = 0; i < d->batch_count; i++) {
int id = d->batches[i].batch_id;
if (id >= 0 && id < tableSize)
batchNames[id] = d->batches[i].batch_name;
}
}

int main(int argc, char *argv[])
{
const char *inputFile = (argc > 1) ? argv[1] : "../data/sample_data.json";

InputData data;
if (!parseInputJSON(inputFile, &data)) {
fprintf(stderr, "Error: could not parse input file '%s'\n", inputFile);
return 1;
}

static Session sessions[MAX_NODES];
int sessionCount = buildSessions(&data, sessions, MAX_NODES);

if (sessionCount == 0) {
printf("{\"timetable\":[]}\n");
return 0;
}

static Graph g;
memset(&g, 0, sizeof(g));
g.V = sessionCount;
memcpy(g.sessions, sessions, sessionCount * sizeof(Session));
memset(g.color, -1, sizeof(g.color));

buildConflictGraph(&g);

int colorsUsed = greedyColoring(&g);

if (colorsUsed > TOTAL_SLOTS) {
fprintf(stderr,
"Greedy used %d colors (max %d). Trying backtracking...\n",
colorsUsed, TOTAL_SLOTS);
memset(g.color, -1, sizeof(g.color));
if (!backtrackingSchedule(&g, 0)) {
fprintf(stderr,
"Error: scheduling impossible – too many conflicting "
"sessions for %d available slots.\n", TOTAL_SLOTS);
return 2;
}
}

static TimetableEntry entries[MAX_NODES];
int entryCount = buildTimetable(&g, entries);

static const char *subjectNames[1024];
static const char *teacherNames[1024];
static const char *roomNames[1024];
static const char *batchNames[1024];
buildNameTables(&data, subjectNames, teacherNames, roomNames, batchNames, 1024);

outputJSON(entries, entryCount,
subjectNames, teacherNames, roomNames, batchNames);

return 0;
}