/// <reference types="@fastly/js-compute"/>

// FIXME:
// Error [PLUGIN_ERROR]: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. Received protocol 'fastly:'
// import { env } from "fastly:env"
//
// so we add a global env to fastly.d.ts to shim it
declare function env(name: string): string;