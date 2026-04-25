#include "scheduler.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

const char *DAY_NAMES[DAYS] = {
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"
};

/* ------------------------------------------------------------------ */
/* DSATUR Graph Coloring (primary algorithm)                           */
/* ------------------------------------------------------------------ */

/*
 * greedyColoring – DSATUR (Degree of Saturation) algorithm
 * ---------------------------------------------------------
 * At each step choose the UNCOLORED vertex with the highest
 * "saturation" (number of distinct colors already used by its
 * neighbours).  Ties are broken by vertex degree.
 *
 * DSATUR is a dynamic greedy that typically achieves the chromatic
 * number for structured graphs like scheduling conflict graphs, making
 * it far superior to static Welsh-Powell ordering.
 *
 * Complexity: O(V^2)   (sufficient for V ≤ MAX_NODES = 256)
 * Returns: number of distinct colors (time slots) used.
 */
int greedyColoring(Graph *g)
{
    int i, j, c;
    int available[MAX_COLORS];
    int maxColor = 0;

    /* degree[v] = total number of neighbours */
    int degree[MAX_NODES];
    memset(degree, 0, sizeof(degree));
    for (i = 0; i < g->V; i++)
        for (j = 0; j < g->V; j++)
            degree[i] += g->adj[i][j];

    /* Initialise all colors to -1 (unassigned) */
    memset(g->color, -1, sizeof(g->color));

    int colored = 0;
    while (colored < g->V) {
        /* Find uncolored vertex with max saturation (tie-break: degree) */
        int best = -1;
        int bestSat = -1;
        for (i = 0; i < g->V; i++) {
            if (g->color[i] != -1) continue;  /* already colored */

            /* Compute saturation of vertex i */
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

        if (best == -1) break;  /* should not happen */

        /* Assign smallest available color to 'best' */
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

/* ------------------------------------------------------------------ */
/* Backtracking Scheduler                                              */
/* ------------------------------------------------------------------ */

/*
 * isSafe
 * ------
 * Returns 1 if assigning color 'c' to node 'node' does not conflict
 * with any already-colored adjacent node.
 */
int isSafe(const Graph *g, int node, int c)
{
    int j;
    if (c >= TOTAL_SLOTS) return 0;  /* no more slots */
    for (j = 0; j < g->V; j++) {
        if (g->adj[node][j] && g->color[j] == c)
            return 0;
    }
    return 1;
}

/*
 * backtrackingSchedule
 * --------------------
 * Recursive backtracking: assign a valid slot to each node in turn.
 * Returns 1 on success, 0 if no valid assignment exists within
 * TOTAL_SLOTS colors.
 *
 * Worst case: O(k^n) where k=TOTAL_SLOTS, n=V  (exponential – used as fallback only)
 */
int backtrackingSchedule(Graph *g, int node)
{
    if (node == g->V)
        return 1;   /* all nodes assigned */

    int c;
    for (c = 0; c < TOTAL_SLOTS; c++) {
        if (isSafe(g, node, c)) {
            g->color[node] = c;
            if (backtrackingSchedule(g, node + 1))
                return 1;
            g->color[node] = -1;  /* backtrack */
        }
    }
    return 0;   /* no valid slot found */
}

/* ------------------------------------------------------------------ */
/* Build timetable entries from coloring                               */
/* ------------------------------------------------------------------ */

int buildTimetable(const Graph *g, TimetableEntry *entries)
{
    int i, n = 0;
    for (i = 0; i < g->V; i++) {
        int color = g->color[i];
        if (color < 0) continue;  /* unassigned – skip */

        TimetableEntry *e = &entries[n++];
        e->session_id = g->sessions[i].session_id;
        e->day        = color / SLOTS_PER_DAY;
        e->slot       = color % SLOTS_PER_DAY;
        e->room_id    = g->sessions[i].room_id;
        e->subject_id = g->sessions[i].subject_id;
        e->teacher_id = g->sessions[i].teacher_id;
        e->batch_id   = g->sessions[i].batch_id;
    }
    return n;
}

/* ------------------------------------------------------------------ */
/* JSON serialisation                                                   */
/* ------------------------------------------------------------------ */

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
    printf("{\n  \"timetable\": [\n");
    for (i = 0; i < n; i++) {
        const TimetableEntry *e = &entries[i];
        printf("    {\n");
        printf("      \"day\": \"%s\",\n",    DAY_NAMES[e->day]);
        printf("      \"slot\": %d,\n",       e->slot + 1);
        printf("      \"room\": \"%s\",\n",   safeName(roomNames,    e->room_id,    1024));
        printf("      \"subject\": \"%s\",\n",safeName(subjectNames, e->subject_id, 1024));
        printf("      \"teacher\": \"%s\",\n",safeName(teacherNames, e->teacher_id, 1024));
        printf("      \"batch\": \"%s\"\n",   safeName(batchNames,   e->batch_id,   1024));
        printf("    }%s\n", (i < n - 1) ? "," : "");
    }
    printf("  ]\n}\n");
}
