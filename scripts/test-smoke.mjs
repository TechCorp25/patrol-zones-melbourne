#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const checks = [
  'app.json',
  'package.json',
  'server/index.ts',
  'docs/symphony-repo-assessment-prompt.md',
];

for (const relative of checks) {
  const full = path.resolve(process.cwd(), relative);
  if (!fs.existsSync(full)) {
    console.error(`Missing required file: ${relative}`);
    process.exit(1);
  }
}

const appJson = JSON.parse(fs.readFileSync(path.resolve('app.json'), 'utf-8'));
if (!appJson.expo?.name || !appJson.expo?.slug) {
  console.error('app.json must contain expo.name and expo.slug');
  process.exit(1);
}

console.log('Smoke checks passed.');
