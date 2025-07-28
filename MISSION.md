## 🧱 Project Scaffold Instruction
### 📌 Goal

Create a personal monorepo for `rodrigopsasaki.com` that will serve as:

1. My public-facing website (CV, projects, blog)
2. A flexible base to add backends later (e.g. Unflagged)
3. A portfolio-ready, open-source codebase that shows engineering taste

---

## 📁 Monorepo Structure

Use `pnpm` workspaces + `mise` (for managing Node version, etc.)

```
/
├── apps/
│   ├── web/           # Astro site: personal homepage, blog, projects
│   └── api/           # Placeholder backend (NestJS or Hono, TBD)
│
├── packages/
│   ├── ui/            # Shared UI components (if needed later)
│   └── config/        # Zod schemas, metadata for blog/projects
│
├── .gitignore
├── package.json       # root + workspace config
├── pnpm-workspace.yaml
├── README.md
└── .tool-versions     # for mise
```

---

## 🧠 Philosophy

* Elegant, boring-for-user / sexy-under-the-hood
* Uses clean URLs (no `.html`, no trailing slashes)
* Mobile-friendly and fast
* Static-first with optional backend evolution
* Markdown-based blog with tags
* Projects support multi-page folders (e.g. `/projects/vision`)
* Everything should be easy to extend

---

## 🌐 Domain Plan

* Primary: `rodrigosasaki.com`
* Subdomains (future):

  * `api.rodrigosasaki.com`
  * `unflagged.rodrigosasaki.com`
* DNS and TLS managed via Cloudflare
* Hosted on Fly.io for full control and backend support

---

## 📦 Tech Stack

### apps/web

* [x] Astro
* [x] TailwindCSS
* [x] Astro Content Collections (for blog/projects)
* [x] Shiki or rehype-pretty-code for syntax highlighting
* [x] Pagefind for static search (later)
* [x] Markdown + frontmatter authoring

### apps/api (stub)

* [ ] NestJS or Hono (let's scaffold just basic placeholders now)

### packages/config

* [x] Zod schemas for blog posts and project metadata
* [x] Tag registry
* [x] Utility to resolve slugs

---

## 📝 Blog Authoring

Each blog post lives in:

```
apps/web/src/content/blog/my-post-slug.mdx
```

With frontmatter:

```ts
export const post = defineCollection({
  schema: z.object({
    title: z.string(),
    date: z.string(),
    tags: z.array(z.string()),
    description: z.string(),
  }),
});
```

Tags are centralized in `packages/config/tags.ts`.

---

## 🚀 Deployment

* Host: Fly.io
* Deploy with `fly deploy` via GitHub Actions
* Add `fly.toml` with:

  * Static builder for Astro
  * Dockerfile (optional if needed later)
* Use `serve` or `astro preview` to run the site inside Fly VM

---

## ✅ Initial Routes

### `/`

* Intro, quick nav, featured blog posts or projects

### `/blog`

* Lists all posts, filterable by tag

### `/blog/[slug]`

* Renders individual post

### `/projects`

* Grid of projects (cli, vision, unflagged, etc.)

### `/projects/[slug]/[page]?`

* Multi-page per project (e.g. `/projects/vision/architecture`)

### `/cv`

* Renders CV from Markdown or links to `/rodrigo-cv.pdf`

---

## 🧪 Testing (later)

* Jest or Vitest setup for `packages/`
* Lint + Prettier enforced at root

