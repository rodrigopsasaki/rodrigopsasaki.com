---
title: "Vision NestJS Integration"
description: "Complete guide to integrating Vision observability with NestJS applications, featuring decorator-based configuration, dependency injection, and enterprise-grade patterns."
tags: ["NestJS", "Vision", "Observability", "Decorators", "TypeScript", "Enterprise"]
parent: "vision"
npm: "https://www.npmjs.com/package/@rodrigopsasaki/vision-nestjs"
github: "https://github.com/rodrigopsasaki/vision/tree/main/packages/vision-nestjs"
order: 4
---

# Vision NestJS Integration

Enterprise-grade observability for NestJS applications with decorator-based configuration, dependency injection support, and comprehensive tracking.

## Quick Start

Install the NestJS integration:

```bash
npm install @rodrigopsasaki/vision @rodrigopsasaki/vision-nestjs
```

Add Vision to your NestJS application:

```typescript
import { Module } from '@nestjs/common';
import { VisionModule } from '@rodrigopsasaki/vision-nestjs';

@Module({
  imports: [
    VisionModule.forRoot({
      exporters: [
        {
          name: 'console',
          success: (ctx) => console.log('✓', ctx.name, `${ctx.duration}ms`),
          error: (ctx, err) => console.error('✗', ctx.name, err.message)
        }
      ]
    })
  ],
})
export class AppModule {}
```

Use Vision decorators in your controllers:

```typescript
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { VisionContext, VisionObserve } from '@rodrigopsasaki/vision-nestjs';
import { vision } from '@rodrigopsasaki/vision';

@Controller('users')
export class UsersController {
  
  @Get(':id')
  @VisionObserve('user.get')  // Automatic context creation
  async getUser(@Param('id') id: string) {
    vision.set('user_id', id);
    vision.set('operation', 'get_user');
    
    const user = await this.usersService.findOne(id);
    vision.set('user_found', !!user);
    
    return user;
  }
  
  @Post()
  @VisionObserve('user.create')
  async createUser(@Body() userData: CreateUserDto) {
    vision.set('email', userData.email);
    vision.set('role', userData.role);
    
    const user = await this.usersService.create(userData);
    vision.set('user_id', user.id);
    vision.set('user_created', true);
    
    return user;
  }
}
```

Every decorated method now creates a Vision context with automatic timing and metadata collection.

## Module Configuration

Configure Vision at the module level with comprehensive options:

```typescript
@Module({
  imports: [
    VisionModule.forRoot({
      // Global configuration
      global: true,                        // Make Vision available everywhere
      
      // Exporters configuration
      exporters: [
        {
          name: 'datadog',
          success: (ctx) => sendToDatadog(ctx),
          error: (ctx, err) => sendErrorToDatadog(ctx, err)
        }
      ],
      
      // HTTP middleware configuration
      http: {
        enabled: true,                     // Enable HTTP request tracking
        captureBody: true,                 // Capture request/response bodies
        captureHeaders: true,              // Capture HTTP headers
        captureQuery: true,                // Capture query parameters
        
        // Security & privacy
        redactSensitiveData: true,
        redactHeaders: ['authorization', 'cookie'],
        redactBodyFields: ['password', 'ssn'],
        redactQueryParams: ['token', 'key'],
        
        // Performance monitoring
        performance: {
          trackExecutionTime: true,
          slowOperationThreshold: 1000,
          trackMemoryUsage: true
        },
        
        // Route filtering
        excludeRoutes: ['/health', '/metrics'],
        shouldExcludeRoute: (req) => req.url.startsWith('/internal/')
      },
      
      // Custom data extraction
      extractUser: (req) => req.user?.id,
      extractTenant: (req) => req.headers['x-tenant-id'],
      extractCorrelationId: (req) => req.headers['x-correlation-id']
    })
  ]
})
export class AppModule {}
```

## Decorators

### @VisionObserve

The main decorator for creating Vision contexts:

