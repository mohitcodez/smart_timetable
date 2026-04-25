#ifndef GRAPH_H
#define GRAPH_H

#define MAX_NODES 1024
#define MAX_COLORS 80

typedef struct {
int session_id;
int teacher_id;
int room_id;
int batch_id;
int subject_id;
int room_capacity;
int batch_size;
} Session;

typedef struct {
int V;
int adj[MAX_NODES][MAX_NODES];
Session sessions[MAX_NODES];
int color[MAX_NODES];
} Graph;

void buildConflictGraph(Graph *g);

void printGraph(const Graph *g);

#endif