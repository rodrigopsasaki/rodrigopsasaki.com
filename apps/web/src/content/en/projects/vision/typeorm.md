---
title: "TypeORM Integration"
description: "Complete TypeORM integration with Vision observability. Automatic instrumentation for entities, repositories, queries, and transactions with zero configuration required."
tags: ["TypeORM", "Database", "ORM", "Observability", "TypeScript", "SQL", "Entities", "Decorators"]
npm: "https://www.npmjs.com/package/@rodrigopsasaki/vision-typeorm"
github: "https://github.com/rodrigopsasaki/vision/tree/main/packages/vision-typeorm"
parent: "vision"
order: 5
---

# TypeORM Integration

Complete database observability for TypeORM with zero configuration required. Automatic instrumentation for entities, repositories, custom repositories, queries, and transactions.

## Installation

```bash
npm install @rodrigopsasaki/vision @rodrigopsasaki/vision-typeorm
```

## Quick Start

```typescript
import { DataSource } from 'typeorm';
import { instrumentDataSource } from '@rodrigopsasaki/vision-typeorm';
import { User } from './entities/User';

const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'user',
  password: 'password',
  database: 'mydb',
  entities: [User],
  synchronize: true,
});

await dataSource.initialize();

// Instrument TypeORM DataSource - this enables automatic observability
const instrumentedDataSource = instrumentDataSource(dataSource);

// That's it! Every database operation is now automatically observed
const userRepository = instrumentedDataSource.getRepository(User);
const users = await userRepository.find({ where: { active: true } });
```

Every TypeORM operation will now be automatically wrapped with Vision context, providing detailed observability data including:

- Entity and repository operations
- Query duration and performance metrics
- SQL queries with parameters (configurable)
- Result counts and metadata
- Transaction boundaries and rollback information
- Entity relationship loading patterns
- Custom repository method calls
- Error information with full context

## How It Works

The TypeORM integration uses a combination of decorators, proxies, and TypeORM's built-in hooks to provide transparent instrumentation. Your existing entities and repositories work unchanged.

```typescript
// Before: Regular TypeORM usage
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  name: string;

  @OneToMany(() => Post, post => post.author)
  posts: Post[];
}

const user = await userRepository.save({
  email: 'user@example.com',
  name: 'John Doe'
});

// After: Same code, but now automatically instrumented
// Vision automatically captures: entity type, operation, timing, SQL, parameters, relationships
```

## Configuration Options

```typescript
import { instrumentDataSource } from '@rodrigopsasaki/vision-typeorm';

const instrumentedDataSource = instrumentDataSource(dataSource, {
  enabled: true,                    // Enable/disable instrumentation
  logQueries: false,                // Log SQL queries (may contain sensitive data)
  logParameters: false,             // Log query parameters (may contain sensitive data)
  logResultCount: true,             // Log result count for find operations
  logConnectionInfo: false,         // Include database connection info
  maxQueryLength: 1000,             // Maximum query length to log
  includeEntityInName: true,        // Include entity name in operation name
  operationPrefix: 'db',            // Custom operation name prefix
  redactFields: ['password', 'token'], // Fields to redact from parameters
  trackRelationLoading: true,       // Track eager/lazy loading of relationships
  trackTransactions: true,          // Track transaction boundaries
  slowQueryThreshold: 1000,         // Mark queries > 1s as slow
  captureStackTrace: false,         // Capture stack traces (performance impact)
});
```

### Configuration Examples

**Production Safe (Recommended)**
```typescript
const instrumentedDataSource = instrumentDataSource(dataSource, {
  logQueries: false,       // Don't log SQL in production
  logParameters: false,    // Don't log parameters in production
  logResultCount: true,    // Safe performance metric
  maxQueryLength: 500,     // Limit query length
  slowQueryThreshold: 2000, // 2s threshold for production
  redactFields: [          // Comprehensive redaction
    'password', 'token', 'secret', 'key', 'hash', 
    'authorization', 'apiKey', 'session', 'refreshToken'
  ],
  trackRelationLoading: true,
  trackTransactions: true
});
```

