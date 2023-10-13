## TODO
- [x] Build qwik city with ssr, deploy static and functions, respond with SimpleCache
- [] Fix fastly: protocol import errors and allow utiltiy functions to be used from ssr project (e.g. env from fastly:env)
- [] Implement redirects with VCL: https://developer.fastly.com/solutions/tutorials/redirects/, similar to Cloudflare Pages _routes.json
- [] Implement custom headers: https://developer.fastly.com/reference/http/http-headers/


### Fastly SSR Setup
The existing `ssr` project was generated with the following
```
pnpm create qwik@latest empty ./ssr && cd ./ssr

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