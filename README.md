# Playwright Last Failed (GitHub Action)

This action supports **re-running only the Playwright tests that failed** when
GitHub Actions runs “re-run failed jobs” (or similar retries). It works together
with [Currents](https://currents.dev) and the
[`@currents/cmd`](https://www.npmjs.com/package/@currents/cmd) CLI.

**Full setup, sharding, orchestration, and CI build ID details:** [Re-run only
failed tests (GitHub Actions)][gha-rerun] on [docs.currents.dev][docs]. For
background on why re-runs need extra configuration, see the guide [Re-run only
failed tests][guide-rerun].

## Purpose

- Before the Playwright test step: restores **last run** metadata (via Currents
  cache or the Currents API) and exposes **extra Playwright CLI flags** as a
  step output.
- After the job (cache mode only): saves updated **last run** metadata so the
  next retry can target failures again.

The step output is passed into the Playwright command—for example
`npx playwright test … ${{ steps.<id>.outputs.extra-pw-flags }}`—so only failed
tests run on retry.

## How it works

The action runs on **Node 24** and installs `@currents/cmd` globally
(`npm install -g @currents/cmd`). It then behaves in one of two ways:

### 1. Cache mode (default)

Suited to workflows that report runs to Currents with a **record key** (typical
Playwright reporter + sharding flow).

1. **Main step:** runs `npx currents cache get` with the `last-run` preset. On
   success, it reads a generated preset file and sets the output
   `extra-pw-flags`.
1. **Post step:** runs `npx currents cache set` with the same preset so the next
   workflow attempt can read an updated snapshot.

Authentication and targeting use the **Currents record key** (input `key` or
`CURRENTS_RECORD_KEY`). Optional `id`, `path`, matrix inputs, and
`pw-output-dir` tune what is cached.

### 2. API / orchestration mode (`use-api` or `or8n`)

Suited to workflows that rely on **Currents Orchestration** (or otherwise need
the CLI to resolve failures via the API). In this mode the **post-cache step is
skipped**.

On **re-run attempts** (`GITHUB_RUN_ATTEMPT` > 1), the main step runs
`npx currents api get-run` to fetch the previous run and, when successful, sets
`extra-pw-flags` to `--last-failed`. The workflow should define
**`CURRENTS_API_KEY`**, **`CURRENTS_PROJECT_ID`** (and related environment
variables as in the docs), and set **`or8n: true`** (or `use-api: true`) as
shown in the [orchestration section][or8n-section] of the documentation.

## Outputs

| Name             | Description                                     |
| ---------------- | ----------------------------------------------- |
| `extra-pw-flags` | Flags to append to the Playwright test command. |

If restoration fails, the output may be empty; the workflow can still run tests
normally.

## Inputs (options)

- **`key`** (optional, default `''`). Currents **record key**, or set
  `CURRENTS_RECORD_KEY`. Used in cache mode.
- **`debug`** (optional, default `false`). Enables debug logging for CLI
  commands.
- **`id`** (optional, default `''`). Cache ID namespace for `cache get` /
  `cache set`.
- **`path`** (optional, default `''`). Comma-separated paths to include when
  writing cache (post step).
- **`output-dir`** (optional, default `''`). Directory for preset output during
  `cache get`.
- **`pw-output-dir`** (optional, default `test-results`). Playwright output
  directory; used for API mode `.last-run.json` path and for `--pw-output-dir`
  on cache set.
- **`matrix-index`** (optional, default `1`). Shard index for parallel runs
  (`cache get` / `cache set`).
- **`matrix-total`** (optional, default `1`). Total shards.
- **`use-api`** (optional, default `false`). API-based last-failed resolution
  (same code path as `or8n`).
- **`or8n`** (optional, default `false`). Orchestration-oriented behavior (API
  path; no post-cache step).
- **`api-key`** (optional, default `''`). API key, or set `CURRENTS_API_KEY` in
  the environment.
- **`project-id`** (optional, default `''`). Currents project ID, or set
  `CURRENTS_PROJECT_ID`.
- **`previous-ci-build-id`** (optional, default `''`). Override for the previous
  CI build ID when resolving the prior run (see [custom CI build
  ID][custom-ci-build-id]).

\*In cache mode a record key (input or environment) is required for meaningful
cache reads/writes.

## Setup

1. **Add `@currents/cmd` to the repository** as a dev dependency and install
   with a **frozen lockfile** in CI (`npm ci`, etc.). The action installs a
   global CLI for convenience; pinning `@currents/cmd` in the repository keeps
   CI reproducible. See the note in the [official docs][gha-rerun].
1. **Configure Currents** (record key, and for API mode, API key and project ID)
   using secrets and `env` as described in the documentation.
1. **Add this action before the Playwright step** and pass `extra-pw-flags` into
   the test command.
1. **Sharding:** set `matrix-index` and `matrix-total` from the job matrix (for
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
`CURRENTS_CI_BUILD_ID`, and copypaste workflows, see **[Re-run only failed tests
(GitHub Actions)][gha-rerun]**.

## Action metadata

Input/output definitions are in [`action.yml`](./action.yml).

## Developing this repository

This action is implemented in TypeScript (`src/index.ts`, `src/post.ts`). After
changing sources, run `npm run all` to format, lint, test, and rebuild `dist/`
before committing.

<!-- prettier-ignore-start -->
<!-- markdownlint-disable MD013 -->

[docs]: https://docs.currents.dev
[gha-rerun]: https://docs.currents.dev/getting-started/ci-setup/github-actions/re-run-failed-only-tests
[guide-rerun]: https://docs.currents.dev/guides/ci-optimization/re-run-only-failed-tests
[or8n-section]: https://docs.currents.dev/getting-started/ci-setup/github-actions/re-run-failed-only-tests#currents-orchestration
[custom-ci-build-id]: https://docs.currents.dev/getting-started/ci-setup/github-actions/re-run-failed-only-tests#custom-ci-build-id-for-reruns

<!-- markdownlint-enable MD013 -->
<!-- prettier-ignore-end -->
