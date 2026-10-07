---
title: "Our Smarter Semantic Search Lost to the Dumb Battery"
description: "A predicate-guided search followed two similar threads efficiently and missed much of the room."
date: "2026-09-01"
lastModified: "2026-09-01"
tags: ["ai","experiments","semantic search","program analysis","negative results"]
author: "Rodrigo Sasaki"
series: "Meaning, Made Addressable"
seriesOrder: 5
visibility: "draft"
---
The first semantic-interrogation experiment was noisy. That did not bother me as much as I expected.

Noise suggested a search problem. Article 3 named the broader engineering agenda—composition, path meaning, support, and retraction. This experiment operationalized one part of it: which questions should the system ask next?

The blind version asked every question family of the whole dossier at roughly equal depth. Of course it wandered. A more mature system, I thought, would behave like a program analyzer: start from a criterion, follow relevant structure, let the type of a discovered edge select the next questions, and stop when the worklist reaches a fixpoint or a boundary.

Software engineering has an intimidating amount to teach us here.

So I built the guided version.

It lost.

Not ambiguously. On the metrics registered for the run, three independent blind calls beat one seed-plus-two-branch guided search in provisional yield and accepted-operation efficiency.

This is an article about why that is good news—and why “this is an optimization problem” does not mean the first optimizer will be good.

## The literature gave us mechanisms, not a blessing

The phrase “guided probing” can become hand-waving quickly. The experiment borrowed five specific mechanisms from software engineering.

First, **program slicing**. Mark Weiser’s formulation starts from a slicing criterion—a behavior of interest—and keeps the program portion relevant to it. The semantic counterpart is to start from a human conversation or decision and refuse to expand candidates with no declared route to that criterion.

Second, **dataflow worklists**. Kildall’s framework propagates information through a directed graph until it stabilizes. The semantic counterpart is a deterministic queue: enqueue eligible edges, select neighbor probes from their predicates, normalize new shapes, and stop when no new eligible shapes appear or the budget expires.

Third, **abstract interpretation**. The Cousots showed how analysis can compute over a declared abstract domain and approximate fixpoints. The practical transfer is to bound the predicate vocabulary instead of letting every run grow a private ontology.

Fourth, **type-directed exploration**. Type inference constrains which operations are admissible. Here the analogy is deliberately modest: an edge predicate selects a registered family of neighboring questions.

```text
supports
  → necessary?
  → sufficient?
  → independently corroborated?
  → what retracts it?

is_not_authoritative_for
  → what is authoritative instead?
  → what non-authoritative signal still requires action?
  → which step completes the handoff?
```

Finally, **invariant and specification mining**. These fields are careful to distinguish likely properties mined from observations from verified specifications. The semantic equivalent keeps proposal separate from ratification.

None of these papers claims that restaurant prose is a program. The transfer is algorithmic: criterion, domain, worklist, transfer function, fixpoint, review boundary.

## A fair-looking comparison

The experiment used the same frozen Café Aster dossier as before and the same model configuration: `gpt-5.4-mini`, low reasoning effort, ephemeral calls with exact prompts and raw event streams preserved.

The blind arm made three independent calls. Each received the full dossier and a compact version of the twelve-question battery. Each returned candidate directed edges with exact dossier quotes, explicit evidence status, a proposed operation, and a limitation.

The guided arm also received three exploration calls:

1. one seed call proposed high-value edges for reservation readiness, explanation, or safety;
2. deterministic code selected two eligible seeds by registered predicate priority and normalized triple;
3. two independent branch calls received one seed each plus only that predicate’s neighbor questions.

Calls were equal. Input length was not exactly equal, so the report retained input and output characters as a provider-independent cost proxy.

Candidates from both arms were normalized mechanically. A reviewer received a hash-shuffled packet with arm provenance removed. The frozen rubric accepted an edge only when its direction and scope were supported, its quote was traceable, its predicate added a useful directed distinction, and its proposed operation was concrete and consistent.

