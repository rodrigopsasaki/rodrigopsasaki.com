---
title: "Episode 3: Practical Simplification Techniques"
description: "Concrete strategies and techniques for building simple software and simplifying existing complex systems."
date: "2025-08-08"
tags: ["Refactoring", "Simplicity", "Best Practices", "Code Quality"]
author: "Rodrigo Sasaki"
series: "simplicity"
order: 3
---

# Episode 3: Practical Simplification Techniques

> "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away." — Antoine de Saint-Exupéry

In our final episode, we move from philosophy to practice. Here are concrete techniques for building simple software and simplifying existing complex systems.

## The Simplification Toolkit

### 1. The Deletion Method

The fastest way to simplify is to delete unnecessary code. Start by asking:

- **Dead code**: Is this code ever executed?
- **Redundant code**: Is this doing the same thing as something else?
- **Speculative code**: Was this added "just in case"?
- **Legacy code**: Is this handling scenarios that no longer exist?

```typescript
// Before: Speculative complexity
class EmailService {
  async sendEmail(
    to: string, 
    subject: string, 
    body: string,
    priority: 'low' | 'normal' | 'high' = 'normal',
    format: 'text' | 'html' = 'text',
    delay?: number,
    retryAttempts: number = 3,
    template?: string,
    variables?: Record<string, any>
  ) {
    // 200 lines handling all these options
  }
}

// After: Just what we actually use
class EmailService {
  async sendEmail(to: string, subject: string, body: string) {
    // 20 lines doing the actual work
  }
}
```

**Deletion checklist:**
- Remove unused imports and dependencies
- Delete commented-out code
- Remove configuration options that are never changed
- Eliminate wrapper functions that don't add value
- Delete interfaces with only one implementation

### 2. The Inline Method

When abstractions don't earn their keep, inline them.

```typescript
// Before: Unnecessary abstraction
class PriceCalculator {
  calculateItemPrice(item: Item): number {
    return this.applyDiscounts(this.getBasePrice(item));
  }

  private getBasePrice(item: Item): number {
    return item.price;
  }

  private applyDiscounts(price: number): number {
    return price; // No discounts actually applied
  }
}

// After: Inline the unnecessary methods
class PriceCalculator {
  calculateItemPrice(item: Item): number {
    return item.price;
  }
}
```

### 3. The Consolidation Method

Merge similar classes, functions, or modules that have grown apart over time.

```typescript
// Before: Similar classes handling different formats
class JsonUserExporter {
  export(users: User[]): string {
    return JSON.stringify(users);
  }
}

class CsvUserExporter {
  export(users: User[]): string {
    return users.map(u => `${u.name},${u.email}`).join('\n');
  }
}

// After: Single class with format parameter
class UserExporter {
  export(users: User[], format: 'json' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify(users);
    }
    return users.map(u => `${u.name},${u.email}`).join('\n');
  }
}
```

### 4. The Data Structure Method

Often, complex code is hiding a simple data structure problem.

```typescript
// Before: Complex user permission checking
class User {
  private permissions: Permission[];
  
  canEdit(resource: Resource): boolean {
    return this.permissions.some(p => 
      p.action === 'edit' && 
      p.resource === resource.type &&
      (p.scope === 'all' || p.resourceIds.includes(resource.id))
    );
  }

  canDelete(resource: Resource): boolean {
    return this.permissions.some(p => 
      p.action === 'delete' && 
      p.resource === resource.type &&
      (p.scope === 'all' || p.resourceIds.includes(resource.id))
    );
  }
}

// After: Simple Set-based approach
class User {
  private permissions = new Set<string>();
  
  constructor(permissions: string[]) {
    this.permissions = new Set(permissions);
  }
  
  can(action: string, resource: Resource): boolean {
    return this.permissions.has(`${action}:${resource.type}:${resource.id}`) ||
           this.permissions.has(`${action}:${resource.type}:*`);
  }
}
```

## Architectural Simplification

### 1. Flatten Deep Hierarchies

Deep inheritance or composition hierarchies are complexity multipliers.

```typescript
// Before: Deep inheritance
abstract class Vehicle {
  abstract move(): void;
}

abstract class MotorVehicle extends Vehicle {
  protected engine: Engine;
  abstract startEngine(): void;
}

abstract class PassengerVehicle extends MotorVehicle {
  protected passengers: Person[];
  abstract loadPassengers(): void;
}

class Car extends PassengerVehicle {
  // Implementation buried 3 levels deep
}

// After: Composition over inheritance
class Car {
  constructor(
    private engine: Engine,
    private seats: Seat[]
  ) {}
  
  start() { this.engine.start(); }
  move() { /* move logic */ }
  loadPassengers(passengers: Person[]) { /* loading logic */ }
}
```

