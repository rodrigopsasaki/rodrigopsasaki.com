---
title: "Building Simple Systems"
description: "Start with constraints, not features. A case study in how a simple queue became a complex monster."
date: "2025-01-12"
tags: ["simplicity", "architecture", "case-study", "design"]
author: "Rodrigo Sasaki"
series: "simplicity"
seriesOrder: 4
visible: false
---

Let me tell you about a queue that didn't stay a queue.

This is a real system. I was there. I watched it grow from simple to complex. I participated in its destruction.

This is how we fail.

## Day 1: A Simple Queue

The requirement: "Build a take-a-number system for a government office."

The solution:

```typescript
class Queue<T> {
  private items: T[] = [];

  enqueue(item: T): void {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  peek(): T | undefined {
    return this.items[0];
  }

  get length(): number {
    return this.items.length;
  }
}
```

Simple. Clean. Wrong.

But we didn't know that yet.

## Week 2: The First Compromise

"Some visitors need priority. Elderly, disabled, pregnant women."

We could have said: "That's not a queue. That's a priority queue. Different thing."

We didn't.

```typescript
interface Ticket {
  number: number;
  priority: boolean;
  timestamp: Date;
}

class SmartQueue extends Queue<Ticket> {
  dequeue(): Ticket | undefined {
    // First, try priority tickets
    const priorityIndex = this.items.findIndex(t => t.priority);
    if (priorityIndex !== -1) {
      return this.items.splice(priorityIndex, 1)[0];
    }
    // Then normal queue behavior
    return super.dequeue();
  }
}
```

We called it SmartQueue. 

"Smart" is a code smell.

## Month 2: The Policy Infection

"Different counters serve different purposes. Counter 1 is priority only. Counter 2 alternates. Counter 3 is standard only."

We could have built three queues. We didn't.

```typescript
class PolicyAwareQueue extends SmartQueue {
  dequeueFor(counter: Counter): Ticket | undefined {
    switch(counter.type) {
      case 'priority-only':
        return this.items.find(t => t.priority);
      
      case 'standard-only':
        return this.items.find(t => !t.priority);
      
      case 'alternating':
        const shouldTakePriority = counter.lastServed !== 'priority';
        if (shouldTakePriority) {
          const ticket = this.items.find(t => t.priority);
          if (ticket) {
            counter.lastServed = 'priority';
            return ticket;
          }
        }
        counter.lastServed = 'standard';
        return this.items.find(t => !t.priority);
    }
  }
}
```

The queue now knows about counters. The counter knows about the queue. They're complected.

## Month 3: The State Explosion

"If someone doesn't respond after 3 calls, skip them. But keep their ticket for complaints."

```typescript
interface Ticket {
  number: number;
  priority: boolean;
  timestamp: Date;
  status: 'waiting' | 'called' | 'serving' | 'completed' | 'skipped';
  callCount: number;
  lastCalledAt?: Date;
  skippedReason?: string;
}

class StatefulQueue extends PolicyAwareQueue {
  private called: Map<number, Ticket> = new Map();
  private skipped: Ticket[] = [];
  
  call(ticket: Ticket): void {
    ticket.callCount++;
    ticket.lastCalledAt = new Date();
    ticket.status = 'called';
    
    if (ticket.callCount >= 3) {
      ticket.status = 'skipped';
      ticket.skippedReason = 'No response after 3 calls';
      this.skipped.push(ticket);
      this.removeTicket(ticket);
    } else {
      this.called.set(ticket.number, ticket);
    }
  }
  
  acknowledge(ticketNumber: number): void {
    const ticket = this.called.get(ticketNumber);
    if (ticket) {
      ticket.status = 'serving';
      this.called.delete(ticketNumber);
    }
  }
}
```

We no longer have a queue. We have a distributed state machine pretending to be a queue.

## Month 6: The Collapse

The system now has:
- 7 ticket states
- 4 counter types
- 3 priority levels (we added 'urgent')
- 5 department routing rules
- Batch processing for families
- Transfer between departments
- Appointment scheduling integration
- SMS notifications
- Analytics tracking
- Holiday mode
- Emergency override
- VIP lane
- Complaint tracking

The original Queue class? Still there. Buried under 2,000 lines of policy code.

## What We Should Have Built

We should have recognized: we're not building a queue. We're building a ticket routing system.

```typescript
// What it IS, not how it WORKS
interface TicketingSystem {
  issueTicket(visitor: Visitor): Ticket;
  nextTicketFor(counter: Counter): Ticket | null;
  acknowledgeTicket(ticket: Ticket): void;
  completeTicket(ticket: Ticket): void;
}

// Each policy is explicit and separate
interface SelectionPolicy {
  selectNext(tickets: Ticket[], counter: Counter): Ticket | null;
}

// State is explicit
type TicketState = 
  | { type: 'waiting' }
  | { type: 'called'; counter: Counter; timestamp: Date }
  | { type: 'serving'; counter: Counter }
  | { type: 'completed'; timestamp: Date }
  | { type: 'abandoned'; reason: string };

// The queue is just storage
class TicketStore {
  private tickets: Map<string, Ticket> = new Map();
  
  add(ticket: Ticket): void {
    this.tickets.set(ticket.id, ticket);
  }
  
  findByState(state: TicketState['type']): Ticket[] {
    return Array.from(this.tickets.values())
      .filter(t => t.state.type === state);
  }
}
```

Separate concerns. Explicit state. Composable policies. No magic.

## The Constraint-First Approach

Start with what the system CANNOT do:

1. **A ticket can only be in one state** - Not "waiting but also called"
2. **A counter serves one ticket at a time** - Not "processing multiple unless..."
3. **Time moves forward** - No retroactive changes
4. **Decisions are final** - No undo, only new decisions

These constraints become your architecture.

## The Power of Saying "That's Not What This Does"

When they asked for priority handling, we should have said:
"A queue doesn't have priorities. You want a priority queue. That's a different thing."

When they asked for counter-specific behavior, we should have said:
"The queue doesn't know about counters. You want a router. That's a different thing."

When they asked for state tracking, we should have said:
"A queue doesn't track state. You want a state machine. That's a different thing."

Each time we said yes, we made the queue less of a queue and more of a everything-machine.

## Building Simple: The Rules

1. **Name things what they are**, not what you hope they'll become
2. **One thing does one thing**. Need two things? Build two things.
3. **Constraints are features**. "It doesn't do that" is a valid response.
4. **Explicit over implicit**. If there are 5 states, show 5 states.
5. **Composition over configuration**. Different behavior = different component.
6. **Say no by default**. Every yes is debt.

## The Real Cost

That government office system? It's still running. 

It takes a team of 5 to maintain it.
It has 47 configuration flags.
It has a 200-page manual.
It crashes twice a month.

The simple version would have been 500 lines of code. The complex version is 50,000.

The simple version would have taken a month to build. The complex version took two years and is never "done."

## The Lesson

Complexity isn't added. It's allowed.

Every time you add "just one more feature" to something that shouldn't have it, you're not extending it. You're corrupting it.

A queue that does more than queue operations isn't a better queue. It's a broken queue and a broken everything else.

Build simple things. Compose them. Let each thing be itself.

That's how you build systems that last.

---

## What's Next?

This series explored why simplicity matters and how we destroy it. But there's a deeper problem: we often don't know what we're building until we've built the wrong thing.

The next post will explore the difference between modeling (deciding what something is) and implementing (deciding how it works), and why confusing the two leads to systems that can't be fixed, only replaced.

Stay tuned for: **"Modeling is Not Implementing"**