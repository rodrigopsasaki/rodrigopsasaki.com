---
title: "Vision Express.js Integration"
description: "Complete guide to integrating Vision observability with Express.js applications, including middleware setup, configuration options, and production examples."
tags: ["Express.js", "Vision", "Observability", "Middleware", "TypeScript"]
parent: "vision"
npm: "https://www.npmjs.com/package/@rodrigopsasaki/vision-express"
github: "https://github.com/rodrigopsasaki/vision/tree/main/packages/vision-express"
order: 1
---

# Vision Express.js Integration

Complete observability for Express.js applications with zero configuration required.

## Quick Start

Install the Express.js integration:

```bash
npm install @rodrigopsasaki/vision @rodrigopsasaki/vision-express
```

Add Vision middleware to your Express app:

```typescript
import express from 'express';
import { vision } from '@rodrigopsasaki/vision';
import { visionMiddleware } from '@rodrigopsasaki/vision-express';

const app = express();

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
app.get('/users/:id', async (req, res) => {
  vision.set('user_id', req.params.id);
  vision.set('operation', 'get_user');
  
  const user = await getUser(req.params.id);
  res.json(user);
});

app.listen(3000);
```

That's it! Every HTTP request now creates a Vision context with automatic timing and metadata collection.

## Middleware Configuration

The Express middleware accepts comprehensive configuration options:

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
  extractUser: (req) => {              // Extract user information
    return req.user?.id || req.headers['x-user-id'];
  },
  extractTenant: (req) => {            // Extract tenant information
    return req.headers['x-tenant-id'];
  },
  extractCorrelationId: (req) => {     // Extract correlation ID
    return req.headers['x-correlation-id'] || 
           req.headers['x-request-id'];
  },
  
  // Route filtering
  excludeRoutes: [                     // Routes to exclude from tracking
    '/health',
    '/metrics', 
    '/favicon.ico'
  ],
  shouldExcludeRoute: (req) => {       // Custom exclusion logic
    return req.url.startsWith('/internal/');
  },
  
  // Error handling
  captureErrors: true,                 // Capture error details
  captureStackTrace: true              // Include stack traces in errors
}));
```

## Real-World Examples

### E-commerce API

```typescript
import express from 'express';
import { vision } from '@rodrigopsasaki/vision';
import { visionMiddleware } from '@rodrigopsasaki/vision-express';

const app = express();

// Production configuration
app.use(visionMiddleware({
  captureBody: true,
  captureHeaders: true,
  redactSensitiveData: true,
  redactBodyFields: ['creditCard', 'ssn', 'password'],
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 2000,
    trackMemoryUsage: true
  },
  extractUser: (req) => req.user?.id,
  extractTenant: (req) => req.headers['x-tenant-id']
}));