**Development/Debug Mode**
```typescript
const instrumentedDataSource = instrumentDataSource(dataSource, {
  logQueries: true,         // Full SQL query logging
  logParameters: true,      // Full parameter logging
  logConnectionInfo: true,  // Connection details
  maxQueryLength: 2000,     // Longer queries in dev
  captureStackTrace: true,  // Stack traces for debugging
  slowQueryThreshold: 500,  // Lower threshold in dev
});
```

## Entity Examples

### Basic Entity Operations

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// All operations automatically instrumented
const userRepository = instrumentedDataSource.getRepository(User);

// Create operation
const user = await userRepository.save({
  email: 'john@example.com',
  name: 'John Doe'
});
// Vision captures: db.user.save, timing, SQL query, result

// Find operations
const users = await userRepository.find({
  where: { active: true },
  order: { createdAt: 'DESC' },
  take: 10
});
// Vision captures: db.user.find, timing, result count, query complexity

// Update operation
await userRepository.update(user.id, { name: 'John Smith' });
// Vision captures: db.user.update, timing, affected rows

// Delete operation
await userRepository.delete(user.id);
// Vision captures: db.user.delete, timing, affected rows
```

### Entity Relationships

```typescript
@Entity()
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @ManyToOne(() => User, user => user.posts)
  author: User;

  @OneToMany(() => Comment, comment => comment.post)
  comments: Comment[];

  @ManyToMany(() => Tag, tag => tag.posts)
  @JoinTable()
  tags: Tag[];
}

@Entity()
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  content: string;

  @ManyToOne(() => Post, post => post.comments)
  post: Post;

  @ManyToOne(() => User, user => user.comments)
  author: User;
}

// Relationship loading automatically tracked
const postRepository = instrumentedDataSource.getRepository(Post);

// Eager loading
const posts = await postRepository.find({
  relations: ['author', 'comments', 'tags'],
  where: { author: { active: true } }
});
// Vision captures: relationship loading patterns, N+1 query detection

// Lazy loading
const post = await postRepository.findOne({ where: { id: 1 } });
const author = await post.author; // Lazy loaded
// Vision captures: lazy loading events, performance impact
```

## Repository Patterns

### Custom Repository

```typescript
import { Repository, EntityRepository } from 'typeorm';
import { observe } from '@rodrigopsasaki/vision';

@EntityRepository(User)
export class UserRepository extends Repository<User> {
  
  async findByEmail(email: string): Promise<User | null> {
    return await observe('user.find_by_email', async () => {
      vision.set('search_email', email);
      
      const user = await this.findOne({ 
        where: { email },
        relations: ['profile'] 
      });
      
      vision.set('user_found', !!user);
      if (user) {
        vision.set('user_id', user.id);
        vision.set('has_profile', !!user.profile);
      }
      
      return user;
    });
  }

  async findActiveUsersWithPosts(): Promise<User[]> {
    return await observe('user.find_active_with_posts', async () => {
      const users = await this.createQueryBuilder('user')
        .leftJoinAndSelect('user.posts', 'post')
        .where('user.active = :active', { active: true })
        .andWhere('post.id IS NOT NULL')
        .orderBy('user.createdAt', 'DESC')
        .getMany();
      
      vision.set('active_users_count', users.length);
      vision.set('total_posts', users.reduce((sum, u) => sum + u.posts.length, 0));
      
      return users;
    });
  }

  async getUserStats(userId: number): Promise<UserStats> {
    return await observe('user.get_stats', async () => {
      vision.set('user_id', userId);
      
      const [user, postCount, commentCount] = await Promise.all([
        this.findOne({ where: { id: userId } }),
        this.manager.count(Post, { where: { author: { id: userId } } }),
        this.manager.count(Comment, { where: { author: { id: userId } } })
      ]);
      
      if (!user) {
        vision.set('user_exists', false);
        throw new Error('User not found');
      }
      
      const stats = {
        user,
        postCount,
        commentCount,
        joinDate: user.createdAt,
        isActive: user.active
      };
      
      vision.set('user_exists', true);
      vision.set('post_count', postCount);
      vision.set('comment_count', commentCount);
      vision.set('user_active', user.active);
      
      return stats;
    });
  }
}
```

## Decorator-Based Instrumentation

The TypeORM integration includes powerful decorators for automatic service instrumentation:

```typescript
import { VisionInstrumented, VisionObserve, VisionParam, VisionEntity } from '@rodrigopsasaki/vision-typeorm';
import { vision } from '@rodrigopsasaki/vision';

