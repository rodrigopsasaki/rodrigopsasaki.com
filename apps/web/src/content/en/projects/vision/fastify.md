---
title: "Vision Fastify Integration"
description: "High-performance observability for Fastify applications with multiple configuration variants optimized for different use cases."
tags: ["Fastify", "Vision", "Observability", "Plugin", "Performance", "TypeScript"]
parent: "vision"
npm: "https://www.npmjs.com/package/@rodrigopsasaki/vision-fastify"
github: "https://github.com/rodrigopsasaki/vision/tree/main/packages/vision-fastify"
order: 2
---

# Vision Fastify Integration

High-performance observability for Fastify applications with native plugin architecture and multiple performance variants.

## Quick Start

Install the Fastify integration:

```bash
npm install @rodrigopsasaki/vision @rodrigopsasaki/vision-fastify
```

Register Vision as a Fastify plugin:

```typescript
import Fastify from 'fastify';
import { visionPlugin } from '@rodrigopsasaki/vision-fastify';

const fastify = Fastify({ logger: true });

// Register Vision plugin
await fastify.register(visionPlugin, {
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 500
  }
});

// Routes automatically get Vision context
fastify.get('/users/:id', async (request, reply) => {
  vision.set('user_id', request.params.id);
  vision.set('operation', 'get_user');
  
  const user = await getUser(request.params.id);
  return user;
});

await fastify.listen({ port: 3000 });
```

## Performance Variants

Fastify integration offers pre-configured variants for different performance requirements:

### Minimal (Ultra-Fast)

Optimized for maximum performance with minimal overhead:

```typescript
import { createMinimalVisionPlugin } from '@rodrigopsasaki/vision-fastify';

await fastify.register(createMinimalVisionPlugin({
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 10,     // Very fast threshold
    trackMemoryUsage: false         // Skip memory tracking for speed
  },
  captureHeaders: false,            // Skip header capture
  captureBody: false,               // Skip body capture
  redactSensitiveData: false        // Skip redaction for speed
}));
```

### Comprehensive (Full Observability)

Complete observability with all features enabled:

```typescript
import { createComprehensiveVisionPlugin } from '@rodrigopsasaki/vision-fastify';

await fastify.register(createComprehensiveVisionPlugin({
  captureHeaders: true,
  captureBody: true,
  captureQuery: true,
  redactSensitiveData: true,
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 500,
    trackMemoryUsage: true,
    trackCpuUsage: true
  },
  errorHandling: {
    captureErrors: true,
    captureStackTrace: true,
    captureValidationErrors: true
  }
}));
```

### Performance-Optimized

Balanced configuration for production workloads:

```typescript
import { createPerformanceVisionPlugin } from '@rodrigopsasaki/vision-fastify';

await fastify.register(createPerformanceVisionPlugin({
  captureHeaders: ['user-agent', 'x-forwarded-for'],
  captureBody: false,
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 100,
    trackMemoryUsage: false
  },
  sampling: {
    enabled: true,
    rate: 0.1                       // Sample 10% of requests
  }
}));
```

## Plugin Configuration

The Fastify plugin supports comprehensive configuration:

```typescript
await fastify.register(visionPlugin, {
  // Context configuration
  contextName: (request) => `fastify.${request.method.toLowerCase()}.${request.routerPath}`,
  
  // Capture options
  captureBody: true,
  captureHeaders: true,
  captureQuery: true,
  captureParams: true,
  
  // Security & privacy
  redactSensitiveData: true,
  redactHeaders: ['authorization', 'cookie'],
  redactQueryParams: ['token', 'key'],
  redactBodyFields: ['password', 'secret'],
  
  // Performance monitoring
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 500,
    trackMemoryUsage: true,
    trackCpuUsage: false,
    trackEventLoopLag: true         // Fastify-specific metric
  },
  
  // Custom data extraction
  extractUser: (request) => request.user?.id || request.headers['x-user-id'],
  extractTenant: (request) => request.headers['x-tenant-id'],
  extractCorrelationId: (request) => request.headers['x-correlation-id'],
  
  // Route filtering
  excludeRoutes: ['/health', '/metrics'],
  shouldExcludeRoute: (request) => request.url.startsWith('/internal/'),
  
  // Error handling
  captureErrors: true,
  captureStackTrace: true,
  captureValidationErrors: true,    // Capture Fastify validation errors
  
  // Sampling (for high-traffic applications)
  sampling: {
    enabled: false,
    rate: 1.0,                      // Sample rate (0.0 to 1.0)
    strategy: 'random'              // 'random' or 'deterministic'
  }
});
```

## Fastify-Specific Features

### Access to Vision Context

