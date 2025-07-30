---
title: "Vision"
description: "A structured observability framework for Node.js that treats production monitoring as a first-class citizen, not an afterthought."
tags: ["TypeScript", "Observability", "Node.js", "Monitoring", "Production", "Framework"]
github: "https://github.com/rodrigopsasaki/vision"
featured: true
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

## Framework Integrations

Once you understand Vision core, you can integrate it with your favorite Node.js framework. Each integration automatically creates Vision contexts for every HTTP request:

### Express.js
```bash
npm install @rodrigopsasaki/vision-express
```

```typescript
import { visionMiddleware } from '@rodrigopsasaki/vision-express';

app.use(visionMiddleware()); // Every endpoint is now traced

app.get('/users/:id', async (req, res) => {
  vision.set('user_id', req.params.id);
  vision.set('operation', 'get_user');
  
  const user = await getUser(req.params.id);
  res.json(user);
});
```

### Fastify
```bash
npm install @rodrigopsasaki/vision-fastify
```

```typescript
import { visionPlugin } from '@rodrigopsasaki/vision-fastify';

await fastify.register(visionPlugin);

fastify.get('/users/:id', async (request, reply) => {
  vision.set('user_id', request.params.id);
  return getUser(request.params.id);
});
```

### Koa
```bash
npm install @rodrigopsasaki/vision-koa
```

```typescript
import { visionMiddleware } from '@rodrigopsasaki/vision-koa';

app.use(visionMiddleware());

app.use(async (ctx) => {
  vision.set('user_id', ctx.params.id);
  ctx.body = await getUser(ctx.params.id);
});
```

### NestJS
```bash
npm install @rodrigopsasaki/vision-nestjs
```

```typescript
import { VisionModule } from '@rodrigopsasaki/vision-nestjs';

@Module({
  imports: [VisionModule.forRoot()],
})
export class AppModule {}

@Controller('users')
export class UsersController {
  @Get(':id')
  async getUser(@Param('id') id: string) {
    vision.set('user_id', id);
    return await this.userService.getUser(id);
  }
}
```

## Available Packages

Vision is architected as a modular ecosystem:

