const fs = require('fs');
const path = require('path');

const appDir = path.resolve(__dirname, '..', 'dist', 'build', 'app');
const targetVersion = '5.13';
const manifestPath = path.join(appDir, 'manifest.json');
const configPath = path.join(appDir, 'app-config-service.js');

function patchManifest() {
  if (!fs.existsSync(manifestPath)) return false;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!manifest.plus) manifest.plus = {};
  if (!manifest.plus['uni-app']) manifest.plus['uni-app'] = {};
  manifest.plus['uni-app'].compilerVersion = targetVersion;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return true;
}

function patchConfig() {
  if (!fs.existsSync(configPath)) return false;
  const current = fs.readFileSync(configPath, 'utf8');
  const next = current.replace(/"compilerVersion"\s*:\s*"[^"]+"/, `"compilerVersion":"${targetVersion}"`);
  fs.writeFileSync(configPath, next, 'utf8');
  return current !== next;
}

const patchedManifest = patchManifest();
const patchedConfig = patchConfig();

if (!patchedManifest || !fs.existsSync(configPath)) {
  throw new Error('App build output is missing; run uni build -p app first.');
}

console.log(`App runtime compilerVersion normalized to ${targetVersion}. manifest=${patchedManifest} config=${patchedConfig}`);
