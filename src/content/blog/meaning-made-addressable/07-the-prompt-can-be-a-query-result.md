---
title: "The Prompt Can Be a Query Result"
description: "Ratified relations can select exact context deterministically before a model is asked to express or act."
date: "2026-09-01"
lastModified: "2026-09-01"
tags: ["ai","agents","prompts","databases","software architecture"]
author: "Rodrigo Sasaki"
series: "Meaning, Made Addressable"
seriesOrder: 6
visibility: "draft"
---
We ask language models to rediscover relevance constantly.

Retrieve five passages. Add records. Paste policy. Describe the task. Then ask the model to work out which facts matter, how they connect, which source has authority, and what conclusion follows.

Often it works.

Then we throw the reconstruction away and pay for it again on the next call.

If semantic relations can earn durable standing, another serving architecture becomes possible:

```text
task
  → deterministic query
  → exact relevant path
  → optional evidence fetch
  → rendered context
  → model expression or action
```

The prompt can literally be a query result.

This is not a promise of zero errors. It is an attempt to give errors addresses.

## One question, two pipelines

The deterministic-context experiment freezes one question:

> Why is reservation R-204 at risk, and may staff treat its reservation note as a completed kitchen allergy handoff?

The fixture contains ordinary operational state:

- R-204 is an accepted four-person reservation for 19:30;
- it has no assigned table;
- T-7 is a planning candidate and is occupied, running late;
- note N-204 says the guest reports a peanut allergy;
- kitchen ticket K-204 has no allergy mark and no verbal-confirmation timestamp.

It also contains source passages describing late-table options, the good-faith seating promise, and the allergy authority boundary.

The baseline pipeline creates a normalized SQLite database, joins the relevant reservation, note, ticket, capacity dependency, and table records, then uses lexical overlap to retrieve up to three source chunks. Its prompt says, in effect:

> Here are records and passages. Infer which facts matter, answer the question, state uncertainty, and cite context IDs.

The addressable pipeline loads a small semantic graph whose edges are explicitly marked as a ratified-style experiment fixture—not author-ratified production state. Deterministic code runs two fixed path queries with predicate allowlists. Only after the path is selected does it lazy-load the evidence named by those edges.

No model chooses the nodes, predicates, direction, or evidence IDs.

Only then is the prompt written. Only after the prompt exists does the base model run.

## The selected path

For reservation risk, the query returns:

```text
g01: T-7
  --has_state-->
table_runs_late

g03: table_runs_late
  --can_delay-->
later_reservation

g02: R-204
  --plays_role-->
later_reservation

g04: R-204
  --creates-->
P-204

g05: P-204
  --targets-->
near_requested_time
```

For the allergy handoff, it returns:

```text
g06: N-204
  --contains-->
allergy_signal

g07: N-204
  --is_not_authoritative_for-->
K-204

g08: allergy_signal
  --triggers_best_effort_escalation-->
kitchen_safety_process

g09: kitchen_safety_process
  --requires-->
verbal_confirmation
```

The path already encodes why each item is present. The model does not have to infer from document proximity that a late table threatens a later reservation, or that an allergy note is relevant without being authoritative.

The evidence passages are still available. They arrive as flesh attached to an already selected skeleton.

## The prompts were nearly the same size

The baseline prompt was 1,510 characters. The addressable prompt was 1,429.

That 81-character difference is not a finding. This experiment was not designed as a compression benchmark.

The difference is inspectability.

In the baseline, one JSON record and three retrieved passages enter a single inference surface. If the answer is wrong, we must ask whether the source record was wrong, lexical retrieval missed something, the model inferred the wrong relation, the prompt rendered it badly, or expression failed.

In the addressable pipeline, the exact path and evidence IDs exist before the model. We can inspect whether `g03` is a bad edge, whether the query walked it in the wrong direction, whether `g07` is stale, whether the path selector omitted an exception, or whether the model misexpressed correct context.

More components do not mean fewer bugs. They mean more named seams.

## Both model answers were good

The experiment then sent each prompt to a fresh `gpt-5.4-mini` session at low reasoning effort. Both calls returned structured answers and made no tool calls.

The baseline correctly said R-204 was at risk because its candidate table was running late and the reservation promised only a good-faith effort near the requested time, not a particular table. It also correctly refused to treat the note as a completed handoff, citing the missing ticket mark and verbal confirmation.

