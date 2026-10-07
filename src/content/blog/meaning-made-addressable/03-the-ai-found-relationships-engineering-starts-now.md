---
title: "The AI Found Relationships. Engineering Starts Now."
description: "Candidate relations create engineering questions about composition, identity, support, and retraction."
date: "2026-09-01"
lastModified: "2026-09-01"
tags: ["ai","software design","category theory","truth maintenance","engineering"]
author: "Rodrigo Sasaki"
series: "Meaning, Made Addressable"
seriesOrder: 2
visibility: "draft"
---
The restaurant experiment worked just well enough to create a worse problem.

Six semantic passes proposed 135 directed relationships. Nineteen survived a provisional investigator review. Some were useful. Many were malformed. Almost none agreed exactly across runs.

That was the capability result: changing the questions changed which computational structures became visible.

Now the model can leave the stage.

We have arrows. Which ones are worth keeping? When are two paths equivalent? Which translation preserves the distinction we care about? What should retract when a supporting premise disappears?

These are not primarily “make the LLM smarter” questions. They are engineering and modeling questions. Better yet, people have worked on their shapes for decades.

The academic ideas should not arrive as homework before we are allowed to think. They should arrive at the moment the problem makes us ask for them.

So let’s earn the first one with a modeling bug.

## Two routes to the same promise

A late table can affect a later reservation in several ways.

One path is harmful:

```text
table_runs_late
  --can_delay-->
later_reservation
  --puts_at_risk-->
reservation_promise
```

Another may preserve service through a fallback:

```text
table_runs_late
  --can_prompt_offer_of-->
bar_seating
  --may_preserve-->
reservation_promise
```

Both paths begin at a late table and end at a promise. A reachability query says the promise is reachable from the delay in both cases.

That answer is true and nearly useless.

The first route reaches the promise **as a threat**. The second reaches it **as a possible mitigation**. Collapse them and an impact analyzer may report that bar seating threatens the promise, or that delay preserves it. Same endpoints; different semantic payload.

Reachability is not enough. The question is **reachable-as**.

A target may be reachable as a consequence, evidence, authority, obligation, exception, dependency, or mitigation. The route is not incidental plumbing. The route is the explanation.

Now we have earned category theory.

## The useful categorical question

Category theory studies mathematical structures through objects, arrows between them, and composition of arrows. It asks, among other things, when different composites should count as the same and when a mapping between structures preserves identities and composition.

That is suggestive here:

- modeled things, states, or concepts can play the role of objects;
- typed directed relations can be treated as candidate arrows;
- walks can be candidates for composition;
- path equivalence becomes an explicit modeling decision;
- a translation between operational and semantic layers can be tested for what it preserves.

Nodes are nouns. Edges are verbs. Paths are syntax. Composition carries meaning.

Use that line carefully. A bag of generated triples is not automatically a category. We have not defined a lawful composition for every predicate, proved associativity, or supplied identity arrows. `can_delay` followed by `puts_at_risk` may compose usefully; `contains` followed by `is_not_authoritative_for` may not compose into a single predicate without losing the distinction that mattered.

The applicability is the question discipline, not a claim that the whole system “is category theory.”

For the late-table example, we can ask whether this diagram should commute—whether two paths with the same endpoints should be treated as equivalent. It should not. One path is risk propagation; the other is mitigation. The correct engineering artifact may be an explicit non-equivalence:

```text
path(delay → later reservation → promise)
  --not_equivalent_in_meaning_to-->
path(delay → bar seating → promise)
```

That annotation can prevent a path optimizer from deduplicating the routes merely because their endpoints match.

The theory arrived because we had a concrete arrow we might otherwise drop.

## An identity test at each level

The categorical lens becomes more useful when a system translates between conversational altitudes.

Consider:

```text
reservation row
  → customer commitment
  → operational obligation
```

The vocabulary changes at each step. At the database level we have a row with status, requested time, and perhaps a null table assignment. At the customer level we have a promise to make a good-faith effort near a requested time. At the operational level we have holds, queues, fallback arrangements, and escalation.

What makes the translation legitimate?

Not word similarity. Structure has to survive.

If the source says a reservation does not guarantee a particular table, a translation that turns the commitment into an obligation to provide table T-7 has failed an identity test. It preserved the noun “reservation” and destroyed the promise’s scope.

Category theory gives us the general notion of structure-preserving maps—functors preserve identities and composition—and applied categorical database work has made schemas, path equations, and data migration concrete engineering subjects. We should not import that machinery wholesale. We can borrow the test:

> When this concept moves to another representation, which relationships must remain invariant for it still to be the same thing for the task at hand?

That question generates useful checks:

- Does `does_not_guarantee table_assignment` survive the move from row to promise?
- Does the beneficiary remain the guest party rather than a guessed master customer?
- Does a safety escalation remain distinct from authoritative instruction?
- Does backward justification recover the same premises that forward prediction consumed?

An “identity at each level” is always identity relative to the structure we chose to preserve. That qualifier prevents the math from becoming incense.

## Then a premise disappears

Suppose we keep this relation:

