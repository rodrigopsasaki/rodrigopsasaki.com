---
title: "When Meaning Has an Address, Correction Changes"
description: "Once a relation has coordinates, people can correct the wrong edge instead of shouting at the prompt."
date: "2026-09-01"
lastModified: "2026-09-01"
tags: ["ai","software design","knowledge graphs","correction","governance"]
author: "Rodrigo Sasaki"
series: "Meaning, Made Addressable"
seriesOrder: 3
visibility: "draft"
---
“Be more careful.”

This may be the most common correction we give an AI system and the least reusable.

The model produces a plausible answer with one dangerous implication. We revise the prompt: consider the full context; respect the policy; ask when unsure. The next output is better. Then a different task crosses the same boundary from another direction, and we begin again.

Prompts are expressive. They are poor addresses.

We “scream at the prompt”—be careful, think harder, use all the context—because the inference surface is usually invisible. The instruction may improve the next paragraph while leaving the wrong turn unnamed and unreusable.

If the third inference depends on a reversed edge, “be more careful” does not name the edge. If a rule is too strong for one scope, rewriting a paragraph does not identify the predicate, exception, or authority that should change. The feedback is legible to a person in the moment and nearly useless to deterministic machinery later.

Materialized semantic structure changes the correction surface.

Instead of criticizing the answer, we can point to the thing that made the answer possible:

- wrong direction;
- predicate too strong;
- missing premise;
- missing scoped exception;
- stale relation;
- unknown converted into fact;
- overloaded relation;
- missing safety override;
- two paths incorrectly treated as equivalent;
- candidate that should be rejected.

These are not magic words. They are operations.

## The allergy contradiction that is not a contradiction

Return to Café Aster. Its operating description establishes two facts:

1. a digital reservation note is not the authoritative instruction for the kitchen’s paper ticket;
2. an allergy signal should still cause a safety process to begin.

A weak representation may choose one and destroy the other.

If it promotes the note directly into kitchen authority, it creates a false completion path. If it treats “not authoritative” as “irrelevant,” it suppresses a signal the staff should act on.

The useful structure preserves both:

```text
reservation_note
  --is_not_authoritative_for-->
kitchen_paper_ticket

allergy_signal
  --triggers_best_effort_escalation-->
kitchen_safety_process
```

Then the handoff path can carry its premise:

```text
reservation_note
  --may_trigger_handoff_review
      [requires: verbal_confirmation]-->
kitchen_paper_ticket
```

Non-authority limits what can be concluded. Safety escalation determines what must happen next. Verbal confirmation gates completion.

The structure is doing something a broad instruction like “prioritize safety” cannot do alone: it separates relevance, authority, and process state.

## A deliberately bad graph

To test the correction surface, I built a small graph with intentional mistakes. It contained:

```text
manager_override --authorizes--> manager
```

The direction is reversed.

```text
reservation_note --must_flow_to--> kitchen_paper_ticket
```

The predicate is too strong and skips verbal confirmation.

```text
unpaid_request --expires_automatically_via--> automatic_expiration
```

The evidence does not establish an automatic expiration policy.

```text
free_text_note --causes--> staff_action
```

The source and target are both overloaded. An accessibility request and a celebration note may share a field while participating in different workflows.

```text
allergy_absence --means--> no_allergy
```

This commits the classic epistemic error: missing note becomes negative fact.

The graph also retained a correct authority boundary, a stale phone-identity rule, and two paths from a late table to a later reservation promise:

```text
table_runs_late
  --can_delay--> later_reservation
  --puts_at_risk--> reservation_promise

table_runs_late
  --can_prompt_offer_of--> bar_seating
  --may_preserve--> reservation_promise
```

The endpoints match. The first path propagates risk; the second describes a possible mitigation. Treating them as equivalent because both make `reservation_promise` reachable would erase the reason either route matters. The fixture therefore begins with an explicit but bad endpoint-equivalence assumption.

This mixed state lets the experiment test whether corrections can preserve, revise, retire, add, and distinguish structure without rebuilding everything.

## Ten correction operations

The experiment applied a machine-readable ledger.

`reverse_direction` changed the manager relation so the manager authorizes the override.

`weaken_predicate` changed `must_flow_to` into `may_trigger_handoff_review`.

`add_missing_premise` attached `verbal_confirmation` to that handoff relation.

`add_scoped_exception` recorded that the note’s non-authority must not suppress allergy escalation.

`mark_stale` retained the old phone rule for audit while excluding it from active walks.

