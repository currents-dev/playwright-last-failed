# Playwright Last Failed (GitHub Action)

This action helps you **re-run only the Playwright tests that failed** when you
use GitHub Actions’ “re-run failed jobs” (or similar retries). It works together
with [Currents](https://currents.dev) and the
[`@currents/cmd`](https://www.npmjs.com/package/@currents/cmd) CLI.

**Full setup, sharding, orchestration, and CI build ID details:**
[Re-run only failed tests (GitHub Actions)](https://docs.currents.dev/getting-started/ci-setup/github-actions/re-run-failed-only-tests)
on [docs.currents.dev](https://docs.currents.dev). For background on why re-runs
need extra configuration, see the guide
[Re-run only failed tests](https://docs.currents.dev/guides/ci-optimization/re-run-only-failed-tests).

## What it does for you

- Before your test step: restores **last run** metadata (via Currents cache or
  the Currents API) and exposes **extra Playwright CLI flags** as a step output.
- After the job (cache mode only): saves updated **last run** metadata so the
  next retry can target failures again.

You wire the output into your Playwright command—for example
`npx playwright test … ${{ steps.<id>.outputs.extra-pw-flags }}`—so only failed
tests run on retry.

## How it works

The action runs on **Node 24** and installs `@currents/cmd` globally
(`npm install -g @currents/cmd`). It then behaves in one of two ways:

### 1. Cache mode (default)

Use this when you report runs to Currents with a **record key** (typical
Playwright reporter + sharding flow).

1. **Main step:** runs `npx currents cache get` with the `last-run` preset. On
   success, it reads a generated preset file and sets the output
   `extra-pw-flags`.
2. **Post step:** runs `npx currents cache set` with the same preset so the next
   workflow attempt can read an updated snapshot.

Authentication and targeting use your **Currents record key** (input `key` or
`CURRENTS_RECORD_KEY`). Optional `id`, `path`, matrix inputs, and
`pw-output-dir` tune what is cached.

### 2. API / orchestration mode (`use-api` or `or8n`)

Use this when you rely on **Currents Orchestration** (or otherwise want the CLI
to resolve failures via the API). In this mode the **post cache step is
skipped**.

On **re-run attempts** (`GITHUB_RUN_ATTEMPT` > 1), the main step runs
`npx currents api get-run` to fetch the previous run and, when successful, sets
`extra-pw-flags` to `--last-failed`. You should supply **`CURRENTS_API_KEY`**,
**`CURRENTS_PROJECT_ID`** (and related env vars as in the docs), and use
**`or8n: true`** (or `use-api: true`) as shown in the
[orchestration section](https://docs.currents.dev/getting-started/ci-setup/github-actions/re-run-failed-only-tests#currents-orchestration)
of the documentation.

## Outputs

| Name             | Description                                      |
| ---------------- | ------------------------------------------------ |
| `extra-pw-flags` | Flags to append to your Playwright test command. |

If restoration fails, the output may be empty; your workflow should still run
tests normally.

## Inputs (options)

| Input                  | Required | Default        | Description                                                                                                                                                                                                                   |
| ---------------------- | -------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `key`                  | No\*     | `''`           | Currents **record key** (or set `CURRENTS_RECORD_KEY`). Used in cache mode.                                                                                                                                                   |
| `debug`                | No       | `false`        | Enable debug logging for CLI commands.                                                                                                                                                                                        |
| `id`                   | No       | `''`           | Cache id namespace for `cache get` / `cache set`.                                                                                                                                                                             |
| `path`                 | No       | `''`           | Comma-separated paths to include when writing cache (post step).                                                                                                                                                              |
| `output-dir`           | No       | `''`           | Directory for preset output during `cache get`.                                                                                                                                                                               |
| `pw-output-dir`        | No       | `test-results` | Playwright output directory; used for API mode `.last-run.json` path and for `--pw-output-dir` on cache set.                                                                                                                  |
| `matrix-index`         | No       | `1`            | Shard index for parallel runs (`cache get` / `cache set`).                                                                                                                                                                    |
| `matrix-total`         | No       | `1`            | Total shards.                                                                                                                                                                                                                 |
| `use-api`              | No       | `false`        | Use API-based last-failed resolution (same code path as `or8n`).                                                                                                                                                              |
| `or8n`                 | No       | `false`        | Enable orchestration-oriented behavior (API path; no cache post step).                                                                                                                                                        |
| `api-key`              | No       | `''`           | API key, or set `CURRENTS_API_KEY` in the environment.                                                                                                                                                                        |
| `project-id`           | No       | `''`           | Currents project id, or set `CURRENTS_PROJECT_ID`.                                                                                                                                                                            |
| `previous-ci-build-id` | No       | `''`           | Override for the previous CI build id used when resolving the prior run (see [custom CI build id](https://docs.currents.dev/getting-started/ci-setup/github-actions/re-run-failed-only-tests#custom-ci-build-id-for-reruns)). |

\*In cache mode you need a record key (input or env) for meaningful cache
reads/writes.

## Setup

1. **Add `@currents/cmd` to your project** as a dev dependency and install with
   a **frozen lockfile** in CI (`npm ci`, etc.). The action installs a global
   CLI for convenience; pinning `@currents/cmd` in your repo keeps CI
   reproducible. See the note in the
   [official docs](https://docs.currents.dev/getting-started/ci-setup/github-actions/re-run-failed-only-tests).
2. **Configure Currents** (record key, and for API mode, API key and project id)
   using secrets and `env` as described in the documentation.
3. **Add this action before your Playwright step** and pass `extra-pw-flags`
   into your test command.
4. **Sharding:** set `matrix-index` and `matrix-total` from your matrix (for
   example `${{ matrix.shard }}` and `${{ strategy.job-total }}`).

### Minimal example (cache mode, sharded)

```yaml
- name: Playwright Last Failed
  id: last-failed
  uses: currents-dev/playwright-last-failed@v1
  env:
    CURRENTS_RECORD_KEY: ${{ secrets.CURRENTS_RECORD_KEY }}
  with:
    pw-output-dir: test-results
    matrix-index: ${{ matrix.shard }}
    matrix-total: ${{ strategy.job-total }}

- name: Run Playwright
  run: npx playwright test ${{ steps.last-failed.outputs.extra-pw-flags }}
```

For orchestration (`or8n: true`), environment variables, custom
`CURRENTS_CI_BUILD_ID`, and copy-paste workflows, follow
**[Re-run only failed tests (GitHub Actions)](https://docs.currents.dev/getting-started/ci-setup/github-actions/re-run-failed-only-tests)**.

## Action metadata

Input/output definitions are in [`action.yml`](./action.yml).

## Developing this repository

This action is implemented in TypeScript (`src/index.ts`, `src/post.ts`). After
changing sources, run `npm run all` to format, lint, test, and rebuild `dist/`
before committing.
