---
title: Inferring World Structure from Bumps. Event Calculus Reasoning in VacuumWorld
date: 2026-08-27
tags: [Neurosymbolic, World Model]
summary: One or two sentences. This is what shows on the index and in link previews.
draft: false
---

When an autonomous agent navigates an environment, spatial perception is usually treated as a given. Sensors report coordinates, maps are built from LiDAR point clouds, and position tracking runs on continuous state updates. 

What if an agent is virtually "blind"? Can it infer global environment properties—specifically, the dimensions $N \times N$ of a bounded grid—using **only wall bump events** and **Event Calculus (EC)** formal reasoning, without direct spatial perception?

Phase 1 of this research answers that question by establishing a formal baseline in Prolog and Python.

---

## Architectural Choices

Before implementing the reasoning harness, two fundamental architectural decisions were made:

### Why Event Calculus over a Simple Counter?
While a simple Python counter could track coordinate deltas, Event Calculus models state changes driven by discrete events naturally ($happensAt$, $initiatesAt$, $terminatesAt$). More importantly, EC provides an axiomatic framework for formal logic. Using EC in Phase 1 establishes a precise evaluator for **Phase 2**, where an LLM will attempt to auto-formalize natural language observations directly into formal Prolog logic.

### Why Prolog over Python Logic?
Because Phase 2 targets autoformalization into formal logic, Prolog serves as the native reasoning engine. Python acts strictly as the environment runner using `janus_swi`, while Prolog handles all domain physics, fluent persistence, and structural deduction.

```text
       +-----------------------+
       |  VacuumWorld (Python) |
       +-----------+-----------+
                   |
     Action / Bump | Events
                   v
       +-----------------------+
       |   janus_swi Bridge    |
       +-----------+-----------+
                   |
   assertz / query | Predicates
                   v
       +-----------------------+
       |   Prolog Engine (EC)  |
       |  - holdsAt/2          |
       |  - wallAt/3           |
       |  - find/1             |
       +-----------------------+
```

---

## System Design & Event Calculus Mechanics

### Event Calculus Axioms (`EC.pl`)
The reasoning engine implements the **Event-Fluent-Time** convention. Fluents hold based on two core clauses: initial condition persistence and event-driven initiation.

```prolog
:- dynamic initially/2.
:- dynamic happensAt/2.
:- dynamic wallAt/3.

% Base Case: Initial state persistence
holdsAt(F, T) :- 
    initially(F, 0), 
    0 =< T, 
    \+ brokenAt(F, 0, T).

% Inductive Case: Event initiation
holdsAt(F, T) :- 
    happensAt(E, Ti), 
    Ti =< T, 
    initiatesAt(E, F, Ti), 
    \+ brokenAt(F, Ti, T).

% Fluent disruption check
brokenAt(F, T1, T2) :-
    happensAt(E, T),
    T1 =< T, T =< T2,
    terminatesAt(E, F, T).
```

### Bump Detection & Wall Inference
Position tracking updates coordinates on movement events. A bump occurs when a `move(D)` action happens at time $T$, but the agent's position fluent remains identical between $T-1$ and $T$:

```prolog
% Bump detection: position did not change despite move event
bump(D, X, Y, T) :-
    TPrev is T - 1,
    holdsAt(at(X, Y), TPrev),
    holdsAt(at(X, Y), T).

% Monotonic belief expansion for wall boundary discovery
check_and_assert_wall(D, X, Y, T) :-
    bump(D, X, Y, T),
    \+ wallAt(X, Y, D),
    assertz(wallAt(X, Y, D)).
```

### Grid-Size Inference Engine
Instead of non-monotonic belief updates (retracting old state estimates), boundary discovery relies on **monotonic belief expansion**. Once walls on opposite edges are asserted, grid dimensions are unified:

