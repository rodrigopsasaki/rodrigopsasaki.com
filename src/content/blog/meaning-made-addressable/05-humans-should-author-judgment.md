---
title: "Humans Should Author Judgment, Not Grade Prose"
description: "A human becomes most valuable where continuing would require an unsupported assumption."
date: "2026-09-01"
lastModified: "2026-09-01"
tags: ["ai","human in the loop","epistemics","agents","software design"]
author: "Rodrigo Sasaki"
series: "Meaning, Made Addressable"
seriesOrder: 4
visibility: "draft"
---
“Ask me when you’re unsure” sounds like a sensible instruction for an AI agent.

It hides almost the entire problem.

Unsure about what? At which step? For which decision? Based on whose threshold? Should the system ask before drafting an email, before moving money, before merging two customer identities, or whenever its next token distribution looks a little flat?

A language model can express uncertainty. It can be trained or prompted to estimate confidence. It does not expose a privileged, universally reliable internal doubt flag that maps neatly onto our organizational risk.

It generates forward.

A better trigger can live outside the model: stop when the structure says that continuing requires an unsupported assumption.

That turns human-in-the-loop from a grading ritual into a boundary protocol.

## The shared phone number

Suppose two reservation records contain the same normalized phone number:

```text
R-1042: Alex, +1-555-0100
R-1188: A. Rivera, +1-555-0100
```

The observation is simple:

```text
R-1042
  --shares_phone_value_with-->
R-1188
```

Two hypotheses remain live:

```text
repeated_phone
  ├── may_indicate → same_person
  └── may_indicate → different_people
```

Both are commonplace. Neither is established by the phone string.

For sending a reservation reminder, the ambiguity may not matter. The operation can use the phone attached to that reservation record.

For merging customer history or attaching a person-level no-show label, identity equivalence matters a great deal. Continuing would collapse an observation into a person claim.

The right question is not:

> Can you provide more context?

It is a question that exposes both the evidence boundary and the policy choice:

> This phone number appears across reservation records R-1042 and R-1188, but the available evidence does not establish whether they belong to the same person or to people sharing a contact. For customer-history merging, should repeated phone numbers establish identity here, or require additional evidence?

The records, decision, and consequence are all named.

## Three conditions for interruption

The Epistemic Boundary experiment uses no model to decide when to ask. It checks three conditions:

1. incompatible hypotheses are still live;
2. the evidence state for identity equivalence is `unknown_from_evidence` or `asked_unanswered`;
3. the requested operation requires identity equivalence.

Only when all three hold does the operation stop.

The first run returns a machine-readable boundary:

```json
{
  "status": "blocked_needs_human_judgment",
  "reason": "unresolved_structural_fork",
  "boundary": {
    "live_hypotheses": ["different_people", "same_person"],
    "evidence_state": "unknown_from_evidence",
    "decision_requires": "identity_equivalence"
  }
}
```

Run a non-identity-dependent operation against the same graph and it does not interrupt. The system is not generally anxious. It is blocked at a specific decision boundary.

## The answer becomes structure

The experiment includes an explicit human-decision fixture:

```json
{
  "authorship": "experimenter_supplied_fixture",
  "model_output": false,
  "answer": "do_not_merge",
  "relation": "distinct_identity_for",
  "scope": "customer_history_merge_in_this_fixture"
}
```

That label matters. This is not a real customer judgment, a model answer, or proof that “do not merge” is the right universal policy. It is a controlled input used to test persistence.

The fixture becomes a durable, scoped relation:

```text
R-1042
  --distinct_identity_for-->
R-1188

[scope: customer-history merge in this fixture]
```

The next attempt to merge the same histories does not ask again. It traverses the stored judgment and returns `denied`.

The result is not “the model learned.” The result is more precise:

> A human-authored judgment changed the deterministic state future decisions consume.

## The human-in-the-loop contract changes

The familiar human-in-the-loop pattern looks like this:

```text
model produces output
  → human approves, rejects, or edits
  → system tries again
```

Humans act as error detectors. The work is often repeated because the correction remains attached to an output, prompt, or conversation rather than the domain relation that caused it.

A different contract looks like this:

