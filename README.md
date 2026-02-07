# Cosense Publisher

Selectively publish pages from a private [Cosense](https://scrapbox.io/) (Scrapbox) project to a public project.

## Features

- **Private page filtering** — pages containing `[private.icon]` are excluded from publication
- **Orphan deletion** — pages that no longer exist in the source (e.g. renamed or deleted pages) are automatically removed from the destination
- **Batch import** — pages are imported in batches to avoid API limits
- **Incremental sync** — only pages updated since the last run are transferred

Inspired by [blu3mo/Scrapbox-Duplicator](https://github.com/blu3mo/Scrapbox-Duplicator).

For more details, see [cosense-publisher](https://scrapbox.io/mrsekut-p/cosense-publisher).

## Setup

### GitHub Actions Secrets

Configure the following secrets in your repository settings:

| Secret                     | Description                       | Note                                                                                                      |
| -------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `SID`                      | Your `connect.sid` cookie value   | **Must be wrapped in double quotes** (e.g. `"s%3A..."`) — otherwise it cannot be saved as a GitHub secret |
| `SOURCE_PROJECT_NAME`      | Source (private) project name     | **Do not** wrap in double quotes — causes build errors                                                    |
| `DESTINATION_PROJECT_NAME` | Destination (public) project name | **Do not** wrap in double quotes — causes build errors                                                    |

The workflow runs daily via cron and can also be triggered manually via `workflow_dispatch`.

## Development

```sh
# Install dependencies
bun install

# Run locally
bun run src/index.ts

# Type check
bun run typecheck

# Run unit tests
bun run test
```
