import { spawn } from 'node:child_process';

const children = [
  spawn(process.execPath, ['server/server.mjs', '--api-only'], {
    stdio: 'inherit',
    env: { ...process.env, PORT: '8787' },
  }),
  spawn('npm', ['exec', '--', 'vite', '--host', '127.0.0.1', '--port', '5173'], {
    stdio: 'inherit',
    env: process.env,
  }),
];

const stop = signal => {
  for (const child of children) child.kill(signal);
};

process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));

for (const child of children) {
  child.on('exit', code => {
    if (code && code !== 0) {
      stop('SIGTERM');
      process.exitCode = code;
    }
  });
}
