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

## The Hook System: AOP for Observability

Vision's exporter system works like aspect-oriented programming for observability. Each exporter can hook into the lifecycle of contexts:

```typescript
const myExporter: VisionExporter = {
  name: "my-custom-exporter",
  
  // Called before context execution
  before(context) {
    console.log(`Starting: ${context.name}`);
  },
  
  // Called after successful execution
  after(context) {
    console.log(`Completed: ${context.name} in ${context.duration}ms`);
  },
  
  // Called when context succeeds
  success(context) {
    // Send to your observability platform
    sendTrace(context);
  },
  
  // Called when context fails
  error(context, error) {
    // Send error with full context
    sendError(context, error);
  }
};
```

This design means you can:
- Send traces to Datadog while also logging to CloudWatch
- Transform data differently for each destination  
- Add custom business logic hooks
- Build debug exporters that only run in development

## The Magic: Express Middleware Does Everything

This is where Vision shines. **You set it up once and forget about it.** The Express middleware automatically creates contexts for every HTTP request — no manual wrapping, no boilerplate, no thinking required.

```typescript
import { vision } from '@rodrigopsasaki/vision';
import { visionMiddleware } from '@rodrigopsasaki/vision-express';

const app = express();

// This is literally all the setup you need
app.use(visionMiddleware());

// Every route now automatically gets:
// ✓ Full request/response tracing
// ✓ Error capture with stack traces  
// ✓ User detection from common auth patterns
// ✓ Correlation ID detection from headers
// ✓ Automatic timing for the entire request
// ✓ Security redaction of sensitive data

app.get('/api/users/:id', async (req, res) => {
  // No context creation needed - it already exists!
  // Just add the data you care about:
  vision.set('user_id', req.params.id);
  vision.set('operation', 'get_user');
  
  const user = await getUser(req.params.id);
  res.json(user);
  
  // When this request finishes (success or error), 
  // everything gets sent to your exporters automatically
});
```

**That's it.** No configuration files. No manual trace creation. No complex setup. Install the middleware, configure your exporters once, and every endpoint in your entire application becomes observable.

## When You DO Need Manual Contexts (Spoiler: Rarely)

Most of the time, you're just adding data with `vision.set()` to the context that already exists. But sometimes you want to trace deeper into specific operations:

```typescript
app.post('/api/payments', async (req, res) => {
  // Main context already exists from the middleware
  vision.set('payment_amount', req.body.amount);
  
  // Only create sub-contexts for operations you want to trace separately
  const payment = await vision.observe('payment.process', async () => {
    vision.set('provider', 'stripe');
    return await processStripePayment(req.body);
  });
  
  const email = await vision.observe('email.send', async () => {
    vision.set('template', 'payment_confirmation');
    return await sendConfirmationEmail(payment);
  });
  
  res.json({ payment, email });
});
```

This is **optional**. You could just as easily write:

```typescript
app.post('/api/payments', async (req, res) => {
  vision.set('payment_amount', req.body.amount);
  
  vision.set('provider', 'stripe');
  const payment = await processStripePayment(req.body);
  
  vision.set('template', 'payment_confirmation');
  const email = await sendConfirmationEmail(payment);
  
  res.json({ payment, email });
});
```

Both approaches work. The first gives you more granular timing and the ability to trace sub-operations independently. The second is simpler and often perfectly adequate.

## Production-Ready Exporters

### Datadog Integration

The Datadog exporter transforms Vision contexts into OpenTelemetry-compliant distributed traces:

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

## Real-World Usage Patterns

### Database Operations

```typescript
await vision.observe("user.create", { scope: "database" }, async () => {
  vision.set("operation", "INSERT");
  vision.set("table", "users");
  
  const user = await vision.observe("user.validate", async () => {
    vision.set("validator", "email_unique");
    return await validateEmailUnique(email);
  });
  
  vision.set("validation_passed", true);
  
  const result = await db.user.create({ data: userData });
  vision.set("user_id", result.id);
  vision.set("rows_affected", 1);
  
  return result;
});
```

