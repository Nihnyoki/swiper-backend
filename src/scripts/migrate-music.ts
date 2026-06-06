// src/scripts/migrate-music.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { PersonSchema } from '../person/schemas/person.schema';
import { migrateAudioFromPersonalDoc, ensureMusicStructure } from '../person/utils/musicHelpers';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

dotenv.config();

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/swiper-backend';

async function run() {
  await mongoose.connect(MONGO, { dbName: process.env.MONGO_DB || undefined });
  const Person = mongoose.model('Person', PersonSchema);

  const cursor = Person.find().cursor();
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let repairedDocs = 0;
  const updatedIds: string[] = [];
  const skippedIds: string[] = [];
  const failedIds: string[] = [];
  const repairedIds: string[] = [];

  const dryRun = !process.argv.includes('--apply');
  const doRepair = process.argv.includes('--repair') || true; // attempt repair by default

  for await (const doc of cursor) {
    try {
      let modified = false;

      // Ensure MUSIC structure
      const ensured = ensureMusicStructure(doc);
      modified = modified || ensured;

      // Migrate audio entries from PERSONAL -> MUSIC in memory
      const migrated = migrateAudioFromPersonalDoc(doc);
      if (migrated.migrated) modified = true;

      // Defensive repair: fix malformed THINGS/childItems structure if requested
      if (doRepair && Array.isArray(doc.THINGS)) {
        let repaired = false;
        for (let i = 0; i < doc.THINGS.length; i++) {
          const thing = doc.THINGS[i] as any;
          if (thing == null || typeof thing !== 'object') {
            doc.THINGS[i] = { key: i, val: 'UNKNOWN', childItems: [] };
            repaired = true;
            continue;
          }
          if (thing.key === undefined || thing.key === null) { thing.key = i; repaired = true; }
          if (!thing.val) { thing.val = 'UNKNOWN'; repaired = true; }
          if (!Array.isArray(thing.childItems)) { thing.childItems = []; repaired = true; }

          for (let j = 0; j < thing.childItems.length; j++) {
            const child = thing.childItems[j] as any;
            if (child == null || typeof child !== 'object') {
              thing.childItems[j] = { key: j, val: 'UnknownChild', data: [] };
              repaired = true;
              continue;
            }
            if (child.key === undefined || child.key === null) { child.key = j; repaired = true; }
            if (!child.val) { child.val = 'UnknownChild'; repaired = true; }
            if (!Array.isArray(child.data)) { child.data = []; repaired = true; }
          }
        }
        if (repaired) {
          modified = true;
          repairedDocs++;
        }
      }

      if (modified) {
        if (!dryRun) {
          await doc.save();
        }
        updated++;
        updatedIds.push(String(doc._id));
      } else {
        skipped++;
        skippedIds.push(String(doc._id));
      }
    } catch (e) {
      console.error('Failed for doc', doc._id, e);
      failed++;
      failedIds.push(String(doc._id));
    }
  }
  // write CSV report
  try {
    const reportsDir = 'migrations';
    if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const csvPath = `${reportsDir}/music-migration-report-${ts}.csv`;
    const lines: string[] = [];
    lines.push('id,action,repaired');
    for (const id of updatedIds) lines.push(`${id},updated,${repairedIds.includes(id) ? '1' : '0'}`);
    for (const id of skippedIds) lines.push(`${id},skipped,0`);
    for (const id of failedIds) lines.push(`${id},failed,0`);
    writeFileSync(csvPath, lines.join('\n'));
    console.log('Wrote report to', csvPath);
  } catch (e) {
    console.error('Failed to write report', e);
  }

  console.log('Migration complete. dryRun=', dryRun, 'updated=', updated, 'skipped=', skipped, 'failed=', failed, 'repairedDocs=', repairedDocs);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
