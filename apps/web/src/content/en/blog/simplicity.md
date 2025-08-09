---
title: "Simplicity is not a dispensable luxury"
description: "Why we choose familiar complexity over unfamiliar simplicity, and why that's killing our systems"
date: "2025-08-09"
tags: ["simplicity", "architecture", "philosophy", "software design"]
author: "Rodrigo Sasaki"
series: "simplicity"
seriesOrder: 0
visible: true  
---

Have you ever wondered how telecom systems work? 

They're ancient by our standards. Written in Erlang. Running on principles from the 1980s. And they work so beautifully that you never think about them. When did you last worry that your call wouldn't connect? That the phone network would be "down for maintenance"?

That's real software engineering.

Ericsson's `AXD301` switch, built with Erlang, achieved `99.9999999%` uptime <sup>[[1]](#ref1)</sup>. Nine nines! That's 31 milliseconds of downtime per year. If you're actively working on a system, how many times has it crashed this year? Or this week? 

Why does their ancient tech work while our modern systems need constant babysitting?

They chose simple. We often choose easy.

## Nothing New Under the Sun

I'm not telling you anything new here. This is old wisdom. Battle-tested principles. The kind of boring truth that's been true since Dijkstra was writing about simplicity in the 1970s.

I grew up on Rich Hickey's talks. "Simple Made Easy" <sup>[[2]](#ref2)</sup> fundamentally changed how I think about software. If what follows feels familiar, it should. These aren't my ideas, I'm just another engineer who finally understood the wisdom in these teachings.

The tragedy is that every generation of programmers needs to rediscover these truths. Usually after building something so complex it collapses under its own weight.

## The Psychological Trap

We argue about microservices vs monoliths. REST vs GraphQL. Postgres vs Mongo. And that's all well and good, but we're missing one very real question: why is everything we build so damn complicated?

The answer isn't technical. It's psychological.

We choose complexity because it feels easier.

## The Seduction of the Familiar

Simple means one thing does one thing. One role. One concept. One reason to change.

Easy means it's familiar. It's what we know. It's what's at hand.

These are not the same thing.

Want to store user data? The easy choice: use an ORM. Your team knows ORMs. There's documentation. There are tutorials. It handles relationships, migrations, caching, validation, serialization. It's a complete solution.

The simple choice? A data structure and a few functions:

```typescript
// Simple: just data
type User = {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

// Simple: functions that do one thing  
function saveUser(user: User): Promise<User>
function findUser(id: string): Promise<User | null>
function updateUser(id: string, changes: Partial<User>): Promise<User>
```

But this feels wrong to object-oriented minds. Where's the encapsulation? Where's the Active Record pattern? Where are all the conveniences?

So we choose the ORM. And then we spend years fighting N+1 queries, debugging lazy loading, wrestling with circular imports, and explaining to new developers why `user.posts` sometimes loads data and sometimes doesn't.

Simple felt too bare. Easy felt complete. But easy was hiding enormous complexity.

## Braiding vs Composing

When you braid things together, you create a new *thing*. The strands lose their individual identity. Try to pull one strand out, and the whole braid falls apart.

When you compose things, each piece remains itself. You can replace one piece without touching the others. You can understand one piece without understanding all pieces.

Here's why this matters in practice.

Your startup processes payments. Version 1 is braided:

```typescript
class PaymentProcessor {
  async processPayment(paymentData: PaymentRequest) {
    // Validate card
    if (!this.isValidCard(paymentData.card)) {
      await this.logFailure('invalid_card', paymentData);
      await this.updateUserRiskScore(paymentData.userId, +10);
      await this.sendFailureEmail(paymentData.userId, 'invalid_card');
      throw new Error('Invalid card');
    }

    // Check for fraud
    const riskScore = await this.calculateRisk(paymentData);
    if (riskScore > 70) {
      await this.logFailure('high_risk', paymentData);
      await this.updateUserRiskScore(paymentData.userId, +20);
      await this.flagForReview(paymentData);
      await this.sendFailureEmail(paymentData.userId, 'requires_review');
      throw new Error('Payment flagged for review');
    }

    // Charge card
    const result = await this.chargeCard(paymentData);
    await this.logSuccess('payment_processed', result);
    await this.updateUserRiskScore(paymentData.userId, -5);
    await this.sendReceiptEmail(paymentData.userId, result);
    await this.updateInventory(paymentData.items);
    
    return result;
  }
}
```

