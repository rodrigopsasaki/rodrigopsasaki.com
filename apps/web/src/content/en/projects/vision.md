---
title: "Vision"
description: "A structured observability framework for Node.js that treats production monitoring as a first-class citizen, not an afterthought."
tags: ["TypeScript", "Observability", "Node.js", "Monitoring", "Production", "Framework"]
github: "https://github.com/rodrigopsasaki/vision"
featured: true
order: 2
---

# Vision: Production-First Observability

Vision is a structured observability framework for Node.js applications. It's built on a simple premise: **observability shouldn't be an afterthought**. When you're building systems that matter, you need to understand what's happening inside them — not just when things break, but all the time.

## The Philosophy: Zero-Setup Observability

We've all been there. You ship a feature, it works great in development, and then... something weird happens in production. Maybe it's slow sometimes. Maybe it fails in ways you never anticipated. Maybe you just can't figure out why.

Traditional approaches add monitoring later — after the architecture is set, after the patterns are established, after it becomes an uphill battle. Vision takes a different approach: **what if observability was automatic?**

```typescript
// Setup once in your app (usually in server.ts or app.ts)
import { vision } from '@rodrigopsasaki/vision';
import { visionMiddleware } from '@rodrigopsasaki/vision-express';
import { createDatadogExporter } from '@rodrigopsasaki/vision-datadog-exporter';

// One-time setup
vision.init({
  exporters: [createDatadogExporter({ apiKey: "...", service: "my-api" })]
});
app.use(visionMiddleware()); // That's it - every endpoint is now traced

// Now your regular code automatically gets observability
async function processPayment(paymentId: string) {
  // The context already exists from the HTTP request
  vision.set("payment_id", paymentId);
  
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  vision.set("amount", payment.amount);
  vision.set("currency", payment.currency);
  
  const result = await stripe.charges.create({ amount: payment.amount });
  vision.set("charge_id", result.id);
  vision.set("status", "completed");
  
  await db.payment.update({ 
    where: { id: paymentId }, 
    data: { status: 'completed' } 
  });
  
  return result;
}
```

That's it. No wrapping every function. No manual context creation. Just add data to the context that already exists. When something goes wrong, you get the complete story: what endpoint was called, what data was involved, how long each step took, and exactly where it failed.

## Framework Integrations

Vision integrates seamlessly with all major Node.js frameworks through dedicated packages:

### Express.js Integration

The most popular Node.js framework, with zero-configuration observability:

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
  exporters: [/* your exporters */]
});

// Add middleware - every route is now traced
app.use(visionMiddleware({
  captureBody: true,
  captureHeaders: true,
  performance: {
    slowOperationThreshold: 1000
  }
}));

// Routes automatically get Vision context
app.get('/api/users/:id', async (req, res) => {
  vision.set('user_id', req.params.id);
  vision.set('operation', 'get_user');
  
  const user = await getUser(req.params.id);
  res.json(user);
});
```

### Fastify Integration

High-performance framework with native plugin architecture:

```bash
npm install @rodrigopsasaki/vision @rodrigopsasaki/vision-fastify
```

```typescript
import Fastify from 'fastify';
import { visionPlugin } from '@rodrigopsasaki/vision-fastify';

const fastify = Fastify();

// Register as a plugin
await fastify.register(visionPlugin, {
  captureBody: true,
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 500
  },
  extractUser: (request) => request.headers['x-user-id']
});

fastify.get('/users/:id', async (request, reply) => {
  // Access Vision context
  const ctx = request.visionContext;
  
  vision.set('user_id', request.params.id);
  vision.set('operation', 'get_user');
  
  const user = await getUser(request.params.id);
  return user;
});
```

### Koa Integration

Elegant async/await middleware for modern Node.js:

```bash
npm install @rodrigopsasaki/vision @rodrigopsasaki/vision-koa
```

```typescript
import Koa from 'koa';
import { createVisionMiddleware } from '@rodrigopsasaki/vision-koa';

const app = new Koa();

// Add Vision middleware
app.use(createVisionMiddleware({
  captureBody: true,
  captureKoaMetadata: true,
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 1000
  }
}));

app.use(async (ctx) => {
  // Vision context is automatically available
  vision.set('user_id', ctx.params.id);
  vision.set('operation', 'get_user');
  
  const user = await getUser(ctx.params.id);
  ctx.body = user;
});
```

### NestJS Integration

Enterprise-grade framework with decorator-based configuration:

```bash
npm install @rodrigopsasaki/vision @rodrigopsasaki/vision-nestjs
```

```typescript
import { Module } from '@nestjs/common';
import { VisionModule } from '@rodrigopsasaki/vision-nestjs';

@Module({
  imports: [
    VisionModule.forRoot({
      exporters: [/* your exporters */],
      captureBody: true,
      captureHeaders: true
    })
  ]
})
export class AppModule {}

// Use in your controllers
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

## Performance Variants

Each integration offers pre-configured variants for different use cases:

### Minimal (Ultra-Fast)

