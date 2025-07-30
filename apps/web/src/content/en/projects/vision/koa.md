---
title: "Vision Koa Integration"
description: "Complete guide to integrating Vision observability with Koa applications, including middleware setup, async/await support, and modern Node.js patterns."
tags: ["Koa", "Vision", "Observability", "Middleware", "TypeScript", "Async/Await"]
parent: "vision"
npm: "https://www.npmjs.com/package/@rodrigopsasaki/vision-koa"
github: "https://github.com/rodrigopsasaki/vision/tree/main/packages/vision-koa"
order: 3
---

# Vision Koa Integration

Elegant observability for Koa applications with native async/await support and modern middleware patterns.

## Quick Start

Install the Koa integration:

```bash
npm install @rodrigopsasaki/vision @rodrigopsasaki/vision-koa
```

Add Vision middleware to your Koa app:

```typescript
import Koa from 'koa';
import { vision } from '@rodrigopsasaki/vision';
import { visionMiddleware } from '@rodrigopsasaki/vision-koa';

const app = new Koa();

// Setup Vision (optional - works without configuration)
vision.init({
  exporters: [
    {
      name: 'console',
      success: (ctx) => console.log('✓', ctx.name, `${ctx.duration}ms`),
      error: (ctx, err) => console.error('✗', ctx.name, err.message)
    }
  ]
});

// Add Vision middleware - every route is now traced
app.use(visionMiddleware());

// Your routes automatically get Vision context
app.use(async (ctx) => {
  if (ctx.path === '/users/:id') {
    vision.set('user_id', ctx.params.id);
    vision.set('operation', 'get_user');
    
    const user = await getUser(ctx.params.id);
    ctx.body = user;
  }
});

app.listen(3000);
```

Every HTTP request now creates a Vision context with automatic timing and metadata collection.

## Middleware Configuration

The Koa middleware accepts comprehensive configuration options:

```typescript
app.use(visionMiddleware({
  // Capture options
  captureBody: true,                    // Capture request/response bodies
  captureHeaders: true,                 // Capture HTTP headers
  captureQuery: true,                   // Capture query parameters
  
  // Security & privacy
  redactSensitiveData: true,           // Enable automatic data redaction
  redactHeaders: [                     // Headers to redact
    'authorization',
    'cookie',
    'x-api-key'
  ],
  redactQueryParams: [                 // Query params to redact
    'token',
    'key',
    'secret',
    'password'
  ],
  redactBodyFields: [                  // Body fields to redact
    'password',
    'ssn',
    'creditCard'
  ],
  
  // Performance monitoring
  performance: {
    trackExecutionTime: true,          // Track request processing time
    slowOperationThreshold: 1000,      // Mark requests > 1s as slow
    trackMemoryUsage: true             // Track memory usage
  },
  
  // Custom data extraction
  extractUser: (ctx) => {              // Extract user information
    return ctx.state.user?.id || ctx.headers['x-user-id'];
  },
  extractTenant: (ctx) => {            // Extract tenant information
    return ctx.headers['x-tenant-id'];
  },
  extractCorrelationId: (ctx) => {     // Extract correlation ID
    return ctx.headers['x-correlation-id'] || 
           ctx.headers['x-request-id'];
  },
  
  // Route filtering
  excludeRoutes: [                     // Routes to exclude from tracking
    '/health',
    '/metrics', 
    '/favicon.ico'
  ],
  shouldExcludeRoute: (ctx) => {       // Custom exclusion logic
    return ctx.path.startsWith('/internal/');
  },
  
  // Error handling
  captureErrors: true,                 // Capture error details
  captureStackTrace: true              // Include stack traces in errors
}));
```

## Real-World Examples

### API Gateway with Koa