The addressable answer followed the supplied path almost line by line. It cited all nine edge IDs and the three lazy-loaded evidence IDs. It correctly separated the note’s allergy signal from its lack of kitchen authority and preserved the required verbal confirmation.

This is not evidence that the semantic pipeline produces better answers. One question cannot establish that, and the baseline was excellent.

The baseline also did something the addressable output did not: it listed two remaining unknowns—whether staff had confirmed the allergy off-record and whether T-7 would clear or an alternate arrangement would be approved. The addressable response returned an empty `remaining_unknowns` array.

That difference is useful.

The path gave the model exactly what had been selected. It did not guarantee that the renderer or expression stage would foreground every unresolved operational fact. Deterministic context can narrow attention so effectively that omitted context becomes the new failure mode.

The architecture moved an error boundary. It did not cross into infallibility.

## A locatable attack surface

The baseline has at least these surfaces:

```text
source or schema
  → retrieval and implicit relevance inference
  → prompt composition
  → model interpretation and expression
```

The addressable pipeline expands them:

```text
source or schema
  → semantic edge quality and freshness
  → traversal direction
  → query or path selection
  → rendering and context
  → model expression
```

That looks worse on a slide. It is better for debugging.

If the system claims the note completed the kitchen handoff, we can inspect `g07`. If the edge is correct, inspect the selected path. If the path is correct, inspect the rendered prompt. If the prompt states the boundary and the answer violates it, the failure is in model expression.

The same geometry supports impact analysis. Retract `g07` because the kitchen adopted a new authoritative digital ticket, then walk forward to identify queries, prompts, and guards that depended on it.

This is what addressability buys: not correctness by construction, but failure localization and reusable correction.

## Why this is not merely better retrieval

Retrieval asks which documents, chunks, or records should enter context. Semantic path serving asks which ratified relations connect the task to relevant state and evidence.

The two can coexist:

```text
task
  → resolve conversation and decision
  → query semantic skeleton
  → retrieve evidence attached to the path
  → render
```

The original RAG architecture combines parametric generation with non-parametric memory and improves access to external knowledge. Nothing here makes that achievement obsolete. The proposed layer changes the unit of reuse.

A retrieved paragraph is evidence. A ratified edge says how evidence, state, authority, and consequence are allowed to connect.

Sometimes a similarity search is all we need. Sometimes the expensive fact is not the paragraph but the organizational judgment that says why it matters.

## Serving is downstream of governance

The demo uses a small fixture graph, and that limitation is not housekeeping.

In production, every served edge would need a lifecycle. Who ratified it? Under which evidence? At what scope? What can supersede it? When was it last checked? Which decisions consume it?

Without those answers, deterministic serving can become a very efficient way to distribute stale policy.

The pipeline also needs typed failure behavior. If the required path is missing, should the system fall back to retrieval, ask a human, refuse the operation, or run a new bounded interrogation? Different conversations deserve different answers. An incident response tool may prefer a noisy fallback. A payment agent may prefer to stop.

Determinism is not synonymous with safety. It is a property we can reason about once the inputs and transitions are named.

## The direction toward agents

An agent needs more than facts. It needs to know what those facts permit, support, block, and leave unresolved.

Today we often place that burden inside a large prompt:

```text
Here is everything we found.
Please infer the policy, decide what matters,
notice ambiguity, respect authority,
and act safely.
```

A more mature architecture can move some of that work earlier:

```text
world
  → interrogation
  → candidate relation
  → corroboration
  → authorized ratification
  → durable relation
  → deterministic query
  → exact context
  → model expression or action
```

The model remains essential. It helps discover candidate geometry. It can translate evidence into proposed structure. It can express a selected path in language and act in interfaces built for people.

But it no longer has to reinvent every meaningful relation inside every prompt.

A database is an awesome tool.

A language model with a prompt is an awesome tool.

The opportunity is not to replace either one. It is to engineer the translation layer that lets probabilistic discovery create new, governed surfaces for deterministic computation.

The prompt can become a query result.

And when it is wrong, we may finally know where to look.

That is the boring endpoint worth wanting: fewer heroic prompts, more inspectable records, explicit paths, scoped judgments, ordinary tests, and maintenance work that looks like engineering. The exotic discovery mechanism can recede upstream. What remains at serving time is infrastructure people can query, diff, invalidate, and repair.

---

### Sources and experiment trail

- Patrick Lewis et al., [“Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks”](https://arxiv.org/abs/2005.11401), 2020.

