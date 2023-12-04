import { component$ } from "@builder.io/qwik";
import { server$, type DocumentHead, routeLoader$ } from "@builder.io/qwik-city";
// import { env } from "fastly:env";

const serverAction = server$(async () => {
  /** Using static imports causes the following error:
   *
   * vite v4.5.0 building SSR bundle for production...
   * ✓ 17 modules transformed.
   * server/build/q-e94350af.css                 0.31 kB
   * server/entry.ssr.js                         0.12 kB
   * server/@qwik-city-plan.js                   0.22 kB
   * server/entry.fastly.js                     19.79 kB
   * server/assets/entry.ssr-f7518689.js        34.73 kB
   * server/assets/@qwik-city-plan-9cd12e5f.js  80.84 kB
   * error during build:
   * Error [PLUGIN_ERROR]: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. Received protocol 'fastly:'
   *     at new NodeError (node:internal/errors:405:5)
   *     at throwIfUnsupportedURLScheme (node:internal/modules/esm/load:136:11)
   *     at defaultLoad (node:internal/modules/esm/load:87:3)
   *     at nextLoad (node:internal/modules/esm/loader:163:28)
   *     at ESMLoader.load (node:internal/modules/esm/loader:603:26)
   *     at ESMLoader.moduleProvider (node:internal/modules/esm/loader:457:22)
   *     at new ModuleJob (node:internal/modules/esm/module_job:64:26)
   *     at #createModuleJob (node:internal/modules/esm/loader:480:17)
   *     at ESMLoader.getModuleJob (node:internal/modules/esm/loader:434:34)
   *     at async ModuleWrap.<anonymous> (node:internal/modules/esm/module_job:79:21)
   *  ELIFECYCLE Command failed with exit code 1.

   * undefined

   *  ELIFECYCLE Command failed with exit code 1. 
  **/
  const { env } = await import("fastly:env")
  return env("FASTLY_HOSTNAME")
})

export const useFastly = routeLoader$(async (requestEvent) => {
  // This code runs only on the server, after every navigation
  const fastlyBackendFetchTest = await (await requestEvent.platform.fetch(`https://ifconfig.io/ip`, { backend: "ifconfig" })).text();
  const fastlyEnvTest = requestEvent.platform.env("FASTLY_HOSTNAME")
  return {
    fastlyBackendFetchTest,
    fastlyEnvTest
  }
});

export default component$(() => {
  const signal = useFastly()
  return (
    <>
      <h1>Hi 👋</h1>
      <p>
        Can't wait to see what you build with qwik!
        <br />
        Happy coding.
      </p>
      <table>
        <thead>
          <td>Value</td>
          <td>Description</td>
        </thead>
        <tbody>
          <tr>
            <td>
              <pre>{signal.value.fastlyBackendFetchTest}</pre>
            </td>
            <td>
              Use Fastly modified global fetch to get IP from ifconfig.io using a defined backend
            </td>
          </tr>
          <tr>
            <td>
              <pre>{signal.value.fastlyEnvTest}</pre>
            </td>
            <td>
              Use fastly:env with platform middleware object
            </td>
          </tr>
          <tr>
            <td>
              <pre>{serverAction()}</pre>
            </td>
            <td>
              Use fastly:env with server action
            </td>
          </tr>

        </tbody>
      </table>
    </>
  );
});

export const head: DocumentHead = {
  title: "Welcome to Qwik",
  meta: [
    {
      name: "description",
      content: "Qwik site description",
    },
  ],
};
