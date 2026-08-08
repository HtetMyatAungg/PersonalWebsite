Four prompt conditions sound like four clean data points. They are not, unless
you design them to be — and my first attempt was not.

## The bundling problem

The standard ladder of prompt conditions goes something like this: zero-shot,
then add an instruction, then add a schema, then add an example. Each rung feels
like one step up.

It is not one step. Consider what actually changes between the schema condition
and the one-shot condition in a naive design:

- an example appears;
- the prompt gets substantially longer;
- the output format is now demonstrated rather than described;
- and, if you are not careful, the example quietly shows the *rule form* you are
  testing whether the model can invent.

That last one is fatal. If your one-shot example contains a general rule, then
a model producing a general rule may have induced it or may have copied the
shape of your example. The condition cannot distinguish those, so it cannot
support the conclusion you wanted to draw from it.

## The composition table

The fix is unglamorous: write down every factor, then define conditions as
explicit combinations rather than as a narrative ladder.

| Condition   | Task statement | Explicit instruction | Output schema | Worked example |
| ----------- | -------------- | -------------------- | ------------- | -------------- |
| Zero-shot   | yes            | no                   | no            | no             |
| Instruction | yes            | yes                  | no            | no             |
| Schema      | yes            | yes                  | yes           | no             |
| One-shot    | yes            | yes                  | yes           | yes            |

Written out like this, two things become obvious that were not obvious in prose.

First, every adjacent pair differs in exactly one column. That is what makes
each comparison attributable: the schema-to-one-shot difference is *the example
and nothing else*, because the schema column is already held constant.

Second, the columns you are not varying are the ones you have to police. Prompt
length, phrasing, and the content of the example are all free parameters that
will drift if you write the four prompts independently. They have to be
generated from a common template so the only difference is the factor you are
manipulating.

## The confound I shipped

My initial conditions bundled two changes into one step. Any effect measured
across that step could be attributed to either factor, which is to say it could
be attributed to neither.

This is not a subtle mistake and I do not want to dress it up as one. What is
worth saying is how it got caught: not by staring at the prompts, but by writing
the composition table afterwards and finding two ticks in a row that should have
been one. The table is a check as much as a design tool. Prose hides
confounds; a grid with one change per row cannot.

## Practical rules I now follow

- **Generate prompts from one template.** Four hand-written prompts are four
  independent chances to introduce an uncontrolled difference.
- **Keep the example structurally neutral.** If the study asks whether a model
  can produce form X, the example must not be in form X. Use a different
  predicate, a different domain, or demonstrate only the output format.
- **Write the table before the prompts, and again after.** The second pass is
  the one that catches you.
- **State the composition in the write-up.** Readers cannot audit conditions
  described only as "we used four increasingly detailed prompts".

None of this makes the experiment better in the sense of producing nicer
numbers. It makes the numbers mean something specific, which is a different and
more valuable property.
