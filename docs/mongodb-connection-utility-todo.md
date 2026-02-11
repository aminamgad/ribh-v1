# MongoDB Connection Utility — Cached Global Connection & maxPoolSize

## Goal
Use a single MongoDB connection utility with a **cached global connection** (to avoid multiple connections in Next.js) and set **maxPoolSize to 5** to limit the connection pool and avoid exhausting MongoDB/resources.

---

## Current State
- **File:** `lib/database.ts`
- **Already implemented:** Cached global connection via `(global as any).mongoose` with `conn` and `promise` to reuse one connection in serverless/hot-reload.
- **Missing:** `maxPoolSize: 5` (and optionally other server options) in `mongoose.connect()` options.

---

## Todo List

### 1. Add connection options (maxPoolSize and optional server options)
- [x] **1.1** In `lib/database.ts`, extend the options passed to `mongoose.connect(MONGODB_URI, opts)`:
  - Set `maxPoolSize: 5` to limit the connection pool size.
  - (Optional) Add `minPoolSize: 0` or `1` if you want a minimum pool size.
  - (Optional) Add `serverSelectionTimeoutMS` (e.g. `10000`) for clearer timeout behavior.
- [x] **1.2** Keep existing `bufferCommands: false` so Mongoose does not buffer commands when not connected (recommended for serverless).

### 2. Keep and document cached global connection
- [x] **2.1** Ensure the cached global pattern remains: use `(global as any).mongoose` (or `globalThis`) so that in Next.js dev (hot reload) and serverless, the same cache is reused and we do not create a new connection per request.
- [x] **2.2** Add a short comment in the file explaining that the cache avoids multiple connections in Next.js.

### 3. Verification
- [ ] **3.1** After changes: run the app, trigger a few API routes that use `connectDB()`, and confirm in logs or MongoDB Atlas (if used) that connection count does not grow unbounded (e.g. stays within a small pool).
- [ ] **3.2** (Optional) Add a simple script or test that calls `connectDB()` multiple times and verifies the same connection is reused (e.g. same `mongoose.connection.id` or connection state).

---

## Implementation Summary

| Item | Action |
|------|--------|
| `lib/database.ts` | Add `maxPoolSize: 5` (and any optional server options) to `mongoose.connect()` options; keep cached global connection; add a brief comment. |

---

## Why 500+ connections? (Atlas "501 connections")

- **Each Next.js process/instance** (dev server worker, production worker, or serverless function instance) has its **own** `global` and thus its own Mongoose connection pool.
- **Total connections ≈ (number of instances) × maxPoolSize.**  
  Example: 100 instances × 5 = 500 connections.
- So even with a cached global connection **per process**, many processes mean many pools and high total connections.

**Changes applied to reduce connections:**
- `maxPoolSize: 2` (was 5) — fewer connections per instance.
- `maxIdleTimeMS: 60000` — close idle connections after 1 minute so Atlas count drops when traffic is low.

---

## Example options (for reference)

```ts
const opts: mongoose.ConnectOptions = {
  bufferCommands: false,
  maxPoolSize: 2,
  maxIdleTimeMS: 60000,
};
cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => m);
```