The reviewer was another AI investigator, not a human or domain expert. That is a significant limitation.

## Version 1 never reached the starting line

The first frozen version asked the seed model to *prefer* predicates in the registered strategy vocabulary.

It proposed seven perfectly parseable edges:

```text
parties_of_seven_or_eight --requires--> deposit
manager --sends--> payment_link
server --confirms--> reported_allergies
server --marks--> kitchen_paper_ticket
...
```

None used a registered predicate.

The deterministic selector could not open two branches, so the experiment stopped. Three blind outputs and the seed output are preserved under `versions/v1/`; no comparison was manufactured from the partial run.

This was not a capability failure. It was an interface failure between a probabilistic proposer and a closed deterministic orchestrator. “Prefer my vocabulary” is not a schema contract.

Version 2 changed the seed instruction to require one of seven predicates. The change was declared, versioned, and frozen before any new call.

That repair let the experiment run. It also helped the guided arm lose.

## The numbers

Here is the recorded v2 comparison:

| Metric | Blind | Guided |
|---|---:|---:|
| Exploration calls | 3 | 3 |
| Input characters | 16,293 | 16,864 |
| Output characters | 15,467 | 8,304 |
| Total character proxy | 31,760 | 25,168 |
| Unique candidate edges | 36 | 19 |
| Exact edges repeated across calls | 4 | 0 |
| Provisionally accepted | 33 | 16 |
| Rejected | 3 | 3 |
| Provisional accept yield | 91.67% | 84.21% |
| Accepted with a deterministic operation | 33 | 16 |
| Accepted operations per 10k characters | 10.39 | 6.36 |

Guided probing produced 20.8% fewer total characters and roughly half as much output. If the goal had been “make the model say less,” it worked beautifully.

That was not the goal.

It returned fewer provisionally useful operations per unit of character cost and a lower acceptance rate. Blind probing found 33 accepted candidates; guided found 16. There was no exact accepted triple shared across arms, which is another warning about unstable node and predicate boundaries.

Do not compare the 91.67% blind acceptance in this experiment with the roughly 14% provisional selection in Experiment 0 as though the model suddenly became six times smarter. The prompts, candidate limits, output obligations, and review rubric changed. This run required exact quotes and concrete operations up front. Cross-experiment percentages are not a benchmark.

## Why guided became narrow

The seed selector ranked registered predicates by priority and then sorted normalized triples. It selected two distinct triples.

Both had the same predicate family:

```text
a_note
  --is_not_authoritative_for-->
request_satisfaction

digital_reservation_note
  --is_not_authoritative_for-->
kitchen_paper_ticket
```

The branch calls did what they were told. They explored note authority, allergy handoff, verbal confirmation, request satisfaction, and typed absence. Several useful edges appeared:

```text
absence_of_allergy_note
  --does_not_imply-->
no_allergy

guest_allergy_mention
  --requires-->
server_verbal_confirmation
```

But the worklist had lost diversity at the first scheduling decision. It followed two neighboring threads in the same semantic neighborhood while the blind arm ranged across deposits, table assignment, patio decisions, waitlist behavior, late tables, promises, and identity ambiguity.

The experiment used predicate priority without predicate-family diversity.

That is a real algorithmic mistake, not something to explain away after the fact. A next version could register “at most one seed per predicate family,” or use a coverage objective over relation families. It would be a new version, not a correction to these results.

The closed vocabulary created another problem. It made orchestration possible by reducing ambiguity, but it could force a candidate into the nearest allowed predicate. Two guided edges claimed that verbal confirmation was `authoritative_for` the kitchen instruction. The reviewer rejected both. The dossier says verbal confirmation and paper marking are expected steps; it does not elevate the confirmation event itself into the authoritative instruction.

The abstraction domain bought control and introduced approximation error. Abstract-interpretation people may be permitted one restrained smile.

## Blind search had an unfair-looking advantage that was actually the point

