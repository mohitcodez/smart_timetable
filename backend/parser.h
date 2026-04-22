#ifndef PARSER_H
#define PARSER_H

#include "graph.h"   

#define MAX_ITEMS      64
#define MAX_NAME_LEN  128



typedef struct {
    int  teacher_id;
    char teacher_name[MAX_NAME_LEN];
    char availability[MAX_NAME_LEN];
} Teacher;

typedef struct {
    int  room_id;
    char room_name[MAX_NAME_LEN];
    int  capacity;
} Room;

typedef struct {
    int  subject_id;
    char subject_name[MAX_NAME_LEN];
    int  teacher_id;
    int  lectures_per_week;
} Subject;

typedef struct {
    int  batch_id;
    char batch_name[MAX_NAME_LEN];
    int  student_count;
} Batch;

typedef struct {
    Teacher teachers[MAX_ITEMS];
    int     teacher_count;

    Room    rooms[MAX_ITEMS];
    int     room_count;

    Subject subjects[MAX_ITEMS];
    int     subject_count;

    Batch   batches[MAX_ITEMS];
    int     batch_count;
} InputData;


int parseInputJSON(const char *filepath, InputData *data);


int buildSessions(const InputData *data, Session *sessions, int maxSessions);

#endif /* PARSER_H */
