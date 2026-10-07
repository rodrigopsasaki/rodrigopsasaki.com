---
title: "The Relations We Never Gave Software"
description: "Semantic inference may let us formalize more of what a business means—and then hand the work back to deterministic software."
date: "2026-09-01"
lastModified: "2026-09-02"
tags: ["ai","databases","software design","semantic systems","r&d"]
author: "Rodrigo Sasaki"
series: "Meaning, Made Addressable"
seriesOrder: 0
visibility: "draft"
---
Why do we model databases the way we do?

The world does not arrive as tables. A business does not naturally contain an `orders` table, three foreign keys, and a disagreement about whether status should be an enum.

We make it that way.

We look at a messy operation and ask disciplined questions. What deserves identity? What changes independently? What must remain true? Which records may refer to one another? What should happen atomically? Which paths will software need to follow repeatedly?

Then we declare:

- entities;
- keys;
- cardinalities;
- constraints;
- foreign keys;
- indexes;
- transaction boundaries.

Once we have done that, a database becomes extraordinarily good at preserving a coherent reality while it changes. Software can get from the cart to the sale, the order to the customer, the invoice to the payment. It can reject an impossible state, survive a process crashing halfway through an update, and answer tomorrow using facts written today.

This is not a limitation to mock on the way to announcing an AI future. It is one of software engineering’s greatest achievements.

But it rests on an assumption so familiar that it is easy to stop seeing it:

> The useful relationships generally have to be known and formalized before software can operate over them reliably.

Traditional software can compute over any relationship we successfully formalize. The uncomfortable question is how many useful relationships we never formalized—not because they were unimportant, but because noticing, naming, and maintaining them was too expensive.

## The relations are already there

Consider the relationships that appear in an ordinary business:

```text
this operational rule supports that customer promise

this document is evidence for a decision
but is not authoritative for it

this policy invalidates that workflow

this repeated identifier suggests identity
but does not establish it

this operational fact creates an obligation

this relationship is unknown, not false
```

These relations are not imaginary. People use them to make decisions every day.

But they often live in business rules, control flow, documentation, comments, policy, incident reports, review judgment, prompts, and the part of institutional memory that leaves shortly after someone’s farewell drinks.

They are present as meaning, but absent as first-class data.

That distinction matters. If a relation is only reconstructed when a person reads five documents together—or when a language model receives all five in a prompt—then the system may be able to discuss it without being able to depend on it.

The answer sounds informed. The relationship disappears when the answer ends.

## When code is also the storage format for meaning

Suppose a restaurant system contains a rule like this:

```python
if reservation_note_mentions_allergy(reservation.note) \
   and not kitchen_ticket.confirmed:
    escalate_to_staff(reservation)
```

The code is useful. It executes a safety precaution.

It also contains, implicitly, several domain relationships:

```text
reservation_note
  --may_signal-->
allergy_risk

kitchen_ticket
  --is_authoritative_for-->
kitchen_instruction

allergy_risk
  --requires_precaution-->
escalation
```

The implementation knows what to do. But it is also accidentally serving as the storage format for *why* that behavior exists.

That meaning is difficult to reuse. A reviewer can infer it from the condition. An incident investigator can reconstruct it from the code, policy, and logs. A new engineer can learn it if someone points them to the right file. Another system can act on it after someone encodes the same understanding again.

If the relationships themselves had standing, the same meaning could support runtime behavior, review, audit, incident explanation, onboarding, policy validation, and the construction of context for an agent.

Computation would become a consumer of meaning rather than its container.

This does not mean business logic should become a decorative cloud of circles and arrows. There is a useful boundary here.

Structure can represent which relationships, obligations, authorities, dependencies, assumptions, and constraints are currently held to be true.

Code can decide what operation to perform given those truths and the current state.

Algorithms, pricing formulas, concurrency control, retries, allocation procedures, and atomic reservation logic remain computation. The claim is not “turn everything into a graph.” It is that we may be able to push the data boundary upward into meaning where doing so creates a useful deterministic surface.

## The overlooked AI capability

Most discussion about AI in software starts at one of two ends.

At one end, models make familiar work faster: write the draft, summarize the document, generate the code, classify the ticket.

At the other, natural language makes an existing system easier to approach: describe the report instead of assembling it in a query builder; state the task instead of learning the interface.

Both are valuable. Neither is the capability I am interested in here.

The overlooked possibility is that language models can inspect messy evidence and propose candidate semantic relationships that people previously had to notice, name, and formalize manually.

They can ask of prose, code, policy, tickets, and operational traces:

```text
What promise exists here?
What supports it?
Which source has authority?
What can invalidate this decision?
Which absence represents uncertainty rather than falsity?
What becomes wrong downstream if this premise changes?
```

The answers are not automatically true. They are candidates.

That gives us an architectural shape with an important boundary in the middle:

```text
world
  → semantic inference
  → candidate relation
  → corroboration / human / evidence ratification
  → durable relation
  → deterministic computation
```

The ratification step is load-bearing. A model does not get unilateral lawmaking power because it can speak fluent JSON.

But once a relationship earns standing, it can become ordinary engineered structure. Give it an identity, scope, provenance, effective time, and an invalidation rule. Then query it, traverse it, join it, index it, diff it, audit it, cache it, test it, or use it for impact analysis.

No language model is necessarily required for those operations.

This is the inversion I find interesting:

> The point is not that everything becomes LLM-powered. It is that LLMs may help create structure that lets more downstream operations stop being LLM-powered.

The probabilistic system found a place where deterministic software could exist.

