import { Effect, Option, pipe } from 'effect';
import { CosenseClient } from './cosense';
import { filterPrivatePages } from './filter';
import { getLastImportTime, saveLastImportTime } from './lastImportTime';

export const duplicator = Effect.gen(function* () {
  const cosense = yield* CosenseClient;

  const lastImportTime = yield* getLastImportTime.pipe(
    Effect.map(Option.getOrElse(() => 0)),
  );
  const newPages = yield* pipe(
    cosense.source.export,
    Effect.map(pages => filterPrivatePages(pages, lastImportTime)),
  );

  if (newPages.length === 0) {
    yield* Effect.logInfo('No new pages to import');
    return;
  }

  yield* Effect.logInfo(`Importing ${newPages.length} pages`);
  yield* Effect.logDebug(`Targets: ${newPages.map(p => p.title).join(', ')}`);

  yield* cosense.destination.import(newPages);
  yield* saveLastImportTime(Math.max(...newPages.map(p => p.updated)));

  yield* Effect.logInfo('Done');
});
