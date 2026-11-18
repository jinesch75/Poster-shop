// Runs once per server process, before any request is handled.
//
// This file is compiled for BOTH the Node and Edge runtimes (the Edge pass
// exists because the project has a middleware.ts). sharp is a native module
// and cannot be resolved for Edge — it pulls in fs, child_process and node:
// scheme imports that the Edge compiler rejects.
//
// Next replaces process.env.NEXT_RUNTIME with a literal at build time, once
// per compiler. Keeping the import INSIDE the branch means the Edge pass sees
// `if ('edge' === 'nodejs')`, eliminates it as dead code, and never tries to
// resolve sharp. A runtime early-return does not achieve this — the bundler
// still has to resolve anything it can reach.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-node');
  }
}
