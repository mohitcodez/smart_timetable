#include "graph.h"
#include <stdio.h>
#include <string.h>

/*
 * buildConflictGraph
 * ------------------
 * For every pair (i, j) of sessions an edge is added when they share:
 *   • the same teacher   (teacher conflict)
 *   • the same batch     (batch conflict)
 *   • the same room      (room conflict)
 *
 * Complexity: O(V²)
 */
void buildConflictGraph(Graph *g)
{
    int i, j;
    memset(g->adj, 0, sizeof(g->adj));
    /* g->V is already set by the caller */

    for (i = 0; i < g->V; i++) {
        for (j = i + 1; j < g->V; j++) {
            const Session *si = &g->sessions[i];
            const Session *sj = &g->sessions[j];

            int conflict =
                (si->teacher_id == sj->teacher_id) ||
                (si->batch_id == sj->batch_id) ||
                (si->room_id == sj->room_id);

            if (conflict) {
                g->adj[i][j] = 1;
                g->adj[j][i] = 1;
            }
        }
    }
}

/*
 * printGraph – debug helper
 */
void printGraph(const Graph *g)
{
    int i, j;
    printf("Conflict Graph (%d nodes):\n", g->V);
    for (i = 0; i < g->V; i++) {
        printf("  Node %d (teacher=%d batch=%d room=%d) -> ",
               i,
               g->sessions[i].teacher_id,
               g->sessions[i].batch_id,
               g->sessions[i].room_id);
        for (j = 0; j < g->V; j++) {
            if (g->adj[i][j])
                printf("%d ", j);
        }
        printf("\n");
    }
}
