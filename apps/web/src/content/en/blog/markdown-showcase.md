---
title: "Complete Markdown Showcase: Every Format You Can Use"
description: "A comprehensive demonstration of all markdown formatting capabilities available in this blog system, from basic text to advanced code blocks and tables."
date: "2025-07-28"
tags: ["Demo", "Markdown", "Formatting", "Documentation"]
---

# Complete Markdown Showcase

This post demonstrates every formatting capability available in this blog system. Use it as a reference when writing your own posts.

## Text Formatting

### Basic Styling
This is **bold text** and this is *italic text*. You can also use ***bold and italic*** together.

You can ~~strike through text~~ and use `inline code` for technical terms.

### Links and References
Here's a [link to GitHub](https://github.com) and here's a [link with title](https://github.com "GitHub Homepage").

You can also use reference-style links: [This is a reference link][ref-link].

[ref-link]: https://example.com "Reference Link Title"

## Headings Hierarchy

# Heading 1 (H1)
## Heading 2 (H2)  
### Heading 3 (H3)
#### Heading 4 (H4)
##### Heading 5 (H5)
###### Heading 6 (H6)

## Lists

### Unordered Lists
- First item
- Second item with a longer description that wraps to multiple lines
- Third item
  - Nested item
  - Another nested item
    - Deep nested item
- Fourth item

### Ordered Lists
1. First numbered item
2. Second numbered item
3. Third item with subitems:
   1. Nested numbered item
   2. Another nested item
   3. One more nested item
4. Fourth numbered item

### Task Lists
- [x] Completed task
- [x] Another completed task
- [ ] Incomplete task
- [ ] Another incomplete task
  - [x] Nested completed subtask
  - [ ] Nested incomplete subtask

## Code Examples

### Inline Code
Use `npm install` to install dependencies, or run `git status` to check your repository status.

### Code Blocks

#### Basic Code Block
```
This is a basic code block
without syntax highlighting
```

#### JavaScript/TypeScript
```javascript
function greetUser(name) {
  const greeting = `Hello, ${name}!`;
  console.log(greeting);
  return greeting;
}

// Usage
const message = greetUser("Developer");
```

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

class UserService {
  private users: User[] = [];

  addUser(user: Omit<User, 'id'>): User {
    const newUser: User = {
      id: Date.now(),
      ...user
    };
    this.users.push(newUser);
    return newUser;
  }

  getUserById(id: number): User | undefined {
    return this.users.find(user => user.id === id);
  }
}
```

#### Bash/Shell Commands
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Deploy to production
./deploy.sh --env=production
```

#### Python
```python
class Calculator:
    def __init__(self):
        self.history = []
    
    def add(self, a, b):
        result = a + b
        self.history.append(f"{a} + {b} = {result}")
        return result
    
    def multiply(self, a, b):
        result = a * b
        self.history.append(f"{a} * {b} = {result}")
        return result

# Usage
calc = Calculator()
sum_result = calc.add(5, 3)
product_result = calc.multiply(4, 7)
print(f"Results: {sum_result}, {product_result}")
```

#### SQL
```sql
-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (username, email) VALUES 
    ('john_doe', 'john@example.com'),
    ('jane_smith', 'jane@example.com'),
    ('developer', 'dev@example.com');

-- Query with JOIN
SELECT u.username, u.email, p.title as project_title
FROM users u
LEFT JOIN projects p ON u.id = p.user_id
WHERE u.created_at > '2024-01-01'
ORDER BY u.username;
```

#### JSON
```json
{
  "name": "my-awesome-project",
  "version": "1.0.0",
  "description": "A demonstration of JSON formatting",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "jest",
    "build": "webpack --mode=production"
  },
  "dependencies": {
    "express": "^4.18.0",
    "lodash": "^4.17.21"
  },
  "devDependencies": {
    "nodemon": "^2.0.20",
    "jest": "^29.0.0"
  },
  "keywords": ["demo", "example", "showcase"],
  "author": "Your Name",
  "license": "MIT"
}
```

#### YAML
```yaml
# Configuration file example
name: CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16, 18, 20]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run linting
        run: npm run lint
```

## Tables

### Basic Table
| Name | Role | Experience | Location |
|------|------|------------|----------|
| John Doe | Frontend Developer | 5 years | New York |
| Jane Smith | Backend Developer | 3 years | San Francisco |
| Bob Johnson | Full Stack Developer | 7 years | Remote |
| Alice Brown | DevOps Engineer | 4 years | London |

### Table with Alignment
| Left Aligned | Center Aligned | Right Aligned | Number |
|:-------------|:-------------:|-------------:|-------:|
| Left | Center | Right | 123 |
| This is left | This is center | This is right | 456 |
| Content | Content | Content | 789 |

### Complex Table with Code
| Command | Description | Example | Output |
|---------|-------------|---------|--------|
| `ls -la` | List all files with details | `ls -la /home` | Shows detailed file listing |
| `git status` | Show repository status | `git status` | Shows modified files |
| `npm install` | Install dependencies | `npm install express` | Installs Express.js |
| `docker ps` | List running containers | `docker ps -a` | Shows all containers |

## Blockquotes

### Simple Blockquote
> This is a simple blockquote. It can contain multiple sentences and will be styled appropriately with the theme colors.

### Nested Blockquote
> This is the first level of quoting.
>
> > This is a nested blockquote inside the first one.
> > It can contain multiple lines as well.
>
> Back to the first level.

### Blockquote with Attribution
> "The best way to predict the future is to create it."
> 
> - Peter Drucker

### Blockquote with Code
> When using the command line, remember:
> 
> ```bash
> cd /path/to/your/project
> git add .
> git commit -m "Your commit message"
> git push origin main
> ```
> 
> Always check your changes before committing!

## Horizontal Rules

You can create horizontal rules to separate sections:

---

Here's another style:

***

And another:

___

## Special Elements

### Keyboard Shortcuts
Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to copy, <kbd>Ctrl</kbd> + <kbd>V</kbd> to paste, and <kbd>Ctrl</kbd> + <kbd>Z</kbd> to undo.

Use <kbd>⌘</kbd> + <kbd>Space</kbd> on Mac to open Spotlight search.

### Abbreviations
HTML stands for HyperText Markup Language.
CSS stands for Cascading Style Sheets.
JS stands for JavaScript.

### Footnotes
Here's a sentence with a footnote[^1].

Here's another footnote[^footnote].

[^1]: This is the first footnote.
[^footnote]: This is a named footnote with more detailed information.

## Mathematical Expressions

### Inline Math
The quadratic formula is $x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$.

### Block Math
$$
\begin{aligned}
\nabla \times \vec{\mathbf{B}} -\, \frac1c\, \frac{\partial\vec{\mathbf{E}}}{\partial t} &= \frac{4\pi}{c}\vec{\mathbf{j}} \\
\nabla \cdot \vec{\mathbf{E}} &= 4 \pi \rho \\
\nabla \times \vec{\mathbf{E}}\, +\, \frac1c\, \frac{\partial\vec{\mathbf{B}}}{\partial t} &= \vec{\mathbf{0}} \\
\nabla \cdot \vec{\mathbf{B}} &= 0
\end{aligned}
$$

## Definition Lists

Term 1
: Definition for term 1

Term 2
: Definition for term 2
: Another definition for term 2

API
: Application Programming Interface

CLI
: Command Line Interface

REST
: Representational State Transfer

## Images and Media

### Image with Alt Text
![Placeholder Image](https://via.placeholder.com/600x300/6366f1/ffffff?text=Sample+Image "Sample placeholder image")

### Image with Caption
![Development Setup](https://via.placeholder.com/800x400/8b5cf6/ffffff?text=Development+Environment "A typical development environment setup")
*Figure 1: A typical development environment with multiple monitors and tools*

## Combinations and Complex Examples

### Code with Explanation Table

| Function | Purpose | Time Complexity | Example Usage |
|----------|---------|----------------|---------------|
| `Array.prototype.map()` | Transform each element | O(n) | `arr.map(x => x * 2)` |
| `Array.prototype.filter()` | Select elements by condition | O(n) | `arr.filter(x => x > 5)` |
| `Array.prototype.reduce()` | Reduce to single value | O(n) | `arr.reduce((a, b) => a + b, 0)` |

Example implementation:
```javascript
const numbers = [1, 2, 3, 4, 5];

// Map: double each number
const doubled = numbers.map(n => n * 2);
console.log(doubled); // [2, 4, 6, 8, 10]

// Filter: get even numbers
const evens = numbers.filter(n => n % 2 === 0);
console.log(evens); // [2, 4]

// Reduce: sum all numbers
const sum = numbers.reduce((acc, n) => acc + n, 0);
console.log(sum); // 15
```

### Nested Lists with Code

1. **Setup Phase**
   - Install dependencies
     ```bash
     npm install
     ```
   - Configure environment
     ```bash
     cp .env.example .env
     ```

2. **Development Phase**
   - Start development server
     ```bash
     npm run dev
     ```
   - Run tests in watch mode
     ```bash
     npm run test:watch
     ```

3. **Deployment Phase**
   - Build production bundle
     ```bash
     npm run build
     ```
   - Deploy to server
     ```bash
     npm run deploy
     ```

### Quote with Code Example

> "Always code as if the guy who ends up maintaining your code will be a violent psychopath who knows where you live."
> 
> - John Woods
>
> This is why we write clean, self-documenting code:
>
> ```javascript
> // Bad
> const d = new Date();
> const y = d.getFullYear();
> 
> // Good
> const currentDate = new Date();
> const currentYear = currentDate.getFullYear();
> ```

## Conclusion

This showcase demonstrates all the formatting options available in your blog system. The combination of Tailwind Typography and custom styling provides excellent readability and visual hierarchy for technical content.

### Key Takeaways
- Use headings to create clear document structure
- Code blocks support syntax highlighting for many languages
- Tables are great for comparing data and specifications
- Blockquotes work well for emphasis and citations
- Lists help organize information hierarchically

Happy writing! ✨