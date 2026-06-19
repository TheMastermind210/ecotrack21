import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { createEcoTrackServer } from './appServer.mjs';

try {
  loadEnvFile();
} catch {
  // Environment variables may be supplied directly by the deployment platform.
}

const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '127.0.0.1';
const apiOnly = process.argv.includes('--api-only');

const server = createEcoTrackServer({
  apiOnly,
  distDir: resolve('dist'),
});

server.listen(port, host, () => {
  console.log(`EcoTrack server listening on http://${host}:${port}`);
});