```typescript
import { createMinimalVisionPlugin } from '@rodrigopsasaki/vision-fastify';

await fastify.register(createMinimalVisionPlugin({
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 10, // Very fast threshold
    trackMemoryUsage: false
  }
}));
```

### Comprehensive (Full Observability)

```typescript
import { createComprehensiveVisionPlugin } from '@rodrigopsasaki/vision-fastify';

await fastify.register(createComprehensiveVisionPlugin({
  captureHeaders: true,
  captureBody: true,
  captureQuery: true,
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 500,
    trackMemoryUsage: true
  },
  errorHandling: {
    captureErrors: true,
    captureStackTrace: true
  }
}));
```

### Performance-Optimized

```typescript
import { createPerformanceVisionPlugin } from '@rodrigopsasaki/vision-fastify';

await fastify.register(createPerformanceVisionPlugin({
  captureHeaders: false,
  captureBody: false,
  redactSensitiveData: false, // Skip redaction for speed
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 100
  }
}));
```

## How It Works: Structured Contexts

At its core, Vision is about **contexts** — scoped units of work that carry structured metadata. Every context has a name, contains key-value data, and tracks timing automatically.

```typescript
await vision.observe(
  "user.authenticate",
  {
    scope: "http-server",
    source: "auth-service",
  },
  async () => {
    vision.set("user_email", email);
    vision.set("auth_method", "password");
    vision.set("ip_address", req.ip);

    // Your authentication logic here
    const user = await verifyCredentials(email, password);

    vision.set("user_id", user.id);
    vision.set("user_role", user.role);
    vision.set("login_success", true);
  }
);
```

When this context completes, Vision sends the complete picture to your configured exporters: the timing, the metadata, success or failure, and any errors that occurred.

## Advanced Features

### Security & Data Redaction

Vision automatically redacts sensitive data from headers, query parameters, and request bodies:

```typescript
app.use(visionMiddleware({
  redactSensitiveData: true,
  redactHeaders: [
    'authorization',
    'cookie',
    'x-api-key'
  ],
  redactQueryParams: [
    'token',
    'key',
    'secret',
    'password'
  ],
  redactBodyFields: [
    'password',
    'ssn',
    'creditCard'
  ]
}));
```

### Custom User Extraction

Extract user information from requests using custom functions:

```typescript
app.use(visionMiddleware({
  extractUser: (req) => {
    // Extract from JWT, session, or headers
    return req.user || req.headers['x-user-id'];
  },
  extractTenant: (req) => {
    return req.headers['x-tenant-id'];
  },
  extractCorrelationId: (req) => {
    return req.headers['x-correlation-id'] || 
           req.headers['x-request-id'];
  }
}));
```

### Performance Monitoring

Track execution time, memory usage, and identify slow operations:

```typescript
app.use(visionMiddleware({
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 1000, // Mark operations > 1s as slow
    trackMemoryUsage: true
  }
}));
```

### Route Exclusion

Exclude health checks and internal routes from tracking:

```typescript
app.use(visionMiddleware({
  excludeRoutes: ['/health', '/metrics', '/favicon.ico'],
  shouldExcludeRoute: (req) => {
    return req.url.startsWith('/internal/');
  }
}));
```

## Production-Ready Exporters

### Datadog Integration

The Datadog exporter transforms Vision contexts into OpenTelemetry-compliant distributed traces:

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

This isn't just a simple HTTP client. It includes:
- **Circuit breaker**: Protects your app when Datadog is down
- **Intelligent batching**: Reduces API calls and improves performance  
- **Retry logic**: Exponential backoff with error classification
- **OpenTelemetry compliance**: Proper trace/span relationships
- **Automatic span kind detection**: Maps contexts to appropriate span types

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

**Natural Integration**: It doesn't change how you write code — it enhances it. The framework-specific integrations feel natural and make your code more readable.

**Powerful Insights**: Because every operation is wrapped and enriched with context, you get incredibly detailed traces that tell the complete story of what happened.

**Production Safety**: Built-in features like circuit breakers, retries, and security redaction mean you can trust it in production from day one.

**Flexible Architecture**: The exporter system means you can send data anywhere — multiple destinations, custom transformations, different formats.

## The Bigger Picture

We're not trying to reinvent observability. There are fantastic tools out there — Datadog, New Relic, Honeycomb, Jaeger. What we're trying to do is make it easier to get high-quality data into those tools.

Vision is our best attempt at solving a problem we've faced repeatedly: **how do you build applications that are observable by design?** It's not perfect, and it's not magic. It's just what we've learned works well for building systems you can understand and debug.

If you're building Node.js applications that need to work reliably in production, give Vision a try. Start small — choose your framework integration, add an exporter, see what insights you get. We think you'll find it makes debugging and understanding your systems significantly easier.

## 🙏 Acknowledgments

Special thanks to [Ryan McGrath](https://github.com/zoltrain), the brilliant Go-savvy engineer who first introduced me to the power of propagating structured context across services. This project is a direct descendant of those conversations — just ported to a new ecosystem with the same care for clarity, pragmatism and the value of sharing good ideas.

---

Because at the end of the day, we're all just trying to build software that works. Vision is our attempt to make that a little bit easier.