---
title: "A Schema Is a Bounded Answer"
description: "Hold the evidence constant, change the questions, and different computational realities become visible."
date: "2026-09-01"
lastModified: "2026-09-01"
tags: ["ai","databases","data modeling","experiments","epistemics"]
author: "Rodrigo Sasaki"
series: "Meaning, Made Addressable"
seriesOrder: 1
visibility: "draft"
---
Give three database designers the same restaurant and you will not get one inevitable schema.

One will create a `guest_contact` table. Another will put names and phone numbers directly on reservations and waitlist entries. A third will generalize approvals; a fourth, if you let them into the experiment, will explain why all previous parties have misunderstood temporal modeling.

This is not a scandal. Schema design is an interrogation.

We ask the world what deserves identity, storage, cardinality, and a transaction boundary. The answers become tables, keys, constraints, and application surfaces. Ask a different bounded family of questions and a different computational shape may appear.

I wanted to see whether that distinction would survive contact with data—even fictional, meticulously frozen data involving a 46-seat restaurant called Café Aster.

The result was not clean. That is one reason I trust it more.

## Same restaurant, different questions

The experiment gave every session the exact same dossier. Café Aster accepts reservations by website and phone. It makes a good-faith effort to seat a party near the requested time, without promising a particular table. Large parties require deposits. Hosts revise wait estimates. Tables run late. Allergy notes can arrive through several channels, but the kitchen’s paper ticket is authoritative only after a verbal confirmation and handoff.

The dossier also names what it does not establish: the numeric meaning of “near,” the concurrency policy between booking channels, whether an unpaid request expires automatically, the identity implied by repeated phone numbers, and several operating thresholds.

Then the experiment split into two arms.

Three conventional sessions received this instruction, in effect:

> Design a practical normalized relational schema. Identify records, fields, keys, cardinalities, and foreign-key relationships. Stay close to current operational requirements.

Six semantic sessions received a fixed twelve-question battery:

- Who notices or must act when this changes?
- What promise exists, and to whom?
- What supports it?
- What blocks or invalidates it?
- What decision consumes this information?
- What becomes wrong downstream?
- What kind of absence is this?
- Where do names hide different meanings?
- Where does direction change explanation?
- Where do alternative paths carry different meanings?
- Which candidate relation could support a deterministic operation?

The prompts and output schemas were frozen and hashed before the calls. Every session was independent. The recorded run used `gpt-5.4-mini` at low reasoning effort through ephemeral Codex CLI sessions because no API key was available. That means the wrapper was not a bare model endpoint. One of nine sessions ran a harmless `pwd` despite the no-tools instruction; the event is preserved, and it read no domain file or outside source. The other eight made no tool calls.

Hosted inference is not bit-for-bit reproducible. The experiment preserves the exact prompts, events, output messages, request metadata, normalization code, review ledger, and hashes so the run can be audited as an observation.

## The operational shape

The conventional arm did what databases are good at.

Across three sessions it proposed 27 candidate tables and 47 explicit normalized relationships. The outputs described reservations, waitlist entries, tables, seating, orders, checks, deposits, approvals, staff, patio decisions, and related keys. They surfaced nullable references and unresolved choices. One session explicitly avoided manufacturing a durable customer identity from a phone number.

The conventional pass was clearer about:

- records and independent lifecycles;
- keys and cardinalities;
- transaction storage;
- CRUD boundaries;
- immediate implementation.

That finding matters. If the semantic pass had produced an enchanting cloud of arrows while the conventional pass failed to represent a reservation, the experiment would have discovered PowerPoint.

It did not.

The relational designs were competent. They answered the questions they were asked.

## The semantic shape

The six semantic sessions produced 100 normalized candidate nodes and 135 unique normalized candidate edges. Only 10 exact triples appeared in at least two sessions. Of the 135, 102 included a proposed deterministic operation.

An AI investigator then reviewed every edge. Nineteen were provisionally selected and materialized into an experimental JSON surface. Fourteen of those were judged both useful and absent as first-class relationships in the conventional aggregate.

Those judgments remain provisional. Author and domain-expert ratification is pending.

The number 14 is not the deepest result. These examples are:

```text
reservation
  --creates-->
reservation_promise

reservation
  --does_not_guarantee-->
table_assignment
```

A database can store a reservation with `table_id = NULL`. That state does not necessarily encode the scope of the promise. The semantic proposal gives software a named rule: accepting a reservation creates a commitment to a party near a requested time, but not to a specific table.

Then there is the authority boundary:

```text
reservation_note
  --is_not_authoritative_for-->
kitchen_paper_ticket
```