The blind arm made three independent full-battery calls. That gave it repeated chances to rediscover common operational relations. Four exact triples appeared in at least two calls, including the large-party deposit requirement and the host’s ability to release a table after the hold window.

The guided arm’s branch calls were intentionally different. Zero exact edges repeated across calls. That metric therefore rewards the blind design’s redundancy and penalizes the guided design’s division of labor.

But redundancy is not automatically waste. It can provide corroboration and protect against a bad seed. Guided search concentrated its risk: if the seed scheduler narrows badly, every downstream token is efficiently spent in the wrong neighborhood.

This is familiar from static analysis. Precision, coverage, and cost trade against one another. A cheap broad approximation can be more useful than a precise local analysis aimed at the wrong target.

## Review was the most expensive call in the room

The exploration comparison counted 31,760 characters for blind and 25,168 for guided.

The arm-blinded review required 77,364 input characters and 23,372 output characters across two calls. The first response changed one character in a candidate ID; the strict coverage check rejected it, and an identical-prompt retry succeeded. Both attempts are preserved. No malformed ID was silently remapped.

The review cost is excluded from the arm comparison because the same combined candidate packet was reviewed for both. It should not be excluded from the architecture conversation.

Proposal generation may become cheap while ratification remains the dominant expense. If a guided strategy cuts candidate volume, that can still matter even when its exploration yield is worse—especially when the reviewer is a human with domain authority rather than another model.

But this run did not test human review time. We cannot spend an imagined saving.

The honest next metric is not only accepted edges per model token. It is useful durable operations per total system cost, including review, adjudication, and future reuse.

## The fit problem remains a hypothesis

I wanted the experiment to turn “blind probing is noisy” into “guided probing is an engineering optimization problem.” It did half of that.

It showed that the search strategy is concrete enough to version, freeze, execute, fail, and measure. Predicate vocabularies, seed diversity, branch depth, stopping rules, and cost allocation are now engineering objects.

It did not show that this particular guided strategy improves the fit.

That distinction matters. Calling something an optimization problem can be a sophisticated way of assuming the optimum exists. It may not, or it may require hybrid search:

```text
broad independent seeds
  → diversity-aware selection
  → predicate-directed expansion
  → periodic global probes
  → stop on novelty fixpoint or human boundary
```

The checked-in v3 design turns those lessons into an executable selector specification. It compares equal character budgets as well as equal calls, enforces seed-family diversity, reserves part of the budget for blind probes, expands the question registry for promise semantics, and introduces probes for the roles of same-endpoint paths. It should also use independent human review if the cost is bearable.

It has not been run. Its existence is evidence that the v2 failure changed the design, not evidence that the new design works.

For now, the conclusion is gloriously unmarketable:

> We taught the semantic search to follow threads. It followed two similar threads very efficiently and missed much of the room.

Software engineering did not fail us. It gave us the vocabulary to identify exactly how our search strategy failed.

That is what an engineering discipline is for.

---

### Sources and experiment trail

- Mark Weiser, [“Program Slicing”](https://courses.cs.washington.edu/courses/cse503/11au/readings/weiser-slicing-icse81.pdf), 1981.
- Gary A. Kildall, [“A Unified Approach to Global Program Optimization”](https://doi.org/10.1145/512927.512945), 1973.
- Patrick and Radhia Cousot, [“Abstract Interpretation”](https://www.di.ens.fr/~cousot/COUSOTpapers/POPL77.shtml), 1977.
- Michael Ernst et al., [“Dynamically Discovering Likely Program Invariants”](https://homes.cs.washington.edu/~mernst/pubs/invariants-icse99.pdf), 1999.
- Glenn Ammons, Rastislav Bodík, and James Larus, [“Mining Specifications”](https://citeseerx.ist.psu.edu/document?doi=dc1817567355cd08e9d0d1669211e0d964c0ad17&repid=rep1&type=pdf), 2002.

