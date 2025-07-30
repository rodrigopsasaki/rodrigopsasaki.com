---
title: "Vision Datadog Exporter"
description: "Production-ready Datadog integration for Vision with circuit breakers, batching, OpenTelemetry compliance, and comprehensive monitoring capabilities."
tags: ["Datadog", "Vision", "Observability", "Production", "Monitoring", "OpenTelemetry"]
parent: "vision"
npm: "https://www.npmjs.com/package/@rodrigopsasaki/vision-datadog-exporter"
github: "https://github.com/rodrigopsasaki/vision/tree/main/packages/vision-datadog-exporter"
order: 5
---

# Vision Datadog Exporter

Production-ready Datadog integration with circuit breakers, batching, OpenTelemetry compliance, and enterprise-grade reliability features.

## Quick Start

Install the Datadog exporter:

```bash
npm install @rodrigopsasaki/vision @rodrigopsasaki/vision-datadog-exporter
```

Configure Vision with Datadog export:

```typescript
import { vision } from '@rodrigopsasaki/vision';
import { DatadogExporter } from '@rodrigopsasaki/vision-datadog-exporter';

// Basic configuration
vision.init({
  exporters: [
    new DatadogExporter({
      apiKey: process.env.DATADOG_API_KEY,
      site: 'datadoghq.com',  // or 'datadoghq.eu' for EU
      service: 'my-app',
      env: process.env.NODE_ENV,
      version: process.env.APP_VERSION
    })
  ]
});

// Your application code
await vision.observe('user.create', async () => {
  vision.set('user_id', 'user123');
  vision.set('email', 'user@example.com');
  
  const user = await createUser();
  vision.set('success', true);
});
```

This sends structured events directly to Datadog with proper tagging and metadata.

## Configuration Options

### Basic Configuration

```typescript
const datadogExporter = new DatadogExporter({
  // Required
  apiKey: process.env.DATADOG_API_KEY,
  
  // Service identification
  service: 'my-application',
  env: 'production',
  version: '1.2.3',
  
  // Datadog site
  site: 'datadoghq.com',  // US1
  // site: 'datadoghq.eu',   // EU
  // site: 'us3.datadoghq.com',  // US3
  // site: 'us5.datadoghq.com',  // US5
  
  // Optional hostname override
  hostname: 'app-server-01'
});
```

### Advanced Configuration

```typescript
const datadogExporter = new DatadogExporter({
  apiKey: process.env.DATADOG_API_KEY,
  service: 'my-application',
  env: 'production',
  
  // Batching configuration
  batch: {
    enabled: true,
    maxSize: 100,           // Max events per batch
    maxWaitMs: 5000,        // Max wait time before sending
    maxBytes: 1024 * 1024   // Max batch size in bytes (1MB)
  },
  
  // Circuit breaker configuration
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,    // Failures before opening circuit
    resetTimeout: 30000,    // Time before trying again (30s)
    monitoringWindow: 60000 // Window for failure tracking (60s)
  },
  
  // Retry configuration
  retry: {
    enabled: true,
    maxAttempts: 3,         // Max retry attempts
    backoffMs: 1000,        // Base backoff time
    backoffMultiplier: 2,   // Exponential backoff multiplier
    jitter: true            // Add random jitter to backoff
  },
  
  // Rate limiting
  rateLimit: {
    enabled: true,
    requestsPerSecond: 100, // Max requests per second
    burstSize: 200          // Burst capacity
  },
  
  // Data transformation
  transform: {
    // Custom field mapping
    fieldMapping: {
      'user_id': 'dd.user.id',
      'request_id': 'dd.trace_id'
    },
    
    // Custom tags
    globalTags: {
      team: 'backend',
      component: 'api',
      datacenter: 'us-east-1'
    },
    
    // Field filtering
    allowedFields: ['user_id', 'operation', 'duration'],
    blockedFields: ['password', 'api_key', 'token'],
    
    // Value transformations
    transformers: {
      email: (value) => hashEmail(value),  // Hash PII
      amount: (value) => Math.round(value * 100) / 100  // Round currency
    }
  },
  
  // OpenTelemetry compliance
  openTelemetry: {
    enabled: true,
    traceIdField: 'trace_id',
    spanIdField: 'span_id',
    samplingRate: 1.0       // 100% sampling
  },
  
  // Error handling
  errorHandling: {
    suppressErrors: false,   // Don't suppress export errors
    errorCallback: (error, context) => {
      console.error('Datadog export failed:', error);
      // Send to alternative monitoring
    }
  }
});
```

