import { ensureMusicStructure, migrateAudioFromPersonalDoc } from '../src/person/utils/musicHelpers';

describe('musicHelpers', () => {
  test('ensureMusicStructure adds MUSIC when missing', () => {
    const person: any = { NAME: 'Alice', THINGS: [] };
    const modified = ensureMusicStructure(person);
    expect(modified).toBe(true);
    const music = person.THINGS.find((t: any) => t.val === 'MUSIC');
    expect(music).toBeDefined();
    expect(Array.isArray(music.childItems)).toBe(true);
    const tracks = music.childItems.find((c: any) => c.val === 'MUSIC');
    expect(tracks).toBeDefined();
    expect(Array.isArray(tracks.data)).toBe(true);
    expect(tracks.data.length).toBe(0);
  });

  test('migrateAudioFromPersonalDoc moves audio items and returns count', () => {
    const audioItem = { id: 'audio-1', type: 'audio' };
    const otherItem = { id: 'note-1', type: 'note' };
    const person: any = {
      THINGS: [
        { key: 0, val: 'PERSONAL', childItems: [{ key: 0, val: 'Things', data: [audioItem, otherItem] }] },
      ],
    };

    const res = migrateAudioFromPersonalDoc(person);
    expect(res.migrated).toBe(true);
    expect(res.count).toBe(1);

    const music = person.THINGS.find((t: any) => t.val === 'MUSIC');
    expect(music).toBeDefined();
    const tracks = music.childItems.find((c: any) => c.val === 'MUSIC');
    expect(tracks).toBeDefined();
    expect(tracks.data.length).toBe(1);

    const personal = person.THINGS.find((t: any) => t.val === 'PERSONAL');
    expect(personal.childItems[0].data.find((d: any) => d.type === 'audio')).toBeUndefined();
    expect(personal.childItems[0].data.find((d: any) => d.type === 'note')).toBeDefined();
  });
});
