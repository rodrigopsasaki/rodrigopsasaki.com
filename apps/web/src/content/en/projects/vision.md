---
title: "Vision"
description: "A structured observability framework for Node.js that treats production monitoring as a first-class citizen, not an afterthought."
tags: ["TypeScript", "Observability", "Node.js", "Monitoring", "Production", "Framework"]
github: "https://github.com/rodrigopsasaki/vision"
featured: true
visible: true
order: 2
---

# Vision: Structured Observability for Node.js

> Structured observability, modeled around intent, not output.

Vision is a structured observability framework for Node.js applications that treats production monitoring as a first-class citizen, not an afterthought.

## What is Vision?

You don't need more logs, you need **context**.

You need to know:
- What just happened
- What data was involved  
- What the outcome was

But most systems log like this:

```typescript
console.log("starting payment processing");
console.log("loaded payment", paymentId);
console.log("charging card", amount);
console.log("done", { status: "success" });
```

This tells a story, but it's whispering. No IDs. No continuity. Just bursts of text into the void.

**Vision fixes this by giving you structured context instead of scattered logs.**

## Vision Core - Getting Started

Install the core package first:

```bash
npm install @rodrigopsasaki/vision
```

Vision works without any configuration. Here's your first example:

```typescript
import { vision } from '@rodrigopsasaki/vision';

await vision.observe('payment.process', async () => {
  vision.set('payment_id', 'pay_123');
  vision.set('amount', 2500); // $25.00
  
  // Your business logic here
  const result = await processPayment();
  vision.set('charge_id', result.id);
  vision.set('status', 'completed');
});
```

That's it. No setup. No boilerplate. Vision runs with a default console exporter out of the box.

This produces a clean canonical event:

```json
{
  "name": "payment.process",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "data": {
    "payment_id": "pay_123",
    "amount": 2500,
    "charge_id": "ch_abc123",
    "status": "completed"
  }
}
```

## Core Concepts & Examples

### Working with Context

Vision gives you simple tools to build rich context:

```typescript
// Set simple values
vision.set('user_id', 'u123');
vision.set('operation', 'checkout');

// Build arrays
vision.push('events', 'cart_loaded');
vision.push('events', 'payment_processed');

// Build objects
vision.merge('metadata', { version: '1.2.3' });
vision.merge('metadata', { region: 'us-east-1' });

// Retrieve values
const userId = vision.get('user_id'); // 'u123'
```

Everything you set is scoped to the active `observe()` block. Accessing context outside that block throws by design.

### Real-World Example

Here's what Vision looks like in real code:

```typescript
await vision.observe('order.fulfillment', async () => {
  vision.set('user_id', user.id);
  vision.set('order_id', order.id);

  await fulfillOrder(order);
});

// fulfillment.ts - Notice: no context passing needed
async function fulfillOrder(order) {
  await pickItems(order);
  await packItems(order);
  await shipOrder(order);
}

async function pickItems(order) {
  // ...picking logic...
  vision.push('events', 'picked');
}

async function packItems(order) {
  // ...packing logic...
  vision.push('events', 'packed');
  vision.merge('dimensions', { weight: '2.1kg' });
}

async function shipOrder(order) {
  // ...shipping logic...
  vision.push('events', 'shipped');
  vision.merge('shipment', {
    carrier: 'DHL',
    tracking: 'abc123',
  });
}
```

You don't pass context around. You don't log manually. You just describe what happened.

Vision collects it and then emits exactly one event:

```json
{
  "name": "order.fulfillment",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "data": {
    "user_id": "user123",
    "order_id": "ord456",
    "events": ["picked", "packed", "shipped"],
    "dimensions": { "weight": "2.1kg" },
    "shipment": { "carrier": "DHL", "tracking": "abc123" }
  }
}
```

### Custom Exporters

By default, Vision logs to the console. But you can register your own exporters:

```typescript
vision.init({
  exporters: [
    {
      name: 'datadog',
      success: (ctx) => sendToDatadog(ctx),
      error: (ctx, err) => sendErrorToDatadog(ctx, err),
    },
  ],
});
```

## Integrations

Vision integrates seamlessly with your existing stack through our growing ecosystem of framework integrations, data layer connectors, and exporters.

**Web Frameworks**: Express.js, Fastify, Koa, NestJS
**Data Layer**: Prisma ORM
**Exporters**: Datadog (with OpenTelemetry compliance)

Browse the complete integration ecosystem using the navigation menu when viewing any integration page. Each integration includes comprehensive examples, configuration variants, and production deployment patterns.

## Why Vision Works

**Minimal Overhead**: Vision is designed to be lightweight. Contexts are just objects with metadata. No heavy instrumentation or performance impact.

**Natural Integration**: It doesn't change how you write code, it enhances it. The framework-specific integrations feel natural and make your code more readable.

**Powerful Insights**: Because every operation is wrapped and enriched with context, you get incredibly detailed traces that tell the complete story of what happened.

**Production Safety**: Built-in features like circuit breakers, retries, and security redaction mean you can trust it in production from day one.

**Flexible Architecture**: The exporter system means you can send data anywhere: multiple destinations, custom transformations, different formats.

## Quick Start

Ready to add structured observability to your application? 

1. Install Vision core: `npm install @rodrigopsasaki/vision`
2. Choose your framework integration from the ecosystem menu
3. Follow the comprehensive setup guide for your specific framework

Each integration provides zero-configuration setup, multiple deployment patterns, and production-ready examples.

## The Bigger Picture

We're not trying to reinvent observability. There are fantastic tools out there like Datadog, New Relic, Honeycomb and Jaeger. What we're trying to do is make it easier to get high-quality data into those tools.

Vision is our best attempt at solving a problem we've faced repeatedly: **how do you build applications that are observable by design?** It's not perfect, and it's not magic. It's just what we've learned works well for building systems you can understand and debug.

If you're building Node.js applications that need to work reliably in production, give Vision a try. Start small: choose your framework integration, add an exporter, see what insights you get. We think you'll find it makes debugging and understanding your systems significantly easier.

## Acknowledgments

Special thanks to [Ryan McGrath](https://github.com/zoltrain), the brilliant Go-savvy engineer who first introduced me to the power of propagating structured context across services. This project is a direct descendant of those conversations, just ported to a new ecosystem with the same care for clarity, pragmatism and the value of sharing good ideas.

---

Because at the end of the day, we're all just trying to build software that works. Vision is our attempt to make that a little bit easier.