@VisionInstrumented()
export class UserService {
  constructor(
    private dataSource: DataSource
  ) {}

  @VisionObserve('user.create')
  async createUser(
    @VisionParam('email') email: string,
    @VisionParam('name') name: string,
    @VisionParam('source') source?: string
  ): Promise<User> {
    vision.set('registration_source', source || 'web');
    
    const userRepository = this.dataSource.getRepository(User);
    
    // Check if user exists
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      vision.set('user_exists', true);
      throw new Error('User already exists');
    }
    
    // Create user with automatic entity tracking
    const user = await userRepository.save({
      email,
      name,
      active: true
    });
    
    vision.set('user_created', true);
    vision.set('user_id', user.id);
    
    return user;
  }

  @VisionObserve('user.update_profile')
  async updateProfile(
    @VisionParam('userId') userId: number,
    @VisionEntity('user') updates: Partial<User>
  ): Promise<User> {
    const userRepository = this.dataSource.getRepository(User);
    
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      vision.set('user_exists', false);
      throw new Error('User not found');
    }
    
    await userRepository.update(userId, updates);
    const updatedUser = await userRepository.findOne({ where: { id: userId } });
    
    vision.set('user_updated', true);
    vision.set('updated_fields', Object.keys(updates));
    
    return updatedUser!;
  }

  @VisionObserve('user.get_stats')
  async getUserStats(@VisionParam('userId') userId: number): Promise<UserStats> {
    const userRepository = this.dataSource.getRepository(User);
    const postRepository = this.dataSource.getRepository(Post);
    
    const [user, postCount] = await Promise.all([
      userRepository.findOne({ where: { id: userId } }),
      postRepository.count({ where: { author: { id: userId } } })
    ]);
    
    if (!user) {
      vision.set('user_exists', false);
      throw new Error('User not found');
    }
    
    const stats = {
      user,
      postCount,
      joinDate: user.createdAt,
      isActive: user.active
    };
    
    vision.set('user_exists', true);
    vision.set('post_count', postCount);
    vision.set('user_active', user.active);
    
    return stats;
  }
}
```

### Service Layer Integration

```typescript
import { Service } from 'typedi';
import { observe, vision } from '@rodrigopsasaki/vision';

@Service()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService
  ) {}

  async createUser(userData: CreateUserDto): Promise<User> {
    return await observe('user.create', async () => {
      vision.set('registration_source', userData.source || 'web');
      vision.set('user_email', userData.email);
      
      // Check if user exists
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        vision.set('user_exists', true);
        throw new Error('User already exists');
      }
      
      // Create user
      const user = await this.userRepository.save({
        email: userData.email,
        name: userData.name,
        active: true
      });
      
      // Create default profile
      const profile = await this.userRepository.manager.save(Profile, {
        userId: user.id,
        bio: userData.bio || '',
        avatar: userData.avatar || null
      });
      
      // Send welcome email
      try {
        await this.emailService.sendWelcomeEmail(user.email, user.name);
        vision.set('welcome_email_sent', true);
      } catch (error) {
        vision.set('welcome_email_sent', false);
        vision.set('email_error', error.message);
        // Don't fail user creation if email fails
      }
      
      vision.set('user_created', true);
      vision.set('user_id', user.id);
      vision.set('profile_created', true);
      
      return { ...user, profile };
    });
  }

  async updateUserProfile(userId: number, updates: UpdateProfileDto): Promise<User> {
    return await observe('user.update_profile', async () => {
      vision.set('user_id', userId);
      vision.set('update_fields', Object.keys(updates));
      
      const user = await this.userRepository.findOne({ 
        where: { id: userId },
        relations: ['profile']
      });
      
      if (!user) {
        vision.set('user_exists', false);
        throw new Error('User not found');
      }
      
      // Update user fields
      if (updates.name) user.name = updates.name;
      if (updates.email) user.email = updates.email;
      
      // Update profile fields
      if (updates.bio !== undefined) user.profile.bio = updates.bio;
      if (updates.avatar) user.profile.avatar = updates.avatar;
      
      await this.userRepository.manager.transaction(async manager => {
        await manager.save(User, user);
        await manager.save(Profile, user.profile);
      });
      
      vision.set('user_updated', true);
      vision.set('profile_updated', true);
      
      return user;
    });
  }
}
```

## Transaction Support

TypeORM transactions are automatically observed as single operations with detailed tracking:

```typescript
import { visionTransaction } from '@rodrigopsasaki/vision-typeorm';
import { observe, vision } from '@rodrigopsasaki/vision';

