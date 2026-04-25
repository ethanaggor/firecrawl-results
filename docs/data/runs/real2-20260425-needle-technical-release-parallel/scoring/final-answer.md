# Result: Next.js 16

The recent TypeScript/JavaScript library/framework release I found is **Next.js 16**, published on **October 21, 2025**, which is after August 2025. The official Next.js 16 announcement says the release includes Cache Components, stable Turbopack, React Compiler support, smarter routing, new caching APIs, React 19.2 features, and breaking changes. Source: https://nextjs.org/blog/next-16

## Concrete API changes and examples

### 1. Cache Components and the `"use cache"` directive

The Next.js 16 announcement describes **Cache Components** as a new model using Partial Pre-Rendering and `use cache`. The official `use cache` API reference says the directive can mark a route, React component, or function as cacheable, and shows enabling it with `cacheComponents`:

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
}

export default nextConfig
```

The same API page shows the directive at file, component, and function level:

```tsx
// File level
'use cache'

export default async function Page() {
  // ...
}

// Component level
export async function MyComponent() {
  'use cache'
  return <></>
}

// Function level
export async function getData() {
  'use cache'
  const data = await fetch('/api/data')
  return data
}
```

Sources: https://nextjs.org/blog/next-16 and https://nextjs.org/docs/app/api-reference/directives/use-cache

### 2. `revalidateTag` now uses a two-argument API for stale-while-revalidate

The Next.js 16 release notes list “Improved Caching APIs” and say there is a refined `revalidateTag()`. The release page’s behavior-change table says the `revalidateTag()` signature now requires a `cacheLife` profile as the second argument for stale-while-revalidate behavior, and the deprecations table says the single-argument `revalidateTag()` form should be replaced with `revalidateTag(tag, profile)` or `updateTag(tag)`.

The official API reference gives the concrete signature:

```ts
revalidateTag(tag: string, profile: string | { expire?: number }): void;
```

It also shows a Server Action example:

```ts
'use server'

import { revalidateTag } from 'next/cache'

export default async function submit() {
  await addPost()
  revalidateTag('posts', 'max')
}
```

Source: https://nextjs.org/docs/app/api-reference/functions/revalidateTag

### 3. New `updateTag(tag)` cache API for Server Actions

The Next.js 16 announcement lists a new `updateTag()` API. The official `updateTag` reference says `updateTag` updates cached data on demand for a specific cache tag from within Server Actions and is designed for “read-your-own-writes” scenarios. It also says `updateTag` can only be called from Server Actions.

The API reference gives the concrete signature:

```tsx
updateTag(tag: string): void;
```

It shows a Server Action example:

```ts
'use server'

import { updateTag } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createPost(formData: FormData) {
  const title = formData.get('title')
  const content = formData.get('content')

  const post = await db.post.create({
    data: { title, content },
  })

  updateTag('posts')
  updateTag(`post-${post.id}`)

  redirect(`/posts/${post.id}`)
}
```

Source: https://nextjs.org/docs/app/api-reference/functions/updateTag

### 4. `middleware.ts` is renamed to `proxy.ts`, with a `proxy` export

The Next.js 16 announcement says Middleware was replaced by `proxy.ts` to clarify the network boundary. The upgrade guide says the `middleware` filename is deprecated and renamed to `proxy`, the named export `middleware` is deprecated and should be renamed to `proxy`, the `proxy` runtime is `nodejs`, and config flags containing `middleware` are renamed, for example `skipMiddlewareUrlNormalize` becomes `skipProxyUrlNormalize`.

The official Proxy guide shows this new shape:

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  return NextResponse.redirect(new URL('/home', request.url))
}

export const config = {
  matcher: '/about/:path*',
}
```

Sources: https://nextjs.org/blog/next-16, https://nextjs.org/docs/app/guides/upgrading/version-16, and https://nextjs.org/docs/app/getting-started/proxy

### 5. Async request-time APIs are now mandatory

The Next.js 16 upgrade guide says synchronous access to request-time APIs is fully removed. The affected APIs include `cookies`, `headers`, `draftMode`, `params` in layouts/pages/routes/default and metadata image files, and `searchParams` in pages.

The guide shows the type-safe async page pattern:

```tsx
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params
  const query = await props.searchParams
  return <h1>Blog Post: {slug}</h1>
}
```

It also says image-generating functions now receive `params` and `id` as promises:

```js
export default async function Image({ params, id }) {
  const { slug } = await params
  const imageId = await id
  // ...
}
```

Source: https://nextjs.org/docs/app/guides/upgrading/version-16

## Why this satisfies the task

Next.js 16 is an official JavaScript/TypeScript framework release after August 2025. The official release notes and API docs back at least five concrete API changes: the `use cache` directive and `cacheComponents` option, the revised `revalidateTag(tag, profile)` signature, the new `updateTag(tag)` API, the `middleware` to `proxy` API/file-convention change, and mandatory async request-time APIs with source-backed TypeScript examples.
