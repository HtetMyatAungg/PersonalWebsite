Run nine models across four prompt conditions and the tempting summary is a
league table: these models are good at autoformalization, those are not. The
data does not support that summary, and the reason is more interesting than the
table would have been.

## The two things people conflate

There are two separate questions hiding inside "can this model formalise a grid
world".

**Capability** is what the model can do at its best — the ceiling. It is a
property of the model.

**Scaffolding** is how much of that ceiling a particular prompt actually
reaches. It is a property of the interaction, not of the model.

A benchmark that runs each model under one prompt reports a single number that
mixes the two, and there is no way to unmix it afterwards. If model A beats
model B, you cannot say whether A is more capable or whether your prompt
happened to suit A.

## What the sweep shows

Crossing nine models with four conditions — zero-shot, instruction, schema, and
one-shot — makes the interaction visible instead of leaving it aggregated away.

The pattern that came out is an interaction rather than a sum:

- **Model tier sets the ceiling.** Below a certain capability, no amount of
  scaffolding produces genuine rule induction. The model reformats its
  enumeration more neatly, and that is all. Scaffolding cannot manufacture an
  abstraction the model cannot form.
- **Scaffolding determines whether a model reaches its ceiling.** Above that
  threshold, the same model can look like a memoriser or an abstractor
  depending entirely on the condition it was run under.

Both halves matter. The first says prompt engineering has a hard limit. The
second says a capability claim made under one prompt condition is not a
capability claim at all.

> The unit of measurement is not the model. It is the model-condition pair.

## The outlier

DeepSeek-V3 does not sit where its tier predicts. Its partial hardcoding
persists across all four conditions — it does not clear up under stronger
scaffolding the way comparable models' does.

I want to be careful here, because a single outlier in a nine-model sweep is a
lead, not a conclusion. What I can say is what it is not: it is not a
scaffolding failure, because the behaviour survives every scaffolding condition
I applied. Something about how this model handles the task differs from its
tier-mates in a way that prompt design does not reach.

That is the kind of observation that makes me want interpretability tools rather
than more prompt variants. Behavioural evaluation can tell me *that* the model
is doing something different. It cannot tell me what.

## Consequences for how results get reported

Three things I now think should be standard when reporting this kind of result.

1. **Report the condition, always.** "Model X achieves Y" is incomplete in the
   same way that a measurement without units is incomplete.
2. **Sweep at least two conditions.** One condition cannot distinguish a low
   ceiling from an unlucky prompt, and those have opposite implications.
3. **Treat the interaction as the finding.** The main effects — best model, best
   prompt — are less informative than how the two combine, and reporting only
   the main effects discards most of what the experiment bought you.

There is a methodological wrinkle underneath all of this: for the contrasts to
mean anything, each condition has to differ from its neighbour in exactly one
respect. Getting that right required a composition table, and getting it wrong
the first time is what taught me to build one.
