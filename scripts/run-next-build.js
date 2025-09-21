#!/usr/bin/env node

const { spawnSync } = require('child_process');

const env = { ...process.env };

if (!env.NEXT_PRIVATE_SKIP_LOCKFILE_PATCH) {
  env.NEXT_PRIVATE_SKIP_LOCKFILE_PATCH = '1';
}

if (!env.NEXT_IGNORE_INCORRECT_LOCKFILE) {
  env.NEXT_IGNORE_INCORRECT_LOCKFILE = '1';
}

const result = spawnSync('next', ['build'], {
  stdio: 'inherit',
  env,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 0);