### Core Framework
- **[@rodrigopsasaki/vision](https://www.npmjs.com/package/@rodrigopsasaki/vision)** - Core observability framework

### Framework Integrations
- **[@rodrigopsasaki/vision-express](https://www.npmjs.com/package/@rodrigopsasaki/vision-express)** - Express.js middleware
- **[@rodrigopsasaki/vision-fastify](https://www.npmjs.com/package/@rodrigopsasaki/vision-fastify)** - Fastify plugin
- **[@rodrigopsasaki/vision-koa](https://www.npmjs.com/package/@rodrigopsasaki/vision-koa)** - Koa middleware
- **[@rodrigopsasaki/vision-nestjs](https://www.npmjs.com/package/@rodrigopsasaki/vision-nestjs)** - NestJS module

### Exporters
- **[@rodrigopsasaki/vision-datadog-exporter](https://www.npmjs.com/package/@rodrigopsasaki/vision-datadog-exporter)** - Datadog traces, metrics, logs

## Production-Ready Exporters

### Datadog Integration

```bash
npm install @rodrigopsasaki/vision-datadog-exporter
```

```typescript
import { createDatadogExporter } from '@rodrigopsasaki/vision-datadog-exporter';

vision.init({
  exporters: [
    createDatadogExporter({
      apiKey: process.env.DATADOG_API_KEY,
      service: "payment-service",
      env: "production",
      
      // Production features built-in
      batchSize: 100,
      retries: 3,
      timeout: 10000,
    })
  ]
});
```

This includes:
- **Circuit breaker**: Protects your app when Datadog is down
- **Intelligent batching**: Reduces API calls and improves performance  
- **Retry logic**: Exponential backoff with error classification
- **OpenTelemetry compliance**: Proper trace/span relationships

### Custom Exporters

Building your own exporter is straightforward:

```typescript
const slackExporter: VisionExporter = {
  name: "slack-alerts",
  
  error(context, error) {
    // Only alert on payment failures
    if (context.name.startsWith("payment.") && context.data.amount > 1000) {
      sendSlackAlert({
        text: `High-value payment failed: ${context.name}`,
        fields: {
          "Payment ID": context.data.payment_id,
          "Amount": context.data.amount,
          "Error": error.message,
          "Duration": `${context.duration}ms`
        }
      });
    }
  }
};
```

## Detailed Framework Integration Examples

Now that you understand the basics, here are comprehensive integration examples for each framework:

### Express.js - Advanced Configuration

```typescript
import express from 'express';
import { vision } from '@rodrigopsasaki/vision';
import { visionMiddleware } from '@rodrigopsasaki/vision-express';

const app = express();

// Advanced setup
vision.init({
  exporters: [/* your exporters */]
});

app.use(visionMiddleware({
  captureBody: true,
  captureHeaders: true,
  redactSensitiveData: true,
  redactHeaders: ['authorization', 'cookie'],
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 1000
  },
  extractUser: (req) => req.headers['x-user-id'],
  excludeRoutes: ['/health', '/metrics']
}));

app.get('/api/users/:id', async (req, res) => {
  vision.set('user_id', req.params.id);
  vision.set('operation', 'get_user');
  
  const user = await getUser(req.params.id);
  res.json(user);
});
```

### Fastify - Performance Variants

```typescript
import Fastify from 'fastify';
import { visionPlugin, createPerformanceVisionPlugin } from '@rodrigopsasaki/vision-fastify';

const fastify = Fastify();

// Performance-optimized variant
await fastify.register(createPerformanceVisionPlugin({
  captureHeaders: false,
  captureBody: false,
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 100
  }
}));

// Or comprehensive variant
await fastify.register(visionPlugin, {
  captureBody: true,
  captureHeaders: true,
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 500,
    trackMemoryUsage: true
  },
  extractUser: (request) => request.headers['x-user-id']
});

fastify.get('/users/:id', async (request, reply) => {
  vision.set('user_id', request.params.id);
  vision.set('operation', 'get_user');
  
  const user = await getUser(request.params.id);
  return user;
});
```

### Koa - Async/Await Patterns

```typescript
import Koa from 'koa';
import { createVisionMiddleware } from '@rodrigopsasaki/vision-koa';

const app = new Koa();

app.use(createVisionMiddleware({
  captureBody: true,
  captureKoaMetadata: true,
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 1000
  },
  redactSensitiveData: true,
  extractUser: (ctx) => ctx.headers['x-user-id']
}));

app.use(async (ctx) => {
  vision.set('user_id', ctx.params.id);
  vision.set('operation', 'get_user');
  
  const user = await getUser(ctx.params.id);
  ctx.body = user;
});
```

### NestJS - Enterprise Configuration

```typescript
import { Module } from '@nestjs/common';
import { VisionModule } from '@rodrigopsasaki/vision-nestjs';

@Module({
  imports: [
    VisionModule.forRoot({
      exporters: [/* your exporters */],
      captureBody: true,
      captureHeaders: true,
      redactSensitiveData: true,
      performance: {
        trackExecutionTime: true,
        slowOperationThreshold: 1000
      }
    })
  ]
})
export class AppModule {}

@Controller('users')
export class UsersController {
  @Get(':id')
  @UseVision('get_user') // Automatic context creation
  async getUser(@Param('id') id: string) {
    vision.set('user_id', id);
    return await this.usersService.getUser(id);
  }
}
```

## Advanced Features

### Security & Data Redaction

Vision automatically redacts sensitive data:

```typescript
app.use(visionMiddleware({
  redactSensitiveData: true,
  redactHeaders: ['authorization', 'cookie', 'x-api-key'],
  redactQueryParams: ['token', 'key', 'secret', 'password'],
  redactBodyFields: ['password', 'ssn', 'creditCard']
}));
```

## Microservices & Distributed Systems

Vision excels in microservice architectures with built-in support for:

### Service Mesh Integration

```typescript
// Automatic service chain tracking
fastify.addHook('preHandler', async (request, reply) => {
  const correlationId = request.headers['x-correlation-id'] || generateId();
  const serviceChain = request.headers['x-service-chain'] || 'gateway';
  
  // Add current service to chain
  const updatedChain = `${serviceChain}->${SERVICE_NAME}`;
  
  reply.header('X-Correlation-ID', correlationId);
  reply.header('X-Service-Chain', updatedChain);
});
```

### Circuit Breaker Pattern

```typescript
async function callExternalService(serviceName: string, url: string) {
  const circuitState = getCircuitBreakerState(serviceName);
  
  if (circuitState === 'open') {
    vision.set('circuit_breaker_open', true);
    throw new Error(`Circuit breaker open for ${serviceName}`);
  }
  
  try {
    vision.set(`${serviceName}_call_start`, Date.now());
    const response = await fetch(url);
    vision.set(`${serviceName}_call_success`, true);
    resetCircuitBreaker(serviceName);
    return response;
  } catch (error) {
    vision.set(`${serviceName}_call_failed`, true);
    recordServiceFailure(serviceName);
    throw error;
  }
}
```

### Inter-Service Communication

```typescript
// Propagate Vision context across services
async function callDownstreamService(endpoint: string, data: any) {
  return await vision.observe('downstream.call', async () => {
    vision.set('downstream_service', endpoint);
    vision.set('request_size', JSON.stringify(data).length);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'X-Correlation-ID': vision.get('correlation_id'),
        'X-Service-Chain': vision.get('service_chain'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    vision.set('response_status', response.status);
    vision.set('response_size', response.headers.get('content-length'));
    
    return response.json();
  });
}
```

## Real-World Examples

### Authentication Flow

```typescript
await vision.observe("user.login", async () => {
  vision.set("auth_method", "email");
  vision.set("ip_address", req.ip);
  vision.set("user_agent", req.headers['user-agent']);
  
  // Rate limiting check
  await vision.observe("auth.rate_limit_check", async () => {
    const attempts = await redis.get(`login_attempts:${req.ip}`);
    vision.set("previous_attempts", attempts || 0);
    
    if (attempts > 5) {
      vision.set("rate_limited", true);
      throw new Error("Too many login attempts");
    }
  });
  
  // Credential verification
  const user = await vision.observe("auth.verify_credentials", async () => {
    vision.set("password_check_start", Date.now());
    const isValid = await bcrypt.compare(password, hashedPassword);
    vision.set("password_valid", isValid);
    
    if (!isValid) {
      await redis.incr(`login_attempts:${req.ip}`);
      throw new Error("Invalid credentials");
    }
    
    return user;
  });
  
  // Session creation
  await vision.observe("auth.create_session", async () => {
    const sessionId = generateId();
    await redis.set(`session:${sessionId}`, JSON.stringify(user));
    vision.set("session_id", sessionId);
    vision.set("session_ttl", 3600);
  });
  
  vision.set("login_successful", true);
  vision.set("user_id", user.id);
  vision.set("user_role", user.role);
});
```

### E-commerce Order Processing

```typescript
await vision.observe("order.process", async () => {
  vision.set("order_id", orderId);
  vision.set("customer_id", customerId);
  vision.set("items_count", items.length);
  
  // Inventory check
  const inventory = await vision.observe("inventory.check", async () => {
    const results = await Promise.all(
      items.map(item => checkInventory(item.productId, item.quantity))
    );
    
    const unavailable = results.filter(r => !r.available);
    vision.set("inventory_issues", unavailable.length);
    
    if (unavailable.length > 0) {
      vision.set("unavailable_items", unavailable.map(r => r.productId));
      throw new Error("Insufficient inventory");
    }
    
    return results;
  });
  
  // Payment processing
  const payment = await vision.observe("payment.process", async () => {
    vision.set("payment_method", paymentData.method);
    vision.set("amount", paymentData.amount);
    vision.set("currency", paymentData.currency);
    
    const result = await stripe.charges.create({
      amount: paymentData.amount,
      currency: paymentData.currency,
      source: paymentData.token
    });
    
    vision.set("charge_id", result.id);
    vision.set("payment_status", result.status);
    
    return result;
  });
  
  // Order fulfillment
  await vision.observe("fulfillment.create", async () => {
    const fulfillment = await createFulfillment({
      orderId,
      items,
      shippingAddress: order.shippingAddress
    });
    
    vision.set("fulfillment_id", fulfillment.id);
    vision.set("estimated_delivery", fulfillment.estimatedDelivery);
  });
  
  // Notification
  await vision.observe("notification.send", async () => {
    await sendOrderConfirmation({
      email: customer.email,
      orderId,
      items,
      total: payment.amount
    });
    
    vision.set("notification_sent", true);
  });
  
  vision.set("order_completed", true);
});
```

### Background Job Processing

```typescript
// Queue worker with Vision
export async function processEmailJob(job: EmailJob) {
  await vision.observe(`email.job.${job.type}`, {
    scope: "background-job",
    source: "worker-service"
  }, async () => {
    vision.set("job_id", job.id);
    vision.set("job_type", job.type);
    vision.set("queue", job.queue);
    vision.set("attempts", job.attempts);
    vision.set("recipient", job.data.email);
    
    // Template processing
    const content = await vision.observe("email.template.render", async () => {
      vision.set("template_name", job.data.template);
      vision.set("template_data_size", Object.keys(job.data.templateData).length);
      
      const rendered = await renderEmailTemplate(
        job.data.template, 
        job.data.templateData
      );
      
      vision.set("content_length", rendered.html.length);
      vision.set("has_attachments", rendered.attachments?.length > 0);
      
      return rendered;
    });
    
    // Email delivery
    const result = await vision.observe("email.delivery", async () => {
      vision.set("provider", "sendgrid");
      
      const response = await sendgrid.send({
        to: job.data.email,
        from: job.data.from,
        subject: content.subject,
        html: content.html,
        attachments: content.attachments
      });
      
      vision.set("message_id", response[0].headers['x-message-id']);
      vision.set("delivery_status", "queued");
      
      return response;
    });
    
    vision.set("job_completed", true);
    vision.set("processing_time_ms", Date.now() - job.startedAt);
  });
}
```

## Key Normalization

Vision automatically normalizes context keys to ensure consistent casing across all your observability data:

```typescript
vision.init({
  normalization: {
    enabled: true,
    keyCasing: "snake_case", // snake_case, camelCase, kebab-case, PascalCase
    deep: true // Normalize nested objects
  }
});

await vision.observe("user.registration", async () => {
  // You write keys however feels natural
  vision.set("userId", "user123");
  vision.set("firstName", "John");
  vision.set("lastLoginAt", "2023-01-01");
  
  // Exporters receive normalized keys:
  // user_id, first_name, last_login_at
});
```

## Production Examples

Check out comprehensive, runnable examples in the repository:

### Fastify Examples
- **[Basic Usage](https://github.com/rodrigopsasaki/vision/blob/main/packages/vision-fastify/examples/basic-usage.ts)** - Simple integration with default settings
- **[Advanced Usage](https://github.com/rodrigopsasaki/vision/blob/main/packages/vision-fastify/examples/advanced-usage.ts)** - Authentication, multi-tenant, custom extractors
- **[Performance Optimized](https://github.com/rodrigopsasaki/vision/blob/main/packages/vision-fastify/examples/performance-optimized.ts)** - High-throughput configurations
- **[Microservice Example](https://github.com/rodrigopsasaki/vision/blob/main/packages/vision-fastify/examples/microservice-example.ts)** - Circuit breakers, service mesh, distributed tracing

### Koa Examples
- **[Basic Usage](https://github.com/rodrigopsasaki/vision/blob/main/packages/vision-koa/examples/basic-usage.ts)** - Async/await middleware patterns
- **[Advanced Usage](https://github.com/rodrigopsasaki/vision/blob/main/packages/vision-koa/examples/advanced-usage.ts)** - Session management, business workflows
- **[Performance Optimized](https://github.com/rodrigopsasaki/vision/blob/main/packages/vision-koa/examples/performance-optimized.ts)** - Stream processing, bulk operations

### Express Examples
- **[Basic Usage](https://github.com/rodrigopsasaki/vision/blob/main/packages/vision-express/examples/basic-usage.ts)** - Standard Express.js integration
- **[Advanced Usage](https://github.com/rodrigopsasaki/vision/blob/main/packages/vision-express/examples/advanced-usage.ts)** - Complex business logic with Vision

### NestJS Examples
- **[Basic Usage](https://github.com/rodrigopsasaki/vision/blob/main/packages/vision-nestjs/examples/basic-usage.ts)** - Decorator-based configuration
- **[Advanced Usage](https://github.com/rodrigopsasaki/vision/blob/main/packages/vision-nestjs/examples/advanced-usage.ts)** - Enterprise patterns with dependency injection

## Getting Started

Choose your framework and follow the quick start:

### Express.js (Most Popular)

```bash
npm install @rodrigopsasaki/vision @rodrigopsasaki/vision-express
```

```typescript
import express from 'express';
import { vision } from '@rodrigopsasaki/vision';
import { visionMiddleware } from '@rodrigopsasaki/vision-express';

const app = express();

// Setup once
vision.init({
  exporters: [
    {
      name: 'console',
      success: (ctx) => console.log('✓', ctx.name, `${ctx.duration}ms`),
      error: (ctx, err) => console.error('✗', ctx.name, err.message)
    }
  ]
});

app.use(visionMiddleware());

// Every route is now traced
app.get('/users/:id', async (req, res) => {
  vision.set('user_id', req.params.id);
  const user = await getUser(req.params.id);
  res.json(user);
});
```

### Fastify (High Performance)

```bash
npm install @rodrigopsasaki/vision @rodrigopsasaki/vision-fastify
```

```typescript
import Fastify from 'fastify';
import { visionPlugin } from '@rodrigopsasaki/vision-fastify';

const fastify = Fastify();

await fastify.register(visionPlugin, {
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 500
  }
});

fastify.get('/users/:id', async (request, reply) => {
  vision.set('user_id', request.params.id);
  const user = await getUser(request.params.id);
  return user;
});
```

### Koa (Modern Async/Await)

```bash
npm install @rodrigopsasaki/vision @rodrigopsasaki/vision-koa
```

```typescript
import Koa from 'koa';
import { createVisionMiddleware } from '@rodrigopsasaki/vision-koa';

const app = new Koa();

app.use(createVisionMiddleware({
  captureBody: true,
  performance: {
    trackExecutionTime: true
  }
}));

app.use(async (ctx) => {
  vision.set('user_id', ctx.params.id);
  const user = await getUser(ctx.params.id);
  ctx.body = user;
});
```

### NestJS (Enterprise)

```bash
npm install @rodrigopsasaki/vision @rodrigopsasaki/vision-nestjs
```

```typescript
import { Module } from '@nestjs/common';
import { VisionModule } from '@rodrigopsasaki/vision-nestjs';

@Module({
  imports: [
    VisionModule.forRoot({
      exporters: [/* your exporters */]
    })
  ]
})
export class AppModule {}

@Controller('users')
export class UsersController {
  @Get(':id')
  @UseVision('get_user')
  async getUser(@Param('id') id: string) {
    vision.set('user_id', id);
    return await this.usersService.getUser(id);
  }
}
```

## Available Packages

Vision is architected as a modular ecosystem:

### Core Framework
- **[@rodrigopsasaki/vision](https://www.npmjs.com/package/@rodrigopsasaki/vision)** - Core observability framework

### Framework Integrations
- **[@rodrigopsasaki/vision-express](https://www.npmjs.com/package/@rodrigopsasaki/vision-express)** - Express.js middleware
- **[@rodrigopsasaki/vision-fastify](https://www.npmjs.com/package/@rodrigopsasaki/vision-fastify)** - Fastify plugin
- **[@rodrigopsasaki/vision-koa](https://www.npmjs.com/package/@rodrigopsasaki/vision-koa)** - Koa middleware
- **[@rodrigopsasaki/vision-nestjs](https://www.npmjs.com/package/@rodrigopsasaki/vision-nestjs)** - NestJS module

### Exporters
- **[@rodrigopsasaki/vision-datadog-exporter](https://www.npmjs.com/package/@rodrigopsasaki/vision-datadog-exporter)** - Datadog traces, metrics, logs

## Why This Approach Works

**Minimal Overhead**: Vision is designed to be lightweight. Contexts are just objects with metadata. No heavy instrumentation or performance impact.

**Natural Integration**: It doesn't change how you write code, it enhances it. The framework-specific integrations feel natural and make your code more readable.

**Powerful Insights**: Because every operation is wrapped and enriched with context, you get incredibly detailed traces that tell the complete story of what happened.

**Production Safety**: Built-in features like circuit breakers, retries, and security redaction mean you can trust it in production from day one.

**Flexible Architecture**: The exporter system means you can send data anywhere: multiple destinations, custom transformations, different formats.

## The Bigger Picture

We're not trying to reinvent observability. There are fantastic tools out there like Datadog, New Relic, Honeycomb, and Jaeger. What we're trying to do is make it easier to get high-quality data into those tools.

Vision is our best attempt at solving a problem we've faced repeatedly: **how do you build applications that are observable by design?** It's not perfect, and it's not magic. It's just what we've learned works well for building systems you can understand and debug.

If you're building Node.js applications that need to work reliably in production, give Vision a try. Start small: choose your framework integration, add an exporter, see what insights you get. We think you'll find it makes debugging and understanding your systems significantly easier.

## 🙏 Acknowledgments

Special thanks to [Ryan McGrath](https://github.com/zoltrain), the brilliant Go-savvy engineer who first introduced me to the power of propagating structured context across services. This project is a direct descendant of those conversations, just ported to a new ecosystem with the same care for clarity, pragmatism and the value of sharing good ideas.

---

Because at the end of the day, we're all just trying to build software that works. Vision is our attempt to make that a little bit easier.