```prolog
% Deduce width N from West (w) and East (e) walls on the same row Y
findbyWidth(N) :-
    wallAt(Xmin, Y, w),
    wallAt(Xmax, Y, e),
    N is Xmax - Xmin + 1.

% Deduce height N from North (n) and South (s) walls on the same column X
findbyHeight(N) :-
    wallAt(X, Ymax, n),
    wallAt(X, Ymin, s),
    N is Ymax - Ymin + 1.

% Grid discovery succeeds when width and height agree on an N x N square
find(N) :-
    findbyWidth(N),
    findbyHeight(N).
```

---

## Python-Prolog Interoperability (`janus_swi`)

Connecting VacuumWorld to Prolog via `janus_swi` required careful state synchronization in the agent's `decide()` loop:

```python
import janus_swi as janus

class ECAgentMind:
    def __init__(self):
        self.cycle = 0
        self.prev_pos = None
        janus.consult("UROP/EC.pl")

    def decide(self, observation):
        curr_pos = observation.get_position()
        
        # 1. Assert movement event and new position fluent to Prolog
        janus.query_once(f"assertz(happensAt(move({self.orientation}), {self.cycle}))")
        janus.query_once(f"assertz(initiatesAt(move({self.orientation}), at({curr_pos.x}, {curr_pos.y}), {self.cycle}))")
        
        # 2. Check bump predicate if step was attempted
        if self.prev_pos is not None:
            res = janus.query_once(f"bump({self.orientation}, {curr_pos.x}, {curr_pos.y}, {self.cycle})")
            if res.get("truth", False):
                janus.query_once(f"assertz(wallAt({curr_pos.x}, {curr_pos.y}, {self.orientation}))")

        # 3. Query grid inference
        grid_res = janus.query_once("find(N)")
        if grid_res.get("truth", False):
            print(f"Inferred Grid Size N: {grid_res['N']}")

        self.prev_pos = curr_pos
        self.cycle += 1
```

---

## Hard-Fought Debugging Milestones

Building the bridge between asynchronous environment updates and formal logic exposed critical race conditions:

* **Prolog Term Constraints:** `janus_swi` cannot directly return compound Prolog terms (e.g., `at(4,1)`) as native Python return values. All variables in queries must unify to atomic terms or primitives.
* **Order of Assertion:** Early tests ran `bump/4` before asserting the current cycle's `initiatesAt/3`. Consequently, `holdsAt(at(P), T)` continuously evaluated as false. Moving position assertions ahead of the bump query resolved the sequence.
* **Non-Terminating Collisions:** Initially, `terminatesAt` was asserted indiscriminately on every step effort, including collisions. This broke `holdsAt` persistence during bumps. Position fluents must remain intact when movement fails against a wall.
* **Stale History Traps During Turns:** When an agent bumped into a North wall and executed a turn, its coordinates remained static for several cycles while changing orientation. Upon taking its first step South, `holdsAt(at(P), T-1)` matched `holdsAt(at(P), T)` from the pre-turn history. This falsely asserted a South wall at the North boundary, yielding $N = 1$. Resetting `prev_pos = None` during orientation changes suppressed bump checks on the first step in a new direction.

---

## Empirical Results

The agent was evaluated in VacuumWorld starting at coordinate $(1,1)$ facing North across grid sizes from $3 \times 3$ up to $13 \times 13$:

| Grid Size ($N \times N$) | Cycle Count | Prolog Inferred $N$ | Status |
| :---: | :---: | :---: | :---: |
| **3 × 3** | 16 | 3 | Success |
| **4 × 4** | 19 | 4 | Success |
| **5 × 5** | 22 | 5 | Success |
| **6 × 6** | 25 | 6 | Success |
| **7 × 7** | 28 | 7 | Success |
| **8 × 8** | 31 | 8 | Success |
| **9 × 9** | 34 | 9 | Success |
| **10 × 10** | 37 | 10 | Success |
| **11 × 11** | 40 | 11 | Success |
| **12 × 12** | 43 | 12 | Success |
| **13 × 13** | 46 | 13 | Success |

### Computational Complexity

$$\text{Cycles}(N) = 3N + 7$$

* **$3N$:** Physical travel distance required to trace two full perimeter boundaries to register all four directional wall bumps.
* **$+7$:** Fixed turning overhead and initial boundary detection cycles.