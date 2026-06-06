// src/scripts/migrate-single.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { PersonSchema } from '../person/schemas/person.schema';
import { migrateAudioFromPersonalDoc, ensureMusicStructure } from '../person/utils/musicHelpers';

dotenv.config();

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/swiper-backend';

async function run() {
  const args = process.argv.slice(2);
  const idArgIndex = args.findIndex(a => a === '--id' || a === '-i');
  if (idArgIndex === -1 || !args[idArgIndex + 1]) {
    console.error('Usage: ts-node src/scripts/migrate-single.ts --id <id> [--apply]');
    process.exit(1);
  }
  const id = args[idArgIndex + 1];
  const apply = args.includes('--apply');

  await mongoose.connect(MONGO, { dbName: process.env.MONGO_DB || undefined });
  const Person = mongoose.model('Person', PersonSchema);

  const doc = await Person.findById(id);
  if (!doc) {
    console.error('Document not found for id', id);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('Found doc', id);
  let modified = false;

  try {
    const ensured = ensureMusicStructure(doc);
    modified = modified || ensured;

    const migrated = migrateAudioFromPersonalDoc(doc);
    if (migrated.migrated) modified = true;

    if (modified) {
      console.log('Changes prepared for doc', id, { ensured, migrated: migrated.count });
      if (apply) {
        await doc.save();
        console.log('Saved changes for doc', id);
      } else {
        console.log('Dry-run (no save). Use --apply to persist changes.');
      }
    } else {
      console.log('No changes needed for doc', id);
    }
  } catch (e) {
    console.error('Error processing doc', id, e);
    process.exitCode = 2;
  } finally {
    await mongoose.disconnect();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
