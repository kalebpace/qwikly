### Active PRs & Discussion
- [Init adapter in Qwik Core](https://github.com/BuilderIO/qwik/pull/5552)
- [Init adapter in Qwik e2e test app](https://github.com/BuilderIO/qwik-city-e2e/pull/9)
- [Missing APIs in Fastly js-compute](https://github.com/fastly/js-compute-runtime/issues/711)

### Setup

Link the two submodules

```
# Build the qwik monorepo submodule and link it globally for use in our projects
cd ./qwik
pnpm install && pnpm api.update && pnpm build && pnpm link.dist

cd ../qwik-city-e2e
pnpm install && pnpm link --global @builder.io/qwik @builder.io/qwik-city

# Builds qwik project and generates wasm with js-compute and inlined static assets
pnpm build.fastly

# Runs built artifacts locally
pnpm serve.fastly

# Creates or deploys the project to fastly
pnpm deploy.fastly
```

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
