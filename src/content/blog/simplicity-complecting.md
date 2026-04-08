---
title: "The Complecting Machine"
description: "How we accidentally braid concerns together and why abstractions become lies"
date: "2025-01-11"
tags: ["simplicity", "abstractions", "architecture", "complexity"]
author: "Rodrigo Sasaki"
series: "simplicity"
seriesOrder: 3
visible: false
---

We are complexity factories.

Give us a simple problem, and we'll return a complex solution. Not because we're incompetent. Because we're clever.

Cleverness is the enemy of simplicity.

## The Original Sin: Time and State

Here's a counter:

```typescript
let count = 0;

function increment() {
  count++;
}

function getCount() {
  return count;
}
```

Simple? No. You've just braided time and state together.

What's the value of count? Depends when you ask.
Can two threads increment safely? Depends on your runtime.
Can you test this? Depends on reset mechanisms you haven't built.

Here's actual simplicity:

```typescript
function increment(count: number): number {
  return count + 1;
}
```

No time. No state. No surprises.

"But I need state!" you say. No, you need to track values over time. That's not the same as mutating variables.

## When Abstractions Lie

An abstraction promises to hide complexity. Most abstractions just move it.

```typescript
class Database {
  async save(entity: Entity) {
    // "Don't worry about persistence!"
  }
}
```

This abstraction says: "Just call save(). I'll handle the rest."

But then:
- What if the network is slow?
- What if the entity is already saved?
- What if two saves happen concurrently?
- What if the save partially succeeds?
- What about transactions?
- What about cascading deletes?

The abstraction lied. You still need to know everything about persistence. Now you also need to know how this particular abstraction handles it.

## The Cache That Ate Everything

True story. Names changed to protect the guilty.

Started simple:

```typescript
class Cache {
  private data = new Map();
  
  get(key: string) {
    return this.data.get(key);
  }
  
  set(key: string, value: any) {
    this.data.set(key, value);
  }
}
```

Then: "We need expiration."

```typescript
class Cache {
  private data = new Map();
  private ttls = new Map();
  
  get(key: string) {
    if (this.isExpired(key)) {
      this.data.delete(key);
      return undefined;
    }
    return this.data.get(key);
  }
  
  set(key: string, value: any, ttl?: number) {
    this.data.set(key, value);
    if (ttl) {
      this.ttls.set(key, Date.now() + ttl);
    }
  }
}
```

Then: "We need invalidation patterns."

```typescript
set(key: string, value: any, ttl?: number, tags?: string[]) {
  // Now tracking dependencies
}

invalidateByTag(tag: string) {
  // Now we're a dependency graph
}
```

Then: "We need persistence."
Then: "We need distribution."
Then: "We need consistency guarantees."

Two years later, the simple cache is a distributed state management system with its own query language.

All because we couldn't say: "That's not what a cache does."

## The Seduction of Smart Code

Smart code is code that does more than it says:

```typescript
// "Smart" - does multiple things implicitly
user.save(); // Also sends email, updates cache, logs audit

// Simple - does exactly what it says
saveUser(user);
sendWelcomeEmail(user);
invalidateUserCache(user.id);
logUserAction('created', user.id);
```

Smart code feels efficient. Look how much happens with one line!

Until you need to save without sending email. Or send email without saving. Or debug why emails are being sent twice.

Simple code is verbose. Simple code is obvious. Simple code is debuggable at 3 AM by someone who's never seen it before.

## The Configuration Trap

Configuration is complexity in disguise:

```yaml
service:
  retry:
    enabled: true
    max_attempts: 3
    backoff: exponential
    initial_delay: 100ms
    max_delay: 30s
    jitter: true
  timeout:
    connection: 5s
    request: 30s
    idle: 60s
  circuit_breaker:
    enabled: true
    threshold: 5
    timeout: 60s
```

You haven't removed complexity. You've moved it to YAML.

Now you have two problems:
1. The original complexity
2. The complexity of configuration

Simple doesn't have configuration. Simple has defaults that work:

```typescript
function fetchWithRetry(url: string) {
  // Three attempts, one second apart. Always.
  for (let i = 0; i < 3; i++) {
    try {
      return fetch(url);
    } catch (e) {
      if (i === 2) throw e;
      await sleep(1000);
    }
  }
}
```

Need different behavior? Write a different function. Don't make one function pretend to be ten.

## How We Complect Without Noticing

1. **Convenience functions** that do "just one more thing"
2. **Optional parameters** that change behavior
3. **Inheritance** that couples unrelated concerns
4. **Shared mutable state** that links independent operations
5. **Implicit dependencies** that hide connections
6. **Feature flags** that create parallel realities

Each seems harmless. Together, they create systems where changing anything breaks everything.

## The Untangling

You can't refactor your way out of complection. You have to stop and rethink.

What is this thing? Not what does it do - what IS it?

- A queue is ordered storage with FIFO access
- A cache is temporary storage with fast retrieval
- A logger writes messages to a destination
- A router maps requests to handlers

If your definition includes "and" or "also" or "sometimes", you have two things pretending to be one.

Split them.

## The Discipline of No

Simple requires saying no:

- "Can the cache also...?" No. It's a cache.
- "Can we add a flag to...?" No. Write a new function.
- "What if we need to...?" We don't. YAGNI.
- "But customers want..." They want it to work.

Every yes adds complexity. Every no preserves simplicity.

## The Simple Test

Before you add that feature, that parameter, that configuration:

1. Can you explain the new behavior in one sentence?
2. Does it change any existing behavior?
3. Does it add state?
4. Does it add conditions?
5. Does it couple previously independent things?

Any "yes" is a red flag. Two "yes"es is a stop sign.

## The Path Forward

Stop being clever. Be obvious.
Stop being flexible. Be specific.
Stop being comprehensive. Be complete.

Write code that does one thing. Name it what it does. Make it do exactly that.

No surprises. No magic. No cleverness.

Just simple, boring, reliable code that anyone can understand.

---

Next: [Episode 4: Building Simple Systems →](/blog/simplicity/building-simple)