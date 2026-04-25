# Answer

A suitable release is **Got v15.0.0**, the Node.js HTTP request library from `sindresorhus/got`.

The official GitHub release page reports:

- URL: https://github.com/sindresorhus/got/releases/tag/v15.0.0
- Published: 2026-04-01T17:26:23Z
- Repository language: TypeScript
- Release type: major release with a "Breaking changes" section and a migration guide

This is after August 2025 and it introduces more than three concrete API changes. Source-backed examples:

1. **`promise.cancel()` was removed**

   The release says "`promise.cancel()` is gone" and instructs users to use the `signal` option with `AbortController` instead.

   Before:

   ```js
   const promise = got(url);
   promise.cancel();
   ```

   After:

   ```js
   const controller = new AbortController();
   const promise = got(url, {signal: controller.signal});
   controller.abort();
   ```

   Supporting source: https://github.com/sindresorhus/got/releases/tag/v15.0.0 and the Got option docs at https://github.com/sindresorhus/got/blob/main/documentation/2-options.md#signal

2. **`isStream: true` was removed**

   The release says the `isStream` option was removed and users should call `got.stream()` directly.

   Before:

   ```js
   got(url, {isStream: true});
   ```

   After:

   ```js
   got.stream(url);
   ```

   Supporting source: https://github.com/sindresorhus/got/releases/tag/v15.0.0 and Got stream documentation at https://github.com/sindresorhus/got/blob/main/documentation/3-streams.md

3. **Form uploads moved to native Web API `FormData`**

   The release says Got now uses the native `FormData` global and tells users to use Web API `FormData` directly.

   Before:

   ```js
   import {FormData} from 'formdata-node';

   const form = new FormData();
   form.set('name', 'value');
   await got.post(url, {body: form});
   ```

   After:

   ```js
   const form = new FormData();
   form.set('name', 'value');
   await got.post(url, {body: form});
   ```

   Supporting source: https://github.com/sindresorhus/got/releases/tag/v15.0.0 and Got body option docs in https://github.com/sindresorhus/got/blob/main/documentation/2-options.md#body

4. **`responseType: 'buffer'`, `response.rawBody`, and `promise.buffer()` now return `Uint8Array` instead of `Buffer`**

   The release states that `response.rawBody` and `promise.buffer()` now return `Uint8Array`, and strict type checks may need updating.

   Before:

   ```js
   const data = await got(url).buffer();
   const copy = Buffer.from(data);
   ```

   After:

   ```js
   const data = await got(url).buffer();
   const copy = new Uint8Array(data);
   ```

   The migration guide adds that callers needing `Buffer`-specific APIs can wrap with `Buffer.from(data.buffer, data.byteOffset, data.byteLength)`.

   Supporting source: https://github.com/sindresorhus/got/releases/tag/v15.0.0

Additional API behavior changes visible in the same release include `strictContentLength` defaulting to `true`, `retry.enforceRetryRules` defaulting to `true`, piped header copying becoming opt-in through `copyPipedHeaders`, `url` being removed from public options objects passed to hooks, and 300/304 responses no longer being auto-followed.

# Key URLs

- https://github.com/sindresorhus/got/releases/tag/v15.0.0
- https://github.com/sindresorhus/got/blob/main/documentation/2-options.md#signal
- https://github.com/sindresorhus/got/blob/main/documentation/3-streams.md
