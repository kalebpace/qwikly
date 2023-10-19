import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";

export const useEnvData = routeLoader$(async () => {
  const { env } = await import('fastly:env');
  const value = env("FASTLY_HOSTNAME");
  return value
})

export default component$(() => {
  const signal = useEnvData();
  return (
    <>
      <h1>Hi 👋</h1>
      <p>
        Can't wait to see what you build with qwik!
        <br />
        Happy coding.
      </p>
      <p>Output from: <pre>env("FASTLY_HOSTNAME")</pre></p>
      <pre>{signal.value}</pre>
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
