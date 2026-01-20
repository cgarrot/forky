const { mkdirSync, copyFileSync, rmSync } = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');

const packageRoot = path.resolve(__dirname, '..');
const schemaSource = path.resolve(
  __dirname,
  '../../db/prisma/schema.prisma',
);
const schemaDir = path.join(packageRoot, '.prisma-schema');
const schemaTarget = path.join(schemaDir, 'schema.prisma');

mkdirSync(schemaDir, { recursive: true });
copyFileSync(schemaSource, schemaTarget);

const prismaBin = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
const result = spawnSync(
  prismaBin,
  ['generate', `--schema=${schemaTarget}`],
  {
    cwd: packageRoot,
    env: {
      ...process.env,
      PRISMA_GENERATE_SKIP_AUTOINSTALL: '1',
    },
    stdio: 'inherit',
  },
);

try {
  rmSync(schemaDir, { recursive: true, force: true });
} catch {
  // Ignore cleanup errors.
}

process.exit(result.status ?? 1);
