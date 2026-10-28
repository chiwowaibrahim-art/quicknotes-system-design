# QuickNotes System Architecture

## 1. Purpose

QuickNotes is moving from a browser-only application to an online service for one million registered users. This document describes the proposed architecture, workload assumptions, request flows, and important design trade-offs.

## 2. Functional requirements

The system must:

1. Allow users to register and authenticate.
2. Create, view, update, and delete notes.
3. Keep each user's notes private.
4. Organize notes using tags.
5. Validate note titles and request data.
6. Display loading, success, empty, and error states.
7. Support paginated note lists.
8. Provide useful error responses and operational logs.

## 3. Non-functional requirements

- **Scalability:** Handle increased traffic by adding application servers.
- **Availability:** Continue serving requests when an individual server fails.
- **Performance:** Use caching and efficient queries to reduce response times.
- **Security:** Use HTTPS, authentication, authorization, and input validation.
- **Reliability:** Use backups, database recovery procedures, and monitored background jobs.
- **Maintainability:** Keep the client, API, database, and background workers separate.
- **Data integrity:** Use database constraints and transactions for important changes.
- **Observability:** Monitor errors, latency, request rates, queue depth, and database health.

## 4. Workload assumptions

The estimate uses the following planning assumptions:

- Registered users: 1,000,000.
- Daily active users: 10% of registered users.
- Each daily active user makes 50 note/feed read requests per day.
- Each daily active user creates 1 note per day.
- Each stored note averages 2 KB, including its title, body, and basic metadata.
- The service operates 100,000 seconds per day and 365 days per year.
- Requests are evenly distributed for average-rate calculations.
- Peak traffic is estimated at five times the average.
- Storage excludes backups, indexes, logs, replicas, and temporary data.
- The read estimate represents note/feed API reads, not every individual database query or static asset request.

## 5. Load calculations

### A. Daily active users

Daily active users = 1,000,000 × 10%

**Daily active users = 100,000.**

### B. Reads per second

Daily reads = 100,000 × 50

Daily reads = 5,000,000.

Average reads per second:

5,000,000 ÷ 100,000 = **50 reads/second**.

Estimated peak reads per second:

50 × 5 = **250 reads/second**.

### C. Writes per second

Assume one note creation per daily active user per day.

Daily note writes = 100,000 × 1 = 100,000.

Average writes per second:

100,000 ÷ 100,000 = **1 write/second**.

Estimated peak writes per second:

1 × 5 = **5 writes/second**.

This estimate counts note creations only. Updates, deletions, authentication events, and background jobs will add workload.

### D. Storage per year

Daily storage = 100,000 notes × 2 KB

Daily storage = 200,000 KB, thus 200 MB using decimal units.

Annual storage:

200 MB × 365 = **73,000 MB, or 73 GB per year**.

**Note:** This is a simplified estimate of new note data. Real storage would be higher after accounting for indexes, database overhead, backups, replicas, logs, and retained versions.

### Summary

| Metric          |         Average |   Estimated peak |
| --------------- | --------------: | ---------------: |
| Note/feed reads | 50 requests/sec | 250 requests/sec |
| Note creations  |     1 write/sec |     5 writes/sec |
| New note data   |      200 MB/day |   Not applicable |
| New note data   |      73 GB/year |   Not applicable |

## 6. Architecture diagram

                      USERS / BROWSERS
                             |
                             v
                           DNS
                             |
                             v
                 +----------------------+
                 | CDN                  |
                 | Cache static assets  |
                 +----------------------+
                             |
                             v
                 +----------------------+
                 | LOAD BALANCER        |
                 | Distribute API calls |
                 +----------------------+
                       /           \
                      v             v
              +-------------+ +-------------+
              | App Server 1| | App Server 2|
              +-------------+ +-------------+
                      \             /
                       \           /
                        v         v
                      +-------------+
                      | Cache       |
                      | Hot note    |
                      | data        |
                      +-------------+
                             |
                             v
                  +---------------------+
                  | Primary Database    |
                  | Users, notes, tags  |
                  +---------------------+
                             |
                       Replication
                             |
                             v
                  +---------------------+
                  | Read Replica        |
                  | Read-only queries   |
                  +---------------------+

                 BACKGROUND PROCESSING
                             |
                  +---------------------+
                  | Message Queue       |
                  | Async jobs          |
                  +---------------------+
                             |
                             v
                  +---------------------+
                  | Worker              |
                  | Processes queued    |
                  | jobs                |
                  +---------------------+