```typescript
import Koa from 'koa';
import Router from '@koa/router';
import { vision } from '@rodrigopsasaki/vision';
import { visionMiddleware } from '@rodrigopsasaki/vision-koa';

const app = new Koa();
const router = new Router();

// Production configuration
app.use(visionMiddleware({
  captureBody: true,
  captureHeaders: true,
  redactSensitiveData: true,
  redactBodyFields: ['apiKey', 'secret', 'password'],
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 1500,
    trackMemoryUsage: true
  },
  extractUser: (ctx) => ctx.state.user?.id,
  extractTenant: (ctx) => ctx.headers['x-tenant-id']
}));

// Proxy endpoint with comprehensive tracking
router.post('/api/proxy/:service', async (ctx) => {
  vision.set('target_service', ctx.params.service);
  vision.set('proxy_method', ctx.method);
  vision.set('request_size', JSON.stringify(ctx.request.body).length);
  
  try {
    // Service discovery
    const serviceUrl = await vision.observe('service.discovery', async () => {
      const url = await discoverService(ctx.params.service);
      vision.set('service_url', url);
      vision.set('discovery_cache_hit', !!url);
      
      if (!url) {
        throw new Error(`Service ${ctx.params.service} not found`);
      }
      
      return url;
    });
    
    // Request forwarding
    const response = await vision.observe('proxy.forward', async () => {
      vision.set('upstream_request_start', Date.now());
      
      const result = await fetch(serviceUrl, {
        method: ctx.method,
        headers: {
          ...ctx.headers,
          'x-forwarded-by': 'api-gateway',
          'x-correlation-id': ctx.headers['x-correlation-id']
        },
        body: ctx.method !== 'GET' ? JSON.stringify(ctx.request.body) : undefined
      });
      
      vision.set('upstream_status', result.status);
      vision.set('upstream_response_time', Date.now() - vision.get('upstream_request_start'));
      
      const data = await result.json();
      vision.set('response_size', JSON.stringify(data).length);
      
      return { status: result.status, data };
    });
    
    // Response transformation
    await vision.observe('response.transform', async () => {
      // Apply any response transformations
      vision.set('transformation_applied', true);
      
      ctx.status = response.status;
      ctx.body = response.data;
    });
    
    vision.set('proxy_successful', true);
    
  } catch (error) {
    vision.set('proxy_failed', true);
    vision.set('error_type', error.name);
    vision.set('error_message', error.message);
    
    ctx.status = 500;
    ctx.body = { error: 'Proxy request failed' };
  }
});
```

### Authentication Middleware

```typescript
// Custom authentication middleware with Vision tracking
const authMiddleware = async (ctx, next) => {
  await vision.observe('auth.middleware', async () => {
    vision.set('auth_required', true);
    vision.set('request_ip', ctx.ip);
    vision.set('user_agent', ctx.headers['user-agent']);
    
    const token = ctx.headers.authorization?.replace('Bearer ', '');
    vision.set('token_provided', !!token);
    
    if (!token) {
      vision.set('auth_failed', true);
      vision.set('failure_reason', 'no_token');
      ctx.throw(401, 'Authentication required');
    }
    
    try {
      // Token validation
      const user = await vision.observe('auth.token_validate', async () => {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        vision.set('token_valid', true);
        vision.set('token_user_id', decoded.userId);
        vision.set('token_role', decoded.role);
        
        const user = await User.findById(decoded.userId);
        if (!user) {
          throw new Error('User not found');
        }
        
        vision.set('user_exists', true);
        vision.set('user_status', user.status);
        
        return user;
      });
      
      // Set user context
      ctx.state.user = user;
      vision.set('auth_successful', true);
      vision.set('authenticated_user_id', user.id);
      vision.set('user_role', user.role);
      
    } catch (error) {
      vision.set('auth_failed', true);
      vision.set('failure_reason', error.message);
      ctx.throw(401, 'Invalid token');
    }
  });
  
  await next();
};

// Apply auth middleware with Vision context
router.use('/protected/*', authMiddleware);
```

## Error Handling

Vision automatically captures and enriches errors in Koa applications:

```typescript
// Automatic error capture
router.get('/users/:id', async (ctx) => {
  vision.set('user_id', ctx.params.id);
  
  try {
    const user = await getUser(ctx.params.id);
    ctx.body = user;
  } catch (error) {
    // Vision automatically captures error details
    // Error context includes: request data, timing, error stack trace
    ctx.throw(404, 'User not found');
  }
});

// Global error handler with Vision integration
app.on('error', (err, ctx) => {
  // Vision context is available in error handlers
  vision.set('global_error', true);
  vision.set('error_stack', err.stack);
  vision.set('error_url', ctx.originalUrl);
  vision.set('error_method', ctx.method);
  
  console.error('Global error:', err);
});
```

## Async/Await Patterns

Koa's native async/await support works perfectly with Vision:

