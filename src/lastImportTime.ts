import { FileSystem } from '@effect/platform';
import { Effect, Option } from 'effect';

const LAST_IMPORT_FILE = 'last_import.txt';

export const getLastImportTime = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;

  const exists = yield* fs.exists(LAST_IMPORT_FILE);
  if (!exists) {
    return Option.none<number>();
  }
  const content = yield* fs.readFileString(LAST_IMPORT_FILE);
  return Option.some(parseInt(content, 10));
});

export const saveLastImportTime = (time: number) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    yield* fs.writeFileString(LAST_IMPORT_FILE, time.toString());
  });
