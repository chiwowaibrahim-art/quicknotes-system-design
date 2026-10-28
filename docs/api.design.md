# QuickNotes API Design

## 1. Purpose

QuickNotes is an online note-taking service that allows registered users to create, view, update, delete, and organize their notes using tags.

This document defines the REST API that the backend team should implement. It describes the real QuickNotes API, rather than JSONPlaceholder.

## 2. Base URL and conventions

Proposed production base URL:

`https://api.quicknotes.example.com/v1`

The domain is a placeholder and must be replaced with the actual production domain.

- Use JSON for request and response bodies.
- Use HTTPS for all production requests.
- Require authentication for private note operations.
- Use `Authorization: Bearer <access_token>` for authenticated requests.
- Return appropriate HTTP status codes.
- Use pagination for list endpoints.

## 3. REST endpoints

| Method | Path                       | Description                         | Success status |
| ------ | -------------------------- | ----------------------------------- | -------------- |
| GET    | `/notes`                   | List the authenticated user's notes | 200 OK         |
| GET    | `/notes/{id}`              | Retrieve one note                   | 200 OK         |
| POST   | `/notes`                   | Create a note                       | 201 Created    |
| PATCH  | `/notes/{id}`              | Update some note fields             | 200 OK         |
| DELETE | `/notes/{id}`              | Delete a note                       | 204 No Content |
| GET    | `/tags`                    | List the user's tags                | 200 OK         |
| POST   | `/tags`                    | Create a tag                        | 201 Created    |
| GET    | `/notes/{id}/tags`         | List tags assigned to a note        | 200 OK         |
| POST   | `/notes/{id}/tags`         | Assign an existing tag to a note    | 201 Created    |
| DELETE | `/notes/{id}/tags/{tagId}` | Remove a tag from a note            | 204 No Content |

All note and tag operations must be restricted to resources the authenticated user is authorized to access.

## 4. List notes

### Request

`GET /v1/notes?limit=10&offset=0`

Header:

`Authorization: Bearer <access_token>`

### Successful response — 200 OK

```json
{
  "data": [
    {
      "id": 101,
      "title": "Study plan",
      "body": "Practise JavaScript for 30 minutes.",
      "createdAt": "2026-10-26T10:00:00Z",
      "updatedAt": "2026-10-26T10:00:00Z"
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 1
  }
}
```

The backend returns only notes belonging to the authenticated user.

## 5. Create a note

### Request

`POST /v1/notes`

Headers:

```text
Authorization: Bearer <access_token>
Content-Type: application/json
```

Request body:

```json
{
  "title": "Study plan",
  "body": "Practise JavaScript for 30 minutes."
}
```

The title is required and must contain no more than 100 characters. The body is optional.

### Successful response — 201 Created

```json
{
  "data": {
    "id": 101,
    "title": "Study plan",
    "body": "Practise JavaScript for 30 minutes.",
    "createdAt": "2026-10-26T10:00:00Z",
    "updatedAt": "2026-10-26T10:00:00Z"
  }
}
```

The server generates the note ID and timestamps. The client must not choose another user's ID or assign ownership to another user.

## 6. Update a note

### Request

`PATCH /v1/notes/101`

```json
{
  "title": "Updated study plan"
}
```

### Successful response — 200 OK

```json
{
  "data": {
    "id": 101,
    "title": "Updated study plan",
    "body": "Practise JavaScript for 30 minutes.",
    "createdAt": "2026-10-26T10:00:00Z",
    "updatedAt": "2026-10-26T11:00:00Z"
  }
}
```

Only supplied, valid fields are updated.

## 7. Retrieve one note

### Request

`GET /v1/notes/101`

### Successful response — 200 OK

```json
{
  "data": {
    "id": 101,
    "title": "Study plan",
    "body": "Practise JavaScript for 30 minutes.",
    "createdAt": "2026-10-26T10:00:00Z",
    "updatedAt": "2026-10-26T10:00:00Z"
  }
}
```

## 8. Delete a note

### Request

`DELETE /v1/notes/101`

### Successful response

`204 No Content`

The response has no body. Deleting a note must not allow one user to delete another user's note.

## 9. Error responses

| Status                    | Meaning                            | Example situation                                      |
| ------------------------- | ---------------------------------- | ------------------------------------------------------ |
| 400 Bad Request           | Invalid input                      | Missing title or title over 100 characters             |
| 401 Unauthorized          | Authentication required or invalid | Missing or expired access token                        |
| 403 Forbidden             | Action not permitted               | User is not allowed to perform the requested operation |
| 404 Not Found             | Resource not found                 | Note ID does not exist or is not visible to the user   |
| 500 Internal Server Error | Unexpected server failure          | Unhandled database or application error                |

### Example error body

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The title is required and must not exceed 100 characters.",
    "details": {
      "field": "title"
    }
  }
}
```

Error responses should use consistent structures and must not expose passwords, access tokens, SQL statements, or internal stack traces.

## 10. Security and reliability

- Hash passwords using a modern password-hashing algorithm.
- Use HTTPS and short-lived access tokens.
- Validate and limit incoming request sizes.
- Apply rate limiting to protect the service from abuse.
- Enforce ownership checks for every private resource.
- Use database transactions when related changes must succeed together.
- Log errors without recording passwords or access tokens.
- Add automated tests for validation, authorization, and failure cases.
