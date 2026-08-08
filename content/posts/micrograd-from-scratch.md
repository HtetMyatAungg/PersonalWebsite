I spend most of my research time treating language models as black boxes:
prompt in, artefact out, symbolic evaluator in between. That is a legitimate way
to work, and it has a ceiling I keep bumping into.

## Where behavioural evaluation stops

My current project can establish, fairly rigorously, that a particular model
enumerates where another induces. It can establish that scaffolding moves some
models and not others. It can flag an outlier that behaves unlike its tier.

What it cannot do is say *why* — and every interesting question I have ends up
there. Why does partial hardcoding persist through every prompt condition for
one model? Is there a representational difference, or just a decoding one?
Behavioural methods answer "what happens". They are structurally incapable of
answering "what is the mechanism".

So I am building up to mechanistic interpretability, and I decided to start
further back than strictly necessary.

## Reimplementing micrograd

Karpathy's micrograd is a scalar-valued autograd engine in a few hundred lines.
Reimplementing it from scratch is a well-worn exercise, and the value is not the
artefact — you can read the original in an afternoon — it is that writing it
forecloses a particular kind of vagueness.

You cannot write a backward pass while holding a fuzzy notion of what a gradient
is. The code either propagates correctly or it does not, and when it does not,
the bug is always in the place where your understanding was approximate.

```python
class Value:
    def __init__(self, data, children=()):
        self.data = data
        self.grad = 0.0
        self._backward = lambda: None
        self._prev = set(children)

    def __mul__(self, other):
        out = Value(self.data * other.data, (self, other))

        def _backward():
            # Each parent accumulates; a node used twice
            # must receive both contributions.
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad

        out._backward = _backward
        return out
```

The `+=` is the whole lesson in that snippet. Write `=` and everything still
runs, most simple graphs still give correct answers, and you have quietly
assumed that no value is ever reused. It is a small bug with a large
implication about what a computational graph actually is.

## Why this is the right groundwork

Interpretability work asks questions about internals: what does this direction
in activation space represent, what happens to the output if this component is
ablated, which circuit is carrying this behaviour. Every one of those questions
presumes fluency with the machinery — what is being computed where, and what
depends on what.

I would rather build that fluency on something I wrote than on an abstraction I
have only used. The plan from here is deliberately incremental:

1. Scalar autograd, complete and tested. (Where I am.)
2. Tensor operations, so the same ideas survive contact with batching.
3. A minimal transformer block written the same way — attention by hand, not
   imported.
4. Only then, interpretability tooling on real models.

Steps three and four are where the research payoff is. Steps one and two are
what make three and four something other than cargo cult.

## The honest caveat

This is not research. It is training, and it competes for time with work that
produces results. I am doing it anyway because the alternative — running
interpretability experiments on a stack I understand at the level of API
documentation — produces findings I would not be able to defend.

There is a version of this field where you can be useful without that
grounding, working purely behaviourally, designing careful evaluations. I am
already doing that, and it is genuinely where my current contribution lies. But
the questions that interest me most are one layer down, and that layer does not
open to people who have only ever called into it.
