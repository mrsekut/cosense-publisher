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
import { hasPrivateIcon } from './filter';
import { duplicator } from './duplicator';

const layer = Layer.mergeAll(CosenseClient.Default, BunContext.layer);

it.effect(
  'privateページがdestinationに含まれないこと',
  () =>
    Effect.gen(function* () {
      // 1. duplicatorを実行
      yield* duplicator;

      // 2. sourceのprivateページのタイトルを取得
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

      const privatePageTitles = sourceResult.val.pages
        .filter(hasPrivateIcon)
        .map(p => p.title);

      // privateページが存在することを前提条件として確認
      expect(privatePageTitles.length).toBeGreaterThan(0);

      // 3. destinationのページを取得
      const destResult = yield* Effect.tryPromise(() =>
        exportPages(destinationProject, { sid, metadata: true }),
      );
      expect(destResult.ok).toBe(true);
      if (!destResult.ok) return;

      const destTitles = destResult.val.pages.map(p => p.title);

      // 4. privateページがdestinationに含まれていないことを検証
      for (const title of privatePageTitles) {
        expect(destTitles).not.toContain(title);
      }
    }).pipe(Effect.provide(layer)),
  { timeout: 30_000 },
);
