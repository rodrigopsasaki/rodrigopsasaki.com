---
title: "Know where you are before you decide where to go"
description: "Why identifying state and acting on it should be two separate operations"
date: "2026-04-07"
tags: ["simplicity", "state machines", "typescript", "software design", "maintainability"]
author: "Rodrigo Sasaki"
visible: true
---

It's 4 AM. A 14-year-old is at an adult party. Someone needs to explain how this happened.

"Well sir, `if (age < 18 && isAccompaniedByGuardian && timeHour < 2)` all checked out. I'm not sure why he's here. It worked fine when I tested it."

No one would accept this explanation. Not because the logic is wrong, but because the framing is wrong. A bouncer doesn't evaluate three conditions and then decide. A bouncer reads the situation. It's late. It's a kid. This is over. The state is obvious: **this person should not be here**. The action follows from that recognition, not from a chain of booleans.

But in code, we write the bouncer as a conditional chain. And when the chain is wrong, we debug the chain. We almost never stop and ask: why is this function making sixty micro-decisions instead of identifying one situation and acting on it?

## Two things pretending to be one

Here is a payment function. It's simplified, but the structure is real. You've seen this before.

```typescript
function processOrder(order: Order): void {
  if (
    order.isPaid &&
    !order.isCancelled &&
    order.items.length > 0 &&
    order.shippingAddress != null
  ) {
    chargePayment(order);
    sendConfirmationEmail(order);
    notifyWarehouse(order);
  } else if (order.isPaid && order.isCancelled) {
    issueRefund(order);
  } else if (!order.isPaid && !order.isCancelled) {
    sendPaymentReminder(order);
  } else {
    logUnexpectedState(order);
  }
}
```

This function is doing two things at once and pretending it's one.

First, it figures out what situation the order is in. Then, it acts on that situation. Both happen inside the same conditional structure. The classification and the commitment are fused together, and there is no seam between them.

This matters because they have very different properties. Identifying a state is safe. You can do it ten times and nothing changes. But calling `chargePayment` is a commitment. The money moves. The email sends. The warehouse starts packing. These are not the same kind of operation, and they should not live in the same block of logic.

## What happens when they're fused

Imagine you need to add a new condition. Orders over $500 require manual approval before payment.

You go to the function. You find the right branch. You add `&& order.total <= 500` to the first condition and write a new branch for the high-value case. You test it. It works.

Three months later someone adds international shipping rules. Six months after that, there's a fraud check. Each change touches the same conditional chain, and each change is a few characters away from charging someone who shouldn't be charged, or not charging someone who should be.

No one refactors it. The branches keep growing. And every branch still ends with an irrevocable action.

This is the real cost. Not that the code is ugly. Not that it's hard to read. The cost is that you cannot modify the classification logic without risking the side effects. Every time you touch a condition, you're one misplaced parenthesis away from issuing a refund that shouldn't happen or sending a confirmation for an order that isn't ready.

## Pull them apart

```typescript
type OrderState =
  | { status: "ready_to_ship" }
  | { status: "cancelled_needs_refund" }
  | { status: "awaiting_payment" }
  | { status: "awaiting_approval"; reason: string }
  | { status: "invalid"; reason: string };

function classifyOrder(order: Order): OrderState {
  if (order.isPaid && order.isCancelled) {
    return { status: "cancelled_needs_refund" };
  }

  if (!order.isPaid && !order.isCancelled) {
    return { status: "awaiting_payment" };
  }

  if (order.isPaid && order.items.length === 0) {
    return { status: "invalid", reason: "paid order with no items" };
  }

  if (order.isPaid && order.shippingAddress == null) {
    return { status: "invalid", reason: "paid order with no shipping address" };
  }

  if (order.isPaid && order.total > 500) {
    return { status: "awaiting_approval", reason: "high value order" };
  }

  return { status: "ready_to_ship" };
}
```

This function does nothing. It changes nothing. It sends no emails, moves no money, notifies no one. It looks at an order and tells you what situation it's in. You can call it a thousand times and the world stays exactly as it was.

But something else happened here, and it's easy to miss.