// Using the visionTransaction utility for enhanced observability
const result = await visionTransaction(instrumentedDataSource, async (manager) => {
  // All operations within the transaction are automatically observed
  const user = await manager.save(User, {
    email: 'user@example.com',
    name: 'John Doe'
  });
  
  const profile = await manager.save(Profile, {
    userId: user.id,
    bio: 'Hello world'
  });
  
  const settings = await manager.save(UserSettings, {
    userId: user.id,
    theme: 'dark',
    notifications: true
  });
  
  return { user, profile, settings };
});

// Transaction with isolation level
const advancedResult = await visionTransactionWithIsolation(
  instrumentedDataSource, 
  'SERIALIZABLE',
  async (manager) => {
    vision.set('isolation_level', 'SERIALIZABLE');
    vision.set('transaction_type', 'critical_operation');
    
    // Critical business logic here
    const order = await manager.save(Order, orderData);
    await manager.decrement(Product, { id: productId }, 'stock', quantity);
    
    return order;
  }
);

// Manual transaction observation with custom context
await observe('user.complete_registration', async () => {
  await visionTransaction(instrumentedDataSource, async (manager) => {
    vision.set('transaction_type', 'user_registration');
    
    // User creation
    const user = await manager.save(User, userData);
    vision.set('user_id', user.id);
    
    // Profile setup
    const profile = await manager.save(Profile, {
      userId: user.id,
      ...profileData
    });
    vision.set('profile_created', true);
    
    // Initial settings
    const settings = await manager.save(UserSettings, {
      userId: user.id,
      theme: 'system',
      notifications: true
    });
    vision.set('settings_created', true);
    
    // Audit log
    await manager.save(AuditLog, {
      userId: user.id,
      action: 'user_created',
      metadata: { source: 'registration' }
    });
    vision.set('audit_logged', true);
    
    vision.set('registration_complete', true);
    return { user, profile, settings };
  });
});
```

Vision captures comprehensive transaction data:
- Transaction duration and success/failure status
- Individual operation performance within the transaction
- Rollback information if the transaction fails
- Deadlock detection and resolution
- Nested transaction handling

## Query Builder Integration

```typescript
// Complex queries with automatic instrumentation
const complexQuery = await observe('analytics.user_engagement', async () => {
  const result = await instrumentedDataSource
    .createQueryBuilder(User, 'user')
    .leftJoin('user.posts', 'post')
    .leftJoin('post.comments', 'comment')
    .leftJoin('user.profile', 'profile')
    .select([
      'user.id',
      'user.name',
      'user.email',
      'user.createdAt',
      'COUNT(DISTINCT post.id) as postCount',
      'COUNT(DISTINCT comment.id) as commentCount',
      'profile.bio'
    ])
    .where('user.active = :active', { active: true })
    .andWhere('user.createdAt >= :since', { since: lastMonth })
    .groupBy('user.id, profile.id')
    .having('COUNT(DISTINCT post.id) > :minPosts', { minPosts: 1 })
    .orderBy('postCount', 'DESC')
    .limit(50)
    .getRawMany();
  
  vision.set('query_type', 'analytics');
  vision.set('result_count', result.length);
  vision.set('time_range', 'last_month');
  vision.set('min_posts_filter', 1);
  
  return result;
});

// Raw SQL queries
const rawResults = await observe('reports.monthly_summary', async () => {
  const sql = `
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      COUNT(*) as user_count,
      COUNT(CASE WHEN active = true THEN 1 END) as active_count
    FROM users 
    WHERE created_at >= $1 
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month DESC
  `;
  
  const results = await instrumentedDataSource.query(sql, [yearAgo]);
  
  vision.set('report_type', 'monthly_summary');
  vision.set('months_included', results.length);
  vision.set('query_method', 'raw_sql');
  
  return results;
});
```

## Performance Monitoring

### Slow Query Detection

```typescript
import { init, createExporter } from '@rodrigopsasaki/vision';