```typescript
@Controller('orders')
export class OrdersController {
  
  @Post()
  @VisionObserve('order.create')
  async createOrder(@Body() orderData: CreateOrderDto) {
    vision.set('customer_id', orderData.customerId);
    vision.set('items_count', orderData.items.length);
    
    // Your business logic here
    const order = await this.ordersService.create(orderData);
    
    vision.set('order_id', order.id);
    vision.set('total_amount', order.total);
    
    return order;
  }
  
  @Get(':id')
  @VisionObserve()  // Auto-generates context name: "order.get"
  async getOrder(@Param('id') id: string) {
    vision.set('order_id', id);
    
    const order = await this.ordersService.findOne(id);
    vision.set('order_found', !!order);
    
    return order;
  }
}
```

### @VisionContext

Inject Vision context data into method parameters:

```typescript
@Controller('analytics')
export class AnalyticsController {
  
  @Get('report')
  @VisionObserve('analytics.report')
  async generateReport(
    @Query() params: ReportParamsDto,
    @VisionContext() context: VisionContextData
  ) {
    vision.set('report_type', params.type);
    vision.set('date_range', params.dateRange);
    
    // Access context metadata
    console.log('Request ID:', context.requestId);
    console.log('User ID:', context.userId);
    console.log('Start Time:', context.startTime);
    
    const report = await this.analyticsService.generate(params);
    
    vision.set('report_size', report.data.length);
    vision.set('generation_time', Date.now() - context.startTime);
    
    return report;
  }
}
```

## Service Integration

Use Vision in NestJS services with dependency injection:

```typescript
import { Injectable } from '@nestjs/common';
import { VisionService } from '@rodrigopsasaki/vision-nestjs';
import { vision } from '@rodrigopsasaki/vision';

@Injectable()
export class PaymentService {
  constructor(private readonly visionService: VisionService) {}
  
  async processPayment(paymentData: PaymentDto): Promise<Payment> {
    return await this.visionService.observe('payment.process', async () => {
      vision.set('payment_amount', paymentData.amount);
      vision.set('payment_method', paymentData.method);
      vision.set('customer_id', paymentData.customerId);
      
      try {
        // Validate payment data
        await this.visionService.observe('payment.validate', async () => {
          const isValid = await this.validatePaymentData(paymentData);
          vision.set('validation_passed', isValid);
          
          if (!isValid) {
            throw new Error('Invalid payment data');
          }
        });
        
        // Process with payment gateway
        const result = await this.visionService.observe('payment.gateway', async () => {
          const response = await this.paymentGateway.charge(paymentData);
          
          vision.set('gateway_response_id', response.id);
          vision.set('gateway_status', response.status);
          vision.set('gateway_fee', response.fee);
          
          return response;
        });
        
        // Save payment record
        const payment = await this.visionService.observe('payment.save', async () => {
          const savedPayment = await this.paymentsRepository.save({
            ...paymentData,
            gatewayId: result.id,
            status: result.status
          });
          
          vision.set('payment_id', savedPayment.id);
          vision.set('payment_saved', true);
          
          return savedPayment;
        });
        
        vision.set('payment_successful', true);
        return payment;
        
      } catch (error) {
        vision.set('payment_failed', true);
        vision.set('error_type', error.name);
        vision.set('error_message', error.message);
        
        throw error;
      }
    });
  }
}
```

## Guards and Interceptors