Everything is braided together. Validation, fraud detection, charging, logging, risk scoring, emails, inventory. One method, eight responsibilities.

Six months later, your legal team says: "We need to store payment failures for compliance. But only card validation failures. And only for EU customers. And the data needs to be encrypted."

In the braided system, this "simple" change touches everything:
- The validation logic (to detect EU customers)  
- The logging system (to encrypt specific logs)
- The risk scoring (EU rules are different)
- The email system (different templates for EU)
- The database schema (new encrypted storage)
- The error handling (EU-specific error codes)

You'll spend three weeks making sure your change doesn't break the eight other things this method does.

Now imagine the same system composed:

```typescript
// Each piece has one job
const payment = await validateCard(paymentData);
const riskAssessment = await assessFraud(payment);

if (riskAssessment.requiresReview) {
  await flagForManualReview(payment, riskAssessment);
  throw new PaymentError('REQUIRES_REVIEW');
}

const result = await chargeCard(payment);
await recordSuccess(result);
await updateInventory(payment.items);
```

Now that same compliance requirement? Add one line:

```typescript
const payment = await validateCard(paymentData);
await recordComplianceData(payment);  // <- One line
const riskAssessment = await assessFraud(payment);
// ... rest unchanged
```

The compliance function knows about EU customers. The validation function knows about cards. Each function has one reason to change. Your "simple" legal requirement becomes a simple code change.

This is why composition wins. Not because the code looks prettier. Because change becomes surgical instead of systemic.

## The Compound Interest of Complexity

Complexity doesn't add. It multiplies.

Two simple things: A understands A, B understands B.
Two complex things: A understands A and B, B understands B and A.

Add a third thing:
- Simple: C understands C
- Complex: C understands A, B, and C. A now understands C. B now understands C.

By the time you have 10 components, nobody understands anything.

This is why your "simple" feature takes 6 weeks. You're not just building a feature. You're negotiating with the complexity that already exists.

## The Test

Here's how you know if something is simple:

Can you explain it to someone without context?

Not "Can you explain what it does?" Can you explain what it *is*?

- A queue is an ordered list where items leave in the order they arrived
- A cache is a temporary copy of something expensive to compute
- A router is a function that maps paths to handlers

Now try explaining your UserService. "Well, it manages users, but also handles caching, and emits events, and manages transactions..."

That's not simple. That's braided.

## The Hard Truth

Simple is not easy because:

1. **Simple requires thought upfront**. Easy lets you start coding immediately.
2. **Simple looks like less**. Easy looks like more. We're paid to deliver more.
3. **Simple requires saying no**. Easy says yes to everything.
4. **Simple requires discipline**. Easy follows impulse.

But here's what nobody tells you:

Simple systems run for decades. Complex systems get rewritten every three years.

Simple systems can be understood by new engineers in days. Complex systems take months.

Simple systems fail in simple ways. Complex systems fail in ways you can't imagine.

## The Choice

Every time you add a feature, you make a choice:
- Do I create a new simple thing?
- Or do I complicate an existing thing?

Every time you fix a bug, you make a choice:
- Do I fix the root cause?
- Or do I add another conditional?

Every time you design a solution, you make a choice:
- Do I solve exactly this problem?
- Or do I solve this problem and three hypothetical future problems?

Choose simple. Even when it's not easy.

Especially when it's not easy.

---
## References

1. <span id="ref1"></span>[Armstrong, J. (2007). Programming Erlang: Software for a Concurrent World](https://pragprog.com/titles/jaerlang/programming-erlang/) - Joe Armstrong documents the AXD301's nine nines reliability. Also discussed in his [2003 PhD thesis](http://erlang.org/download/armstrong_thesis_2003.pdf), Chapter 1.2
2. <span id="ref2"></span>[Simple Made Easy - Rich Hickey (2011)](https://www.infoq.com/presentations/Simple-Made-Easy/) - The talk that fundamentally changed how many of us think about simplicity vs ease