```typescript
// Sequential operations with Vision tracking
router.post('/orders', async (ctx) => {
  vision.set('order_data', ctx.request.body);
  
  try {
    // Step 1: Validate inventory
    const inventory = await vision.observe('inventory.validate', async () => {
      const results = await Promise.all(
        ctx.request.body.items.map(item => checkInventory(item.id, item.quantity))
      );
      
      vision.set('inventory_checks', results.length);
      vision.set('all_available', results.every(r => r.available));
      
      return results;
    });
    
    // Step 2: Calculate pricing
    const pricing = await vision.observe('pricing.calculate', async () => {
      const basePrice = ctx.request.body.items.reduce((sum, item) => sum + item.price, 0);
      const discounts = await calculateDiscounts(ctx.state.user.id, basePrice);
      const taxes = await calculateTaxes(basePrice - discounts, ctx.request.body.shippingAddress);
      
      vision.set('base_price', basePrice);
      vision.set('discounts_applied', discounts);
      vision.set('taxes_calculated', taxes);
      
      return { basePrice, discounts, taxes, total: basePrice - discounts + taxes };
    });
    
    // Step 3: Process payment
    const payment = await vision.observe('payment.process', async () => {
      const result = await processPayment({
        amount: pricing.total,
        customerId: ctx.state.user.id,
        paymentMethod: ctx.request.body.paymentMethod
      });
      
      vision.set('payment_id', result.id);
      vision.set('payment_status', result.status);
      
      return result;
    });
    
    // Step 4: Create order
    const order = await vision.observe('order.create', async () => {
      const newOrder = await Order.create({
        customerId: ctx.state.user.id,
        items: ctx.request.body.items,
        pricing,
        paymentId: payment.id
      });
      
      vision.set('order_id', newOrder.id);
      vision.set('order_created', true);
      
      return newOrder;
    });
    
    ctx.body = order;
    
  } catch (error) {
    vision.set('order_failed', true);
    vision.set('failure_stage', error.stage || 'unknown');
    ctx.throw(400, error.message);
  }
});
```

## Performance Monitoring

Track performance metrics for every request:

```typescript
app.use(visionMiddleware({
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 1000,       // Mark requests > 1s as slow
    trackMemoryUsage: true,
    trackCpuUsage: false                 // Optional CPU tracking
  }
}));

// Requests automatically get performance data:
// - execution_time_ms
// - memory_usage_mb  
// - slow_operation (boolean)
// - performance_category (fast/normal/slow)
```

## Advanced Configuration

### Custom Context Names

```typescript
app.use(visionMiddleware({
  contextName: (ctx) => `${ctx.method.toLowerCase()}.${ctx.path}`
}));

// Creates contexts like: "get./users/123", "post./orders"
```

### Multi-tenant Support

```typescript
app.use(visionMiddleware({
  extractTenant: (ctx) => ctx.headers['x-tenant-id'],
  contextName: (ctx) => {
    const tenant = ctx.headers['x-tenant-id'];
    return `${tenant}.${ctx.method.toLowerCase()}.${ctx.path}`;
  }
}));
```

## Production Deployment

### Health Check Exclusion

```typescript
app.use(visionMiddleware({
  excludeRoutes: [
    '/health',
    '/ready',
    '/metrics'
  ],
  shouldExcludeRoute: (ctx) => {
    // Exclude internal monitoring endpoints
    return ctx.path.startsWith('/_internal/') ||
           ctx.path.startsWith('/actuator/');
  }
}));
```

### Load Balancer Integration

```typescript
app.use(visionMiddleware({
  extractCorrelationId: (ctx) => {
    // Support multiple correlation ID headers
    return ctx.headers['x-correlation-id'] ||
           ctx.headers['x-request-id'] ||
           ctx.headers['x-trace-id'];
  }
}));
```

## Testing

Test your Vision-enabled Koa routes:

```typescript
import request from 'supertest';
import { vision } from '@rodrigopsasaki/vision';

describe('Vision Koa Integration', () => {
  beforeEach(() => {
    // Clear Vision context between tests
    vision.init({ exporters: [] });
  });

  it('should create Vision context for requests', async () => {
    const contexts = [];
    
    vision.init({
      exporters: [{
        name: 'test',
        success: (ctx) => contexts.push(ctx)
      }]
    });

    await request(app.callback())
      .get('/users/123')
      .expect(200);

    expect(contexts).toHaveLength(1);
    expect(contexts[0].name).toBe('http.request');
    expect(contexts[0].data.get('method')).toBe('GET');
    expect(contexts[0].data.get('url')).toBe('/users/123');
  });
});
```

## Troubleshooting

### Common Issues

**Context not available in middleware:**
```typescript
// ❌ Wrong - Vision middleware not installed
app.use(async (ctx) => {
  vision.set('user_id', '123'); // Throws error
});

// ✅ Correct - Install Vision middleware first
app.use(visionMiddleware());
app.use(async (ctx) => {
  vision.set('user_id', '123'); // Works
});
```

**Async context loss:**
```typescript
// ✅ Ensure proper async/await usage
router.get('/users', async (ctx) => {
  // Good - maintains context
  const user = await getUser();
  vision.set('user_found', !!user);
  
  // Good - maintains context in Promise.all
  const [profile, settings] = await Promise.all([
    getUserProfile(user.id),
    getUserSettings(user.id)
  ]);
  
  ctx.body = { user, profile, settings };
});
```

The Koa integration provides elegant observability with native async/await support and modern middleware patterns. Every request becomes a rich, structured event with automatic timing, error capture, and customizable metadata collection.