// Order processing endpoint
app.post('/orders', async (req, res) => {
  vision.set('customer_id', req.body.customerId);
  vision.set('items_count', req.body.items.length);
  vision.set('total_amount', req.body.total);
  
  try {
    // Inventory check
    await vision.observe('inventory.check', async () => {
      const results = await checkInventory(req.body.items);
      vision.set('inventory_status', results.allAvailable ? 'available' : 'partial');
      vision.set('unavailable_items', results.unavailable.length);
      
      if (!results.allAvailable) {
        throw new Error('Insufficient inventory');
      }
    });
    
    // Payment processing
    const payment = await vision.observe('payment.process', async () => {
      vision.set('payment_method', req.body.paymentMethod);
      
      const result = await processPayment({
        amount: req.body.total,
        method: req.body.paymentMethod,
        customerId: req.body.customerId
      });
      
      vision.set('payment_id', result.id);
      vision.set('payment_status', result.status);
      
      return result;
    });
    
    // Order creation
    const order = await vision.observe('order.create', async () => {
      const newOrder = await createOrder({
        customerId: req.body.customerId,
        items: req.body.items,
        paymentId: payment.id,
        total: req.body.total
      });
      
      vision.set('order_id', newOrder.id);
      vision.set('estimated_delivery', newOrder.estimatedDelivery);
      
      return newOrder;
    });
    
    // Success response
    vision.set('order_completed', true);
    res.json(order);
    
  } catch (error) {
    vision.set('error_type', error.name);
    vision.set('error_message', error.message);
    res.status(400).json({ error: error.message });
  }
});
```

### Authentication Service

```typescript
// User authentication with comprehensive tracking
app.post('/auth/login', async (req, res) => {
  vision.set('auth_method', 'email_password');
  vision.set('email', req.body.email);
  vision.set('ip_address', req.ip);
  vision.set('user_agent', req.headers['user-agent']);
  
  try {
    // Rate limiting check
    await vision.observe('auth.rate_limit_check', async () => {
      const attempts = await redis.get(`login_attempts:${req.ip}`);
      vision.set('previous_attempts', attempts || 0);
      
      if (attempts > 5) {
        vision.set('rate_limited', true);
        throw new Error('Too many login attempts');
      }
    });
    
    // User lookup
    const user = await vision.observe('auth.user_lookup', async () => {
      const foundUser = await User.findOne({ email: req.body.email });
      vision.set('user_exists', !!foundUser);
      
      if (!foundUser) {
        throw new Error('User not found');
      }
      
      vision.set('user_id', foundUser.id);
      vision.set('user_role', foundUser.role);
      vision.set('account_status', foundUser.status);
      
      return foundUser;
    });
    
    // Password verification
    await vision.observe('auth.password_verify', async () => {
      const isValid = await bcrypt.compare(req.body.password, user.hashedPassword);
      vision.set('password_valid', isValid);
      
      if (!isValid) {
        await redis.incr(`login_attempts:${req.ip}`);
        vision.set('login_failed', true);
        throw new Error('Invalid credentials');
      }
    });
    
    // Session creation
    const session = await vision.observe('auth.session_create', async () => {
      const sessionToken = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      await redis.set(`session:${sessionToken}`, JSON.stringify(user), 'EX', 86400);
      
      vision.set('session_created', true);
      vision.set('session_ttl', 86400);
      
      return sessionToken;
    });
    
    // Success response
    vision.set('login_successful', true);
    res.json({
      token: session,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
    
  } catch (error) {
    vision.set('login_failed', true);
    vision.set('failure_reason', error.message);
    res.status(401).json({ error: error.message });
  }
});
```

## Error Handling

Vision automatically captures and enriches errors in Express applications:

```typescript
// Automatic error capture
app.get('/users/:id', async (req, res) => {
  vision.set('user_id', req.params.id);
  
  try {
    const user = await getUser(req.params.id);
    res.json(user);
  } catch (error) {
    // Vision automatically captures error details
    // Error context includes: request data, timing, error stack trace
    res.status(500).json({ error: 'User not found' });
  }
});

// Manual error enrichment
app.post('/payments', async (req, res) => {
  vision.set('payment_amount', req.body.amount);
  vision.set('payment_method', req.body.method);
  
  try {
    const result = await processPayment(req.body);
    res.json(result);
  } catch (error) {
    // Add custom error context
    vision.set('payment_failed', true);
    vision.set('failure_code', error.code);
    vision.set('gateway_response', error.gatewayResponse);
    
    res.status(400).json({ error: error.message });
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
  contextName: (req) => `${req.method.toLowerCase()}.${req.route?.path || 'unknown'}`
}));

// Creates contexts like: "get./users/:id", "post./orders"
```

### Multi-tenant Support

```typescript
app.use(visionMiddleware({
  extractTenant: (req) => req.headers['x-tenant-id'],
  contextName: (req) => {
    const tenant = req.headers['x-tenant-id'];
    const route = req.route?.path || 'unknown';
    return `${tenant}.${req.method.toLowerCase()}.${route}`;
  }
}));
```

### Integration with Other Middleware

```typescript
// Vision works seamlessly with other Express middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());

// Add Vision after body parsing but before routes
app.use(visionMiddleware({
  captureBody: true,  // Now has access to parsed body
  captureHeaders: true
}));

// Your routes
app.use('/api', apiRoutes);
```

## Production Deployment

### Health Check Exclusion

```typescript
app.use(visionMiddleware({
  excludeRoutes: [
    '/health',
    '/ready',
    '/metrics',
    '/favicon.ico'
  ],
  shouldExcludeRoute: (req) => {
    // Exclude internal monitoring endpoints
    return req.url.startsWith('/_internal/') ||
           req.url.startsWith('/actuator/');
  }
}));
```

### Load Balancer Integration

```typescript
app.use(visionMiddleware({
  extractCorrelationId: (req) => {
    // Support multiple correlation ID headers
    return req.headers['x-correlation-id'] ||
           req.headers['x-request-id'] ||
           req.headers['x-trace-id'] ||
           req.headers['request-id'];
  },
  
  // Capture load balancer information
  extractLoadBalancer: (req) => {
    return req.headers['x-forwarded-by'] ||
           req.headers['x-lb-name'];
  }
}));
```

### Kubernetes Deployment

```typescript
// Extract Kubernetes metadata
app.use(visionMiddleware({
  extractServiceInfo: (req) => ({
    pod_name: process.env.HOSTNAME,
    namespace: process.env.NAMESPACE,
    service_name: process.env.SERVICE_NAME,
    version: process.env.VERSION
  })
}));
```

## Testing

Test your Vision-enabled Express routes:

```typescript
import request from 'supertest';
import { vision } from '@rodrigopsasaki/vision';

describe('Vision Express Integration', () => {
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

    await request(app)
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
app.get('/users', (req, res) => {
  vision.set('user_id', '123'); // Throws error
});

// ✅ Correct - Install Vision middleware first
app.use(visionMiddleware());
app.get('/users', (req, res) => {
  vision.set('user_id', '123'); // Works
});
```

**Memory leaks in long-running processes:**
```typescript
// ✅ Configure appropriate thresholds
app.use(visionMiddleware({
  performance: {
    trackMemoryUsage: true,
    memoryWarningThreshold: 500 // MB
  }
}));
```

**Sensitive data in logs:**
```typescript
// ✅ Enable data redaction
app.use(visionMiddleware({
  redactSensitiveData: true,
  redactBodyFields: ['password', 'token', 'secret'],
  redactHeaders: ['authorization', 'cookie']
}));
```

The Express.js integration provides production-ready observability with minimal setup. Every request becomes a rich, structured event with automatic timing, error capture, and customizable metadata collection.