## Production Examples

### E-commerce Application

```typescript
import { vision } from '@rodrigopsasaki/vision';
import { DatadogExporter } from '@rodrigopsasaki/vision-datadog-exporter';

// Production-grade configuration
const datadogExporter = new DatadogExporter({
  apiKey: process.env.DATADOG_API_KEY,
  service: 'ecommerce-api',
  env: process.env.NODE_ENV,
  version: process.env.GIT_SHA,
  
  // High-throughput configuration
  batch: {
    enabled: true,
    maxSize: 500,
    maxWaitMs: 2000,
    maxBytes: 2 * 1024 * 1024  // 2MB batches
  },
  
  // Resilient circuit breaker
  circuitBreaker: {
    enabled: true,
    failureThreshold: 10,
    resetTimeout: 60000,
    monitoringWindow: 120000
  },
  
  // Business-specific tags
  transform: {
    globalTags: {
      service: 'ecommerce-api',
      team: 'platform',
      business_unit: 'retail',
      cost_center: 'engineering'
    },
    
    // PII protection
    transformers: {
      email: (email) => crypto.createHash('sha256').update(email).digest('hex').substring(0, 8),
      credit_card: () => '[REDACTED]',
      ssn: () => '[REDACTED]'
    },
    
    // Performance categorization
    customTransforms: (context) => {
      const duration = context.duration;
      return {
        ...context.data,
        performance_tier: duration < 100 ? 'fast' : duration < 500 ? 'normal' : 'slow',
        error_category: context.error ? classifyError(context.error) : null
      };
    }
  }
});

vision.init({ exporters: [datadogExporter] });

// Order processing with rich tracking
app.post('/orders', async (req, res) => {
  await vision.observe('order.process', async () => {
    vision.set('customer_id', req.body.customerId);
    vision.set('order_value', req.body.total);
    vision.set('items_count', req.body.items.length);
    vision.set('payment_method', req.body.paymentMethod);
    vision.set('shipping_country', req.body.shippingAddress.country);
    
    // This will appear in Datadog as:
    // - Metrics: order.process.duration, order.process.count
    // - Tags: customer_id, payment_method, shipping_country
    // - Custom fields: order_value, items_count
    
    try {
      const order = await processOrder(req.body);
      vision.set('order_id', order.id);
      vision.set('success', true);
      vision.set('fulfillment_center', order.fulfillmentCenter);
      
      res.json(order);
    } catch (error) {
      vision.set('error_type', error.name);
      vision.set('error_code', error.code);
      vision.set('success', false);
      throw error;
    }
  });
});
```

### Microservice Architecture

```typescript
// Service A: User Service
const userServiceExporter = new DatadogExporter({
  apiKey: process.env.DATADOG_API_KEY,
  service: 'user-service',
  env: process.env.NODE_ENV,
  
  transform: {
    globalTags: {
      service_type: 'microservice',
      domain: 'identity',
      sla_tier: 'critical'
    }
  }
});

// Service B: Payment Service  
const paymentServiceExporter = new DatadogExporter({
  apiKey: process.env.DATADOG_API_KEY,
  service: 'payment-service',
  env: process.env.NODE_ENV,
  
  transform: {
    globalTags: {
      service_type: 'microservice',
      domain: 'financial',
      sla_tier: 'critical',
      pci_compliant: 'true'
    },
    
    // Extra security for payment service
    transformers: {
      card_number: () => '[REDACTED]',
      cvv: () => '[REDACTED]',
      bank_account: () => '[REDACTED]'
    }
  }
});

// Distributed tracing correlation
app.use(async (req, res, next) => {
  const traceId = req.headers['x-trace-id'] || generateTraceId();
  
  await vision.observe('http.request', async () => {
    vision.set('trace_id', traceId);
    vision.set('service_name', 'user-service');
    vision.set('request_path', req.path);
    vision.set('request_method', req.method);
    
    // Forward trace ID to downstream services
    req.headers['x-trace-id'] = traceId;
    
    next();
  });
});
```