## We already had rules engines

None of the machinery after ratification is new.

Software already has relational databases, graph databases, ontologies, rules engines, policy engines, dynamic schemas, and more configuration formats than anyone has successfully counted. We have long been able to store a relationship and compute over it.

The hard part was often deciding which distinction deserved to be stored.

Someone had to notice that a reservation creates a promise without guaranteeing a particular table. Someone had to distinguish evidence from authority. Someone had to recognize that the absence of a verified customer record creates identity ambiguity rather than a license to merge two people who share a phone number.

Then they had to name the relation, bound its scope, find the evidence, negotiate the exceptions, and persuade the software to remember it.

Traditional configurable systems do not remove that discovery cost. They become powerful after someone has already paid it.

Semantic inference may lower the cost of finding candidate distinctions. Not to zero, and not uniformly. The work of verification, ownership, and maintenance remains. But if discovery becomes cheap enough to attempt repeatedly, the practical state space of software changes.

The new capability is not that relationships can be formalized. It is that the set of relationships we can economically attempt to formalize may become much larger.

## The graph does not need to arrive complete

It would be a mistake to imagine this as a model reading the company drive on Tuesday and delivering The Enterprise Ontology on Wednesday.

Useful structure can grow iteratively.

Imagine that semantic inference proposes this relation:

```text
reservation
  --creates-->
reservation_promise
```

People inspect it. Evidence supports it. The business decides what the promise means and where it applies. The relation earns standing.

Now software has a new deterministic coordinate: `reservation_promise`.

From that position, questions become useful that were not necessary—or sometimes not even natural—to ask before:

- Who is the promise owed to?
- What operational facts support it?
- What can invalidate it?
- What counts as fulfillment?
- What threatens it?
- What does the promise explicitly *not* guarantee?

Those questions may produce more candidates:

```text
reservation_promise
  --is_owed_to-->
party

ready_table_hold
  --supports-->
reservation_promise

table_overrun
  --can_threaten-->
later_reservation_promise

reservation_promise
  --does_not_guarantee-->
specific_table
```

Each accepted relation changes what can be reached deterministically. It also creates a new stable position from which the domain can be interrogated again.

The system does not need to infer everything at once. It can grow with the terrain:

![A five-step cycle: discover a candidate relation, ratify it, make it deterministic, reach new semantic terrain, and ask the next bounded question. Each loop creates another deterministic foothold.](/images/meaning-made-addressable/evolving-terrain-cycle.png)

The graph does not need to arrive complete. Each ratified relationship creates a new deterministic foothold from which another semantic question becomes possible.

Semantic inference expands the map. Deterministic software turns discovered terrain into stable ground. From that ground, the next frontier becomes visible.

That is not mystical. It is schema evolution with a new discovery instrument.

## A smaller probabilistic surface

There is a practical destination hiding inside this idea.

Today, many AI systems repeatedly reconstruct the same meaning at serving time:

```text
user task
  → retrieve a large pile of possibly relevant material
  → ask a model what matters
  → ask the model to infer the relationships again
  → produce an answer or action
```

If some of those relationships have already been discovered, ratified, and materialized, the serving path can change:

```text
occasional semantic inference
          ↓
candidate relationships
          ↓
       ratification
          ↓
durable semantic structure
          ↓
   deterministic serving
     ↙       ↓       ↘
 queries   rules   prompt context
```

A user task can become a deterministic query over ratified structure. The query selects an exact relevant path and its supporting evidence. A model may still express the answer or perform the final action, but it does not have to rediscover why the context matters every time.

The prompt can become a query result.

That is the destination of this series, not a conclusion we have earned yet. First we need to know whether semantic interrogation finds useful structure at all.

## Candidates are not truth

The appealing part of this idea is discovery. The dangerous part is forgetting the word *candidate*.

A model can reverse an edge, confuse evidence with authority, invent scope, compress two actors into one, or translate “the documentation does not say” into “this is false.” Putting the error in a graph makes it addressable; it does not make it correct.

A candidate relation should have to answer ordinary engineering questions before it receives standing:

- What evidence supports it?
- Where does it apply?
- Who or what has authority to ratify it?
- When did it become effective?
- What would retract or supersede it?
- Which deterministic behavior does it enable?
- What is the consequence if it is wrong?

The last question should influence the ratification path. A relation used to recommend a table for review and a relation used to decide whether an allergy handoff is complete do not deserve the same threshold.

Discovery can be probabilistic. Standing must be governed.

## A cheap test

The thesis can be made falsifiable.

If semantic inference expands the set of relations we can economically make first-class, then the same bounded description of a business should yield materially different useful structure depending on the questions pressed against it.

One interrogation can ask conventional schema questions:

```text
What are the records?
Which fields do they contain?
What needs identity?
What are the keys and cardinalities?
Which relationships should be foreign keys?
```

Another can ask semantic relationship questions:

```text
What promise exists?
What supports or invalidates it?
Which source is evidence, and which is authoritative?
What obligation follows from this fact?
Which relationship is unknown rather than false?
What downstream decision depends on the distinction?
```

Hold the business description constant. Freeze the questions. Run the interrogations independently. Keep the malformed answers instead of quietly sanding them off.

Then ask two things.

Did the semantic interrogation propose useful relationships that the operational schema did not represent as first-class structure?

Could any of those relationships support a deterministic operation that was not available from the original schema alone?

If the answer is no, the idea deserves to die cheaply. If the answer is yes, it earns the next engineering question.

That is cheap to test.

So I did.

The next article opens the notebook.