const performanceExporter = createExporter('typeorm_performance', {
  success: (context) => {
    // Alert on slow database operations
    if (context.duration > 2000) { // > 2 seconds
      alertSlowQuery({
        operation: context.name,
        duration: context.duration,
        entity: context.data.entity,
        query: context.data.sql_query,
        parameters: context.data.parameters
      });
    }
    
    // Track N+1 query patterns
    if (context.data.potential_n_plus_one) {
      trackNPlusOneQuery({
        operation: context.name,
        entity: context.data.entity,
        relation: context.data.relation,
        query_count: context.data.query_count
      });
    }
  }
});

init({ exporters: [performanceExporter] });
```

### Query Pattern Analysis

```typescript
const analyticsExporter = createExporter('typeorm_analytics', {
  success: (context) => {
    if (context.data.entity && context.data.operation) {
      // Track query patterns
      trackQueryPattern({
        entity: context.data.entity,
        operation: context.data.operation,
        duration: context.data.duration_ms,
        resultCount: context.data.result_count,
        hasRelations: context.data.relations_loaded || false,
        queryComplexity: context.data.query_complexity || 'simple'
      });
      
      // Track relationship loading efficiency  
      if (context.data.relations_loaded) {
        trackRelationshipLoading({
          entity: context.data.entity,
          relations: context.data.loaded_relations,
          loadingStrategy: context.data.loading_strategy,
          duration: context.data.duration_ms
        });
      }
    }
  }
});
```

## Error Handling and Debugging

When database operations fail, Vision automatically captures comprehensive error information:

```typescript
try {
  await userRepository.save({
    email: 'duplicate@example.com' // This email already exists
  });
} catch (error) {
  // Vision automatically captures:
  // - The exact entity and operation that failed
  // - SQL query and parameters
  // - TypeORM error details and constraints
  // - Stack trace and timing information
  // - Transaction state if within a transaction
  throw error;
}
```

Generated error context:
```json
{
  "name": "db.user.save",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "data": {
    "database.operation": "save",
    "database.target": "typeorm",
    "database.entity": "User",
    "database.success": false,
    "database.duration_ms": 45,
    "database.error_type": "QueryFailedError",
    "database.error_message": "duplicate key value violates unique constraint \"UQ_user_email\"",
    "database.constraint": "UQ_user_email",
    "database.sql_query": "INSERT INTO \"user\"(\"email\", \"name\", \"active\") VALUES ($1, $2, $3) RETURNING \"id\", \"created_at\", \"updated_at\"",
    "database.parameters": ["[REDACTED]", "John Doe", true],
    "database.transaction_active": false
  },
  "error": {
    "name": "QueryFailedError",
    "message": "duplicate key value violates unique constraint \"UQ_user_email\"",
    "constraint": "UQ_user_email",
    "table": "user",
    "column": "email",
    "stack": "..."
  },
  "duration": 47
}
```

## Advanced Integration Patterns

### Multi-Database Support

```typescript
// Main application database
const mainDataSource = new DataSource({
  name: 'main',
  type: 'postgres',
  host: 'localhost',
  database: 'app_main',
  entities: [User, Post, Comment]
});

// Analytics database
const analyticsDataSource = new DataSource({
  name: 'analytics',
  type: 'postgres', 
  host: 'analytics-db',
  database: 'app_analytics',
  entities: [AnalyticsEvent, UserMetrics]
});

// Different configurations for different databases
const instrumentedMainDataSource = instrumentDataSource(mainDataSource, {
  operationPrefix: 'main_db',
  logQueries: false,
  trackTransactions: true
});

const instrumentedAnalyticsDataSource = instrumentDataSource(analyticsDataSource, {
  operationPrefix: 'analytics_db',
  logQueries: true,  // Analytics queries can be more verbose
  trackTransactions: false,
  slowQueryThreshold: 5000  // Analytics queries can be slower
});
```

### Custom Decorators and Hooks

```typescript
import { observe, vision } from '@rodrigopsasaki/vision';

