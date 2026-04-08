---
title: "Implicit state machines"
description: "How well-intentioned conditional checks evolve into something you didn't expect"
date: "2026-01-02"
tags: ["simplicity", "state machines", "typescript", "software design", "maintainability"]
author: "Rodrigo Sasaki"
visible: true
---

Ever had some code that was genuinely straightforward at the start?

Not clever. Not elegant. Just clear. You understood the rules, you knew what needed to happen and in what order, and if someone asked what the code did you could explain it quickly and move on.

Then requirements changed.

Nothing dramatic. No architectural shift. Just normal evolution. One exception, then another, then a special case, a fallback, a flag.

Now you open the file, and it's hard to read, not because the business rules are unclear. You still know the rules. What's exhausting is re-deriving them from the code every time you look at it.

This is not a post about product complexity or business logic. It's about code. About what it feels like to maintain code that technically works, but slowly erodes your confidence every time you touch it.

## A simple example

Let's start with a simple example. You are implementing entry logic for a venue. The initial rule is straightforward: you must be over 18 to enter.

All examples below are TypeScript, typesafe, and compilable.

```typescript
interface EntryInput {
  age: number;
}

function allowEntry(_input: EntryInput): void {
  // Side effects: logs, metrics, access grants, notifications, audits
}

function denyEntry(_input: EntryInput): void {
  // Side effects too
}

export function handleEntryV1(input: EntryInput): void {
  if (input.age >= 18) {
    allowEntry(input);
  } else {
    denyEntry(input);
  }
}
```

That's clear enough. Then a new requirement comes in. VIPs can enter regardless of age, but only until midnight.

```typescript
interface EntryInputV2 extends EntryInput {
  isVip: boolean;
  beforeMidnight: boolean;
}

export function handleEntryV2(input: EntryInputV2): void {
  if (input.isVip && input.beforeMidnight) {
    allowEntry(input);
  } else if (input.age >= 18) {
    allowEntry(input);
  } else {
    denyEntry(input);
  }
}
```

Still readable. Still easy to reason about.

Later, minors are allowed in if they are accompanied by a guardian.

```typescript
interface EntryInputV3 extends EntryInputV2 {
  hasGuardian: boolean;
}

export function handleEntryV3(input: EntryInputV3): void {
  if (input.isVip && input.beforeMidnight) {
    allowEntry(input);
  } else if (input.age >= 18) {
    allowEntry(input);
  } else if (input.hasGuardian) {
    allowEntry(input);
  } else {
    denyEntry(input);
  }
}
```

Each change makes sense in isolation. Each condition reflects a real rule. At this point, most people would still be comfortable maintaining this code.

## A reasonable merge with good intentions

Now the logic grows a bit more, but not because you sat down to redesign it.

Another team touches this code while working on a related feature. They notice that staff access is handled elsewhere and decide to reuse this logic to avoid duplication. Staff should be allowed in during work hours, so the check gets folded in here.

```typescript
interface EntryInputV4 extends EntryInputV3 {
  isStaff: boolean;
  onShift: boolean;
}

export function handleEntryV4(input: EntryInputV4): void {
  if (input.isVip && input.beforeMidnight) {
    allowEntry(input);
  } else if (input.isStaff && input.onShift) {
    allowEntry(input);
  } else if (input.age >= 18) {
    allowEntry(input);
  } else if (input.hasGuardian) {
    allowEntry(input);
  } else {
    denyEntry(input);
  }
}
```

Nothing about this feels reckless. The change was made with good intentions, and given certain conditions it's a reasonable judgment call to combine these rules.

Maybe centralizing entry logic aligns with the company's broader strategy. Maybe compliance requires staff access to follow the same gate as attendees. Maybe this came from outside the team and the direction was clear.

Questioning those decisions is healthy and expected. Thinking about fundamentals is part of the job. But once a broader decision is made, there is still a responsibility to commit to it and implement it cleanly.

The rules are still correct. The code still works, but reading it now requires effort.

## Side effects are why this matters

In a real system, `allowEntry` may not be a trivial operation. It exists as an isolated function for a reason. Calling it is a decision with consequences: logs, metrics, audits, notifications, access grants.