Look at the original version. To review it, you had to ask: "is `order.isPaid && !order.isCancelled && order.items.length > 0 && order.shippingAddress != null` correct?" That's a logic puzzle. You're simulating boolean algebra in your head, checking operators and parentheses. The question has no connection to the business. It's pure syntax.

Now look at the named version. The question becomes: "is this what defines `ready_to_ship`?"

That's a completely different kind of thinking. You're no longer verifying logic. You're challenging a definition. And suddenly your domain knowledge activates. You stop parsing and start asking real questions: "Wait, can an order be ready to ship without a fraud check? Shouldn't we verify inventory first?"

You can ask these questions without reading the conditions at all. Just from the name.

This isn't about making code easier to read. It's about changing what kind of cognition the reader uses. From logical verification to semantic challenge. And humans are dramatically better at the second one.

Now the action side:

```typescript
function executeOrder(state: OrderState, order: Order): void {
  switch (state.status) {
    case "ready_to_ship":
      chargePayment(order);
      sendConfirmationEmail(order);
      notifyWarehouse(order);
      break;
    case "cancelled_needs_refund":
      issueRefund(order);
      break;
    case "awaiting_payment":
      sendPaymentReminder(order);
      break;
    case "awaiting_approval":
      flagForReview(order, state.reason);
      break;
    case "invalid":
      logUnexpectedState(order, state.reason);
      break;
  }
}
```

And the call site:

```typescript
function processOrder(order: Order): void {
  const state = classifyOrder(order);
  executeOrder(state, order);
}
```

The classification is pure. The execution is a simple dispatch on a known, finite set of states. They change for different reasons, they break for different reasons, and they are tested for different reasons.

## Test what you mean

Here is what tests look like when classification and action are fused:

```typescript
it("should charge payment and send email when order is paid, not cancelled, has items, and has a shipping address", () => {
  // ...
});
```

This test is asserting the classification and the action at the same time. When it breaks, you don't know if the problem is in how the state was identified or in what happened afterward. And as conditions accumulate, the test name turns into a paragraph.

Now here is what tests look like when they're separated:

```typescript
// Classification tests
it("should classify a valid paid order as ready_to_ship", () => {
  const state = classifyOrder(validPaidOrder);
  expect(state.status).toBe("ready_to_ship");
});

it("should classify a paid and cancelled order as cancelled_needs_refund", () => {
  const state = classifyOrder(paidCancelledOrder);
  expect(state.status).toBe("cancelled_needs_refund");
});

it("should classify a high-value paid order as awaiting_approval", () => {
  const state = classifyOrder(highValueOrder);
  expect(state.status).toBe("awaiting_approval");
});

// Action tests
it("should charge payment and notify warehouse when ready_to_ship", () => {
  executeOrder({ status: "ready_to_ship" }, order);
  expect(chargePayment).toHaveBeenCalled();
  expect(notifyWarehouse).toHaveBeenCalled();
});

it("should issue refund when cancelled_needs_refund", () => {
  executeOrder({ status: "cancelled_needs_refund" }, order);
  expect(issueRefund).toHaveBeenCalled();
});
```

The classification tests don't need mocks. No side effects, no spies, no setup beyond the input. They are pure functions with pure tests.

The action tests don't need complex inputs. They start from a known state and verify the right things happen. They don't care how you got to that state.

When the high-value approval rule changes next quarter, you change `classifyOrder` and its tests. You don't touch the action tests. They still pass because `awaiting_approval` still means the same thing. The boundary holds.

## Going is a commitment

The intuition behind all of this is simple but easy to forget.

Figuring out where you are is free. You can look around as many times as you want. Nothing changes. No one gets charged. No email goes out.

Deciding where to go is a commitment. Once you step through that door, you're on the other side. The payment clears. The warehouse ships. The state of the world is different now, and you can't always undo it.

When these two operations are tangled together, every change to how you look around risks accidentally stepping through a door. And that's not a theoretical risk. That's a 4 AM incident. That's a double charge. That's the kind of bug that doesn't show up in staging because the conditions were just different enough.

Pull them apart. Know where you are. Then decide where to go.
