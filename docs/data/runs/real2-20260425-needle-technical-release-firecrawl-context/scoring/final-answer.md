## Answer

A good match is **React 19.2**, released by the React Team on **October 1, 2025**. The official release post says "React 19.2 is now available on npm," so it is a JavaScript/TypeScript ecosystem library release after August 2025.

Source: https://react.dev/blog/2025/10/01/react-19-2

### Source-backed API changes and examples

1. **New `<Activity />` component**

   React 19.2 adds `<Activity>` to split an app into activities that can be controlled and prioritized. The release post presents it as an alternative to conditional rendering:

   ```jsx
   // Before
   {isVisible && <Page />}

   // After
   <Activity mode={isVisible ? 'visible' : 'hidden'}>
     <Page />
   </Activity>
   ```

   The post states that React 19.2 supports `visible` and `hidden` modes. `hidden` hides children, unmounts effects, and defers updates; `visible` shows children, mounts effects, and processes updates normally.

2. **New `useEffectEvent` hook**

   React 19.2 adds `useEffectEvent` for effect-driven event logic that should see the latest props/state without forcing the surrounding Effect to re-run. The release post's example extracts notification logic from a chat-room connection effect:

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

   The post explicitly says Effect Events should not be declared in the dependency array and notes that the latest `eslint-plugin-react-hooks` understands this.

3. **New `cacheSignal` API for React Server Components**

   React 19.2 adds `cacheSignal` for React Server Components so code can observe when a `cache()` lifetime is over and clean up or abort work. The release post gives this example:

   ```jsx
   import { cache, cacheSignal } from 'react';

   const dedupedFetch = cache(fetch);

   async function Component() {
     await dedupedFetch(url, { signal: cacheSignal() });
   }
   ```

   The post says this helps abort or clean up when React has completed rendering, the render was aborted, or the render failed.

4. **New React DOM partial pre-rendering and resume APIs**

   React 19.2 adds partial pre-rendering for React DOM: pre-render static parts, save postponed state, and resume rendering later. The release post shows:

   ```jsx
   const { prelude, postponed } = await prerender(<App />, {
     signal: controller.signal,
   });

   await savePostponedState(postponed);
   ```

   It then resumes later:

   ```jsx
   const postponed = await getPostponedState(request);
   const resumeStream = await resume(<App />, postponed);
   ```

   The post lists new APIs including `resume`, `resumeToPipeableStream`, `resumeAndPrerender`, and `resumeAndPrerenderToNodeStream`, and says the prerender APIs now return postponed state to pass to resume APIs.

### Conclusion

React 19.2 satisfies the task: it is a post-August-2025 JavaScript/TypeScript library release, and the official release notes provide at least three concrete API changes with examples: `<Activity />`, `useEffectEvent`, `cacheSignal`, and partial pre-rendering/resume APIs.
