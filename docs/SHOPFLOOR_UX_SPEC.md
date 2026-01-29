# Shop-Floor UX Spec (Gunther Werks Demo)

## Purpose
This demo must not feel like an ERP or a parts database. It must feel like a **shop-floor operating system** for bespoke restomod builds:
- Workers can quickly see “what to do next” and log progress with minimal friction.
- Supervisors can see where each build actually is, what’s blocked, and why.
- Inventory visibility is an enabler, not the center of the UI.

## Core Reality of Operations (Non-linear Phases)
- Builds have phases (0–12), but work is non-linear.
- Workers frequently jump between phases (e.g., working on Phase 6, then back to Phase 5).
- Therefore the system must be **event-driven**:
  - Task events (START / PAUSE / RESUME / COMPLETE / BLOCK) define reality.
  - “Current phase” is computed from recent events + active tasks.

## User Roles
### 1) Worker (shop-floor)
Primary goal: execute tasks fast, log truth fast.
Constraints:
- Hands are dirty/gloved.
- Needs large tap targets, minimal typing.
- Needs “resume where I left off.”

### 2) Supervisor / Ops lead
Primary goal: spot bottlenecks and unblock.
Wants:
- build status overview
- blockers + reasons
- upcoming risk (parts / WOs / ETA)

### 3) Admin / Procurement
Primary goal: reconcile inventory, track ETAs, send RFQs, and close the loop.

## North Star Screens (Must-have for shop-floor usability)
### A) “Today Board” (worker-first)
A single screen to answer:
- What builds are active in my area?
- What are the top tasks to execute next?
- What is blocked and why?

UI requirements:
- Large cards (Build -> Next Task)
- “Start / Pause / Complete” buttons
- “Blocker” quick-select (parts missing / waiting QC / waiting approval / tool unavailable)
- “Add note” optional but not required

### B) “Build Station View” (per build)
Optimized for a station/area screen (TV/tablet).
Shows:
- Build identity (code, model, color, engine)
- Current focus phase (computed)
- Top 5 active tasks + owners
- Blockers and required parts status
- QR / short link to open on a phone/tablet

### C) “Quick Log” (ultra-low friction)
For workers to log events without navigating tables:
- Select Build (search or recent list)
- Select Task (active tasks first)
- Choose event (Start/Pause/Resume/Complete/Block)
- Optional: attach photo / voice note (future)
- Submit in < 10 seconds

## Data Model Expectations (do not over-engineer)
We already have task_events. Lean on them.
We must ensure the UI uses:
- tasks (what can be worked on)
- task_events (what actually happened)
- builds status (HOLD is a managerial state)
- BOM/inventory availability only when needed to explain blockers

## “Truth Hierarchy” (important)
1) Most recent task_event is the strongest signal.
2) Task status must reflect events (IN_PROGRESS if last event is START/RESUME).
3) Build status is a summary, but should never contradict events.

## Key Computations
### Current Focus Phase (for a build)
Compute from:
- any IN_PROGRESS tasks -> use the phase_id of the most recently updated IN_PROGRESS task
- else use most recent task_event’s implied phase/task
- fallback: build.status + last updated task

### Build Health
- OK: no blockers, inventory adequate
- AT RISK: parts shortage OR overdue WO OR repeated pause/block events
- HOLD: build.status=HOLD or critical blocker

## UX Requirements (Shop-floor)
- Tap targets >= 44px
- Minimal typing; prefer presets
- “Resume last task” at top
- Offline-friendly (future); for demo, just ensure fast UI and simple interactions
- “Red/Yellow/Green” status cues

## Demo Scenario Alignment
We must preserve the demo narrative:
- Build GW-993-TRB-11 is HOLD due to engine/bearing shortage
- ENG_BEARING_SET_993 is 0 on-hand
- Engine core RS40-ENG-0011 is in rebuild WO
- Timeline shows pause/resume and block events

## Implementation Plan (UI)
Add routes:
- /floor (Today Board)
- /floor/build/[id] (Build Station View)
- /floor/log (Quick Log)

Keep existing admin routes, but position them as “back office”.