### External API Calls

```typescript
await vision.observe("github.user.fetch", { scope: "client" }, async () => {
  vision.set("provider", "github");
  vision.set("api_version", "v4");
  vision.set("username", username);
  
  try {
    const response = await fetch(`https://api.github.com/users/${username}`, {
      headers: { Authorization: `token ${token}` }
    });
    
    vision.set("status_code", response.status);
    vision.set("rate_limit_remaining", response.headers.get('x-ratelimit-remaining'));
    
    if (!response.ok) {
      vision.set("error_type", "http_error");
      throw new Error(`GitHub API returned ${response.status}`);
    }
    
    const user = await response.json();
    vision.set("user_id", user.id);
    vision.set("public_repos", user.public_repos);
    
    return user;
  } catch (error) {
    vision.set("error_type", "network_error");
    throw error;
  }
});
```

### Background Jobs

```typescript
await vision.observe("email.send", { scope: "background-job" }, async () => {
  vision.set("job_type", "email");
  vision.set("queue", "high-priority");
  vision.set("recipient", email);
  vision.set("template", "welcome");
  
  const result = await vision.observe("sendgrid.send", async () => {
    vision.set("provider", "sendgrid");
    return await sendEmail({
      to: email,
      template: "welcome",
      data: templateData
    });
  });
  
  vision.set("message_id", result.messageId);
  vision.set("delivery_status", "queued");
});
```

## Why This Approach Works

**Minimal Overhead**: Vision is designed to be lightweight. Contexts are just objects with metadata. No heavy instrumentation or performance impact.

**Natural Integration**: It doesn't change how you write code — it enhances it. The `observe` pattern feels natural and makes your code more readable.

**Powerful Insights**: Because every operation is wrapped and enriched with context, you get incredibly detailed traces that tell the complete story of what happened.

**Production Safety**: Built-in features like circuit breakers, retries, and security redaction mean you can trust it in production from day one.

**Flexible Architecture**: The exporter system means you can send data anywhere — multiple destinations, custom transformations, different formats.

## The Bigger Picture

We're not trying to reinvent observability. There are fantastic tools out there — Datadog, New Relic, Honeycomb, Jaeger. What we're trying to do is make it easier to get high-quality data into those tools.

Vision is our best attempt at solving a problem we've faced repeatedly: **how do you build applications that are observable by design?** It's not perfect, and it's not magic. It's just what we've learned works well for building systems you can understand and debug.

If you're building Node.js applications that need to work reliably in production, give Vision a try. Start small — wrap a few critical operations, add an exporter, see what insights you get. We think you'll find it makes debugging and understanding your systems significantly easier.

## 🙏 Acknowledgments

Special thanks to [Ryan McGrath](https://github.com/zoltrain), the brilliant Go-savvy engineer who first introduced me to the power of propagating structured context across services. This project is a direct descendant of those conversations — just ported to a new ecosystem with the same care for clarity, pragmatism and the value of sharing good ideas.

## Get Started (Seriously, It's This Easy)

For Express apps (most common):

```bash
npm install @rodrigopsasaki/vision @rodrigopsasaki/vision-express
```

```typescript
// In your server.ts or app.ts
import { vision } from '@rodrigopsasaki/vision';
import { visionMiddleware } from '@rodrigopsasaki/vision-express';

// Setup (do this once)
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

// That's it! Every endpoint is now traced.
// In your routes, just add data:
app.get('/users/:id', async (req, res) => {
  vision.set('user_id', req.params.id);
  const user = await getUser(req.params.id);
  res.json(user);
});
```

**Done.** You're now capturing structured observability data for every HTTP request. No additional setup needed. From here, you can add more sophisticated exporters (like Datadog), but the core functionality is already working.

Because at the end of the day, we're all just trying to build software that works. Vision is our attempt to make that a little bit easier.