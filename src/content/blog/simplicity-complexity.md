---
title: "Complexity is the Enemy of Reliability"
description: "Why you can't test your way to correctness and why reliable systems are boring systems"
date: "2025-01-10"
tags: ["simplicity", "reliability", "testing", "architecture"]
author: "Rodrigo Sasaki"
series: "simplicity"
seriesOrder: 1
visible: false 
---

There's a lie we tell ourselves: "We handle complexity well."

We don't.

We handle complexity with tests. With monitoring. With runbooks. With heroics at 3 AM.

That's not handling complexity. That's living with it.

## The State Space Problem

Here's a simple state machine with 3 states:

```typescript
type State = "pending" | "processing" | "complete";
```

Three states. Easy to reason about. Easy to test.

Now add error handling:

```typescript
type State = "pending" | "processing" | "complete" | "failed";
```

Four states. Still manageable.

Now add retry logic:

```typescript
type State = "pending" | "processing" | "complete" | "failed" | "retrying";
```

But wait. Can you retry from failed? From processing? What about complete? Suddenly you don't have 5 states. You have 5 states times the number of valid transitions.

Now add concurrent processing:

```typescript
type State = "pending" | "processing" | "complete" | "failed" | "retrying" | "processing_batch";
```

And partial failures:

```typescript
type State = "pending" | "processing" | "complete" | "failed" | "retrying" | "processing_batch" | "partially_complete";
```

Seven states? No. You have 7^n states where n is the number of concurrent operations.

**You cannot test this.**

## Every Conditional is a Fork

```typescript
function processPayment(payment: Payment) {
  if (payment.amount > 10000) {
    if (payment.currency === 'USD') {
      if (payment.method === 'card') {
        if (payment.fraud_score > 0.7) {
          // Path 1
        } else {
          // Path 2
        }
      } else {
        // Path 3
      }
    } else {
      // Path 4
    }
  } else {
    // Path 5
  }
}
```

Five paths? No. 

Each conditional creates 2^n paths where n is the number of conditions. But that's just the happy path. Add error handling:

```typescript
function processPayment(payment: Payment) {
  try {
    if (payment.amount > 10000) {
      try {
        if (payment.currency === 'USD') {
          // ...
        }
      } catch (e) {
        // More paths
      }
    }
  } catch (e) {
    // Even more paths
  }
}
```

Now you have 2^n * 2^m paths where m is the number of catch blocks.

This is why your payment system fails in production in ways you've never seen in tests.

## The Myth of Coverage

"We have 100% test coverage!"

Cool. You've tested 100% of the lines. Have you tested 100% of the states? 100% of the transitions? 100% of the race conditions?

A system with 10 boolean flags has 2^10 = 1,024 possible states.

A system with 10 integer counters (0-100) has 100^10 = 10^20 possible states.

Your tests cover maybe 50 states. On a good day.

## Why Reliable Systems are Boring

Look at the most reliable systems you know. Postgres. Redis. SQLite.

They're boring.

Postgres doesn't try to be a message queue. Redis doesn't try to be a SQL database. SQLite doesn't try to be distributed.

They do one thing. They do it well. They do it the same way every time.

Boring is reliable. Exciting is broken at 3 AM.

## The Complexity Budget

You have a complexity budget. It's not infinite.

Every feature you add, every edge case you handle, every "just in case" you code - it all comes from the same budget.

Spend it on accidental complexity (how you build) and you have none left for essential complexity (what you build).

Here's a payment processor that spent its budget on the wrong things:

```typescript
class PaymentProcessor {
  async process(payment: Payment) {
    // Accidental complexity: retry logic mixed with business logic
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // Accidental complexity: caching mixed with processing
        const cached = await this.cache.get(payment.id);
        if (cached) return cached;
        
        // Accidental complexity: feature flags mixed with core logic
        if (this.features.isEnabled('new_fraud_check')) {
          // Essential complexity: actual fraud checking
          await this.checkFraud(payment);
        }
        
        // Accidental complexity: metrics mixed with business logic
        const timer = this.metrics.startTimer();
        const result = await this.provider.charge(payment);
        timer.end();
        
        return result;
      } catch (e) {
        // Accidental complexity: retry logic again
        if (attempt === 2) throw e;
        await this.sleep(attempt * 1000);
      }
    }
  }
}
```

Every line that isn't `await this.provider.charge(payment)` is complexity spent on the wrong thing.

## Simple Fails Simply

When a simple system fails, you know why:

```typescript
function divide(a: number, b: number): number {
  if (b === 0) throw new Error("Division by zero");
  return a / b;
}
```

One failure mode. One error message. One fix.

When a complex system fails:

```
Error: Cannot read property 'id' of undefined
  at PaymentProcessor.process (/app/src/payment.ts:47:23)
  at async RetryableQueue.handle (/app/src/queue.ts:182:11)
  at async EventEmitter.emit (/app/src/events.ts:94:7)
  at async CacheManager.invalidate (/app/src/cache.ts:234:19)
```

Four systems involved. Which one failed? Why? Good luck.

## The Reliability Formula

Reliability = 1 / Complexity^2

Double the complexity, quarter the reliability.

This isn't a metaphor. It's math.

If component A has reliability 0.99 and component B has reliability 0.99:
- A OR B (redundant): 0.9999 reliability
- A AND B (required): 0.9801 reliability

Add component C (0.99):
- A AND B AND C: 0.970299 reliability

Ten components at 0.99 reliability each:
- All required: 0.904 reliability

That's one failure every 10 operations. From components that each fail once in 100.

## The Simple Path to Reliability

1. **Do less**. Every feature you don't build can't break.
2. **Separate concerns**. When the cache dies, the business logic should survive.
3. **Fail fast**. Don't retry. Don't recover. Just fail and let something else handle it.
4. **Make state explicit**. If you have 5 states, have 5 states. Not 3 states and 2 flags.
5. **Choose boring**. Boring has been debugged. Exciting has not.

## The Test of Time

Complex systems don't survive contact with reality.

They get patched. Extended. Worked around. Until someone says "we need to rewrite this" and the cycle begins again.

Simple systems survive decades.

`grep` was written in 1973. Still works.
`make` was written in 1976. Still works.
`vi` was written in 1976. Still works.

Not because they're perfect. Because they're simple.

They do one thing. They do it well. They don't pretend to do more.

## The Bottom Line

You want reliability? Stop adding features. Start removing complexity.

You can't test quality in. You can't monitor reliability in. You can't document your way to correctness.

You can only design it in. From the start. By choosing simple.

Even when simple is harder.

Especially when simple is harder.

---

Next: [Episode 3: The Complecting Machine →](/blog/simplicity/complecting)