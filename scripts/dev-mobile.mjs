import { spawn } from 'node:child_process';

const DEFAULT_HOST = '172.30.1.79';
const DEFAULT_PORT = process.env.MOBILE_DEV_PORT ?? process.env.PORT ?? '3000';

const rawTarget =
  process.argv[2] ?? process.env.MOBILE_DEV_HOST ?? DEFAULT_HOST;

const normalizeTarget = (target) => {
  if (target.startsWith('http://') || target.startsWith('https://')) {
    const url = new URL(target);
    return {
      origin: `${url.protocol}//${url.hostname}:${url.port || DEFAULT_PORT}`,
      port: url.port || DEFAULT_PORT,
    };
  }

  const [host, port = DEFAULT_PORT] = target.split(':');
  return {
    origin: `http://${host}:${port}`,
    port,
  };
};

const { origin, port } = normalizeTarget(rawTarget);
const isWindows = process.platform === 'win32';
const command = isWindows ? 'yarn.cmd' : 'yarn';

console.log(`[dev:mobile] NEXTAUTH_URL=${origin}`);
console.log(`[dev:mobile] NEXT_PUBLIC_SITE_URL=${origin}`);
console.log(`[dev:mobile] Listening on 0.0.0.0:${port}`);

const child = spawn(command, ['dev', '-H', '0.0.0.0', '-p', port], {
  stdio: 'inherit',
  shell: isWindows,
  env: {
    ...process.env,
    NEXTAUTH_URL: origin,
    NEXT_PUBLIC_SITE_URL: origin,
    PORT: port,
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
