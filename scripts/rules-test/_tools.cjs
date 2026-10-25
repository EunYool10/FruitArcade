// Where firebase-tools lives on this machine (the rules tests sign in with the Firebase CLI's login).
// Set FIREBASE_TOOLS_LIB to its lib/ folder, or have it installed globally or in the npx cache.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

exports.firebaseToolsLib = function firebaseToolsLib() {
  const tries = [];
  if (process.env.FIREBASE_TOOLS_LIB) tries.push(process.env.FIREBASE_TOOLS_LIB);
  try {
    tries.push(path.join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'firebase-tools', 'lib'));
  } catch {
    // no global npm
  }
  const npxCache = path.join(process.env.LOCALAPPDATA || path.join(process.env.HOME || '', '.npm'), 'npm-cache', '_npx');
  if (fs.existsSync(npxCache)) for (const d of fs.readdirSync(npxCache)) tries.push(path.join(npxCache, d, 'node_modules', 'firebase-tools', 'lib'));
  const found = tries.find((dir) => fs.existsSync(path.join(dir, 'auth.js')));
  if (!found) {
    console.error('firebase-tools not found: run `npx firebase-tools login` once, or set FIREBASE_TOOLS_LIB');
    process.exit(1);
  }
  return found + path.sep;
};
