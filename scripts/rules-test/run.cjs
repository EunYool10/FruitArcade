// npm run test:rules — every rules suite against the local firestore.rules (Firebase rules :test API,
// nothing is deployed). Needs the Firebase CLI to be signed in as a project owner.
const { execFileSync } = require('child_process');
const path = require('path');

const suites = ['score-proofs.cjs', 'player-cards.cjs', 'presence-and-admin.cjs', 'blue-check.cjs', 'coins.cjs', 'admin-list.cjs'];
let failed = false;
for (const suite of suites) {
  console.log(`\n▶ ${suite}`);
  try {
    execFileSync(process.execPath, [path.join(__dirname, suite), process.argv[2] || 'firestore.rules'], { stdio: 'inherit' });
  } catch {
    failed = true;
  }
}
if (failed) {
  console.error('\nSome rules tests failed');
  process.exit(1);
}
console.log('\nAll rules tests passed');
