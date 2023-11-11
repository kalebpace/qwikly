import { component$ } from "@builder.io/qwik";
import { type DocumentHead, routeLoader$ } from "@builder.io/qwik-city";

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
      <pre>{signal.value.fastlyBackendFetchTest}</pre>
      <pre>{signal.value.fastlyEnvTest}</pre>
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
