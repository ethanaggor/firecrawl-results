# Needle Technical Release Answer

A source-backed match is **Next.js 16**, published by the official Next.js team on **October 21, 2025**, which is after August 2025. The official release page says "Next.js 16 is now available" and lists API-facing changes including Proxy, improved caching APIs, React Compiler support, Cache Components, and breaking changes.

Primary sources:

- https://nextjs.org/blog/next-16
- https://nextjs.org/docs/app/guides/upgrading/version-16
- https://nextjs.org/docs/app/guides/caching

## Concrete API Changes

1. **`middleware` was deprecated and renamed to `proxy`.**

   The upgrade guide says the `middleware` filename is deprecated and renamed to `proxy`, and the named export `middleware` is also deprecated. It gives the migration shape:

   ```ts
   // Rename middleware.ts to proxy.ts
   export function proxy(request: Request) {}
   ```

   It also says config flags containing `middleware` were renamed, for example `skipMiddlewareUrlNormalize` is now `skipProxyUrlNormalize`.

2. **`revalidateTag` changed its call signature.**

   The version 16 upgrade guide says `revalidateTag` now requires a second argument specifying a `cacheLife` profile. The single-argument form is deprecated and produces a TypeScript error.

   ```ts
   // Before
   revalidateTag('posts')

   // After
   revalidateTag('posts', 'max')
   ```

3. **New `updateTag` cache API was introduced.**

   The upgrade guide describes `updateTag` as a new Server Actions-only API that gives read-your-writes semantics by expiring and immediately refreshing data within the same request.

   ```ts
   'use server'
   import { updateTag } from 'next/cache'

   export async function updateUserProfile(userId: string, profile: Profile) {
     await db.users.update(userId, profile)
     updateTag(`user-${userId}`)
   }
   ```

4. **New `refresh` cache/router API was introduced.**

   The upgrade guide says `refresh` lets you refresh the client router from within a Server Action.

   ```ts
   'use server'
   import { refresh } from 'next/cache'

   export async function markNotificationAsRead(notificationId: string) {
     await db.notifications.markAsRead(notificationId)
     refresh()
   }
   ```

5. **`cacheLife` and `cacheTag` became stable APIs.**

   The guide says the `unstable_` prefix is no longer needed. The import shape changed from aliased unstable names to stable exports:

   ```ts
   import {
     unstable_cacheLife as cacheLife,
     unstable_cacheTag as cacheTag,
   } from 'next/cache'

   import { cacheLife, cacheTag } from 'next/cache'
   ```

6. **PPR configuration moved to `cacheComponents`.**

   Next.js 16 removes experimental PPR configuration options, including route-level `experimental_ppr`, and the upgrade guide shows opting into PPR with `cacheComponents`.

   ```js
   const nextConfig = {
     cacheComponents: true,
   }

   module.exports = nextConfig
   ```

7. **React Compiler configuration was promoted to stable.**

   The release and upgrade pages say built-in React Compiler support is stable in Next.js 16 and the `reactCompiler` config moved out of experimental usage:

   ```ts
   import type { NextConfig } from 'next'

   const nextConfig: NextConfig = {
     reactCompiler: true,
   }

   export default nextConfig
   ```

## Conclusion

Next.js 16 satisfies the task: it is a recent JavaScript/TypeScript ecosystem release after August 2025, and official release/upgrade documentation provides more than three concrete API changes with TypeScript or JavaScript examples. The strongest examples are the `proxy` migration, `revalidateTag` signature change, new `updateTag`, new `refresh`, stable `cacheLife` and `cacheTag`, `cacheComponents`, and stable `reactCompiler` config.