## Monitoring & Alerting

### Custom Metrics

The Datadog exporter automatically creates metrics from your Vision events:

```typescript
// This Vision observation...
await vision.observe('payment.process', async () => {
  vision.set('amount', 99.99);
  vision.set('currency', 'USD');
  vision.set('payment_method', 'credit_card');
  
  // Process payment...
  vision.set('success', true);
});

// ...generates these Datadog metrics:
// - payment.process.duration (timing)
// - payment.process.count (counter)
// - payment.process.success_rate (derived)
```

### Dashboard Configuration

Create Datadog dashboards with Vision metrics:

```json
{
  "title": "Vision Application Metrics",
  "widgets": [
    {
      "definition": {
        "type": "timeseries",
        "title": "Request Duration",
        "requests": [
          {
            "q": "avg:vision.http.request.duration{service:my-app} by {endpoint}",
            "display_type": "line"
          }
        ]
      }
    },
    {
      "definition": {
        "type": "query_value",
        "title": "Error Rate",
        "requests": [
          {
            "q": "sum:vision.*.error{service:my-app}.as_rate()",
            "aggregator": "avg"
          }
        ]
      }
    },
    {
      "definition": {
        "type": "toplist",
        "title": "Slowest Operations",
        "requests": [
          {
            "q": "top(avg:vision.*.duration{service:my-app} by {operation}, 10, 'mean', 'desc')"
          }
        ]
      }
    }
  ]
}
```

### Alert Configuration

Set up alerts based on Vision metrics:

```typescript
// Configure alerts in your infrastructure code
const alerts = [
  {
    name: 'High Error Rate',
    query: 'avg(last_5m):sum:vision.*.error{service:my-app}.as_rate() > 0.05',
    message: 'Error rate above 5% for {{service.name}}',
    tags: ['team:backend', 'severity:high']
  },
  {
    name: 'Slow Response Time',
    query: 'avg(last_5m):avg:vision.http.request.duration{service:my-app} > 2000',
    message: 'Average response time above 2s for {{service.name}}',
    tags: ['team:backend', 'severity:medium']
  },
  {
    name: 'Circuit Breaker Open',
    query: 'max(last_1m):max:vision.circuit_breaker.state{service:my-app} >= 1',
    message: 'Circuit breaker is open for {{service.name}}',
    tags: ['team:backend', 'severity:critical']
  }
];
```

## OpenTelemetry Integration

The Datadog exporter supports OpenTelemetry standards:

```typescript
const datadogExporter = new DatadogExporter({
  apiKey: process.env.DATADOG_API_KEY,
  service: 'my-app',
  
  // OpenTelemetry configuration
  openTelemetry: {
    enabled: true,
    
    // Map Vision context to OpenTelemetry spans
    traceIdField: 'trace_id',
    spanIdField: 'span_id',
    parentSpanIdField: 'parent_span_id',
    
    // Span attributes mapping
    spanAttributes: {
      'http.method': 'request_method',
      'http.url': 'request_url',
      'http.status_code': 'response_status',
      'user.id': 'user_id'
    },
    
    // Resource attributes
    resourceAttributes: {
      'service.name': 'my-app',
      'service.version': process.env.APP_VERSION,
      'deployment.environment': process.env.NODE_ENV
    }
  }
});

// Distributed tracing example
app.use(async (req, res, next) => {
  const traceId = req.headers['x-trace-id'] || generateTraceId();
  const spanId = generateSpanId();
  
  await vision.observe('http.request', async () => {
    // OpenTelemetry-compliant fields
    vision.set('trace_id', traceId);
    vision.set('span_id', spanId);
    vision.set('parent_span_id', req.headers['x-parent-span-id']);
    
    // Standard HTTP attributes
    vision.set('http.method', req.method);
    vision.set('http.url', req.url);
    vision.set('http.user_agent', req.headers['user-agent']);
    
    next();
    
    // Response attributes
    vision.set('http.status_code', res.statusCode);
    vision.set('http.response_size', res.get('content-length'));
  });
});
```

