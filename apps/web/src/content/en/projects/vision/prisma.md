---
title: "Prisma Integration"
description: "Automatic database operation observability for Prisma with zero configuration. Every query, mutation, and transaction automatically instrumented with rich context."
tags: ["Prisma", "Database", "ORM", "Observability", "TypeScript", "SQL", "Performance"]
npm: "https://www.npmjs.com/package/@rodrigopsasaki/vision-prisma"
github: "https://github.com/rodrigopsasaki/vision/tree/main/packages/vision-prisma"
parent: "vision"
order: 4
---

# Prisma Integration

Automatic database operation observability for Prisma with zero configuration required.

## Installation

```bash
npm install @rodrigopsasaki/vision @rodrigopsasaki/vision-prisma
```

## Quick Start

```typescript
import { PrismaClient } from '@prisma/client';
import { instrumentPrisma } from '@rodrigopsasaki/vision-prisma';

const prisma = instrumentPrisma(new PrismaClient());

// That's it! Every database operation is now automatically observed
const users = await prisma.user.findMany({
  where: { active: true }
});
```

Every database operation will now be automatically wrapped with Vision context, providing detailed observability data including:

- Operation type and model
- Query duration and performance metrics
- SQL queries (configurable)
- Parameters (configurable, with sensitive data redaction)
- Result counts and metadata
- Error information and stack traces

## How It Works

The Prisma integration uses JavaScript proxies to intercept all database operations at runtime. It's completely transparent - your existing code doesn't need to change.

```typescript
// Before: Regular Prisma usage
const user = await prisma.user.create({
  data: { email: 'user@example.com', name: 'John' }
});

// After: Same code, but now automatically instrumented
const user = await prisma.user.create({
  data: { email: 'user@example.com', name: 'John' }
});
// Vision automatically captures: operation type, timing, SQL query, parameters, results
```

## Configuration Options

```typescript
import { instrumentPrisma } from '@rodrigopsasaki/vision-prisma';

const prisma = instrumentPrisma(new PrismaClient(), {
  enabled: true,                    // Enable/disable instrumentation
  logParams: false,                 // Log query parameters (may contain sensitive data)
  logQuery: true,                   // Log the actual SQL query
  logResultCount: true,             // Log result count for find operations
  maxQueryLength: 1000,             // Maximum query length to log
  includeModelInName: true,         // Include model name in operation name
  operationPrefix: 'db',            // Custom operation name prefix
  redactFields: ['password', 'token'], // Fields to redact from parameters
  logConnectionInfo: false,         // Include database connection info
});
```

### Configuration Examples

**Production Safe (Recommended)**
```typescript
const prisma = instrumentPrisma(new PrismaClient(), {
  logParams: false,        // Don't log parameters in production
  logQuery: false,         // Don't log SQL in production
  logResultCount: true,    // Safe performance metric
  maxQueryLength: 500,     // Limit query length
  redactFields: [          // Comprehensive redaction
    'password', 'token', 'secret', 'key', 'hash', 
    'authorization', 'api_key', 'session'
  ]
});
```

**Development/Debug Mode**
```typescript
const prisma = instrumentPrisma(new PrismaClient(), {
  logParams: true,         // Full parameter logging
  logQuery: true,          // Full SQL query logging
  maxQueryLength: 2000,    // Longer queries in dev
  logConnectionInfo: true, // Connection details
});
```

## Real-World Examples

### E-commerce Order Processing

```typescript
import { observe } from '@rodrigopsasaki/vision-prisma';

await observe('order.create', async () => {
  // Create order with items
  const order = await prisma.order.create({
    data: {
      userId: 123,
      total: 299.97,
      status: 'pending',
      items: {
        create: [
          { productId: 1, quantity: 2, price: 99.99 },
          { productId: 2, quantity: 1, price: 99.99 }
        ]
      }
    },
    include: {
      items: { include: { product: true } },
      user: true
    }
  });

  // Update inventory for each item
  for (const item of order.items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: {
        stock: { decrement: item.quantity }
      }
    });
  }

  // Add custom context
  vision.set('order_id', order.id);
  vision.set('item_count', order.items.length);
  vision.set('customer_email', order.user.email);
  
  return order;
});
```

This generates comprehensive observability data:

