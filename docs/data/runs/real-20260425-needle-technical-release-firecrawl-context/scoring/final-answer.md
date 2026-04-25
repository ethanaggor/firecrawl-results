# Recent TypeScript/JavaScript Library Release

The best supported match is **React 19.2**, a JavaScript library release published **October 1, 2025**, which is after August 2025. The official React release post says "React 19.2 is now available on npm" and presents new React and React DOM APIs. The official React changelog confirms **19.2.0 (October 1st, 2025)** and lists the new APIs, including `Activity`, `useEffectEvent`, `cacheSignal`, `resume`, `resumeAndPrerender`, `resumeToPipeableStream`, `resumeAndPrerenderToNodeStream`, and `prerender`.

## Source-backed API changes and examples

1. **`<Activity />` component**

   React 19.2 introduced `<Activity>` to divide an app into activities that can be controlled and prioritized. The release post shows replacing conditional rendering:

   ```jsx
   // Before
   {isVisible && <Page />}

   // After
   <Activity mode={isVisible ? 'visible' : 'hidden'}>
     <Page />
   </Activity>
   ```

   The source says React 19.2 supports `visible` and `hidden` modes. `hidden` hides children, unmounts effects, and defers updates until React has no visible work left; `visible` shows children, mounts effects, and processes updates normally.

2. **`useEffectEvent` hook**

   React 19.2 introduced `useEffectEvent` to split event-like logic out of an Effect so unrelated prop/state changes do not re-run the Effect. The release post's example extracts notification logic:

   ```jsx
   function ChatRoom({ roomId, theme }) {
     const onConnected = useEffectEvent(() => {
       showNotification('Connected!', theme);
     });

     useEffect(() => {
       const connection = createConnection(serverUrl, roomId);
       connection.on('connected', () => {
         onConnected();
       });
       connection.connect();
       return () => connection.disconnect();
     }, [roomId]);
   }
   ```

   The source states Effect Events always see the latest props and state, and they should not be declared in the dependency array.

3. **`cacheSignal` API**

   React 19.2 introduced `cacheSignal` for React Server Components. The release post says it lets code know when the `cache()` lifetime is over, and gives this usage shape:

   ```jsx
   import { cache, cacheSignal } from 'react';

   const dedupedFetch = cache(fetch);

   async function Component() {
     await dedupedFetch(url, { signal: cacheSignal() });
   }
   ```

   The source says this allows cleanup or aborting work when a cached result will no longer be used, including after rendering completes, aborts, or fails.

4. **Partial pre-rendering / resume APIs**

   React 19.2 added Partial Pre-rendering in React DOM: pre-render part of the app ahead of time and resume rendering later. The release post shows `prerender` returning both `prelude` and `postponed`:

   ```jsx
   const { prelude, postponed } = await prerender(<App />, {
     signal: controller.signal,
   });
   await savePostponedState(postponed);
   ```

   It then shows later resume usage:

   ```jsx
   const postponed = await getPostponedState(request);
   const resumeStream = await resume(<App />, postponed);
   ```

   The same section names the new APIs `resume`, `resumeToPipeableStream`, `resumeAndPrerender`, and `resumeAndPrerenderToNodeStream`, and notes that prerender APIs now return postponed state to pass to the resume APIs.

## Key sources

- Official React release post: https://react.dev/blog/2025/10/01/react-19-2
- Official React changelog: https://raw.githubusercontent.com/facebook/react/main/CHANGELOG.md