```typescript
// Access Vision context in handlers
fastify.get('/users/:id', async (request, reply) => {
  // Direct access to Vision context
  const ctx = request.visionContext;
  
  // Add data to context
  vision.set('user_id', request.params.id);
  vision.set('handler_start', Date.now());
  
  const user = await getUser(request.params.id);
  
  vision.set('user_found', !!user);
  vision.set('user_role', user?.role);
  
  return user;
});
```

### Hook Integration

```typescript
// Use Fastify hooks with Vision
fastify.addHook('preHandler', async (request, reply) => {
  // Add authentication info to Vision context
  if (request.headers.authorization) {
    const token = request.headers.authorization.replace('Bearer ', '');
    const decoded = jwt.decode(token);
    
    vision.set('auth_user_id', decoded?.userId);
    vision.set('auth_role', decoded?.role);
    vision.set('token_exp', decoded?.exp);
  }
});

fastify.addHook('onResponse', async (request, reply) => {
  // Add response timing
  vision.set('response_time', reply.getResponseTime());
  vision.set('status_code', reply.statusCode);
  
  // Track business metrics
  if (request.routerPath === '/orders') {
    vision.set('order_endpoint_hit', true);
  }
});
```

### Schema Validation Integration

```typescript
const schema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 }
    }
  }
};

fastify.post('/login', { schema }, async (request, reply) => {
  // Vision automatically captures validation errors
  vision.set('validation_passed', true);
  vision.set('email', request.body.email);
  
  // Process login
  const result = await authenticateUser(request.body);
  return result;
});

// Validation errors are automatically captured by Vision
```

## Real-World Examples

### High-Performance API Gateway

```typescript
import Fastify from 'fastify';
import { createPerformanceVisionPlugin } from '@rodrigopsasaki/vision-fastify';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
});

// Optimized for API gateway workloads
await fastify.register(createPerformanceVisionPlugin({
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 50,     // Very aggressive threshold
    trackEventLoopLag: true,
    trackMemoryUsage: false
  },
  captureHeaders: ['user-agent', 'x-forwarded-for', 'x-real-ip'],
  captureBody: false,               // Don't capture bodies in gateway
  sampling: {
    enabled: true,
    rate: 0.05                      // Sample 5% of requests
  }
}));

// Service routing with Vision tracking
fastify.register(async function routes(fastify) {
  fastify.all('/api/users/*', async (request, reply) => {
    vision.set('service', 'user-service');
    vision.set('downstream_path', request.url);
    
    const response = await vision.observe('downstream.call', async () => {
      const result = await fetch(`http://user-service${request.url}`, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' ? JSON.stringify(request.body) : undefined
      });
      
      vision.set('downstream_status', result.status);
      vision.set('downstream_time', Date.now());
      
      return result;
    });
    
    reply.code(response.status);
    return response.json();
  });
});
```

### Microservice with Circuit Breaker

```typescript
import Fastify from 'fastify';
import { visionPlugin } from '@rodrigopsasaki/vision-fastify';

const fastify = Fastify({ logger: true });

await fastify.register(visionPlugin, {
  captureHeaders: true,
  captureBody: true,
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 1000,
    trackMemoryUsage: true
  }
});

// Circuit breaker state
const circuitBreakers = new Map();