```json
{
  "name": "order.create",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "data": {
    "order_id": "ord_abc123",
    "item_count": 2,
    "customer_email": "customer@example.com",
    "db_operations": [
      {
        "model": "order",
        "operation": "create",
        "duration_ms": 45,
        "result_count": 1
      },
      {
        "model": "product", 
        "operation": "update",
        "duration_ms": 12,
        "result_count": 1
      },
      {
        "model": "product",
        "operation": "update", 
        "duration_ms": 8,
        "result_count": 1
      }
    ]
  },
  "duration": 89
}
```

### User Registration with Profile

```typescript
await observe('user.registration', async () => {
  const user = await prisma.user.create({
    data: {
      email: 'new@example.com',
      name: 'Jane Doe',
      profile: {
        create: {
          bio: 'Software engineer',
          avatar: 'https://example.com/avatar.jpg'
        }
      }
    },
    include: { profile: true }
  });

  // Send welcome email (external service call)
  await sendWelcomeEmail(user.email);
  
  vision.set('user_id', user.id);
  vision.set('registration_source', 'web');
  vision.set('email_sent', true);
  
  return user;
});
```

### Complex Query with Aggregations

```typescript
await observe('analytics.daily_report', async () => {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  // Multiple complex queries automatically instrumented
  const [newUsers, orders, revenue] = await Promise.all([
    prisma.user.count({
      where: {
        createdAt: { gte: yesterday, lt: today }
      }
    }),
    
    prisma.order.findMany({
      where: {
        createdAt: { gte: yesterday, lt: today },
        status: 'completed'
      },
      include: { items: true }
    }),
    
    prisma.order.aggregate({
      where: {
        createdAt: { gte: yesterday, lt: today },
        status: 'completed'
      },
      _sum: { total: true }
    })
  ]);

  vision.set('new_users_count', newUsers);
  vision.set('orders_count', orders.length);
  vision.set('total_revenue', revenue._sum.total);
  
  return { newUsers, orders: orders.length, revenue: revenue._sum.total };
});
```

## Transaction Support

Prisma transactions are automatically observed as single operations:

```typescript
const result = await prisma.$transaction(async (tx) => {
  // All operations within the transaction are automatically observed
  const user = await tx.user.create({
    data: { email: 'user@example.com' }
  });
  
  const profile = await tx.profile.create({
    data: { userId: user.id, bio: 'Hello world' }
  });
  
  const settings = await tx.userSettings.create({
    data: { userId: user.id, theme: 'dark' }
  });
  
  return { user, profile, settings };
});
```

Vision captures:
- The overall transaction duration
- Individual operation performance within the transaction
- Transaction success/failure status
- Rollback information if the transaction fails

## Performance Monitoring

### Slow Query Detection

```typescript
// Configure Vision to export to your monitoring service
import { init, createExporter } from '@rodrigopsasaki/vision';

const performanceExporter = createExporter('performance', {
  success: (context) => {
    // Alert on slow database operations
    if (context.duration > 1000) { // > 1 second
      alertSlowQuery({
        operation: context.name,
        duration: context.duration,
        model: context.data.model,
        query: context.data.sql_query
      });
    }
  }
});

init({ exporters: [performanceExporter] });
```

### Query Analysis

```typescript
// Track query patterns
const analyticsExporter = createExporter('analytics', {
  success: (context) => {
    if (context.data.model && context.data.operation) {
      trackQueryPattern({
        model: context.data.model,
        operation: context.data.operation,
        duration: context.data.duration_ms,
        resultCount: context.data.result_count
      });
    }
  }
});
```

## Error Handling and Debugging

When database operations fail, Vision automatically captures comprehensive error information:

```typescript
try {
  await prisma.user.create({
    data: {
      email: 'duplicate@example.com' // This email already exists
    }
  });
} catch (error) {
  // Vision automatically captures:
  // - The exact operation that failed
  // - SQL query and parameters
  // - Prisma error details
  // - Stack trace
  // - Timing information
  throw error;
}
```

Generated error context:
```json
{
  "name": "db.user.create",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "data": {
    "model": "user",
    "operation": "create",
    "status": "error",
    "error_type": "PrismaClientKnownRequestError",
    "error_message": "Unique constraint failed on the fields: (`email`)",
    "sql_query": "INSERT INTO \"User\" (\"email\") VALUES ($1)",
    "duration_ms": 23
  },
  "error": {
    "name": "PrismaClientKnownRequestError",
    "message": "Unique constraint failed on the fields: (`email`)",
    "stack": "..."
  },
  "duration": 25
}
```

