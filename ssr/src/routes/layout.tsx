import { component$, Slot } from "@builder.io/qwik";
import type { RequestEvent, RequestHandler } from "@builder.io/qwik-city";

export const onGet: RequestHandler = async (requestEvent: RequestEvent) => {
  const hostname = requestEvent.platform.env("FASTLY_HOSTNAME")
  console.log(hostname)
  return hostname
};

export default component$(() => {
  return <Slot />;
});