// Custom decorator for business operations
function BusinessOperation(operationName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      return await observe(`business.${operationName}`, async () => {
        vision.set('operation_type', 'business');
        vision.set('method_name', propertyName);
        vision.set('class_name', target.constructor.name);
        
        try {
          const result = await method.apply(this, args);
          vision.set('operation_success', true);
          return result;
        } catch (error) {
          vision.set('operation_success', false);
          vision.set('error_type', error.constructor.name);
          throw error;
        }
      });
    };
  };
}

// Usage in service classes
@Service()
export class OrderService {
  
  @BusinessOperation('create_order')
  async createOrder(orderData: CreateOrderDto): Promise<Order> {
    vision.set('customer_id', orderData.customerId);
    vision.set('item_count', orderData.items.length);
    vision.set('total_amount', orderData.total);
    
    // Complex business logic with multiple DB operations
    return await visionTransaction(instrumentedDataSource, async manager => {
      const order = await manager.save(Order, orderData);
      
      for (const item of orderData.items) {
        await manager.save(OrderItem, { ...item, orderId: order.id });
        await manager.decrement(Product, { id: item.productId }, 'stock', item.quantity);
      }
      
      await manager.save(AuditLog, {
        entityType: 'Order',
        entityId: order.id,
        action: 'created',
        userId: orderData.customerId
      });
      
      return order;
    });
  }
  
  @BusinessOperation('process_payment')
  async processPayment(orderId: number, paymentData: PaymentDto): Promise<Payment> {
    vision.set('order_id', orderId);
    vision.set('payment_method', paymentData.method);
    vision.set('amount', paymentData.amount);
    
    // Payment processing logic...
  }
}
```

### Integration with Other ORMs

```typescript
// Side-by-side with Prisma
const prisma = instrumentPrisma(new PrismaClient(), {
  operationPrefix: 'prisma'
});

const instrumentedTypeOrmDataSource = instrumentDataSource(typeormDataSource, {
  operationPrefix: 'typeorm'  
});

// Operations from both ORMs are tracked separately but consistently
await observe('data_migration', async () => {
  // TypeORM operations
  const typeormUsers = await instrumentedTypeOrmDataSource.getRepository(User).find();
  
  // Prisma operations  
  const prismaUsers = await prisma.user.findMany();
  
  vision.set('typeorm_user_count', typeormUsers.length);
  vision.set('prisma_user_count', prismaUsers.length);
  vision.set('migration_type', 'user_sync');
});
```

## Best Practices

### 1. Security First
- Always use `logQueries: false` and `logParameters: false` in production
- Configure comprehensive `redactFields` for sensitive data
- Be careful with relationship loading as it may expose sensitive data in logs

### 2. Performance Considerations
- The instrumentation adds ~2-3ms overhead per operation
- Use `slowQueryThreshold` to identify problematic queries
- Monitor N+1 query patterns with `trackRelationLoading: true`
- Consider disabling stack traces in production for better performance

### 3. Meaningful Operation Names
```typescript
// Instead of letting every operation create its own context
const user = await userRepository.findOne({ where: { id: 1 } });
const posts = await postRepository.find({ where: { authorId: 1 } });

// Wrap related operations with business context
await observe('user.profile_page', async () => {
  const user = await userRepository.findOne({ where: { id: 1 } });
  const posts = await postRepository.find({ where: { authorId: 1 } });
  vision.set('profile_type', 'public');
  vision.set('user_id', user.id);
  vision.set('post_count', posts.length);
});
```

### 4. Transaction Management
```typescript
// Prefer explicit transaction boundaries for complex operations
await observe('order.complete_checkout', async () => {
  await visionTransaction(instrumentedDataSource, async manager => {
    // All related operations within single transaction
    const order = await manager.save(Order, orderData);
    await manager.save(OrderItem, itemsData);
    await manager.update(Product, productIds, { stock: decrements });
    await manager.save(Payment, paymentData);
    
    vision.set('order_id', order.id);
    vision.set('items_processed', itemsData.length);
    vision.set('payment_processed', true);
  });
});
```

### 5. Error Monitoring
```typescript
const errorExporter = createExporter('typeorm_errors', {
  error: async (context, error) => {
    // Send database errors to error tracking service
    await sendToSentry({
      message: `TypeORM operation failed: ${context.name}`,
      extra: {
        entity: context.data.entity,
        operation: context.data.operation,
        duration: context.data.duration_ms,
        query: context.data.sql_query,
        parameters: context.data.parameters,
        constraint: error.constraint,
        table: error.table
      },
      error,
      tags: {
        database: 'typeorm',
        entity: context.data.entity
      }
    });
  }
});
```

## TypeScript Support

The integration is fully typed and works seamlessly with TypeORM's decorators and generated types:

```typescript
import type { VisionTypeORMConfig } from '@rodrigopsasaki/vision-typeorm';
import type { Repository, DataSource } from 'typeorm';

