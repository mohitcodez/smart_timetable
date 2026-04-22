#ifndef GRAPH_H
#define GRAPH_H

#define MAX_NODES 256
#define MAX_COLORS 40   /* max time slots (5 days × 8 slots) */

/* A class session (vertex in the conflict graph) */
typedef struct {
    int   session_id;
    int   teacher_id;
    int   room_id;
    int   batch_id;
    int   subject_id;
    int   room_capacity;
    int   batch_size;
} Session;

/* Conflict graph */
typedef struct {
    int      V;                          /* number of vertices (sessions) */
    int      adj[MAX_NODES][MAX_NODES];  /* adjacency matrix: 1 = conflict */
    Session  sessions[MAX_NODES];        /* vertex data                    */
    int      color[MAX_NODES];           /* assigned time-slot color        */
} Graph;

/* Build the conflict graph from the sessions array */
void buildConflictGraph(Graph *g);

/* Print adjacency matrix (debug) */
void printGraph(const Graph *g);

#endif /* GRAPH_H */