Create Vision-aware guards and interceptors:

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { vision } from '@rodrigopsasaki/vision';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    return await vision.observe('auth.guard', async () => {
      const request = context.switchToHttp().getRequest();
      
      vision.set('auth_guard_triggered', true);
      vision.set('request_path', request.url);
      vision.set('request_method', request.method);
      
      const token = request.headers.authorization?.replace('Bearer ', '');
      vision.set('token_provided', !!token);
      
      if (!token) {
        vision.set('auth_failed', true);
        vision.set('failure_reason', 'no_token');
        return false;
      }
      
      try {
        const user = await this.validateToken(token);
        vision.set('auth_successful', true);
        vision.set('user_id', user.id);
        vision.set('user_role', user.role);
        
        request.user = user;
        return true;
        
      } catch (error) {
        vision.set('auth_failed', true);
        vision.set('failure_reason', error.message);
        return false;
      }
    });
  }
}
```

### Performance Interceptor

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { vision } from '@rodrigopsasaki/vision';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest();
    
    vision.set('performance_tracking', true);
    vision.set('request_start_time', startTime);
    vision.set('memory_start', process.memoryUsage().heapUsed);
    
    return next.handle().pipe(
      tap(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const memoryEnd = process.memoryUsage().heapUsed;
        const memoryDelta = memoryEnd - vision.get('memory_start');
        
        vision.set('request_duration', duration);
        vision.set('memory_delta', memoryDelta);
        vision.set('slow_request', duration > 1000);
        
        if (duration > 2000) {
          vision.set('very_slow_request', true);
        }
      })
    );
  }
}
```

## Real-World Examples

### E-commerce Order Processing

```typescript
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly inventoryService: InventoryService,
    private readonly paymentService: PaymentService,
    private readonly visionService: VisionService
  ) {}
  
  @Post()
  @VisionObserve('order.process')
  @UseGuards(AuthGuard)
  @UseInterceptors(PerformanceInterceptor)
  async processOrder(
    @Body() orderData: CreateOrderDto,
    @Request() req,
    @VisionContext() context: VisionContextData
  ) {
    vision.set('customer_id', orderData.customerId);
    vision.set('items_count', orderData.items.length);
    vision.set('order_total', orderData.total);
    vision.set('authenticated_user', req.user.id);
    
    try {
      // Step 1: Inventory validation
      const inventoryCheck = await this.visionService.observe('inventory.validate', async () => {
        const results = await Promise.all(
          orderData.items.map(item => 
            this.inventoryService.checkAvailability(item.productId, item.quantity)
          )
        );
        
        const allAvailable = results.every(r => r.available);
        vision.set('inventory_available', allAvailable);
        vision.set('inventory_checks', results.length);
        
        if (!allAvailable) {
          const unavailable = results.filter(r => !r.available);
          vision.set('unavailable_items', unavailable.length);
          throw new Error('Insufficient inventory');
        }
        
        return results;
      });
      
      // Step 2: Payment processing
      const payment = await this.visionService.observe('payment.process', async () => {
        const paymentResult = await this.paymentService.processPayment({
          amount: orderData.total,
          customerId: orderData.customerId,
          method: orderData.paymentMethod
        });
        
        vision.set('payment_id', paymentResult.id);
        vision.set('payment_status', paymentResult.status);
        vision.set('payment_method', orderData.paymentMethod);
        
        return paymentResult;
      });
      
      // Step 3: Order creation
      const order = await this.visionService.observe('order.create', async () => {
        const newOrder = await this.ordersService.create({
          ...orderData,
          paymentId: payment.id,
          status: 'confirmed'
        });
        
        vision.set('order_id', newOrder.id);
        vision.set('order_created', true);
        vision.set('estimated_delivery', newOrder.estimatedDelivery);
        
        return newOrder;
      });
      
      // Step 4: Inventory reservation
      await this.visionService.observe('inventory.reserve', async () => {
        await Promise.all(
          orderData.items.map(item =>
            this.inventoryService.reserve(item.productId, item.quantity, order.id)
          )
        );
        
        vision.set('inventory_reserved', true);
      });
      
      vision.set('order_processing_successful', true);
      return order;
      
    } catch (error) {
      vision.set('order_processing_failed', true);
      vision.set('error_stage', error.stage || 'unknown');
      vision.set('error_message', error.message);
      
      throw error;
    }
  }
}
```

### User Authentication Service

