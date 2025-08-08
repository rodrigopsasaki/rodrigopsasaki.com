# Blog Structure System

This system automatically creates blog series with navigation, breadcrumbs, and next/previous links based on file structure.

## How It Works

### Individual Posts
Create standalone blog posts by placing `.md` files in `/src/content/en/blog/`:

```
src/content/en/blog/
├── my-awesome-post.md
├── another-post.md
└── markdown-showcase.md
```

### Series Posts
Create a series by:

1. **Main series page**: `series-name.md` in the blog root
2. **Episodes**: Place in `series-name/` directory

```
src/content/en/blog/
├── simplicity.md                 # Series overview
├── simplicity/
│   ├── philosophy.md            # Episode 1
│   ├── complexity.md            # Episode 2
│   └── techniques.md            # Episode 3
└── another-series.md
```

## Frontmatter Structure

### Series Overview (simplicity.md)
```yaml
---
title: "The Art of Simplicity: A Series on Building Better Software"
description: "A deep dive into..."
date: "2025-08-08"
tags: ["Simplicity", "Architecture"]
author: "Rodrigo Sasaki"
series: "simplicity"
---
```

### Series Episode (simplicity/philosophy.md)
```yaml
---
title: "Episode 1: The Philosophy of Simple Software"
description: "Exploring what simplicity truly means..."
date: "2025-08-08"
tags: ["Simplicity", "Philosophy"]
author: "Rodrigo Sasaki"
series: "simplicity"
order: 1
---
```

## What Gets Generated Automatically

### For Series Posts:
1. **Sidebar Navigation** - Lists all episodes with current page highlighted
2. **Breadcrumbs** - Shows: Blog > Series Name > Current Episode
3. **Next/Previous Links** - Navigate between episodes in order
4. **Mobile Navigation** - Responsive sidebar for mobile devices

### For Individual Posts:
1. **Standard Layout** - Clean, focused reading experience
2. **No Sidebar** - Full-width content area

## URL Structure

- Individual posts: `/blog/post-name/`
- Series overview: `/blog/series-name/`
- Series episodes: `/blog/series-name/episode-name/`

## Features

- **Zero Configuration** - Just create markdown files in the right structure
- **Automatic Navigation** - Sidebar menu generated from file structure
- **SEO Optimized** - Proper meta tags, structured data, breadcrumbs
- **Responsive Design** - Works on all device sizes
- **Theme Support** - Dark/light mode compatible

## Example Series Structure

```
blog/
├── simplicity.md              # Series overview
├── simplicity/
│   ├── philosophy.md          # order: 1
│   ├── complexity.md          # order: 2
│   └── techniques.md          # order: 3
```

This creates:
- Overview at `/blog/simplicity/`
- Episodes at `/blog/simplicity/philosophy/`, etc.
- Automatic navigation between all parts
- Breadcrumbs: Blog > Simplicity > Episode Name

## Tips

1. **Use `order` field** to control episode sequence
2. **Keep series names short** for clean URLs
3. **Write descriptive titles** for better navigation
4. **Include series overview** to introduce the topic
5. **Link between episodes** in content for better UX