```text
system walks supported structure
  → continuing requires an unsupported assumption
  → human authors judgment at that boundary
  → judgment gains scope, provenance, and lifecycle
  → future walks inherit it
```

Call the familiar approval pattern HITL 1.0 and the boundary protocol Human-in-the-Loop 2.0 if version numbers help. The point is a different contract, not improved validation. The deeper distinction is this:

> Humans are not graders of a probabilistic performance. They are authors of judgment the system did not possess.

It is sculpting, not validating a xerox machine.

The durable artifact is not an approved output. It is a changed future decision surface.

## Typed absence makes the boundary possible

This protocol collapses if every missing value is `null`.

The experiment preserves several different states:

```text
unasked
asked_unanswered
unknown_from_evidence
unsupported
false
not_applicable
answered_by_scoped_judgment
```

They imply different behavior.

`unasked` may mean the interrogation instrument never touched the dimension. `asked_unanswered` means someone posed it and is waiting. `unknown_from_evidence` means current sources cannot decide. `unsupported` applies to a proposal that has not earned standing. `false` closes a proposition. `not_applicable` says the question is malformed for this scope.

The identity fork is not resolved merely because a field is present. It is resolved when an authorized judgment or sufficient evidence changes the epistemic state.

This is what lets the system distinguish a productive interruption from a generic request for more context.

## Judgment needs an authority model

Persisting an answer is the easy part. Deciding whose answer counts is harder.

In a real system, a durable judgment should probably carry at least:

- author or authority role;
- scope;
- evidence or rationale;
- effective time;
- expiration or review condition;
- superseded judgments;
- downstream decisions it governs.

A restaurant host may have authority over tonight’s seating arrangement and no authority to merge long-term customer identities. A compliance officer may ratify a retention rule but not a kitchen safety procedure. A customer can correct their own identity and cannot generally define whether two other records represent one person.

If two authorized humans disagree, that disagreement should remain representable. Overwriting one row with the latest opinion recreates the opacity we were trying to remove.

The system needs tension, not a winner selected by timestamp.

## Durable judgment can become durable error

Human authorship is not a correctness oracle.

A person can answer hastily. An organization can ratify a discriminatory rule. A judgment can outlive its context. A locally sensible exception can become a global bug if its scope is lost.

The architecture therefore needs retraction and invalidation as first-class operations. Every judgment that can influence future decisions should be inspectable backward to its author and premise, and forward to its consumers.

This is where the same geometry serves two purposes:

```text
prediction: judgment → downstream decision
justification: downstream decision → judgment → author/evidence
```

If the judgment dies, the system can retract it and walk forward to find affected behavior. If a decision is challenged, it can walk backward to explain why it was made.

The promise is not that humans disappear. It is that human responsibility becomes harder to smear across a prompt.

## The same ambiguity should not cost forever

Human attention is expensive, and interruption has a compounding cost. An agent that repeatedly asks the same resolved question is not cautious; it is forgetful.

Persistent judgment amortizes attention. The first encounter may be expensive: a person must inspect the records, understand the consequence, and decide. Later encounters can reuse the scoped relation until new evidence, expiration, or contradiction reopens it.

That suggests a better optimization target for human-in-the-loop systems. Do not merely minimize the number of approvals. Maximize the amount of future safe behavior unlocked by each well-scoped judgment.

The human should intervene where their judgment changes the reachable state space, not where a product designer happened to place an approval button.

## Now the system has a search problem

The previous article gave correction an address. This one gave missing judgment a structural trigger: multiple viable hypotheses, insufficient disambiguating evidence, and a downstream decision that cannot proceed without choosing between them.

Neither solves discovery cost.

A blind semantic battery can ask excellent questions about every part of a dossier and still produce a noisy frontier. Once one edge becomes promising, which neighboring questions should open? When should the branch stop? How do we avoid spending the budget asking business questions of artifacts at the wrong altitude?

That is not only a model-capability question. It is a search strategy.

Software engineering has spent fifty years teaching machines to follow relevant structure, propagate consequences, approximate safely, prune paths, and stop at fixpoints.

The next experiment borrowed those ideas.

It lost.

That turned out to be more useful than a clean win.

