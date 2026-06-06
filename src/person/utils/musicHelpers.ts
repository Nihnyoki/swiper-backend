// src/person/utils/musicHelpers.ts
export function ensureMusicStructure(person: any): boolean {
  if (!person) return false;

  if (!person.THINGS) person.THINGS = [];

  let modified = false;

  let musicThing = person.THINGS.find((t: any) => t.val === 'MUSIC');
  if (!musicThing) {
    musicThing = {
      key: person.THINGS.length,
      val: 'MUSIC',
      childItems: [
        {
          key: 0,
          val: 'MUSIC',
          data: [],
        },
      ],
    };
    person.THINGS.push(musicThing);
    modified = true;
  } else {
    if (!Array.isArray(musicThing.childItems)) {
      musicThing.childItems = [];
      modified = true;
    }

    const tracks = musicThing.childItems.find((c: any) => c.val === 'MUSIC');
    if (!tracks) {
      musicThing.childItems.push({ key: musicThing.childItems.length, val: 'MUSIC', data: [] });
      modified = true;
    }
  }

  return modified;
}

export function migrateAudioFromPersonalDoc(person: any): { migrated: boolean; count: number } {
  if (!person?.THINGS?.length) return { migrated: false, count: 0 };

  const personalThing = person.THINGS.find((thing: any) => thing.val === 'PERSONAL');
  if (!personalThing?.childItems?.length) return { migrated: false, count: 0 };

  const audioItems: any[] = [];
  for (const child of personalThing.childItems) {
    if (!child?.data?.length) continue;

    const remainingData: any[] = [];
    for (const item of child.data) {
      if (item?.type === 'audio') {
        audioItems.push(item);
      } else {
        remainingData.push(item);
      }
    }
    child.data = remainingData;
  }

  if (!audioItems.length) return { migrated: false, count: 0 };

  let musicThing = person.THINGS.find((thing: any) => thing.val === 'MUSIC');
  if (!musicThing) {
    musicThing = { key: person.THINGS.length, val: 'MUSIC', childItems: [] };
    person.THINGS.push(musicThing);
  }

  let tracksChild = musicThing.childItems.find((c: any) => c.val === 'MUSIC');
  if (!tracksChild) {
    tracksChild = { key: musicThing.childItems.length, val: 'MUSIC', data: [] };
    musicThing.childItems.push(tracksChild);
  }

  tracksChild.data = [...(tracksChild.data || []), ...audioItems];

  return { migrated: true, count: audioItems.length };
}
