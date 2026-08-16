# Orvexa — Development Progress

A running log of what has been built, what is in flight, and the technical
decisions behind each phase. Updated at the end of every completed phase.

**Product:** Orvexa — a modern operations and productivity platform
**Tagline:** Turn Team Work Into Visible Progress
**Stack:** React (Vite) · Node.js · Express · MongoDB (Mongoose) · Socket.IO · JWT · Zustand · Recharts · dnd-kit

---

## Phase status

| # | Phase | Status |
|---|-------|--------|
| 1 | Project setup & monorepo scaffold | ✅ Complete |
| 2 | MongoDB connection & backend architecture | ✅ Complete |
| 3 | Authentication & JWT security | ✅ Complete |
| 4 | Role-based access control | ✅ Complete |
| 5 | Project management (API) | ✅ Complete |
| 6 | Task management (API) | ✅ Complete |
| 7 | Analytics, project health & smart insights (API) | ✅ Complete |
| 8 | Real-time collaboration (Socket.IO) | ✅ Complete |
| 9 | Comments & notifications | ✅ Complete |
| 10 | Goals, time tracking & milestones | ✅ Complete |
| 11 | Design system & theming | ✅ Complete |
| 12 | Frontend shell, routing & auth screens | 🔄 In progress |
| 13 | Premium dashboard & progress tracker | ⏳ Next |
| 14 | Kanban board with drag & drop | ⏳ Planned |
| 15 | Calendar & project timeline | ⏳ Planned |
| 16 | Team management & admin | ⏳ Planned |
| 17 | Global search & command centre | ⏳ Planned |
| 18 | Accessibility & eye comfort | ⏳ Planned |
| 19 | Testing & API documentation | ⏳ Planned |
| 20 | Performance optimisation | ⏳ Planned |
| 21 | Full QA pass | ⏳ Planned |
| 22 | Documentation & release preparation | ⏳ Planned |

---

## Completed work

### Phase 1 — Project setup & monorepo scaffold
Root workspace running `backend` and `frontend` together through `concurrently`,
so a single `npm run dev` starts the whole product. `.gitignore` blocks
`node_modules`, every `.env` variant, build output and uploads before the first
commit exists, so no secret can enter the history by accident. `.env.example`
documents every variable the app reads.

### Phase 2 — MongoDB connection & backend architecture
Layered backend: `routes → middleware → controllers → services → models`.
Config is centralised in `config/env.js`, which fails fast with a readable
message when a required variable is missing rather than crashing deep inside a
driver call. `config/db.js` owns the Mongoose connection and exposes its state
to the health endpoint.

Nine Mongoose models with validation, references, compound indexes and text
indexes: `User`, `Project`, `Task`, `Comment`, `Notification`, `Activity`,
`Milestone`, `Goal`, `TimeEntry`.

**Decision:** ES modules throughout the backend (`"type": "module"`) to match
the frontend and avoid two module dialects in one repository.

### Phase 3 — Authentication & JWT security
Register, login, logout, logout-all, refresh, forgot/reset password and change
password. Access tokens are short-lived and held in memory on the client;
refresh tokens live in an httpOnly cookie and are **rotated** on every refresh,
with used tokens removed from the user document so a stolen refresh token
cannot be replayed. Passwords are hashed with bcrypt (cost 12).

**Decision:** the client keeps the access token in memory rather than
localStorage, which removes the XSS token-theft path. A single-flight refresh
interceptor means a burst of concurrent 401s triggers exactly one refresh.

**Honest note:** no mail provider is configured, so `forgot-password` returns
the reset token directly in development instead of pretending an email was
sent. The reset flow itself is real and works end to end.

### Phase 4 — Role-based access control
Three roles — `admin`, `manager`, `employee` — enforced **on the server**, not
just hidden in the UI. `authorize(...roles)` guards role-restricted routes;
`loadProject()` additionally asserts project membership so a valid token for
one workspace cannot read another project's tasks. The last admin cannot be
demoted or deleted, so a workspace can never lock itself out.

### Phase 5 — Project management API
Full lifecycle plus membership management. List responses carry **live** task
statistics computed by aggregation, so project cards never display a stored
number that has drifted from reality. Removing a member unassigns their tasks
rather than deleting the work.

### Phase 6 — Task management API
CRUD, Kanban move with persisted column ordering, checklists, labels,
dependencies, estimates and comment counts. Status transitions keep
`completedAt` in sync automatically, which is what every analytics query is
built on. Completing a task notifies the reporter and everyone blocked by it.

### Phase 7 — Analytics, project health & smart insights
MongoDB aggregation pipelines produce dashboard KPIs, daily created/completed
series, weekday breakdowns, completion streaks and tracked time.

Project health starts at 100 and is reduced by *measurable* signals — overdue
count, low completion rate, deadline clustering, stalled delivery — and returns
the reason in plain language ("Project is at risk because 7 tasks are
overdue"). Nothing is randomised or hard-coded.

**Decision:** insights are only emitted when the underlying signal exists. If
there is not enough data for a claim, no insight is shown rather than an
invented one.

### Phase 8 — Real-time collaboration
Socket.IO with JWT handshake authentication, per-user rooms, per-project rooms
and per-task rooms. Presence is tracked by socket count per user so multiple
tabs do not flicker a user offline. Task, comment and project mutations
broadcast to the relevant room.

### Phase 9 — Comments & notifications
Threaded task comments with mentions, edit/delete of your own, real-time
delivery. Ten notification types with unread counts pushed over the socket.
Self-notifications are suppressed.

### Phase 10 — Goals, time tracking & milestones
Timer start/stop with one running timer per user, manual entries, and per-task
actual-hours rollup. `task_count` goals derive progress from real completed
tasks in the window rather than a stored counter that can drift.

### Phase 11 — Design system & theming
Token-driven design system in `frontend/src/styles/tokens.css`. Forest +
Champagne is the product identity; Cobalt+Lime, Burgundy+Teal and Arctic+Mint
are reserved for data visualisation so charts never borrow semantic UI colour.

Light and dark are tuned independently rather than inverted. Eye comfort has
three levels — Normal, Comfort (warmer surfaces, softer contrast, reduced
motion), Focus (decoration removed, motion off) — implemented with
`color-mix()` on the token layer, so no yellow overlay is ever painted over
the interface.

---

## In progress

### Phase 12 — Frontend shell, routing & auth screens
App shell, protected routing, Zustand stores (auth, UI, notifications), the
axios client with refresh handling, the socket hook, and shared UI primitives
(Avatar, Modal, Toasts, Progress, loading/empty/error states, custom cursor).

---

## Next

**Phase 13 — Premium dashboard & progress tracker.** KPI row with real trends,
weekly progress ring, goals, project health cards, upcoming deadlines, streak
heatmap and productivity charts — all bound to `/api/analytics/dashboard`.

---

## Standing technical decisions

- **No fake features.** If something appears in the UI it is wired to a real
  endpoint. Features that cannot be implemented honestly are removed rather
  than stubbed. The AI assistant disables itself cleanly when no API key is
  configured instead of returning canned text.
- **Server is the authority.** Every permission check exists on the server;
  the UI only mirrors it.
- **Derived over stored.** Progress, health and goal figures are computed from
  task data at read time, so they cannot drift from the truth.
- **Secrets never enter the repository.** `.env` is git-ignored from the first
  commit; `.env.example` carries placeholders only.
