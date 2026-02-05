import { exportPages as rawExportPages } from '@cosense/std/rest';
import { deletePage as rawDeletePage } from '@cosense/std/websocket';
import type { ExportedData } from '@jsr/cosense__types/rest';
import { Array, Config, Data, Duration, Effect } from 'effect';

const BATCH_SIZE = 100;

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

      const exportSourcePages = Effect.gen(function* () {
        yield* Effect.logInfo(`Exporting from /${sourceProject}...`);

        const result = yield* Effect.tryPromise({
          try: () => rawExportPages(sourceProject, { sid, metadata: true }),
          catch: e => new CosenseError({ operation: 'export', cause: e }),
        });

        if (!result.ok) {
          yield* Effect.fail(new CosenseError({ operation: 'export', cause: result.err, }));
          return;
        }

        yield* Effect.logInfo(`Exported ${result.val.pages.length} pages`);
        return result.val.pages;
      });

      const exportDestinationPages = Effect.gen(function* () {
        yield* Effect.logInfo(`Exporting from /${destinationProject}...`);

        const result = yield* Effect.tryPromise({
          try: () =>
            rawExportPages(destinationProject, { sid, metadata: true }),
          catch: e => new CosenseError({ operation: 'export', cause: e }),
        });

        if (!result.ok) {
          yield* Effect.fail(new CosenseError({ operation: 'export', cause: result.err, }));
          return;
        }

        yield* Effect.logInfo(
          `Exported ${result.val.pages.length} destination pages`,
        );
        return result.val.pages;
      });

      // NOTE: @cosense/std の importPages は Blob を使っており、
      // Bun ではファイル名が付かず 400 になるため、自前で実装している
      const importDestinationPages = (pages: ExportedData<true>['pages']) =>
        Effect.gen(function* () {
          yield* Effect.logInfo(
            `Importing ${pages.length} pages to /${destinationProject}...`,
          );

          const result = yield* Effect.tryPromise({
            try: async () => {
              const data = {
                pages: pages.map(p => ({
                  title: p.title,
                  lines: p.lines.map(l => ({
                    text: l.text,
                    created: l.created,
                    updated: l.updated,
                  })),
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
            catch: e => Effect.fail(new CosenseError({ operation: 'import', cause: e })),
          });

          yield* Effect.logInfo(`Import completed: ${result.message}`);
          return result;
        });

      const importDestinationPagesBatched = (
        pages: ExportedData<true>['pages'],
      ) =>
        Effect.gen(function* () {
          const chunks = Array.chunksOf(pages, BATCH_SIZE);
          yield* Effect.forEach(
            chunks,
            (batch, i) =>
              Effect.gen(function* () {
                yield* Effect.logInfo(
                  `Batch ${i + 1}/${chunks.length} (${batch.length} pages)`,
                );
                yield* importDestinationPages(batch);
                if (i < chunks.length - 1) {
                  yield* Effect.sleep(Duration.seconds(1));
                }
              }),
            { concurrency: 1 },
          );
        });

      const deleteDestinationPage = (title: string) =>
        Effect.gen(function* () {
          yield* Effect.logInfo(`Deleting page: ${title}`);

          const result = yield* Effect.tryPromise({
            try: () => rawDeletePage(destinationProject, title, { sid }),
            catch: e => Effect.fail(new CosenseError({ operation: 'delete', cause: e })),
          });

          if (!result.ok) {
            yield* Effect.fail(new CosenseError({ operation: 'delete', cause: result.err, }));
          }

          yield* Effect.logInfo(`Deleted page: ${title}`);
          return result.val;
        });

      const deleteDestinationPages = (titles: string[]) =>
        Effect.gen(function* () {
          yield* Effect.logInfo(`Deleting ${titles.length} orphan pages...`);
          yield* Effect.forEach(
            titles,
            (title, i) =>
              Effect.gen(function* () {
                yield* deleteDestinationPage(title);
                if (i < titles.length - 1) {
                  yield* Effect.sleep(Duration.seconds(1));
                }
              }),
            { concurrency: 1 },
          );
          yield* Effect.logInfo(`Deleted ${titles.length} orphan pages`);
        });

      return {
        destination: {
          export: exportDestinationPages,
          import: importDestinationPagesBatched,
          delete: deleteDestinationPages,
        },
        source: {
          export: exportSourcePages,
        },
      };
    }),
  },
) {}

export class CosenseError extends Data.TaggedError('CosenseError')<{
  readonly operation: 'export' | 'import' | 'delete';
  readonly cause: unknown;
}> {}