```typescript
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly visionService: VisionService
  ) {}
  
  async login(loginDto: LoginDto): Promise<AuthResult> {
    return await this.visionService.observe('auth.login', async () => {
      vision.set('login_attempt', true);
      vision.set('email', loginDto.email);
      vision.set('login_method', 'email_password');
      
      try {
        // User lookup
        const user = await this.visionService.observe('auth.user_lookup', async () => {
          const foundUser = await this.usersService.findByEmail(loginDto.email);
          vision.set('user_exists', !!foundUser);
          
          if (!foundUser) {
            throw new Error('User not found');
          }
          
          vision.set('user_id', foundUser.id);
          vision.set('user_role', foundUser.role);
          vision.set('user_status', foundUser.status);
          vision.set('last_login', foundUser.lastLoginAt);
          
          return foundUser;
        });
        
        // Password verification
        await this.visionService.observe('auth.password_verify', async () => {
          const isValidPassword = await bcrypt.compare(loginDto.password, user.hashedPassword);
          vision.set('password_valid', isValidPassword);
          
          if (!isValidPassword) {
            vision.set('login_failed', true);
            vision.set('failure_reason', 'invalid_password');
            throw new Error('Invalid credentials');
          }
        });
        
        // JWT token generation
        const tokens = await this.visionService.observe('auth.token_generate', async () => {
          const payload = { sub: user.id, email: user.email, role: user.role };
          
          const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
          const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
          
          vision.set('tokens_generated', true);
          vision.set('access_token_ttl', 900); // 15 minutes
          vision.set('refresh_token_ttl', 604800); // 7 days
          
          return { accessToken, refreshToken };
        });
        
        // Update last login
        await this.visionService.observe('auth.update_last_login', async () => {
          await this.usersService.updateLastLogin(user.id);
          vision.set('last_login_updated', true);
        });
        
        vision.set('login_successful', true);
        
        return {
          user: {
            id: user.id,
            email: user.email,
            role: user.role
          },
          ...tokens
        };
        
      } catch (error) {
        vision.set('login_failed', true);
        vision.set('failure_reason', error.message);
        throw error;
      }
    });
  }
}
```

## Testing

Test your Vision-enabled NestJS application:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { VisionModule } from '@rodrigopsasaki/vision-nestjs';
import { vision } from '@rodrigopsasaki/vision';

describe('OrdersController', () => {
  let controller: OrdersController;
  let contexts: any[] = [];

  beforeEach(async () => {
    contexts = [];
    
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        VisionModule.forRoot({
          exporters: [{
            name: 'test',
            success: (ctx) => contexts.push(ctx)
          }]
        })
      ],
      controllers: [OrdersController],
      providers: [OrdersService],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  it('should create Vision context for order processing', async () => {
    const orderData = {
      customerId: 'cust123',
      items: [{ productId: 'prod456', quantity: 2 }],
      total: 99.99
    };

    await controller.processOrder(orderData, { user: { id: 'user789' } }, {});

    expect(contexts).toHaveLength(1);
    expect(contexts[0].name).toBe('order.process');
    expect(contexts[0].data.get('customer_id')).toBe('cust123');
    expect(contexts[0].data.get('items_count')).toBe(1);
  });
});
```

## Configuration

### Environment-based Configuration

```typescript
@Module({
  imports: [
    VisionModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        exporters: [
          {
            name: 'datadog',
            success: (ctx) => {
              if (configService.get('NODE_ENV') === 'production') {
                sendToDatadog(ctx);
              }
            }
          }
        ],
        http: {
          enabled: true,
          redactSensitiveData: configService.get('NODE_ENV') === 'production',
          performance: {
            trackExecutionTime: true,
            slowOperationThreshold: Number(configService.get('SLOW_THRESHOLD', '1000'))
          }
        }
      }),
      inject: [ConfigService]
    })
  ]
})
export class AppModule {}
```

The NestJS integration provides enterprise-grade observability with decorator-based configuration, dependency injection support, and comprehensive tracking. Every decorated method and HTTP request becomes a rich, structured event with automatic timing, error capture, and customizable metadata collection.