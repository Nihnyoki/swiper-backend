// src/person/utils/categoryHelpers.ts
export const contentCategory = 'C👁️NT👀NT';
export const contentChildItem = 'Things';
export const bannedCategories = new Set(['SOCIAL', 'PROFESSIONAL', 'CULTURE']);

export function ensureContentStructure(person: any): boolean {
  if (!person) return false;
  if (!person.THINGS) person.THINGS = [];

  let modified = false;
  let contentThing = person.THINGS.find((thing: any) => thing.val === contentCategory);

  if (!contentThing) {
    contentThing = {
      key: person.THINGS.length,
      val: contentCategory,
      childItems: [
        {
          key: 0,
          val: contentChildItem,
          data: [],
        },
      ],
    };
    person.THINGS.push(contentThing);
    modified = true;
  } else {
    if (!Array.isArray(contentThing.childItems)) {
      contentThing.childItems = [];
      modified = true;
    }
    const child = contentThing.childItems.find((c: any) => c.val === contentChildItem);
    if (!child) {
      contentThing.childItems.push({ key: contentThing.childItems.length, val: contentChildItem, data: [] });
      modified = true;
    }
  }

  return modified;
}

export function convertPersonalToContent(person: any): boolean {
  if (!person?.THINGS?.length) return false;

  const personalIndex = person.THINGS.findIndex((thing: any) => thing.val === 'PERSONAL');
  if (personalIndex === -1) return false;

  const personalThing = person.THINGS[personalIndex];
  if (!personalThing) return false;

  let contentThing = person.THINGS.find((thing: any) => thing.val === contentCategory);
  if (!contentThing) {
    personalThing.val = contentCategory;
    return true;
  }

  if (!Array.isArray(contentThing.childItems)) {
    contentThing.childItems = [];
  }

  if (Array.isArray(personalThing.childItems)) {
    for (const personalChild of personalThing.childItems) {
      if (!personalChild) continue;
      const existingChild = contentThing.childItems.find((c: any) => c.val === personalChild.val);
      if (existingChild) {
        existingChild.data = [...(existingChild.data || []), ...(personalChild.data || [])];
      } else {
        contentThing.childItems.push({
          key: contentThing.childItems.length,
          val: personalChild.val,
          data: personalChild.data || [],
        });
      }
    }
  }

  person.THINGS.splice(personalIndex, 1);
  return true;
}

export function validateDisallowedCategories(person: any): void {
  if (!person?.THINGS?.length) return;
  for (const thing of person.THINGS) {
    if (!thing || typeof thing !== 'object') continue;
    if (bannedCategories.has(thing.val)) {
      throw new Error(`Category ${thing.val} is not allowed`);
    }
  }
}

export function normalizeContentResponse(person: any): boolean {
  if (!person?.THINGS?.length) return false;
  let modified = false;

  const personalThing = person.THINGS.find((thing: any) => thing.val === 'PERSONAL');
  const contentThing = person.THINGS.find((thing: any) => thing.val === contentCategory);

  if (personalThing && !contentThing) {
    personalThing.val = contentCategory;
    modified = true;
  } else if (personalThing && contentThing) {
    if (!Array.isArray(contentThing.childItems)) contentThing.childItems = [];
    if (Array.isArray(personalThing.childItems)) {
      for (const personalChild of personalThing.childItems) {
        const existingChild = contentThing.childItems.find((c: any) => c.val === personalChild.val);
        if (existingChild) {
          existingChild.data = [...(existingChild.data || []), ...(personalChild.data || [])];
        } else {
          contentThing.childItems.push({ key: contentThing.childItems.length, val: personalChild.val, data: personalChild.data || [] });
        }
      }
    }
    const personalIndex = person.THINGS.findIndex((thing: any) => thing.val === 'PERSONAL');
    if (personalIndex !== -1) {
      person.THINGS.splice(personalIndex, 1);
      modified = true;
    }
  }

  modified = ensureContentStructure(person) || modified;
  return modified;
}

export function removeBannedCategories(person: any): boolean {
  if (!person?.THINGS?.length) return false;
  const originalLength = person.THINGS.length;
  person.THINGS = person.THINGS.filter((thing: any) => !bannedCategories.has(thing.val));
  return person.THINGS.length !== originalLength;
}

export function rollbackContentCategory(person: any): boolean {
  if (!person?.THINGS?.length) return false;
  const contentIndex = person.THINGS.findIndex((thing: any) => thing.val === contentCategory);
  if (contentIndex === -1) return false;
  const contentThing = person.THINGS[contentIndex];
  contentThing.val = 'PERSONAL';
  return true;
}