The point is not what it does, but that calling it is a commitment. You want certainty that all the conditions justifying those side effects truly hold at the moment you trigger them. You want confidence that you are in the right situation, not just that the last if happened to pass.

As conditions accumulate, that certainty erodes. And when side effects are irreversible, such as an audit log written, a notification sent, a door unlocked, then erosion of certainty becomes erosion of trust in your own system.

## Another reasonable rule arrives

Later, a new requirement lands. Some events do not allow minors at all. This change is unrelated to staff access and is perfectly sensible on its own.

```typescript
interface EntryInputV5 extends EntryInputV4 {
  restrictedEvent: boolean;
}

export function handleEntryV5(input: EntryInputV5): void {
  if (input.isVip && input.beforeMidnight) {
    allowEntry(input);
  } else if (input.isStaff && input.onShift) {
    allowEntry(input);
  } else if (input.age >= 18 && !input.restrictedEvent) {
    allowEntry(input);
  } else if (input.hasGuardian && !input.restrictedEvent) {
    allowEntry(input);
  } else {
    denyEntry(input);
  }
}
```

Still reasonable. Still correct, but something important has changed.

## The combinatorics gut punch

Look at the code again and count how many independent facts influence the decision.

- `isVip`
- `beforeMidnight`
- `isStaff`
- `onShift`
- `age >= 18`
- `hasGuardian`
- `restrictedEvent`

That's seven independent boolean inputs. Combinatorially, that is `2⁷` possible combinations. `128` possible states.

Before `restrictedEvent` existed, there were six arguments. That means `64` possible combinations. Adding one reasonable condition doubled the number of possible worlds this code can see.

Some combinations lead to the same outcome. A minor and a minor VIP without a guardian after midnight both get denied. But they are still different states of the world. They matter because you may log differently, audit differently, emit different metrics, or later change the rules in a way that splits those cases apart. The fact that they collapse today does not mean they are the same.

And this example is still extremely forgiving.

All of these are booleans. Real systems rarely are. Age is a range. Staff is a role. VIP may have tiers. Events may have types. Time may be a policy window instead of a simple cutoff.

It does not take much to blow this completely out of the water.

This is why certainty erodes. Not because of carelessness, but because the state space grows faster than intuition. At some point, nobody is reasoning about all the combinations anymore. They are reasoning about the ones they remember.

## The real cognitive cost

Every time you hit an `if`, you have to re-evaluate the state you believe the system is in. You ask:

> Is everything that was true before still true here? Which scenarios are still possible? Did previous checks already rule some paths out?

That mental reset happens every single time.

You are no longer reasoning about behavior. You are reasoning about reachability, and that's a terrible place to be.

Tests start to feel like the only safety net. But that opens an uncomfortable question:

> Should tests be responsible for protecting us from confusing control flow? Or should control flow be clear enough that tests validate intent, not compensate for ambiguity?

## The uncomfortable realization

By this point, the code has an implicit state machine. It exists whether you acknowledge it or not.

States like VIP active, staff on duty, adult at a normal event, minor with guardian at a normal event, denied entry are real. The code depends on them. They are just not named.

Instead, they are smeared across conditionals, forcing every reader to rediscover them from scratch.

## Making the state explicit

The fix is not fewer conditionals. The fix is deciding the state once.

```typescript
type EntryState =
  | { kind: "VipActive" }
  | { kind: "StaffOnDuty" }
  | { kind: "AdultNormalEvent" }
  | { kind: "MinorWithGuardianNormalEvent" }
  | { kind: "Denied"; reason: DenialReason };

type DenialReason =
  | "underage"
  | "restrictedEvent"
  | "vipAfterMidnight"
  | "staffOffShift";
```

Notice that Denied is not a single bucket. Different denial reasons may require different audit logs, different error messages, different metrics. The granularity you choose here is a design decision. Get it wrong and you will be back to proliferating states later.

Then write a function whose only job is to identify the state. No side effects. No entry logic. Just classification.