```text
ready_table_hold
  --supports-->
reservation_promise
```

The table is released after the hold window. What should happen?

A naïve graph implementation deletes the edge and leaves every derived conclusion untouched. Another deletes the promise itself, as though losing one support erases the restaurant’s commitment. A third recomputes the entire graph from prose.

None is satisfying.

We need to know why a conclusion has standing, which premise sets support it, what alternative supports remain, what becomes contradicted, and which downstream conclusions require recomputation.

Now we have earned Truth-Maintenance Systems.

Jon Doyle’s 1979 Truth Maintenance System separates a problem solver’s conclusions from the machinery that records justifications and updates belief status. Johan de Kleer’s later assumption-based TMS tracks sets of assumptions so multiple contexts and inconsistent alternatives can remain available without repeatedly rebuilding everything.

The direct applicability is maintenance:

```text
premises
  → justification
  → standing conclusion
```

When a premise changes, walk forward to affected conclusions. When someone asks why a conclusion stands, walk backward through its justification. Same geometry, opposite traversal.

For the reservation promise, releasing the table hold may retract one support without retracting the promise. The correct update could be:

```text
ready_table_hold: no longer active
reservation_promise: still exists
promise_supported_for_on_time_seating: weakened
later_reservation_risk: newly active
fallback paths: now relevant
```

The exact predicates need design. The maintenance problem is already familiar.

TMS literature also makes contradiction less embarrassing. If one source supports “the note is authoritative” and a ratified operating rule says it is not, the system should not quietly choose the more recent sentence. It can retain the conflict, identify both justification sets, and require adjudication at the appropriate boundary.

The model found candidate structure. Older AI machinery helps us keep that structure honest when its supports move.

## Theories become question-generators

The original semantic battery asked about promises, premises, authority, blockers, absence, direction, paths, and deterministic operations. Category theory and truth maintenance reveal questions it did not ask explicitly:

```text
Do these paths preserve the same meaning?
Should this diagram commute?
Which relation is the identity we must preserve across this translation?
Is this composition admissible, or does it erase an actor or modality?

Which premise sets justify this conclusion?
Is each support necessary, sufficient, or merely helpful?
What remains standing when this premise retracts?
Which contradictions become visible in another assumption context?
```

The new questions do not prove the old battery was wrong.

They reveal its blind spots.

This epistemic distinction matters. A path-equivalence question that was never asked is **unasked**. Its absence from the first experiment is not evidence that the paths are equivalent, non-equivalent, irrelevant, or unknowable. The instrument simply did not excite that dimension.

The interrogation repertoire can grow monotonically even while individual claims remain retractable. We can add a new question family without rewriting history. Old runs remain bounded observations made with an earlier instrument.

Literature review becomes operational: each theory contributes probes, validation rules, and maintenance obligations.

## Problem first, abstraction second, machinery third

This order is more than a writing preference.

Newer engineers often meet academic work as a wall of definitions detached from the discomfort that made someone invent them. “A category consists of objects and morphisms” is true. It is not yet a reason to care.

The late-table bug supplies the reason: two paths share endpoints and mean opposite things. Then composition and path equations arrive as relief.

“A TMS maintains beliefs” is trivia until a support disappears and nobody knows what to retract. Then justification networks arrive as the next tool we need.

The teaching pattern should mirror the architecture:

```text
problem
  → visible structural failure
  → precise question
  → existing theory
  → engineered operation
```

The model is useful at the beginning because it makes new candidate geometry cheap enough to inspect. After that, the protagonist is engineering.

## The exotic part should become boring

If this architecture succeeds, its most valuable relations should eventually stop feeling like AI output.

They should become schemas, constraints, indexes, migrations, dependency records, invalidation jobs, tests, dashboards, and deterministic queries. They should acquire owners and review policies. They should be cached. They should break in observable ways.

That is not an anticlimax. It is the destination.

```text
world
  → semantic interrogation
  → candidate relation
  → engineering and ratification
  → stable relation
  → query
  → context
  → agent
```

The probabilistic system found a place where deterministic software could exist.

Engineering decides whether it deserves to.

The next article turns to the most immediate engineering advantage: once meaning has an address, the structure we found becomes the language we use to correct it.

---

### Sources and research trail

- Saunders Mac Lane, [*Categories for the Working Mathematician*](https://link.springer.com/book/10.1007/978-1-4757-4721-8).
- David I. Spivak, [“Functorial Data Migration”](https://arxiv.org/abs/1009.1166).
- Brendan Fong and David I. Spivak, [*An Invitation to Applied Category Theory*](https://arxiv.org/abs/1803.05316), especially the chapter on databases, categories, functors, and path equations.
- Jon Doyle, [publication record for “A Truth Maintenance System”](https://www.csc2.ncsu.edu/faculty/jdoyle2/publications/), *Artificial Intelligence* 12, 1979.
- Johan de Kleer, [“An Assumption-Based TMS”](https://www.dekleer.org/Publications/An%20Assumption-Based%20TMS.pdf), *Artificial Intelligence* 28, 1986.