The CDN is primarily for static assets such as JavaScript, CSS, and images. API requests must still pass through the load balancer and application layer so authentication and authorization can be enforced.

## 7. Component explanations

1. **Client/browser:** Provides the interface users use to create, read, update, and delete notes.
2. **DNS:** Resolves the service's domain name to the correct network endpoint.
3. **CDN:** Caches static assets near users to reduce download latency and origin-server traffic.
4. **Load balancer:** Distributes incoming API requests across healthy application servers.
5. **Application servers:** Validate requests, enforce permissions, run business logic, and access the database and cache.
6. **Cache:** Stores frequently accessed note data temporarily to reduce repeated database reads.
7. **Primary database:** Stores authoritative user, note, tag, and relationship records.
8. **Read replica:** Handles eligible read queries to reduce pressure on the primary database.
9. **Message queue:** Holds background jobs so non-critical processing does not have to finish during an API request.
10. **Worker:** Processes queued jobs such as notifications, cleanup, or other asynchronous tasks.

## 8. GET /notes request flow

1. The browser resolves the service domain through DNS.
2. The browser sends an authenticated `GET /v1/notes` request.
3. The load balancer routes the request to a healthy application server.
4. The application server validates the access token and checks the user's permissions.
5. The application checks the cache for the requested user's notes.
6. If the cache contains valid data, the application can return it; otherwise, it queries the database or a suitable read replica.
7. The application returns a paginated JSON response.
8. The browser renders the notes and displays a success, empty, or error message.

## 9. POST /notes request flow

1. The browser submits a note title and optional body in a JSON request.
2. The load balancer sends the request to a healthy application server.
3. The application verifies authentication and validates the title and body.
4. The application inserts the note into the primary database within a transaction.
5. After the write succeeds, the application invalidates or updates relevant cached note data.
6. If background processing is needed, the application publishes a job to the message queue.
7. The application returns `201 Created` with the new note ID and saved note data.
8. A worker processes any queued tasks independently and retries transient failures according to a defined policy.

**Note:** The application must not report success until the database has confirmed the note was saved.

## 10. Trade-offs

### A. Caching versus data freshness

Caching reduces database load and can improve response times, but cached notes may be stale after an update or deletion.

**Trade-off:** The decision is to use short cache lifetimes or explicit invalidation after writes. Avoid caching private user data in a shared cache without a user-specific key and suitable access controls.

### B. Read replicas versus consistency

Read replicas improve read capacity, but replication delay can make a newly created or updated note temporarily unavailable on the replica.

**Trade-off:** The decision is to send writes to the primary database and use the primary for read-after-write operations that require immediate consistency. Use replicas for other suitable reads.

### C. Synchronous versus asynchronous work

Performing all processing during a request makes the response wait for every task. A queue and worker allow non-critical work to happen later, but introduce more components and possible processing delays.

**Decision:** The decision is to keep saving a note synchronous; run non-critical tasks asynchronously and monitor retries and queue depth.

### D. Availability versus operational complexity

Multiple application servers and database replicas improve resilience, but increase infrastructure cost and operational complexity.

**Trade-offs:** The decision is to begin with a manageable deployment, monitor actual demand, and introduce additional redundancy as service requirements justify it.

## 11. To Avoid Single Points Of Failure

- Run at least two application servers and configure health checks in the load balancer.
- Use a managed or redundant load-balancing service across suitable availability zones.
- Configure DNS and CDN services with appropriate provider-level redundancy.
- Use database backups and test restoration regularly.
- For production, configure database failover to a suitably maintained standby or managed high-availability setup; a read replica alone does not guarantee automatic failover.
- Deploy redundant queue infrastructure and workers, and make background jobs safe to retry.
- Monitor service health and test recovery procedures.
- Store secrets outside source code and restrict production access.

## Conclusion

The proposed architecture separates API processing, caching, persistent storage, and background work. Under the stated assumptions, it starts with approximately 50 reads per second and 1 note writes per second on average, with five-times peaks of 250 reads and 5 note writes per second.
