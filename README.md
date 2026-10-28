# QuickNotes System Design

## Description

QuickNotes is a note-taking application project that demonstrates how a browser-based application can communicate with a REST API and how a backend service could be designed for one million registered users.

The front-end client uses the JSONPlaceholder practice API to demonstrate loading notes, creating notes, deleting notes, input validation, request handling, and status messages.

The design documents describe the proposed real QuickNotes API, relational data model, and scalable application architecture.

**Important:** JSONPlaceholder simulates POST and DELETE responses. It does not permanently save created posts or delete posts from its dataset.

## Features

- Load the first 10 notes from the practice API.
- Create notes with a required title and optional body.
- Delete notes from the current page's in-memory list.
- Display loading, success, error, and empty states.
- Disable buttons while requests are running.
- Render note content safely using `textContent`.
- Document the proposed REST API, database, and system architecture.

## QuickNotes System Design structure

    quicknotes-system-design/
    ├── index.html
    ├── style.css
    ├── api.js
    ├── README.md
    └── docs/
        ├── api-design.md
        ├── data-model.md
        └── architecture.md

## How to run the API client

1. Clone or download this repository.
2. Open the project folder in Visual Studio Code.
3. Open `index.html` in a browser, or use the VS Code Live Server extension.
4. Click **Load notes** to retrieve notes from JSONPlaceholder.
5. Use the form to create a note.
6. Click a note's **Delete** button to demonstrate the delete operation.
7. Test the title validation by submitting an empty title.

An internet connection is required to access JSONPlaceholder.

No backend server or package installation is needed for this front-end demonstration.

## Design documents

- [API Design](docs/api-design.md) — REST endpoints, request and response examples, error handling, and security.
- [Data Model](docs/data-model.md) — Database entities, relationships, SQL statements, example queries, indexes, and database choice.
- [Architecture](docs/architecture.md) — Requirements, load estimates, architecture diagram, request flows, trade-offs, and availability.

## What I learned

Here a few things that I have learned from this project:

1. How JavaScript's `fetch`, `async`, and `await` can be used to communicate with a REST API.
2. How to handle loading, success, error, and empty states while keeping buttons disabled during requests.
3. How to validate user input and use `textContent` to render user-controlled text safely.
4. How relational databases use primary keys, foreign keys, and junction tables to represent relationships.
5. How caching, load balancing, read replicas, and queues can help a system scale.
6. Why API practice environments such as JSONPlaceholder are useful for learning but are not substitutes for a persistent production backend.

## Limitations

- JSONPlaceholder does not persist changes made through POST and DELETE.
- The application does not include a real login system or production backend.
- The architecture and capacity figures are design estimates, not results from a load test.
- The proposed production API domain is illustrative and must be replaced by a real service.

## Future improvements

- Connect the client to a real backend and MySQL database.
- Add authentication and authorization.
- Persist notes between sessions.
- Add note editing, search, and tag management.
- Add automated tests, monitoring, and production deployment.

## License

This is a project built during web development for educational purposes.
