# rodrigopsasaki.com

Personal monorepo for my website and future projects.

## Structure

```
/
├── apps/
│   ├── web/           # Astro site: personal homepage, blog, projects
│   └── api/           # Placeholder backend (future)
│
├── packages/
│   ├── ui/            # Shared UI components (future)
│   └── config/        # Zod schemas, metadata for blog/projects
```

## Tech Stack

- **Web**: Astro + TailwindCSS
- **Config**: TypeScript + Zod
- **Package Manager**: pnpm
- **Node Version**: 20.11.0 (managed with mise)

## Development

```bash
# Install dependencies
pnpm install

# Run development servers
pnpm dev

# Build all packages
pnpm build

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Deployment

Hosted on Fly.io with automatic deployments via GitHub Actions.