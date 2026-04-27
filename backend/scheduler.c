#include "scheduler.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

const char *DAY_NAMES[DAYS] = {
"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"
};

int greedyColoring(Graph *g)
{
int i, j, c;
int available[MAX_COLORS];
int maxColor = 0;

int degree[MAX_NODES];
memset(degree, 0, sizeof(degree));
for (i = 0; i < g->V; i++)
for (j = 0; j < g->V; j++)
degree[i] += g->adj[i][j];

memset(g->color, -1, sizeof(g->color));

int colored = 0;
while (colored < g->V) {
int best = -1;
int bestSat = -1;
for (i = 0; i < g->V; i++) {
if (g->color[i] != -1) continue;

int usedColors[MAX_COLORS];
memset(usedColors, 0, sizeof(usedColors));
for (j = 0; j < g->V; j++) {
if (g->adj[i][j] && g->color[j] >= 0 && g->color[j] < MAX_COLORS)
usedColors[g->color[j]] = 1;
}
int sat = 0;
for (c = 0; c < MAX_COLORS; c++)
sat += usedColors[c];

if (best == -1 || sat > bestSat || (sat == bestSat && degree[i] > degree[best])) {
bestSat = sat;
best = i;
}
}

if (best == -1) break;

memset(available, 0, sizeof(available));
for (j = 0; j < g->V; j++) {
if (g->adj[best][j] && g->color[j] >= 0 && g->color[j] < MAX_COLORS)
available[g->color[j]] = 1;
}
int chosen = 0;
while (chosen < MAX_COLORS && available[chosen])
chosen++;

g->color[best] = chosen;
if (chosen > maxColor)
maxColor = chosen;

colored++;
}

return maxColor + 1;
}

int isSafe(const Graph *g, int node, int c)
{
int j;
if (c >= TOTAL_SLOTS) return 0;
for (j = 0; j < g->V; j++) {
if (g->adj[node][j] && g->color[j] == c)
return 0;
}
return 1;
}

int backtrackingSchedule(Graph *g, int node)
{
if (node == g->V)
return 1;

int c;
for (c = 0; c < TOTAL_SLOTS; c++) {
if (isSafe(g, node, c)) {
g->color[node] = c;
if (backtrackingSchedule(g, node + 1))
return 1;
g->color[node] = -1;
}
}
return 0;
}

int buildTimetable(const Graph *g, TimetableEntry *entries)
{
int i, n = 0;
for (i = 0; i < g->V; i++) {
int color = g->color[i];
if (color < 0) continue;

TimetableEntry *e = &entries[n++];
e->session_id = g->sessions[i].session_id;
e->day = color / SLOTS_PER_DAY;
e->slot = color % SLOTS_PER_DAY;
e->room_id = g->sessions[i].room_id;
e->subject_id = g->sessions[i].subject_id;
e->teacher_id = g->sessions[i].teacher_id;
e->batch_id = g->sessions[i].batch_id;
}
return n;
}

static const char *safeName(const char **names, int idx, int maxIdx)
{
if (names && idx >= 0 && idx < maxIdx && names[idx])
return names[idx];
return "Unknown";
}

void outputJSON(const TimetableEntry *entries, int n,
const char **subjectNames,
const char **teacherNames,
const char **roomNames,
const char **batchNames)
{
int i;
printf("{\n \"timetable\": [\n");
for (i = 0; i < n; i++) {
const TimetableEntry *e = &entries[i];
printf(" {\n");
printf(" \"day\": \"%s\",\n", DAY_NAMES[e->day]);
printf(" \"slot\": %d,\n", e->slot + 1);
printf(" \"room\": \"%s\",\n", safeName(roomNames, e->room_id, 1024));
printf(" \"subject\": \"%s\",\n",safeName(subjectNames, e->subject_id, 1024));
printf(" \"teacher\": \"%s\",\n",safeName(teacherNames, e->teacher_id, 1024));
printf(" \"batch\": \"%s\"\n", safeName(batchNames, e->batch_id, 1024));
printf(" }%s\n", (i < n - 1) ? "," : "");
}
printf(" ]\n}\n");
}
