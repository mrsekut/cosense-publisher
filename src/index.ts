import { Effect, Option, pipe, Array, Layer } from 'effect';
import { CosenseClient } from './cosense';
import { getLastImportTime, saveLastImportTime } from './lastImportTime';
import { BunContext, BunRuntime } from '@effect/platform-bun';

// TODO: batch, test
const program = Effect.gen(function* () {
  const cosense = yield* CosenseClient;

  const lastImportTime = yield* getLastImportTime.pipe(
    Effect.map(Option.getOrElse(() => 0)),
  );
  const newPages = yield* pipe(
    cosense.exportPages,
    Effect.map(Array.filter(p => !hasPrivateIcon(p))),
    Effect.map(Array.filter(p => p.updated > lastImportTime)),
  );

  if (newPages.length === 0) {
    yield* Effect.logInfo('No new pages to import');
    return;
  }

  yield* Effect.logInfo(`Importing ${newPages.length} pages`);
  yield* Effect.logDebug(`Targets: ${newPages.map(p => p.title).join(', ')}`);

  yield* cosense.importPages(newPages);
  yield* saveLastImportTime(Math.max(...newPages.map(p => p.updated)));

  yield* Effect.logInfo('Done');
});

type Page = {
  title: string;
  lines: { text: string }[];
  updated: number;
};

const hasPrivateIcon = (p: Page) =>
  p.lines.some(l => l.text.includes('[private.icon]'));

//
// main
//

const layer = Layer.mergeAll(CosenseClient.Default, BunContext.layer);

program.pipe(
  Effect.provide(layer),
  Effect.catchAll(error =>
    Effect.sync(() => {
      console.error('Error:', error);
      process.exit(1);
    }),
  ),
  BunRuntime.runMain,
);
