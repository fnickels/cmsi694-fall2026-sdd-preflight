// Fails (exit 1) when the gzipped client JavaScript exceeds the plan's 150 KB budget.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_BYTES = 150 * 1024;
const assetsDir = path.resolve('dist/client/assets');

let files;
try {
  files = readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
} catch {
  console.error(`No build output at ${assetsDir}. Run "npm run build" first.`);
  process.exit(1);
}

let total = 0;
for (const f of files) {
  const size = gzipSync(readFileSync(path.join(assetsDir, f))).length;
  total += size;
  console.log(`${f}: ${(size / 1024).toFixed(1)} KB gzipped`);
}

const kb = (total / 1024).toFixed(1);
if (total > BUDGET_BYTES) {
  console.error(`Client JS is ${kb} KB gzipped, over the ${BUDGET_BYTES / 1024} KB budget.`);
  process.exit(1);
}
console.log(`Client JS total: ${kb} KB gzipped (budget ${BUDGET_BYTES / 1024} KB).`);
