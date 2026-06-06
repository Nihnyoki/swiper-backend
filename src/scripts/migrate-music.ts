// src/scripts/migrate-music.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { PersonSchema } from '../person/schemas/person.schema';
import { migrateAudioFromPersonalDoc, ensureMusicStructure } from '../person/utils/musicHelpers';

dotenv.config();

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/swiper-backend';

async function run() {
  await mongoose.connect(MONGO, { dbName: process.env.MONGO_DB || undefined });
  const Person = mongoose.model('Person', PersonSchema);

  const cursor = Person.find().cursor();
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for await (const doc of cursor) {
    try {
      let modified = false;
      const ensured = ensureMusicStructure(doc);
      modified = modified || ensured;

      const migrated = migrateAudioFromPersonalDoc(doc);
      if (migrated.migrated) modified = true;

      if (modified) {
        await doc.save();
        updated++;
      } else {
        skipped++;
      }
    } catch (e) {
      console.error('Failed for doc', doc._id, e);
      failed++;
    }
  }

  console.log('Migration complete. updated=', updated, 'skipped=', skipped, 'failed=', failed);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
