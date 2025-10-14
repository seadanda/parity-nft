/**
 * WebSocket provider wrapper for Vercel serverless functions
 * Ensures proper loading of native modules (ws, bufferutil, utf-8-validate)
 *
 * The native modules are externalized in next.config.ts so they will be
 * loaded at runtime by Node.js, not bundled by webpack.
 */

export async function getVercelWsProvider(url: string) {
  // Import the WS provider
  const { getWsProvider } = await import("polkadot-api/ws-provider/node");

  // Return the provider - native modules are handled by externalization
  return getWsProvider(url);
}
