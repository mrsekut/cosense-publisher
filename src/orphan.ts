import { Effect, pipe } from 'effect';
import { CosenseClient } from './cosense';
import { filterPrivatePages } from './filter';

export const deleteOrphanPages = Effect.gen(function* () {
  const cosense = yield* CosenseClient;

  const sourceTitles = yield* pipe(
    cosense.source.export,
    Effect.map(pages => filterPrivatePages(pages, 0).map(p => p.title)),
  );

  const destTitles = yield* pipe(
    cosense.destination.export,
    Effect.map(pages => pages.map(p => p.title)),
  );

  const orphans = findOrphanTitles(sourceTitles, destTitles);

  if (orphans.length === 0) {
    yield* Effect.logInfo('No orphan pages to delete');
    return;
  }

  yield* Effect.logInfo(
    `Found ${orphans.length} orphan pages: ${orphans.join(', ')}`,
  );
  yield* cosense.destination.delete(orphans);
});

const findOrphanTitles = (sourceTitles: string[], destTitles: string[]) => {
  const sourceSet = new Set(sourceTitles);
  return destTitles.filter(title => !sourceSet.has(title));
};

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;

  test('sourceにないdestページが検出される', () => {
    const source = ['a', 'b'];
    const dest = ['a', 'b', 'c', 'd'];
    expect(findOrphanTitles(source, dest)).toEqual(['c', 'd']);
  });

  test('両方にあるページは検出されない', () => {
    const source = ['a', 'b', 'c'];
    const dest = ['a', 'b', 'c'];
    expect(findOrphanTitles(source, dest)).toEqual([]);
  });

  test('sourceが空ならdest全部がorphan', () => {
    const source: string[] = [];
    const dest = ['a', 'b'];
    expect(findOrphanTitles(source, dest)).toEqual(['a', 'b']);
  });

  test('destが空ならorphanなし', () => {
    const source = ['a', 'b'];
    const dest: string[] = [];
    expect(findOrphanTitles(source, dest)).toEqual([]);
  });
}
