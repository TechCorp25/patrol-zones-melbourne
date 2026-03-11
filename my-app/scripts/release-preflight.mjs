#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];

function assertFile(file) {
  if (!fs.existsSync(path.join(root, file))) {
    errors.push(`Missing required file: ${file}`);
  }
}

function assertEnvVar(name, target = 'mobile') {
  if (!process.env[name]) {
    warnings.push(`[${target}] ${name} is not set in current shell (required before build/release).`);
  }
}

assertFile('app.config.ts');
assertFile('eas.json');
assertFile('package.json');
assertFile('server/package.json');

if (fs.existsSync(path.join(root, 'app.config.ts'))) {
  const appConfig = fs.readFileSync(path.join(root, 'app.config.ts'), 'utf8');
  if (appConfig.includes('replace-with-real-project-id')) {
    errors.push('app.config.ts still contains placeholder EAS projectId. Replace before deployment.');
  }

  if (!appConfig.includes('EXPO_PUBLIC_API_BASE_URL')) {
    errors.push('app.config.ts missing EXPO_PUBLIC_API_BASE_URL wiring.');
  }

  if (!appConfig.includes('EXPO_PUBLIC_ENVIRONMENT')) {
    errors.push('app.config.ts missing EXPO_PUBLIC_ENVIRONMENT wiring.');
  }
}

if (fs.existsSync(path.join(root, 'eas.json'))) {
  const eas = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));
  const profiles = eas?.build ?? {};
  for (const key of ['development', 'preview', 'production']) {
    if (!profiles[key]) {
      errors.push(`eas.json missing build profile: ${key}`);
    }
  }

  if (!eas?.cli?.version) {
    errors.push('eas.json missing cli.version gate.');
  }
}

if (fs.existsSync(path.join(root, 'package.json'))) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const scripts = pkg.scripts ?? {};
  for (const script of ['dev', 'lint', 'typecheck', 'test', 'doctor', 'check']) {
    if (!scripts[script]) {
      errors.push(`package.json missing script: ${script}`);
    }
  }
}

if (fs.existsSync(path.join(root, 'server/package.json'))) {
  const spkg = JSON.parse(fs.readFileSync(path.join(root, 'server/package.json'), 'utf8'));
  const scripts = spkg.scripts ?? {};
  for (const script of ['dev', 'build', 'lint', 'typecheck', 'test', 'check']) {
    if (!scripts[script]) {
      errors.push(`server/package.json missing script: ${script}`);
    }
  }
}

assertEnvVar('EXPO_PUBLIC_API_BASE_URL', 'mobile');
assertEnvVar('EXPO_PUBLIC_ENVIRONMENT', 'mobile');
assertEnvVar('DATABASE_URL', 'server');
assertEnvVar('SESSION_TTL_HOURS', 'server');
assertEnvVar('ROUTING_PROVIDER', 'server');
assertEnvVar('ELEVATION_PROVIDER', 'server');

if (errors.length) {
  console.error('❌ Release preflight failed');
  for (const err of errors) console.error(`- ${err}`);
  for (const warn of warnings) console.error(`- ${warn}`);
  process.exit(1);
}

console.log('✅ Release preflight passed required checks');
for (const warn of warnings) {
  console.log(`⚠️  ${warn}`);
}
