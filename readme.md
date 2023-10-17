## Demo
https://steadily-endless-sunbeam.edgecompute.app/

## TODO
- [x] Build qwik city with ssr, deploy static and functions, respond with SimpleCache

- [x] Fix fastly: protocol import errors and allow utiltiy functions to be used from ssr project (e.g. env from fastly:env)
    ```
    Error [PLUGIN_ERROR]: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. Received protocol 'fastly:'
    ```

- [ ] Fix fetches for static assets
    ```
    Error while running request handler: No backend specified for request with url http://127.0.0.1:7676/manifest.json. Must provide a `backend` property on the `init` object passed to either `new Request()` or `fetch`
    ```

- [ ] Implement redirects with VCL: https://developer.fastly.com/solutions/tutorials/redirects/, similar to Cloudflare Pages _routes.json

- [ ] Implement custom headers: https://developer.fastly.com/reference/http/http-headers/

### Fastly SSR Setup
The existing `ssr` project was generated with the following
```
pnpm create qwik@latest empty ./ssr && cd ./ssr

# Build the qwik monorepo submodule and link it globally for use in other projects
cd ./qwik
pnpm install && pnpm api.update && pnpm build && pnpm link.dist

# Must link against the submodule twice since 'qwik add' causes an unlink
pnpm install && pnpm link --global @builder.io/qwik @builder.io/qwik-city
pnpm qwik add fastly
pnpm install && pnpm link --global @builder.io/qwik @builder.io/qwik-city
```

### Building
Before running build commands:
- add `"type": "module"` to your `package.json` in the `ssr` project
- add a `<pre>{env("FASTLY_HOSTNAME")</pre>` inside `./ssr/src/routes/index.tsx` to test the fastly env functionality
```
# Builds qwik project and generates wasm with js-compute
pnpm build.server

# Runs built artifacts locally
pnpm serve

# Creates or deploys the project to fastly
pnpm run deploy
```

# Discussion

## Summary
The intent of this project is to build and test a Qwik City adapter for Fastly's Edge@Compute service. The architecture consists of three components:

1. The [Vite config.](https://github.com/kalebpace/qwik/blob/kpace/fastly-adapter/packages/qwik-city/adapters/fastly/vite/index.ts) Responsible for generating a server entrypoint for the Fastly platform.
2. The [platform middleware.](https://github.com/kalebpace/qwik/blob/kpace/fastly-adapter/packages//qwik-city/middleware/fastly/index.ts) Responsible for handling the Fastly platform [`FetchEvent`](https://js-compute-reference-docs.edgecompute.app/docs/globals/FetchEvent/) on each request and mapping qwik-city features to the platform. This includes:
    - [SimpleCache](https://js-compute-reference-docs.edgecompute.app/docs/fastly:cache/SimpleCache/) for static routes
    - `FetchEvent.waitUntil()` for work needed before the runtime is shutdown.
    - Qwik City's [internal request handling](https://qwik.builder.io/api/qwik-city-middleware-request-handler/#requesthandler) to [generate an SSR'd response](https://github.com/kalebpace/qwik/blob/kpace/fastly-adapter/packages/qwik-city/middleware/fastly/index.ts#L82)
3. The [starter template.](https://github.com/kalebpace/qwik/blob/kpace/fastly-adapter/starters/adapters/fastly/) Responsible for **merging** template files and settings with an existing qwik-city project.
    - This template includes the `@fastly/js-compute` library which contains the `js-compute-runtime` command. This command is responsible for building the `bin/main.wasm` executable and packing this up into a Fastly deployable `pkg/[fastly service name].tar.gz` tarball.


## Known issues
The `@fastly/js-compute` library exposes type definitions through a [Typescript triple-slash directive](https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html) as shown [here](https://js-compute-reference-docs.edgecompute.app/docs/#trying-things-out). It has lead to issues when including types inside the adapter's source, both when building the server entrypoint as well as ensuring the API Extractor tools are aware of these 3rd party types. 

Most errors would be fixed by making the `@fastly/js-compute` module expose its types through the module interface instead of relying on compiler directives. This would also allow the types to be scoped/referenced within the adapter middleware without instealling the fastly specific modules to the root of the qwik monorepo.

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


 -->
