import {
  exportPages as rawExportPages,
  importPages as rawImportPages,
} from '@cosense/std/rest';
import type { ExportedData } from '@jsr/cosense__types/rest';
import { Config, Data, Effect } from 'effect';

export class CosenseClient extends Effect.Service<CosenseClient>()(
  'app/CosenseClient',
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const sid = yield* Config.string('SID');
      const sourceProject = yield* Config.string('SOURCE_PROJECT_NAME');
      const destinationProject = yield* Config.string(
        'DESTINATION_PROJECT_NAME',
      );

      const exportPages = Effect.gen(function* () {
        const result = yield* Effect.tryPromise({
          try: () => rawExportPages(sourceProject, { sid, metadata: true }),
          catch: e => new CosenseError({ operation: 'export', cause: e }),
        });

        if (!result.ok) {
          return yield* new CosenseError({
            operation: 'export',
            cause: result.err,
          });
        }

        return result.val.pages;
      });

      const importPages = (pages: ExportedData<true>['pages']) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () => rawImportPages(destinationProject, { pages }, { sid }),
            catch: e => new CosenseError({ operation: 'import', cause: e }),
          });

          if (!result.ok) {
            return yield* new CosenseError({
              operation: 'import',
              cause: result.err,
            });
          }

          return result.val;
        });

      return { exportPages, importPages };
    }),
  },
) {}

export class CosenseError extends Data.TaggedError('CosenseError')<{
  readonly operation: 'export' | 'import';
  readonly cause: unknown;
}> {}