```typescript
function classifyEntry(input: EntryInputV5): EntryState {
  if (input.isVip && input.beforeMidnight) {
    return { kind: "VipActive" };
  }

  if (input.isVip && !input.beforeMidnight) {
    return { kind: "Denied", reason: "vipAfterMidnight" };
  }

  if (input.isStaff && input.onShift) {
    return { kind: "StaffOnDuty" };
  }

  if (input.isStaff && !input.onShift) {
    return { kind: "Denied", reason: "staffOffShift" };
  }

  if (input.restrictedEvent && input.age < 18) {
    return { kind: "Denied", reason: "restrictedEvent" };
  }

  if (input.age >= 18) {
    return { kind: "AdultNormalEvent" };
  }

  if (input.hasGuardian) {
    return { kind: "MinorWithGuardianNormalEvent" };
  }

  return { kind: "Denied", reason: "underage" };
}
```

Now control flow becomes linear.

```typescript
export function handleEntryExplicit(input: EntryInputV5): void {
  const state = classifyEntry(input);

  switch (state.kind) {
    case "VipActive":
    case "StaffOnDuty":
    case "AdultNormalEvent":
    case "MinorWithGuardianNormalEvent":
      allowEntry(input);
      return;
    case "Denied":
      denyEntry(input, state.reason);
      return;
  }
}
```

You decide the situation once. From that point on, the code assumes it is true.

There is something else happening here that is easy to miss. TypeScript's exhaustiveness checking means that if you add a new state to `EntryState` and forget to handle it in the switch, the compiler will tell you. This is not a minor convenience. It means the type system is now tracking your state machine. Add a state, and every place that consumes it must account for it, or the code will not compile.

## Testing changes completely

Once state identification is isolated, you can test it exhaustively.

You can test that given an input, the correct state is produced. That test has no side effects and no mocks. It is pure: input in, state out.

You can separately test that for a given state, the correct function is called. That test answers a very specific question: are we selecting the right behavior for this situation?

Those tests are fundamentally different from tests that verify what happens when allowEntry runs. Those focus on logs, metrics, events, and persistence. Separating these concerns makes tests smaller, clearer, and far more trustworthy. When a test fails, you know which concern broke.

## When the meaning of a state changes

Take VIP access. Today it lasts until midnight. Tomorrow it lasts until 1 AM. Or it lasts longer for certain events.

If that meaning is encoded through scattered conditionals, you hunt. You patch. You hope you found them all. If it is encoded in one place, you change it once. Everything downstream either still works or fails loudly.

The important point is not whether any particular decision was right or wrong. It's that even well-reasoned, intentional decisions increase the number of situations the code must handle. When state remains implicit, each new situation makes the code harder to read. When state is explicit, each new situation is just another case.

## Where this pattern has limits

This example is stateless. You classify once, act once, and you're done. The pattern works cleanly because there are no transitions. There's no "what can happen next from here?"

Many systems are not like this. A user session, a payment flow, an order lifecycle, these have state that persists and changes over time. The question shifts from "which bucket does this input fall into?" to "what transitions are valid from here?"

Explicit state still helps in those cases, perhaps even more so, but the classification function becomes a transition function, and you need to think carefully about where state lives and who is allowed to change it, but that's a different conversation.

But even in simpler cases like this one, making the state explicit is a significant win. It turns a tangle of conditions into a named vocabulary. It makes the compiler an ally. It separates "what situation are we in?" from "what do we do about it?"

## The turning point

The point isn't to refactor every conditional into a state machine.

It's to notice when you're approaching a threshold. There's usually a moment, right before adding one more case, where you can feel that the code won't absorb this change gracefully. The structure that carried you this far is about to start working against you.

That's the moment to stop and ask: is this still extensible? Or am I about to turn this clean path into a knot? 

The skill isn't knowing the pattern. It's recognizing when you need it.

## The point of all this

This is a way to organize code. Nothing more.

It is about reducing the mental effort required to read, change, and trust your own code. It is about keeping your peace of mind as a maintainer. Implicit state machines emerge whether you want them to or not. Most sufficiently complex conditionals have one hiding inside.

Naming them does not add complexity. It contains it.

And that is often the difference between code that merely works and code you can confidently maintain after the tenth change.