## Performance & Scalability

### High-Throughput Configuration

```typescript
// Optimized for high-volume applications
const datadogExporter = new DatadogExporter({
  apiKey: process.env.DATADOG_API_KEY,
  service: 'high-volume-api',
  
  // Aggressive batching
  batch: {
    enabled: true,
    maxSize: 1000,           // Large batches
    maxWaitMs: 1000,         // Fast batching
    maxBytes: 5 * 1024 * 1024 // 5MB batches
  },
  
  // High rate limits
  rateLimit: {
    enabled: true,
    requestsPerSecond: 1000,
    burstSize: 2000
  },
  
  // Minimal retries for speed
  retry: {
    enabled: true,
    maxAttempts: 2,
    backoffMs: 500
  },
  
  // Selective field inclusion
  transform: {
    allowedFields: [
      'user_id', 'request_id', 'duration', 
      'success', 'error_type', 'operation'
    ]
  }
});
```

### Memory Management

```typescript
// Memory-optimized configuration
const datadogExporter = new DatadogExporter({
  apiKey: process.env.DATADOG_API_KEY,
  service: 'memory-optimized-app',
  
  // Frequent batching to reduce memory usage
  batch: {
    enabled: true,
    maxSize: 100,
    maxWaitMs: 2000,
    maxBytes: 512 * 1024  // 512KB batches
  },
  
  // Field limits
  transform: {
    maxFieldLength: 1000,      // Truncate long values
    maxNestedDepth: 3,         // Limit object nesting
    excludeLargeFields: true   // Skip fields > 10KB
  }
});
```

## Testing

Test your Datadog integration:

```typescript
import { DatadogExporter } from '@rodrigopsasaki/vision-datadog-exporter';
import { vision } from '@rodrigopsasaki/vision';

describe('Datadog Integration', () => {
  let mockDatadogApi: jest.MockedFunction<any>;
  
  beforeEach(() => {
    mockDatadogApi = jest.fn().mockResolvedValue({ status: 202 });
    
    const exporter = new DatadogExporter({
      apiKey: 'test-key',
      service: 'test-app',
      
      // Use mock for testing
      httpClient: mockDatadogApi
    });
    
    vision.init({ exporters: [exporter] });
  });

  it('should send events to Datadog', async () => {
    await vision.observe('test.operation', async () => {
      vision.set('test_field', 'test_value');
    });

    // Wait for batch to be sent
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockDatadogApi).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'test-app',
        events: expect.arrayContaining([
          expect.objectContaining({
            name: 'test.operation',
            data: expect.objectContaining({
              test_field: 'test_value'
            })
          })
        ])
      })
    );
  });
});
```

## Troubleshooting

### Common Issues

**Events not appearing in Datadog:**
```typescript
// Enable debug logging
const datadogExporter = new DatadogExporter({
  apiKey: process.env.DATADOG_API_KEY,
  service: 'my-app',
  
  debug: {
    enabled: true,
    logLevel: 'debug',
    logRequests: true,
    logResponses: true
  }
});
```

**Circuit breaker constantly open:**
```typescript
// Check circuit breaker status
datadogExporter.getCircuitBreakerStatus(); // { state: 'open', failures: 10, lastFailure: Date }

// Adjust thresholds
const datadogExporter = new DatadogExporter({
  circuitBreaker: {
    failureThreshold: 20,     // Higher threshold
    resetTimeout: 120000      // Longer reset time
  }
});
```

**High memory usage:**
```typescript
// Monitor batch sizes
datadogExporter.getBatchStats(); // { pendingEvents: 150, memoryUsage: '15MB' }

// Reduce batch size
const datadogExporter = new DatadogExporter({
  batch: {
    maxSize: 50,              // Smaller batches
    maxWaitMs: 1000          // More frequent sends
  }
});
```

The Datadog exporter provides enterprise-grade reliability with circuit breakers, batching, retry logic, and comprehensive monitoring capabilities. It seamlessly transforms Vision events into Datadog metrics, traces, and logs with full OpenTelemetry compliance.