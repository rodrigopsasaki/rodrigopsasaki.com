---
title: "Simple is not Easy"
description: "Why we choose familiar complexity over unfamiliar simplicity, and why that's killing our systems"
date: "2025-01-09"
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

A monolithic Express app with 100 services intertwined through middleware and decorators? That's easy. You know Express. Your team knows Express. There's an npm package for everything.

A single function that takes data, validates it, transforms it, and returns a result? That's simple. But it's not easy. It's unfamiliar. Where are the classes? Where's the dependency injection? Where's the abstraction layer?

So we choose the easy thing. And then we spend the next five years fighting the complexity we invited in.

## Braiding vs Composing

When you braid things together, you create a new *thing*. The strands lose their individual identity. Try to pull one strand out, and the whole braid falls apart.

When you compose things, each piece remains itself. You can replace one piece without touching the others. You can understand one piece without understanding all pieces.

Most software braids.

```typescript
class UserService {
  constructor(
    private db: Database,
    private cache: Cache,
    private events: EventBus,
    private logger: Logger,
    private config: Config
  ) {}
  
  async createUser(data: UserData) {
    const user = await this.db.transaction(async (trx) => {
      const created = await trx.insert('users', data);
      await this.cache.invalidate(`users:*`);
      await this.events.emit('user.created', created);
      this.logger.info('User created', { id: created.id });
      return created;
    });
    return user;
  }
}
```

Five concerns. Braided. You can't understand user creation without understanding transactions, caching strategies, event schemas, and logging formats.

Here's composition:

```typescript
// Create user
const user = await createUser(data);

// Then invalidate
await invalidateUserCache();

// Then notify
await emitUserCreated(user);

// Then log
logUserCreated(user);
```

"But what if one fails?" you ask.

Good. Let it fail. Handle it where it matters. Don't braid error handling into every operation.

Here's a pipe that embraces failure:

```typescript
// Simple pipe - each step can fail independently
async function processUser(userData: unknown) {
  const user = await createUser(userData);        // Throws on validation error
  await invalidateUserCache();                    // Throws on cache error  
  await emitUserCreated(user);                    // Throws on event bus error
  logUserCreated(user);                          // Throws on logging error
  return user;
}

// Handle it at the boundary
try {
  const user = await processUser(request.body);
  response.json({ user });
} catch (error) {
  if (error instanceof ValidationError) {
    response.status(400).json({ error: error.message });
  } else {
    // Cache failed? Event failed? Log failed? 
    // The user was still created. That's what matters.
    response.status(500).json({ error: 'Something went wrong' });
  }
}
```

Each operation has one job. When it can't do its job, it fails fast. The caller decides what failure means.

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