### 2. Eliminate Middleware Chains

Complex middleware chains can often be simplified to simple function calls.

```typescript
// Before: Over-engineered middleware
const app = express();
app.use(authenticationMiddleware);
app.use(authorizationMiddleware);
app.use(validationMiddleware);
app.use(transformationMiddleware);
app.use(loggingMiddleware);

app.get('/users/:id', getUserHandler);

// After: Explicit function calls
app.get('/users/:id', async (req, res) => {
  const user = authenticate(req);
  authorize(user, 'read:users');
  const userId = validateUserId(req.params.id);
  
  const userData = await getUser(userId);
  res.json(userData);
});
```

### 3. Replace Configuration with Convention

Reduce configuration by establishing sensible defaults and conventions.

```typescript
// Before: Everything configurable
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  pool: {
    min: number;
    max: number;
    idle: number;
  };
  retry: {
    attempts: number;
    delay: number;
  };
  ssl: boolean;
  timeout: number;
}

// After: Convention over configuration
interface DatabaseConfig {
  url: string; // Contains most settings
  // Everything else uses sensible defaults
}
```

## Code-Level Simplification

### 1. Eliminate Boolean Parameters

Boolean parameters often indicate that a function is doing too much.

```typescript
// Before: Boolean parameter complexity
function processOrder(order: Order, urgent: boolean, validate: boolean) {
  if (validate) {
    // validation logic
  }
  
  if (urgent) {
    // urgent processing
  } else {
    // normal processing
  }
}

// After: Separate functions for different scenarios
function processOrder(order: Order) {
  validateOrder(order);
  // normal processing
}

function processUrgentOrder(order: Order) {
  validateOrder(order);
  // urgent processing
}
```

### 2. Use Early Returns

Eliminate nested conditions with early returns.

```typescript
// Before: Nested conditions
function calculateDiscount(user: User, order: Order): number {
  let discount = 0;
  
  if (user.isPremium) {
    if (order.total > 100) {
      if (user.loyaltyPoints > 1000) {
        discount = 0.15;
      } else {
        discount = 0.10;
      }
    } else {
      discount = 0.05;
    }
  }
  
  return discount;
}

// After: Early returns
function calculateDiscount(user: User, order: Order): number {
  if (!user.isPremium) return 0;
  if (order.total <= 100) return 0.05;
  if (user.loyaltyPoints > 1000) return 0.15;
  return 0.10;
}
```

### 3. Replace Comments with Code

If you need a comment to explain code, consider if the code can explain itself.

```typescript
// Before: Code that needs explanation
// Calculate the compound interest using the formula A = P(1 + r/n)^(nt)
const result = principal * Math.pow(1 + (rate / compoundingFrequency), 
                                   compoundingFrequency * time);

// After: Self-explaining code
function calculateCompoundInterest(
  principal: number,
  annualRate: number,
  compoundingPerYear: number,
  years: number
): number {
  const ratePerPeriod = annualRate / compoundingPerYear;
  const totalPeriods = compoundingPerYear * years;
  
  return principal * Math.pow(1 + ratePerPeriod, totalPeriods);
}
```

## Testing Simplicity

### 1. Test Behavior, Not Implementation

Focus tests on what the system does, not how it does it.

```typescript
// Before: Testing implementation details
test('UserService uses repository to fetch user', async () => {
  const mockRepo = jest.fn().mockResolvedValue(mockUser);
  const service = new UserService(mockRepo);
  
  await service.getUser('123');
  
  expect(mockRepo).toHaveBeenCalledWith('123');
});

// After: Testing behavior
test('getUser returns user data for valid ID', async () => {
  const user = await userService.getUser('123');
  
  expect(user).toEqual({
    id: '123',
    name: 'John Doe',
    email: 'john@example.com'
  });
});
```

### 2. Reduce Test Setup

Complex test setup often indicates complex production code.

```typescript
// Before: Complex test setup
beforeEach(() => {
  mockDatabase = new MockDatabase();
  mockEmailService = new MockEmailService();
  mockLogger = new MockLogger();
  mockConfig = new MockConfig();
  
  userService = new UserService(
    mockDatabase,
    mockEmailService,
    mockLogger,
    mockConfig
  );
});

// After: Simple test setup
beforeEach(() => {
  userService = new UserService();
});
```

