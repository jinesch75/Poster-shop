// Visual smoke test for the new mockup compositor.
//
// Reads three posters by filename from public/posters/, composites a
// single-frame office mockup using the first poster, and a triptych
// living-room mockup using all three (first as the centre/main, the
// others as siblings). Writes both JPGs to /tmp so you can open them
// in Preview and eyeball the result.
//
// Run from the linework-studio directory:
//   npx tsx scripts/test-mockup.ts
//
// Override the trio by setting MAIN, SIB_LEFT, SIB_RIGHT to filenames
// inside public/posters/, e.g.
//   MAIN=big-ben.png SIB_LEFT=tower-bridge.png SIB_RIGHT=st-pauls.png \
//     npx tsx scripts/test-mockup.ts

import { promises as fs } from 'fs';
import path from 'path';
import { buildOfficeMockup, buildLivingRoomMockup } from '../lib/watermark';

const POSTERS_DIR = path.join(process.cwd(), 'public', 'posters');
const OUT_DIR = '/tmp';

const MAIN = process.env.MAIN ?? 'westminster-primary-ii.png';
const SIB_LEFT = process.env.SIB_LEFT ?? 'tower-bridge-ii.png';
const SIB_RIGHT = process.env.SIB_RIGHT ?? 'south-bank-ii.png';

async function main() {
  console.log(`Reading posters from ${POSTERS_DIR}`);
  console.log(`  main  = ${MAIN}`);
  console.log(`  left  = ${SIB_LEFT}`);
  console.log(`  right = ${SIB_RIGHT}`);

  const [mainBuf, leftBuf, rightBuf] = await Promise.all([
    fs.readFile(path.join(POSTERS_DIR, MAIN)),
    fs.readFile(path.join(POSTERS_DIR, SIB_LEFT)),
    fs.readFile(path.join(POSTERS_DIR, SIB_RIGHT)),
  ]);

  const office = await buildOfficeMockup(mainBuf);
  const living = await buildLivingRoomMockup(mainBuf, leftBuf, rightBuf);

  const officePath = path.join(OUT_DIR, 'mockup-test-office.jpg');
  const livingPath = path.join(OUT_DIR, 'mockup-test-living.jpg');
  await fs.writeFile(officePath, office);
  await fs.writeFile(livingPath, living);

  console.log('\nWrote:');
  console.log('  ' + officePath);
  console.log('  ' + livingPath);
  console.log('\nOpen them in Preview to check the framing looks right.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