Two semantic sessions proposed that exact edge. A conventional design can store the note, verbal confirmation, and ticket mark perfectly well while leaving their authority relationship in application logic or human practice.

And the identity distinction:

```text
customer_record_absence
  --leads_to-->
identity_ambiguity
```

The traditional arm could avoid a false identity merge through careful schema design. The semantic arm proposed making the ambiguity itself addressable—a state that could block person-level joins.

Finally, typed unknown:

```text
concurrent_booking_conflict_detection
  --unknown_for-->
website_booking
```

This is awkward graph grammar carrying a useful idea. The dossier names a question the evidence cannot answer. Materializing the gap can drive a readiness check without pretending conflict detection is false.

## The strongest result is not “more”

It is tempting to say the semantic interrogation produced a richer schema. I think that is sloppy.

The two arms produced different projections.

The operational pass found shapes necessary to record the operation. The semantic pass proposed shapes that might be useful for reasoning about the operation: promises, premises, invalidations, authority boundaries, decision inputs, explanation paths, causal propagation, negative scope, and epistemic gaps.

Same dossier. Same evidence. Nobody had to be incompetent.

Different questions produced different computational realities.

That supports a useful framing:

> A schema is the accumulated answer to a bounded set of questions about reality.

The bounds are doing real work. The semantic battery could find promises partly because it asked about promises. The dossier was deliberately rich in commitments, unknowns, authority, and alternative paths. The experiment does not show that a model will spontaneously discover the deep ontology of an arbitrary business.

It shows something narrower: when we declare dimensions of interrogation, a model can project bounded evidence onto them and propose relations that operational modeling may leave implicit.

The questions are the instrument.

## The garbage has edges too

Of 135 semantic candidate edges, 116 were rejected. The prompt deliberately favored recall and told models not to hide weak or awkward candidates, so 116 is not a conventional error rate. It is still a large review surface.

Some failures are almost generous in how clearly they explain themselves:

```text
manager_override --authorizes--> manager
```

The arrow is backward.

```text
manager --sends--> deposit
```

The manager sends a payment link, not a deposit.

```text
deposit --creates--> pending_request
```

The causality is backward. The request is pending before payment; payment resolves the state.

```text
bar_seating --offers--> waitlist_entry
```

The actor has been compressed out of existence.

The most instructive failure may be:

```text
kitchen_throughput_threshold_absent
  --does_not_link_to-->
reservation_promise
```

The dossier says no formal connection is established. The candidate converts that epistemic gap into a negative fact about reality. It mistakes “we do not know a relation” for “there is no relation.”

Graph structure makes semantic mistakes embarrassingly pointable. In generated prose, a wrong implication can hide inside a smooth paragraph. Here we can say: wrong source, wrong target, wrong direction, wrong predicate, wrong scope.

That may be an advantage of the representation even when the proposal is bad.

## Repetition did not rescue us

Only 10 of 135 exact semantic triples appeared in more than one session. Raw vocabulary was unstable. Models chose different node boundaries and neighboring predicates such as `supports`, `requires`, `depends_on`, and `enables`.

Repeated support was not reliably corrective. A repeated `bar_seating --alternative_to--> waitlist` proposal was still rejected because bar seating can coexist with a waitlist entry until accepted as final seating.

Consensus can stabilize around a lossy abstraction.

But the conventional arm was not canonical either. Only 3 of its 47 exact relationships appeared in more than one session. One designer normalized contacts; another embedded them. One generalized approvals; another split them.

This does not excuse semantic fragmentation. It prevents us from pretending ordinary schema formation is objective photography.

Candidate discovery and canonical schema formation are separate stages in both worlds. We are simply less practiced at admitting it when the vocabulary is new.

## What this experiment earned

It did not prove that semantic graphs replace relational databases, models discover canonical ontologies, arbitrary businesses can be modeled automatically, consensus equals truth, or this architecture is ready for production.

It provisionally earned one sentence:

> Changing the interrogation dimensions over the same bounded evidence surfaced useful candidate directed relationships that record-oriented schema design did not represent as first-class relations.

That is enough to continue.

The next problem is engineering. If candidate generation is noisy—and it is—then a pile of edges is not yet a system. Two paths can reach the same endpoint while carrying opposite operational meanings. A stored relation can outlive the premise that supported it. A record, a commitment, and an obligation can all be called “the reservation” until software needs to preserve the difference.

Before we can correct the actual structural mistake, we need a vocabulary for asking what kind of mistake it is. The next article returns to the workbench and lets the concrete failures earn that vocabulary.

---

### Reproduce and inspect

Historical context: E. F. Codd, [“A Relational Model of Data for Large Shared Data Banks”](https://doi.org/10.1145/362384.362685), 1970.

