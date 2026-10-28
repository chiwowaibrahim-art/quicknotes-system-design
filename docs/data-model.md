# QuickNotes Data Model

## 1. Overview

QuickNotes uses four main entities: `users`, `notes`, `tags`, and `note_tags`.

The database stores users and their notes, the tags users create, and the relationship between notes and tags.

PostgreSQL is used in the examples below.

## 2. Entities and columns

### Users

| Column        | Type         | Key / constraint | Purpose               |
| ------------- | ------------ | ---------------- | --------------------- |
| id            | BIGINT       | Primary key      | Unique user ID        |
| email         | VARCHAR(255) | Unique, not null | Login email           |
| password_hash | VARCHAR(255) | Not null         | Hashed password       |
| created_at    | TIMESTAMPTZ  | Not null         | Account creation time |

### Notes

| Column     | Type         | Key / constraint      | Purpose          |
| ---------- | ------------ | --------------------- | ---------------- |
| id         | BIGINT       | Primary key           | Unique note ID   |
| user_id    | BIGINT       | Foreign key, not null | Note owner       |
| title      | VARCHAR(100) | Not null              | Note title       |
| body       | TEXT         | Nullable              | Note content     |
| created_at | TIMESTAMPTZ  | Not null              | Creation time    |
| updated_at | TIMESTAMPTZ  | Not null              | Last update time |

### Tags

| Column     | Type        | Key / constraint      | Purpose       |
| ---------- | ----------- | --------------------- | ------------- |
| id         | BIGINT      | Primary key           | Unique tag ID |
| user_id    | BIGINT      | Foreign key, not null | Tag owner     |
| name       | VARCHAR(50) | Not null              | Tag name      |
| created_at | TIMESTAMPTZ | Not null              | Creation time |

### Note_tags

| Column      | Type        | Key / constraint              | Purpose               |
| ----------- | ----------- | ----------------------------- | --------------------- |
| note_id     | BIGINT      | Foreign key, primary key part | Related note          |
| tag_id      | BIGINT      | Foreign key, primary key part | Related tag           |
| assigned_at | TIMESTAMPTZ | Not null                      | Time tag was assigned |

The composite primary key `(note_id, tag_id)` prevents the same tag from being assigned to the same note more than once.

## 3. Relationships

### One-to-many: users and notes

One user can own many notes, but each note belongs to one user.

The `notes.user_id` foreign key references `users.id`.

### One-to-many: users and tags

One user can create many tags, but each tag belongs to one user.

The `tags.user_id` foreign key references `users.id`.

### Many-to-many: notes and tags

A note can have many tags, and a tag can be assigned to many notes.

The `note_tags` junction table connects the two entities. Its composite primary key prevents duplicate assignments.

The application must also verify that the note owner and tag owner match before assigning a tag.

## 4. CREATE TABLE statements

```sql
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id)
        ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    body TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id)
        ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, name)
);

CREATE TABLE note_tags (
    note_id BIGINT NOT NULL REFERENCES notes(id)
        ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tags(id)
        ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (note_id, tag_id)
);
```

`ON DELETE CASCADE` removes dependent notes, tags, or assignments when their referenced record is deleted. A production service should confirm its retention and recovery requirements before adopting cascading user deletion.

## 5. Example SQL queries

### Query 1: Get all notes belonging to a user

```sql
SELECT id, title, body, created_at, updated_at
FROM notes
WHERE user_id = 1
ORDER BY updated_at DESC;
```

### Query 2: Get a note and its tags (JOIN)

```sql
SELECT
    n.id AS note_id,
    n.title,
    t.name AS tag_name
FROM notes AS n
JOIN note_tags AS nt ON nt.note_id = n.id
JOIN tags AS t ON t.id = nt.tag_id
WHERE n.id = 101
  AND n.user_id = 1;
```

This query returns the tags attached to a note only when that note belongs to the specified user. The application must additionally enforce that the tag belongs to the same user.

### Query 3: Count notes per user

```sql
SELECT
    u.id,
    u.email,
    COUNT(n.id) AS total_notes
FROM users AS u
LEFT JOIN notes AS n ON n.user_id = u.id
GROUP BY u.id, u.email
ORDER BY total_notes DESC;
```

The `LEFT JOIN` includes users who have not created any notes.

### Query 4: Find notes with a particular tag

```sql
SELECT n.id, n.title, n.body
FROM notes AS n
JOIN note_tags AS nt ON nt.note_id = n.id
JOIN tags AS t ON t.id = nt.tag_id
WHERE n.user_id = 1
  AND t.user_id = 1
  AND t.name = 'Study';
```

## 6. Indexes

```sql
CREATE INDEX idx_notes_user_updated
ON notes (user_id, updated_at DESC);

CREATE INDEX idx_note_tags_tag
ON note_tags (tag_id);
```

- `idx_notes_user_updated` helps retrieve one user's notes in recently updated order.
- `idx_note_tags_tag` helps find notes associated with a particular tag.

The primary keys and unique constraints create their own indexes in PostgreSQL. Indexes improve common reads but require additional storage and can slow down writes slightly.

## 7. SQL versus NoSQL

Relational SQL database such as MySQL over NoSQL because QuickNotes contains related entities with clear relationships and ownership rules. Foreign keys and transactions help maintain data integrity when notes, users, and tags are created or deleted. Again, SQL also supports joins and reporting queries needed by the application.

NoSQL databases can be useful for flexible document data or particular high-scale access patterns, but they are not necessary for the initial QuickNotes design. MySQL can scale through indexing, caching, read replicas, and suitable partitioning if future workload measurements justify it.