## Advanced Integration Patterns

### Custom Operation Names

```typescript
// Wrap related operations with meaningful names
await observe('user.profile.complete_setup', async () => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { onboardingCompleted: true }
  });

  await prisma.profile.update({
    where: { userId },
    data: { isComplete: true }
  });

  await prisma.userSettings.create({
    data: { 
      userId,
      notifications: true,
      theme: 'system'
    }
  });
});
```

### Multi-Database Support

```typescript
// Different databases, different configurations
const mainDB = instrumentPrisma(new PrismaClient(), {
  operationPrefix: 'main_db',
  logQuery: true
});

const analyticsDB = instrumentPrisma(new PrismaClient({
  datasources: { db: { url: process.env.ANALYTICS_DATABASE_URL }}
}), {
  operationPrefix: 'analytics_db',
  logQuery: false,  // Analytics queries can be verbose
  logResultCount: true
});
```

### Development vs Production

```typescript
const isDev = process.env.NODE_ENV === 'development';

const prisma = instrumentPrisma(new PrismaClient(), {
  enabled: true,
  logParams: isDev,
  logQuery: isDev,
  logResultCount: true,
  maxQueryLength: isDev ? 2000 : 500,
  redactFields: isDev ? [] : [
    'password', 'token', 'secret', 'key', 'hash'
  ]
});
```

## Best Practices

### 1. Security First
- Always use `logParams: false` in production unless you need it for debugging
- Configure comprehensive `redactFields` for sensitive data
- Be careful with `logQuery: true` as it may expose sensitive information in WHERE clauses

### 2. Performance Considerations
- The instrumentation adds ~1-2ms overhead per operation
- Use `maxQueryLength` to prevent log bloat from large queries
- Consider disabling detailed logging in high-throughput scenarios

### 3. Meaningful Operation Names
```typescript
// Instead of letting every query create its own context
const users = await prisma.user.findMany();
const posts = await prisma.post.findMany();

// Wrap related operations with business context
await observe('dashboard.load', async () => {
  const users = await prisma.user.findMany();
  const posts = await prisma.post.findMany();
  vision.set('dashboard_type', 'admin');
});
```

### 4. Error Monitoring
```typescript
const errorExporter = createExporter('error_tracking', {
  error: async (context, error) => {
    // Send database errors to your error tracking service
    await sendToSentry({
      message: `Database operation failed: ${context.name}`,
      extra: {
        operation: context.data.operation,
        model: context.data.model,
        duration: context.data.duration_ms,
        query: context.data.sql_query
      },
      error
    });
  }
});
```

## TypeScript Support

The integration is fully typed and works seamlessly with Prisma's generated types:

```typescript
import type { VisionPrismaConfig } from '@rodrigopsasaki/vision-prisma';
import type { User, Post } from '@prisma/client';

const config: VisionPrismaConfig = {
  logParams: true,
  redactFields: ['password']
};

// Full type safety maintained
const user: User = await prisma.user.create({
  data: {
    email: 'typed@example.com',
    name: 'TypeScript User'
  }
});
```

## Integration with Other Tools

### OpenTelemetry
```typescript
import { createExporter } from '@rodrigopsasaki/vision';
import { trace } from '@opentelemetry/api';

const otelExporter = createExporter('opentelemetry', {
  success: (context) => {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent('database_operation', {
        operation: context.data.operation,
        model: context.data.model,
        duration: context.data.duration_ms
      });
    }
  }
});
```

### Prometheus Metrics
```typescript
const promClient = require('prom-client');

const dbOperationDuration = new promClient.Histogram({
  name: 'db_operation_duration_seconds',
  help: 'Database operation duration',
  labelNames: ['model', 'operation']
});

const promExporter = createExporter('prometheus', {
  success: (context) => {
    if (context.data.model && context.data.operation) {
      dbOperationDuration
        .labels(context.data.model, context.data.operation)
        .observe(context.data.duration_ms / 1000);
    }
  }
});
```

The Prisma integration makes database observability effortless while maintaining the full power and type safety of Prisma. Your existing code works unchanged, but now you have deep insights into every database operation.