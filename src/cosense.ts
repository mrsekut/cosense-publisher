import { exportPages as rawExportPages } from '@cosense/std/rest';
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
        yield* Effect.logInfo(`Exporting from /${sourceProject}...`);

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

        yield* Effect.logInfo(`Exported ${result.val.pages.length} pages`);
        return result.val.pages;
      });

      // NOTE: @cosense/std の importPages は Blob を使っており、
      // Bun ではファイル名が付かず 400 になるため、自前で実装している
      const importPages = (pages: ExportedData<true>['pages']) =>
        Effect.gen(function* () {
          yield* Effect.logInfo(
            `Importing ${pages.length} pages to /${destinationProject}...`,
          );

          const result = yield* Effect.tryPromise({
            try: async () => {
              const data = {
                pages: pages.map(p => ({
                  title: p.title,
                  lines: p.lines.map(l => ({ text: l.text })),
                })),
              };
              const formData = new FormData();
              const file = new File([JSON.stringify(data)], 'import.json', {
                type: 'application/octet-stream',
              });
              formData.append('import-file', file);
              formData.append('name', 'import.json');

              const csrfRes = await fetch('https://scrapbox.io/api/users/me', {
                headers: { Cookie: `connect.sid=${sid}` },
              });
              const csrfJson = (await csrfRes.json()) as {
                csrfToken: string;
              };

              const res = await fetch(
                `https://scrapbox.io/api/page-data/import/${destinationProject}.json`,
                {
                  method: 'POST',
                  headers: {
                    Cookie: `connect.sid=${sid}`,
                    Accept: 'application/json, text/plain, */*',
                    'X-CSRF-TOKEN': csrfJson.csrfToken,
                  },
                  body: formData,
                },
              );

              if (!res.ok) {
                const body = await res.text();
                throw new Error(`${res.status} ${res.statusText}: ${body}`);
              }

              return (await res.json()) as { message: string };
            },
            catch: e => new CosenseError({ operation: 'import', cause: e }),
          });

          yield* Effect.logInfo(`Import completed: ${result.message}`);
          return result;
        });

      return { exportPages, importPages };
    }),
  },
) {}

export class CosenseError extends Data.TaggedError('CosenseError')<{
  readonly operation: 'export' | 'import';
  readonly cause: unknown;
}> {}