## Preventing Complexity

### 1. The YAGNI Principle

"You Aren't Gonna Need It" - Build only what you need today.

### 2. The 3-Strike Rule

Only create an abstraction after you've written similar code 3 times.

### 3. The Simplicity Review

Add a simplicity check to your code review process:
- Can this be simpler?
- What would happen if we removed this?
- Is this solving a real problem?

### 4. Complexity Budgets

Set limits on complexity metrics:
- Maximum cyclomatic complexity per function (e.g., 10)
- Maximum parameters per function (e.g., 4)
- Maximum nesting depth (e.g., 3)

## Real-World Simplification: A Case Study

Let's look at a real example of simplification in action.

**Before: Over-engineered notification system**

```typescript
abstract class NotificationChannel {
  abstract send(message: NotificationMessage): Promise<void>;
}

class EmailChannel extends NotificationChannel {
  async send(message: NotificationMessage): Promise<void> {
    // Email implementation
  }
}

class SMSChannel extends NotificationChannel {
  async send(message: NotificationMessage): Promise<void> {
    // SMS implementation  
  }
}

class NotificationManager {
  private channels: Map<ChannelType, NotificationChannel> = new Map();
  
  registerChannel(type: ChannelType, channel: NotificationChannel) {
    this.channels.set(type, channel);
  }
  
  async sendNotification(
    message: NotificationMessage, 
    preferences: UserPreferences
  ): Promise<void> {
    const availableChannels = this.getAvailableChannels(preferences);
    const selectedChannel = this.selectOptimalChannel(availableChannels);
    
    await selectedChannel.send(message);
  }
}
```

**After: Simplified approach**

```typescript
class NotificationService {
  async sendNotification(
    userId: string, 
    message: string, 
    type: 'email' | 'sms' = 'email'
  ): Promise<void> {
    const user = await this.getUser(userId);
    
    if (type === 'email') {
      await this.sendEmail(user.email, message);
    } else {
      await this.sendSMS(user.phone, message);
    }
  }
  
  private async sendEmail(email: string, message: string): Promise<void> {
    // Direct email implementation
  }
  
  private async sendSMS(phone: string, message: string): Promise<void> {
    // Direct SMS implementation
  }
}
```

The simplified version:
- Eliminated abstract classes and inheritance
- Removed the complex channel registration system
- Simplified the API to just what's actually needed
- Made the code easier to understand and modify

## Measuring Simplification Success

Track these metrics to measure the impact of simplification:

**Code Metrics**
- Lines of code (should decrease)
- Cyclomatic complexity (should decrease)
- Number of classes/interfaces (should decrease)
- Test coverage (should stay the same or improve)

**Team Metrics**
- Time to onboard new developers (should decrease)
- Time to implement new features (should decrease)
- Number of bugs (should decrease)
- Developer satisfaction (should increase)

## Conclusion: The Simple Path Forward

Building simple software is an ongoing discipline, not a one-time effort. It requires:

1. **Vigilance** - Constantly questioning complexity
2. **Courage** - Saying no to unnecessary features and abstractions  
3. **Discipline** - Resisting the urge to over-engineer
4. **Skill** - Knowing how to create simple solutions to complex problems

Remember: The goal isn't to make everything simple, but to make the right things simple and only accept complexity when it serves a clear purpose.

## Key Takeaways

1. **Deletion is your most powerful tool** - Remove before you refactor
2. **Flatten deep hierarchies** - Prefer composition over inheritance
3. **Test behavior, not implementation** - Keep tests simple too
4. **Use early returns** - Reduce nesting and cognitive load
5. **Prevent complexity** - It's easier to avoid than to remove

## Final Thought

In a world that rewards complexity and clever solutions, choosing simplicity is a radical act. It requires confidence, skill, and the wisdom to know that the best code is code that doesn't need to exist.

The next time you're about to add a layer of abstraction, create a configuration option, or implement a flexible framework, pause and ask: "What's the simplest thing that could possibly work?"

Often, you'll find that the simplest thing is not just adequate—it's superior.

---

**Previous:** [← Episode 2: Recognizing Unnecessary Complexity](/blog/simplicity/complexity/)  
**Series:** [← Back to Series Overview](/blog/simplicity/)