const path = require('path');
const { createRequire } = require('module');

/**
 * In nested workspaces (e.g. creating a second Expo app inside this repo),
 * EAS can discover this parent Metro config while building the child app.
 * If Expo isn't installed for this parent package in that environment,
 * requiring `expo/metro-config` throws and the build fails before the child
 * app's own config is loaded.
 */
function loadExpoMetroConfig() {
  try {
    return require('expo/metro-config');
  } catch {
    try {
      const fromCwd = createRequire(path.join(process.cwd(), 'package.json'));
      return fromCwd('expo/metro-config');
    } catch {
      return null;
    }
  }
}

const expoMetroConfig = loadExpoMetroConfig();

module.exports = expoMetroConfig
  ? expoMetroConfig.getDefaultConfig(__dirname)
  : {};
