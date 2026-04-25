# Answer

A recent JavaScript library release that satisfies the task is React 19.2, released after August 2025.

Primary source: https://react.dev/blog/2025/10/01/react-19-2

The official React release post is dated October 1, 2025 and states: "React 19.2 is now available on npm!" It lists new React features and React DOM features with concrete API examples.

## Source-backed API changes

1. `<Activity />` was added as a new React feature.

The release says `<Activity>` lets apps break UI into activities that can be controlled and prioritized, and gives this migration shape:

```jsx
// Before
{isVisible && <Page />}

// After
<Activity mode={isVisible ? 'visible' : 'hidden'}>
  <Page />
</Activity>
```

The post documents `visible` and `hidden` modes. In `hidden` mode, children are hidden, effects are unmounted, and updates are deferred until React has no visible work left.

2. `useEffectEvent` was added for event-like logic inside effects.

The release explains that `useEffectEvent` separates event logic from the effect that emits it, avoiding unnecessary effect reruns when unrelated values such as `theme` change. The source example changes effect code to this shape:

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

The release notes that Effect Events always see the latest props and state, should not be dependency-array entries, and require upgrading `eslint-plugin-react-hooks` so the linter understands them.

3. `cacheSignal` was added for React Server Components cache lifetimes.

The release says `cacheSignal` is for React Server Components and lets code know when the `cache()` lifetime is over. The source example imports it from `react` and passes it to `fetch`:

```jsx
import { cache, cacheSignal } from 'react';

const dedupedFetch = cache(fetch);

async function Component() {
  await dedupedFetch(url, { signal: cacheSignal() });
}
```

The release says this can clean up or abort work after rendering completes, rendering is aborted, or rendering fails.

4. React DOM added Partial Pre-rendering APIs.

The release says React 19.2 adds Partial Pre-rendering so static parts can be pre-rendered and later resumed. The source examples show:

```jsx
const { prelude, postponed } = await prerender(<App />, {
  signal: controller.signal,
});
```

Then later:

```jsx
const resumeStream = await resume(<App />, postponed);
```

Or for static generation:

```jsx
const { prelude } = await resumeAndPrerender(<App />, postponedState);
```

The same section names the new docs/API surface for `resume`, `resumeToPipeableStream`, `resumeAndPrerender`, and `resumeAndPrerenderToNodeStream`, and notes that prerender APIs now return postponed state to pass to resume APIs.

## Conclusion

React 19.2 is a post-August-2025 JavaScript library release with at least three concrete API changes. The strongest examples from the official release are `<Activity />`, `useEffectEvent`, `cacheSignal`, and the React DOM Partial Pre-rendering resume APIs.
