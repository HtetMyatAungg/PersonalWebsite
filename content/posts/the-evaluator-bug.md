---
title: The bug that was quietly zeroing my best results
date: 2026-07-14
tags: [Evaluation, Engineering]
summary: An evaluator that failed asymmetrically, in the direction of the hypothesis. What it cost, and the fixtures that would have caught it on day one.
draft: false
---

The result I was about to write up was wrong, and it was wrong in the most
flattering direction possible: my evaluator was giving zero to precisely the
outputs the study was designed to reward.

## How it surfaced

I was reading through raw model outputs--not scores, the actual generated
Prolog--because the aggregate numbers had settled into a story I liked. That
should have been the first warning.

One output was a clean, general, obviously correct boundary rule. Exactly the
artefact the whole project is trying to detect. It had scored zero.

Not low. Zero.

A single zero is a data point. What made it a bug rather than a quirk was that
the failure was **systematic and directional**: rule-shaped outputs were being
zeroed, enumerated outputs were not. The harness had a preference, and its
preference ran opposite to the hypothesis.

## Why this class of bug is dangerous

An evaluator that fails randomly adds noise. Annoying, but noise widens error
bars and makes you less confident, which is the safe direction to fail in.

An evaluator that fails *asymmetrically* does something worse. It moves the
result. And because it moves the result in a coherent way, the output looks
like a finding rather than like corruption. Noise looks like noise. Bias looks
like science.

Mine had a further property that made it hard to catch: it was silent. There was
no exception, no warning, no unparsed-output counter ticking up. A constraint
check returned false where it should have returned true, and false is a
perfectly ordinary thing for a constraint check to return.

> A harness that crashes is a nuisance. A harness that quietly returns a
> plausible number is a liability.

## The correction

Patching the check itself took very little time. Working out what the previous
results had actually been measuring took considerably longer, and re-running the
sweep changed the headline finding — which is the honest way to describe it,
rather than saying the bug was "minor".

The fix I care more about is procedural. The evaluator now gets tested against
hand-written fixtures before it is allowed near model output:

- A hand-written **ideal rule-based** knowledge base, which must score full
  marks. This is the one that would have caught the bug on day one.
- A hand-written **pure enumeration**, which must score correctly at small N and
  must decay as N grows.
- A **deliberately broken** knowledge base, inconsistent, incomplete, which
  must fail, and fail on the specific constraints it violates rather than
  generically.

These are unit tests. Calling them that is the point: an evaluation harness is
software, and it is the piece of software whose bugs are least likely to
announce themselves, because its output is a number and numbers always look
finished.

## What I would tell past me

Three things, in order of how much time they would have saved.

1. **Write the fixtures before the harness.** If you cannot state what a perfect
   answer looks like concretely enough to hard-code it, you are not ready to
   score anything.
2. **Read raw outputs at every stage, not just when the numbers look odd.** I
   found this because I went looking after the numbers looked *good*. That was
   luck dressed up as diligence.
3. **Be specific about which direction a bug pushes.** "There was a bug, I fixed
   it" is not a useful record. "Rule-based outputs were zeroed, so the
   pre-patch results understated abstraction across every condition" is
   something a reader can actually evaluate.

The second bug in this project was a prompt confound; one condition varying two
things at once, so any effect could not be attributed to either. Different
failure, same root cause: I checked the results before I checked the instrument.
