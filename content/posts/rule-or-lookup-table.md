---
title: A rule and a lookup table look identical on a small grid
date: 2026-07-28
tags: [Autoformalization, Evaluation, Interpretability]
summary: Why symbolic scoring is not enough on its own, and how sweeping grid size turns an unanswerable question into a measurable one.
draft: false
---

A boundary wall in a grid world can be described two ways, and for a long time
my evaluation could not tell them apart.

## Two knowledge bases, one score

Here is what a model produces when it enumerates:

```prolog
% Everything it was shown, restated.
wall(0, 0).  wall(0, 1).  wall(0, 2).
wall(1, 0).  wall(2, 0).  wall(2, 2).
```

And here is what it produces when it has actually induced the concept:

```prolog
% The condition that makes a cell a wall, for any grid.
wall(X, Y) :-
    grid_size(N),
    ( X =:= 0 ; Y =:= 0 ; X =:= N - 1 ; Y =:= N - 1 ).
```

On a 3×3 grid, both are correct. Every query you can pose returns the same
answer. If your evaluation asks "does this knowledge base give the right
answers on the world the model saw", the two are indistinguishable — and only
one of them is knowledge.

This is the whole difficulty of my current project. The task looks like
translation: take what a VacuumWorld agent can perceive, produce a Prolog
knowledge base. The research question is not whether the translation is
*correct* but whether it *generalises*, and those come apart in exactly the
case that matters.

## Why string matching fails first

The obvious way to score a generated knowledge base is to compare it against a
reference. This falls over immediately.

There are many correct ways to write the same rule. Variable names differ.
Disjunction can be a single clause with semicolons or four separate clauses.
Arithmetic can be `X =:= 0` or `X == 0` or a guard placed elsewhere. A string
comparison punishes all of that variety, and it punishes it *unevenly* —
verbose but correct answers lose points that terse ones keep.

So the scoring has to be symbolic. I check nine constraints against the
knowledge base itself: does it entail the wall facts it should, does it avoid
entailing the ones it should not, does it remain consistent, and so on. What
the model wrote is irrelevant; what the knowledge base *means* is the thing
under test.

That fixes correctness scoring. It does not fix the generalisation problem,
because an enumerated knowledge base is genuinely correct on the grid it
enumerated.

## Making N the experiment

The fix is to stop asking one question and start asking a sequence of them.
Sweep the grid size upward and plot F1 against N.

An induced rule is indifferent to N. The clause quantifies over coordinates, so
a 3×3 grid and a 30×30 grid are the same statement. Its F1 is flat.

An enumeration is not indifferent to N at all. The facts it listed cover a
fixed region, and as the grid grows, the proportion of the world it accounts for
shrinks. Its F1 decays, and the shape of that decay is a fingerprint.

> If a metric is flat in the variable you care about, you are not measuring the
> thing you think you are measuring.

The consequence for study design is uncomfortable: **any result reported at a
single small N is uninterpretable.** Not wrong, exactly — just silent on the
only question worth asking. A model that scores perfectly on 3×3 has told you
nothing about whether it understands walls.

## What this changes about reading results

Once you have the sweep, some familiar claims get weaker.

- "The model solved the task" becomes "the model solved the task at the size we
  tested", which is a much smaller claim.
- Comparisons between models need the same N, and ideally the same *range* of N,
  or you are comparing different questions.
- Partial hardcoding shows up as a partial slope: not flat, not fully decaying.
  That intermediate case turns out to be common, and it is invisible to a
  single-point evaluation.

None of this is exotic. It is closer to basic hygiene, and I suspect the reason
it is not standard is that the single-point version is so much cheaper to run
and so much easier to report.

The uncomfortable part is that the harness only became trustworthy after I
found a bug in it that was silently zeroing exactly the outputs it was built to
reward. That is a separate note.
