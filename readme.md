## Qwikly
- TODO
    - [ ] Remove all pnpm workspace links
    - [ ] Improve adapter documentation


### Setup
The existing `ssr` project was generated with the following
- Ensure `"type": "module"` is added to the `package.json` of the `ssr` project after initial creation

```
pnpm create qwik@latest empty ./ssr && cd ./ssr

# Link deps
cd ./js-compute-runtime
pnpm link --global

# Build the qwik monorepo submodule and link it globally for use in our projects
cd ./qwik
pnpm link --global @fastly/js-compute
pnpm install && pnpm api.update && pnpm build && pnpm link.dist

# Must link against the submodule twice since 'qwik add' causes an unlink
pnpm install && pnpm link --global @builder.io/qwik @builder.io/qwik-city @fastly/js-compute
pnpm qwik add fastly
pnpm install && pnpm link --global @builder.io/qwik @builder.io/qwik-city @fastly/js-compute

# Builds qwik project and generates wasm with js-compute and inlined static assets
pnpm build.server

# Runs built artifacts locally
pnpm serve

# Creates or deploys the project to fastly
pnpm run deploy
```

### `js-compute-runtime`
The `@fastly/js-compute` package can be difficult to include into projects due to its exposure of types only through [Typescript's triple-slash compliler directive](https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html) as shown [in the _Compute@Edge_ examples](https://js-compute-reference-docs.edgecompute.app/docs/#trying-things-out). The propsoal is to expose `@fastly/js-compute` types through the JavaScript module system so that dependant projects will have access to types through the `import`/`export` syntax such as:
```typescript
import type { FetchEvent } from '@fastly/js-compute';
```  

While developing the Qwik City Fastly Adapter, there was a need to import types within the [adapter middleware](https://qwik.builder.io/docs/deployments/#add-middleware) to enable framework usage of _Compute@Edge_ features. All example usage of _Compute@Edge_ applications require the use of the directive `/// <reference types="@fastly/js-compute"/>`, however when included into the middleware, causes issues in two ways:
1. It creates conflicts with global types. For example, the standard `FetchEvent` type is overridden, which causes type errors anywhere Qwik expects a non-fastly-specific fetch event type, and does not give the developer the choice of which types are imported or overridden.
2. It does not make the toolchain aware of dependant types. The Qwik project leverages [api-extractor](https://api-extractor.com/) to generate its type and project documentation. When a directive is used in a given file, it does not make the types available to the wider toolchain, which leads to build and test failures due to missing types in both the server entrypoint as well as documentation generation. 

There was an attempt to make the directive work with the Qwik project by placing the directive in a `fastly.d.ts` definition file and including it in the root `tsconfig.json`. This partially worked in solving the toolchain type awareness, but still exhibited issues with global type overrides, broke from the conventions found in other adapters and runtimes, circumvented vite/rollup's ability to mark types/modules as external, and made it unclear to future maintainers where the _Compute@Edge_ types and functions came from within the middleware source.


### Qwik City Fastly Adapter
The architecture [follows this guide](https://qwik.builder.io/docs/deployments/#add-a-new-deployment) and consists of three components:
1. The [Vite config.](https://github.com/kalebpace/qwik/blob/kpace/fastly-adapter/packages/qwik-city/adapters/fastly/vite/index.ts) Responsible for generating a server entrypoint for the Fastly platform.
2. The [platform middleware.](https://github.com/kalebpace/qwik/blob/kpace/fastly-adapter/packages//qwik-city/middleware/fastly/index.ts) Responsible for handling the Fastly platform [`FetchEvent`](https://js-compute-reference-docs.edgecompute.app/docs/globals/FetchEvent/) on each request and mapping qwik-city features to the platform. This includes:
    - [PublishServer](https://github.com/fastly/compute-js-static-publish/blob/main/src/server/publisher-server.ts) to serve static assets from inline WASM or _Compute@Edge_ KV Store
    - [SimpleCache](https://js-compute-reference-docs.edgecompute.app/docs/fastly:cache/SimpleCache/) for response caching
    - `FetchEvent.waitUntil()` for work needed before the runtime is shutdown.
    - Qwik City's [internal request handling](https://qwik.builder.io/api/qwik-city-middleware-request-handler/#requesthandler) to [generate an SSR'd response](https://github.com/kalebpace/qwik/blob/kpace/fastly-adapter/packages/qwik-city/middleware/fastly/index.ts#L82)
3. The [starter template.](https://github.com/kalebpace/qwik/blob/kpace/fastly-adapter/starters/adapters/fastly/) Responsible for **merging** template files and settings with an existing qwik-city project.
    - This template includes the `@fastly/compute-js-static-publish` along with a default `static-publish.rc.js` config. This is responsible for building mappings of static assets and including them inline to the WASM binary or uploading them to the KV Store. A `statics.js` gets generated during this process, which yields a `getServer()` factory for creating a `PublisherServer` that gets passed into the middleware at runtime. 
    - This template also includes the `@fastly/js-compute` library which contains the `js-compute-runtime` command. This command is responsible for building the `bin/main.wasm` executable and packing this up into a Fastly deployable `pkg/[fastly service name].tar.gz` tarball.

<!-- The below are fixed and out of date, but kept for possible refernece later -->

<!-- ### Vite/Rollup Errors
After adding the adapter to an empty qwik city project, a likely next step is to include a call to one of the Fastly runtime APIs, like `env`. These **external** functions have their signatures imported like a normal module: `import { env } from 'fastly:env'`.

- When building with this format, the following error occurs.

    **Command:** `cd ./ssr && pnpm build.server`

    **Output:**
    ```
    error during build:
    Error [PLUGIN_ERROR]: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. Received protocol 'fastly:'
        at new NodeError (node:internal/errors:405:5)
        at throwIfUnsupportedURLScheme (node:internal/modules/esm/load:131:11)
        at defaultLoad (node:internal/modules/esm/load:82:3)
        at nextLoad (node:internal/modules/esm/loader:163:28)
        at ESMLoader.load (node:internal/modules/esm/loader:603:26)
        at ESMLoader.moduleProvider (node:internal/modules/esm/loader:457:22)
        at new ModuleJob (node:internal/modules/esm/module_job:64:26)
        at #createModuleJob (node:internal/modules/esm/loader:480:17)
        at ESMLoader.getModuleJob (node:internal/modules/esm/loader:434:34)
        at async ModuleWrap.<anonymous> (node:internal/modules/esm/module_job:79:21)
    ```

The workaround, to make use of the `env()` API and supress type errors, is to add a shim in the `./ssr/fastly.d.ts` for this function and remove the import. 

 - Though, this causes symbols to be missing during runtime. 

    **Command:** `cd ./ssr && pnpm serve`

    **Output:**
    ```
    2023-10-16T01:48:48.535292Z  INFO request{id=0}: handling request GET http://127.0.0.1:7676/
    Error: (new ReferenceError("env is not defined", "<stdin>", 3227))
    ```

The second part to this workaround is to skip the vite/rollup bundling and patch the [generated entrypoint](https://github.com/kalebpace/qwik/blob/kpace/fastly-adapter/packages/qwik-city/adapters/fastly/vite/index.ts#L64). This patch includes both the types directive as well as attaching `import { env } from 'fastly:env'` to `globalThis.env = env`.

This is not an ideal setup. Hopefully, once a fix for the vite/rollup protocol errors is found, adding the directive and globalThis patches will not be needed. 

### [API Extractor](https://api-extractor.com/) Errors

- Extending from or using `FetchEvent` causes the following.

    **Command:** `cd ./qwik && pnpm build`

    **Output:**
    ```
    ❌ Error: Internal Error: Unable to follow symbol for "FetchEvent"
    ```

An initial fix is to include a `fastly.d.ts` in the qwik monorepo's [root tsconfig](https://github.com/kalebpace/qwik/blob/kpace/fastly-adapter/tsconfig.json#L156).

## TODO
- [x] Build qwik city with ssr, deploy static and functions, respond with SimpleCache
- [x] Fix fastly: protocol import errors and allow utiltiy functions to be used from ssr project (e.g. env from fastly:env)
    ```
    Error [PLUGIN_ERROR]: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. Received protocol 'fastly:'
    ```
- [x] Fix fetches for static assets
    ```
    Error while running request handler: No backend specified for request with url http://127.0.0.1:7676/manifest.json. Must provide a `backend` property on the `init` object passed to either `new Request()` or `fetch`
    ```
- [x] Fix fetches with defined backends

 -->
