import { FileSystem } from '@effect/platform';
import { Config, Effect, Option } from 'effect';

const lastImportFile = Effect.gen(function* () {
  const source = yield* Config.string('SOURCE_PROJECT_NAME');
  const dest = yield* Config.string('DESTINATION_PROJECT_NAME');
  return `last_import_${source}_${dest}.txt`;
});

export const getLastImportTime = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const file = yield* lastImportFile;

  const exists = yield* fs.exists(file);
  if (!exists) {
    return Option.none<number>();
  }
  const content = yield* fs.readFileString(file);
  return Option.some(parseInt(content, 10));
});

export const saveLastImportTime = (time: number) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const file = yield* lastImportFile;
    yield* fs.writeFileString(file, time.toString());
  });
