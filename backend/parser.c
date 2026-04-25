#include "parser.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

static char *readFile(const char *path)
{
FILE *f = fopen(path, "r");
if (!f) return NULL;

fseek(f, 0, SEEK_END);
long size = ftell(f);
rewind(f);

char *buf = (char *)malloc(size + 1);
if (!buf) { fclose(f); return NULL; }

size_t nread = fread(buf, 1, size, f);
buf[nread] = '\0';
fclose(f);
return buf;
}

static const char *findKey(const char **p, const char *key)
{
char pattern[128];
snprintf(pattern, sizeof(pattern), "\"%s\"", key);
const char *pos = strstr(*p, pattern);
if (!pos) return NULL;
pos += strlen(pattern);
while (*pos && (*pos == ' ' || *pos == ':' || *pos == '\t' || *pos == '\n' || *pos == '\r'))
pos++;
*p = pos;
return pos;
}

static void readString(const char **p, char *buf, int bufLen)
{
const char *s = *p;
while (*s && *s != '"') s++;
if (*s == '"') s++;
int i = 0;
while (*s && *s != '"' && i < bufLen - 1)
buf[i++] = *s++;
buf[i] = '\0';
if (*s == '"') s++;
*p = s;
}

static int readInt(const char **p)
{
const char *s = *p;
while (*s && !isdigit((unsigned char)*s) && *s != '-') s++;
int v = 0;
int neg = 0;
if (*s == '-') { neg = 1; s++; }
while (*s && isdigit((unsigned char)*s))
v = v * 10 + (*s++ - '0');
*p = s;
return neg ? -v : v;
}

static int readIntArray(const char **p, int *values, int maxCount)
{
const char *s = *p;
while (*s && *s != '[') s++;
if (*s != '[') {
*p = s;
return 0;
}

s++;
int count = 0;
while (*s && *s != ']') {
while (*s && !isdigit((unsigned char)*s) && *s != '-' && *s != ']') s++;
if (*s == ']') break;
if (count < maxCount) {
values[count++] = readInt(&s);
} else {
(void)readInt(&s);
}
}

if (*s == ']') s++;
*p = s;
return count;
}

static const char *nextObject(const char **p)
{
const char *s = *p;
while (*s && *s != '{' && *s != ']') s++;
if (!*s || *s == ']') return NULL;
*p = s + 1;
return s;
}

static char *extractObject(const char **p)
{
const char *start = *p;
const char *s = start;
int depth = 1;
while (*s && depth > 0) {
if (*s == '{') depth++;
else if (*s == '}') depth--;
s++;
}
size_t len = (size_t)(s - start - 1);
char *obj = (char *)malloc(len + 1);
if (!obj) return NULL;
memcpy(obj, start, len);
obj[len] = '\0';
*p = s;
return obj;
}

static int parseTeachers(const char *section, InputData *data)
{
const char *p = section;
int count = 0;
while (count < MAX_ITEMS) {
const char *obj = nextObject(&p);
if (!obj) break;
char *body = extractObject(&p);
if (!body) break;
Teacher *t = &data->teachers[count];
const char *tmp = body;
if (findKey(&tmp, "teacher_id")) t->teacher_id = readInt(&tmp);
tmp = body;
if (findKey(&tmp, "teacher_name")) readString(&tmp, t->teacher_name, sizeof(t->teacher_name));
tmp = body;
if (findKey(&tmp, "availability")) readString(&tmp, t->availability, sizeof(t->availability));
else strcpy(t->availability, "all");
free(body);
count++;
}
return count;
}

static int parseRooms(const char *section, InputData *data)
{
const char *p = section;
int count = 0;
while (count < MAX_ITEMS) {
const char *obj = nextObject(&p);
if (!obj) break;
char *body = extractObject(&p);
if (!body) break;
Room *r = &data->rooms[count];
const char *tmp = body;
if (findKey(&tmp, "room_id")) r->room_id = readInt(&tmp);
tmp = body;
if (findKey(&tmp, "room_name")) readString(&tmp, r->room_name, sizeof(r->room_name));
tmp = body;
if (findKey(&tmp, "capacity")) r->capacity = readInt(&tmp);
free(body);
count++;
}
return count;
}

