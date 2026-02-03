import { Effect, Layer, pipe } from 'effect';
import { CosenseClient } from './cosense';
import { BunContext, BunRuntime } from '@effect/platform-bun';
import { duplicator } from './duplicator';
import { deleteOrphanPages } from './orphan';

const main = Effect.gen(function* () {
  yield* duplicator;
  yield* deleteOrphanPages;
});

const layer = Layer.mergeAll(CosenseClient.Default, BunContext.layer);

pipe(
  main,
  Effect.provide(layer),
  Effect.catchAll(error =>
    Effect.sync(() => {
      console.error('Error:', error);
      process.exit(1);
    }),
  ),
  BunRuntime.runMain,
);