const config: VisionTypeORMConfig = {
  logQueries: true,
  redactFields: ['password', 'token'],
  trackRelationLoading: true
};

// Full type safety maintained
const userRepository: Repository<User> = dataSource.getRepository(User);
const user: User = await userRepository.save({
  email: 'typed@example.com',
  name: 'TypeScript User'
});

// Custom repository with full typing
interface UserStats {
  user: User;
  postCount: number;
  commentCount: number;
  joinDate: Date;
  isActive: boolean;
}

class TypedUserRepository extends Repository<User> {
  async getUserStats(userId: number): Promise<UserStats> {
    // Implementation with full type safety
  }
}
```

## Integration with Other Tools

### OpenTelemetry
```typescript
import { createExporter } from '@rodrigopsasaki/vision';
import { trace } from '@opentelemetry/api';

const otelExporter = createExporter('typeorm_otel', {
  success: (context) => {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent('typeorm_operation', {
        entity: context.data.entity,
        operation: context.data.operation,
        duration: context.data.duration_ms,
        result_count: context.data.result_count
      });
    }
  }
});
```

### Prometheus Metrics
```typescript
const promClient = require('prom-client');

const typeormOperationDuration = new promClient.Histogram({
  name: 'typeorm_operation_duration_seconds',
  help: 'TypeORM operation duration',
  labelNames: ['entity', 'operation', 'status']
});

const typeormConnectionPool = new promClient.Gauge({
  name: 'typeorm_connection_pool_active',
  help: 'Active TypeORM database connections'
});

const promExporter = createExporter('typeorm_prometheus', {
  success: (context) => {
    typeormOperationDuration
      .labels(
        context.data.entity || 'unknown',
        context.data.operation || 'unknown', 
        'success'
      )
      .observe(context.data.duration_ms / 1000);
  },
  error: (context, error) => {
    typeormOperationDuration
      .labels(
        context.data.entity || 'unknown',
        context.data.operation || 'unknown',
        'error'
      )
      .observe(context.data.duration_ms / 1000);
  }
});
```

### DataDog Integration
```typescript
const datadogExporter = createExporter('typeorm_datadog', {
  success: (context) => {
    // Custom metrics
    DogStatsD.histogram('typeorm.operation.duration', context.duration, {
      entity: context.data.entity,
      operation: context.data.operation
    });
    
    DogStatsD.increment('typeorm.operation.count', 1, {
      entity: context.data.entity,
      operation: context.data.operation,
      status: 'success'
    });
    
    // Track slow queries
    if (context.data.is_slow_query) {
      DogStatsD.increment('typeorm.slow_query.count', 1, {
        entity: context.data.entity,
        threshold: context.data.slow_threshold
      });
    }
  }
});
```

## Migration from Other ORMs

### From Prisma

```typescript
// Prisma approach
const user = await prisma.user.create({
  data: { email: 'user@example.com', name: 'John' },
  include: { posts: true }
});

// TypeORM approach with Vision
const userRepository = dataSource.getRepository(User);
const user = await userRepository.save({
  email: 'user@example.com', 
  name: 'John'
});
const userWithPosts = await userRepository.findOne({
  where: { id: user.id },
  relations: ['posts']
});

// Both automatically instrumented by Vision with consistent patterns
```

### From Sequelize

```typescript
// Sequelize approach
const user = await User.create({
  email: 'user@example.com',
  name: 'John'
});

// TypeORM approach
const user = await userRepository.save({
  email: 'user@example.com',
  name: 'John'  
});

// Vision provides consistent observability regardless of ORM choice
```

The TypeORM integration makes database observability effortless while maintaining the full power of TypeORM's decorators, entities, and type safety. Your existing code works unchanged, but now you have deep insights into every database operation, relationship loading pattern, and transaction boundary.