static int parseSubjects(const char *section, InputData *data)
{
const char *p = section;
int count = 0;
while (count < MAX_ITEMS) {
const char *obj = nextObject(&p);
if (!obj) break;
char *body = extractObject(&p);
if (!body) break;
Subject *s = &data->subjects[count];
const char *tmp = body;
if (findKey(&tmp, "subject_id")) s->subject_id = readInt(&tmp);
tmp = body;
if (findKey(&tmp, "subject_name")) readString(&tmp, s->subject_name, sizeof(s->subject_name));
tmp = body;
if (findKey(&tmp, "teacher_id")) s->teacher_id = readInt(&tmp);
tmp = body;
if (findKey(&tmp, "lectures_per_week")) s->lectures_per_week = readInt(&tmp);
tmp = body;
if (findKey(&tmp, "batch_ids"))
s->batch_id_count = readIntArray(&tmp, s->batch_ids, MAX_ITEMS);
else
s->batch_id_count = 0;
free(body);
count++;
}
return count;
}

static int parseBatches(const char *section, InputData *data)
{
const char *p = section;
int count = 0;
while (count < MAX_ITEMS) {
const char *obj = nextObject(&p);
if (!obj) break;
char *body = extractObject(&p);
if (!body) break;
Batch *b = &data->batches[count];
const char *tmp = body;
if (findKey(&tmp, "batch_id")) b->batch_id = readInt(&tmp);
tmp = body;
if (findKey(&tmp, "batch_name")) readString(&tmp, b->batch_name, sizeof(b->batch_name));
tmp = body;
if (findKey(&tmp, "student_count")) b->student_count = readInt(&tmp);
free(body);
count++;
}
return count;
}

int parseInputJSON(const char *filepath, InputData *data)
{
char *buf = readFile(filepath);
if (!buf) {
fprintf(stderr, "parser: cannot open '%s'\n", filepath);
return 0;
}

memset(data, 0, sizeof(*data));

const char *p;

p = buf;
if (findKey(&p, "teachers"))
data->teacher_count = parseTeachers(p, data);

p = buf;
if (findKey(&p, "rooms"))
data->room_count = parseRooms(p, data);

p = buf;
if (findKey(&p, "subjects"))
data->subject_count = parseSubjects(p, data);

p = buf;
if (findKey(&p, "batches"))
data->batch_count = parseBatches(p, data);

free(buf);
return 1;
}

int buildSessions(const InputData *data, Session *sessions, int maxSessions)
{
int si = 0;
int bi, sj, lk, ri;

int batchRoom[MAX_ITEMS];
int roomUsed[MAX_ITEMS];
memset(roomUsed, 0, sizeof(roomUsed));

for (bi = 0; bi < data->batch_count; bi++) {
batchRoom[bi] = 0;
for (ri = 0; ri < data->room_count; ri++) {
if (!roomUsed[ri] &&
data->rooms[ri].capacity >= data->batches[bi].student_count) {
batchRoom[bi] = ri;
roomUsed[ri] = 1;
break;
}
}
if (!roomUsed[batchRoom[bi]]) {
for (ri = 0; ri < data->room_count; ri++) {
if (data->rooms[ri].capacity >= data->batches[bi].student_count) {
batchRoom[bi] = ri;
break;
}
}
}

for (sj = 0; sj < data->subject_count && si < maxSessions; sj++) {
const Subject *subj = &data->subjects[sj];

for (bi = 0; bi < data->batch_count && si < maxSessions; bi++) {
const Batch *batch = &data->batches[bi];
int roomIdx = batchRoom[bi];
int applies = (subj->batch_id_count == 0);

if (!applies) {
int bk;
for (bk = 0; bk < subj->batch_id_count; bk++) {
if (subj->batch_ids[bk] == batch->batch_id) {
applies = 1;
break;
}
}
}

if (!applies)
continue;

for (lk = 0; lk < subj->lectures_per_week && si < maxSessions; lk++) {
Session *s = &sessions[si];
s->session_id = si;
s->teacher_id = subj->teacher_id;
s->room_id = data->rooms[roomIdx].room_id;
s->batch_id = batch->batch_id;
s->subject_id = subj->subject_id;
s->room_capacity = data->rooms[roomIdx].capacity;
s->batch_size = batch->student_count;
si++;
}
}
}
return si;
}