`preserve_unknown` rejected automatic expiration and replaced it with a typed `unknown_from_evidence` question.

`split_overloaded_relation` replaced generic `free_text_note --causes--> staff_action` with separate celebration and accessibility shapes.

`add_safety_override` added the best-effort allergy escalation path.

`reject_edge` removed the claim that missing allergy notes mean no allergy.

`mark_paths_non_equivalent` rejected the endpoint-based equivalence and labeled one path `risk_propagation` and the other `mitigation`.

Each correction recorded an ID, reason, before state, and after state. The experiment regenerated the graph and then ran the same deterministic walk over both versions.

This is the practical meaning of *reachable-as*. “Can I reach the promise?” is insufficient. We must also ask whether it is reachable as a threatened obligation, a preserved obligation, an explanation, an authorization, or something else. The structure we discovered becomes the language we use to correct it.

## Before and after are query results

Before correction, starting from `reservation_note` and `allergy_signal` with `verbal_confirmation = false` traversed both the correct non-authority boundary and the incorrect direct flow to the paper ticket:

```text
reservation_note
  --is_not_authoritative_for-->
kitchen_paper_ticket

reservation_note
  --must_flow_to-->
kitchen_paper_ticket
```

The graph contradicted itself operationally. The note was simultaneously non-authoritative and a mandatory direct route.

After correction, the same facts produced a different walk:

```text
reservation_note
  --is_not_authoritative_for-->
kitchen_paper_ticket

allergy_signal
  --triggers_best_effort_escalation-->
kitchen_safety_process
```

The weakened handoff edge was present but blocked, with `verbal_confirmation` named as the missing premise.

Nothing in that decision required a model at read time. The graph state and traversal rule were enough.

That distinction is central. The system did not generate a wiser paragraph because we asked nicely. The correction changed which path was executable.

## Correction becomes compositional

Prompt feedback often bundles several repairs into one blob:

> The reservation note is not official, but allergies are important, so make sure someone checks, and do not assume no note means no allergy.

A competent model can follow that instruction. The problem arrives later, when we need to know which part applies to a reporting job, a kitchen workflow, a reservation agent, or an audit.

Structural correction decomposes the bundle:

```text
authority boundary
+ safety escalation
+ completion premise
+ typed absence
```

Each part has a different downstream consumer and lifecycle. The authority boundary may remain stable for years. The escalation policy may vary by location. The premise may change if the kitchen digitizes its ticketing workflow. The typed absence rule may apply across every channel.

Because the pieces have addresses, they can be diffed and scoped independently.

This is a different kind of learning. It does not require changing model weights. It changes the structure the next walk will consume.

## Addressability makes mistakes easier to argue about

This advantage is not limited to correction after an error. It changes review before materialization.

Compare these two review comments:

> I think the answer overstates the manager’s role.

and:

> `manager_override --authorizes--> manager` has the authority direction reversed. Replace it with `manager --authorizes--> manager_override` within the overbooking and complimentary-item scope.

The second comment can still be wrong. It is simply easier to inspect. We can ask whether the source is the manager role or a specific manager, whether `authorizes` is the right predicate, whether the scope should be attached to the edge, and what evidence established it.

Meaning has coordinates.

That makes disagreement cheaper. Two reviewers do not have to debate whether a paragraph “basically captures the policy.” They can disagree about a predicate and preserve both positions until someone with authority decides.

## The representation does not choose the policy

There is a danger in falling in love with editability. A perfectly addressable policy can still be a bad policy.

The correction experiment proves only that typed operations produce deterministic, auditable changes in graph state, path interpretation, and downstream walks. It does not prove that the human editor is correct, that the predicate vocabulary is canonical, or that a graph editor is the right interface for staff.

Governance moves into view rather than disappearing:

- Who may reverse an authority edge?
- What evidence is required to weaken a predicate?
- Does an exception override a rule or merely add a parallel path?
- When does a judgment become stale?
- How are conflicting scoped corrections represented?

Those are hard questions. They are better than “why did the chatbot say that?” because they have inspectable objects.

## From correction to judgment

Addressable correction solves one class of failure: the system has structure, but the structure is wrong or incomplete.

Another class remains. Sometimes the available evidence genuinely supports multiple live hypotheses. There is no edge to correct because the missing piece is a judgment nobody has authored yet.

At that point, “ask me when unsure” is still too vague. The system needs a deterministic reason to stop, a precise question to ask, and a durable place to put the answer.

That changes the human’s job from grading output to authoring judgment.