fastify.post('/orders', async (request, reply) => {
  vision.set('order_id', request.body.orderId);
  vision.set('customer_id', request.body.customerId);
  vision.set('items_count', request.body.items.length);
  
  // Check inventory service with circuit breaker
  const inventoryResult = await vision.observe('inventory.check', async () => {
    const serviceName = 'inventory-service';
    const circuitState = circuitBreakers.get(serviceName) || 'closed';
    
    vision.set('circuit_breaker_state', circuitState);
    
    if (circuitState === 'open') {
      vision.set('circuit_breaker_tripped', true);
      throw new Error('Inventory service unavailable');
    }
    
    try {
      const response = await fetch('http://inventory-service/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: request.body.items }),
        timeout: 5000
      });
      
      if (!response.ok) {
        throw new Error(`Inventory check failed: ${response.status}`);
      }
      
      // Reset circuit breaker on success
      circuitBreakers.set(serviceName, 'closed');
      vision.set('inventory_check_success', true);
      
      return response.json();
      
    } catch (error) {
      // Trip circuit breaker on failure
      circuitBreakers.set(serviceName, 'open');
      vision.set('circuit_breaker_opened', true);
      vision.set('inventory_error', error.message);
      
      // Auto-reset after 30 seconds
      setTimeout(() => {
        circuitBreakers.set(serviceName, 'half-open');
      }, 30000);
      
      throw error;
    }
  });
  
  // Process order if inventory available
  if (inventoryResult.available) {
    const order = await vision.observe('order.create', async () => {
      const newOrder = await createOrder(request.body);
      vision.set('order_created', true);
      vision.set('order_total', newOrder.total);
      return newOrder;
    });
    
    return order;
  } else {
    vision.set('order_rejected', true);
    vision.set('rejection_reason', 'insufficient_inventory');
    reply.code(409);
    return { error: 'Insufficient inventory' };
  }
});
```

## Performance Optimization

### Sampling for High Traffic

```typescript
await fastify.register(visionPlugin, {
  sampling: {
    enabled: true,
    rate: 0.1,                      // Sample 10% of requests
    strategy: 'deterministic',      // Use deterministic sampling
    keyExtractor: (request) => {    // Custom sampling key
      return request.user?.id || request.ip;
    }
  }
});
```

### Memory Management

```typescript
await fastify.register(visionPlugin, {
  performance: {
    trackMemoryUsage: true,
    memoryWarningThreshold: 500,    // MB
    memoryErrorThreshold: 800       // MB
  },
  
  // Automatic cleanup for long-running contexts
  contextTimeout: 30000,            // 30 seconds
  maxContextSize: 1000             // Max data entries per context
});
```

### Event Loop Monitoring

```typescript
await fastify.register(visionPlugin, {
  performance: {
    trackEventLoopLag: true,
    eventLoopLagThreshold: 10,      // milliseconds
    trackEventLoopUtilization: true
  }
});

// Contexts automatically include:
// - event_loop_lag_ms
// - event_loop_utilization_percent
// - event_loop_blocked (boolean)
```

## Integration with Fastify Ecosystem

### With @fastify/jwt

```typescript
import jwt from '@fastify/jwt';

await fastify.register(jwt, { secret: 'supersecret' });

await fastify.register(visionPlugin, {
  extractUser: (request) => {
    try {
      const decoded = request.jwt.decode();
      return decoded?.userId;
    } catch {
      return null;
    }
  }
});

fastify.addHook('preHandler', async (request, reply) => {
  if (request.headers.authorization) {
    await request.jwtVerify();
    vision.set('auth_verified', true);
    vision.set('user_id', request.user.userId);
    vision.set('user_role', request.user.role);
  }
});
```

### With @fastify/multipart

```typescript
import multipart from '@fastify/multipart';

await fastify.register(multipart);

await fastify.register(visionPlugin, {
  captureMultipart: true,          // Capture multipart metadata
  redactMultipartFields: ['image', 'document']
});

fastify.post('/upload', async (request, reply) => {
  const data = await request.file();
  
  vision.set('upload_filename', data.filename);
  vision.set('upload_mimetype', data.mimetype);
  vision.set('upload_size', data.file.bytesRead);
  
  // Process upload
  const result = await processUpload(data);
  return result;
});
```

## Testing

Test your Vision-enabled Fastify routes:

```typescript
import { build } from './app';

describe('Vision Fastify Integration', () => {
  let app;

  beforeAll(async () => {
    app = build({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  test('should create Vision context', async () => {
    const contexts = [];
    
    // Override Vision configuration for testing
    app.vision.init({
      exporters: [{
        name: 'test',
        success: (ctx) => contexts.push(ctx)
      }]
    });

    const response = await app.inject({
      method: 'GET',
      url: '/users/123'
    });

    expect(response.statusCode).toBe(200);
    expect(contexts).toHaveLength(1);
    expect(contexts[0].name).toContain('fastify');
    expect(contexts[0].data.get('method')).toBe('GET');
  });
});
```

## Troubleshooting

### Common Issues

**Plugin registration order:**
```typescript
// ❌ Wrong - register Vision after routes
await fastify.register(apiRoutes);
await fastify.register(visionPlugin); // Too late

// ✅ Correct - register Vision before routes
await fastify.register(visionPlugin);
await fastify.register(apiRoutes);
```

**Memory leaks in high-traffic scenarios:**
```typescript
// ✅ Enable sampling and context cleanup
await fastify.register(visionPlugin, {
  sampling: { enabled: true, rate: 0.1 },
  contextTimeout: 30000,
  maxContextSize: 500
});
```

**Performance impact:**
```typescript
// ✅ Use performance-optimized variant
import { createPerformanceVisionPlugin } from '@rodrigopsasaki/vision-fastify';

await fastify.register(createPerformanceVisionPlugin({
  captureBody: false,
  captureHeaders: false,
  performance: {
    trackExecutionTime: true,
    trackMemoryUsage: false
  }
}));
```

The Fastify integration provides high-performance observability with native plugin architecture and multiple configuration variants to match your performance requirements.