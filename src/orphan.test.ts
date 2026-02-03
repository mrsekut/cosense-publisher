/**
 * E2E test: ローカル実行専用
 * .env の SID, SOURCE_PROJECT_NAME, DESTINATION_PROJECT_NAME が必要
 */
import { it } from '@effect/vitest';
import { expect } from 'vitest';
import { exportPages } from '@cosense/std/rest';
import { Config, Effect, Layer } from 'effect';
import { BunContext } from '@effect/platform-bun';
import { CosenseClient } from './cosense';
import { deleteOrphanPages } from './orphan';

const layer = Layer.mergeAll(CosenseClient.Default, BunContext.layer);

it.effect(
  'orphan削除後にdestinationにorphanが残っていないこと',
  () =>
    Effect.gen(function* () {
      // 1. orphan削除を実行
      yield* deleteOrphanPages;

      // 2. source と destination のページを取得
      const sid = yield* Config.string('SID');
      const sourceProject = yield* Config.string('SOURCE_PROJECT_NAME');
      const destinationProject = yield* Config.string(
        'DESTINATION_PROJECT_NAME',
      );

      const sourceResult = yield* Effect.tryPromise(() =>
        exportPages(sourceProject, { sid, metadata: true }),
      );
      expect(sourceResult.ok).toBe(true);
      if (!sourceResult.ok) return;

      const sourceTitles = sourceResult.val.pages.map(p => p.title);

      const destResult = yield* Effect.tryPromise(() =>
        exportPages(destinationProject, { sid, metadata: true }),
      );
      expect(destResult.ok).toBe(true);
      if (!destResult.ok) return;

      const destTitles = destResult.val.pages.map(p => p.title);

      // 3. destinationの全ページがsourceに存在することを検証
      for (const title of destTitles) {
        expect(sourceTitles).toContain(title);
      }
    }).pipe(Effect.provide(layer)),
  { timeout: 60_000 },
);
