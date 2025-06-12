import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as path from 'path'
import { parseIntSafe, parseTemplate, parseYamlBoolean } from './utils'

// Define interface for inputs
interface ActionInputs {
  useAPI: boolean
  or8n: boolean
  debug: boolean
  matrixIndex: string
  matrixTotal: string
  apiKey?: string
  projectId?: string
  previousCIBuildId?: string
  key?: string
  id?: string
  path?: string
  outputDir?: string
  pwOutputDir?: string
}

// Get inputs with types
function getInputs(): ActionInputs {
  return {
    useAPI: parseYamlBoolean(core.getInput('use-api')) ?? false,
    or8n: parseYamlBoolean(core.getInput('or8n')) ?? false,
    debug: parseYamlBoolean(core.getInput('debug')) ?? false,
    apiKey: core.getInput('api-key') ?? process.env.CURRENTS_API_KEY,
    projectId: core.getInput('project-id') ?? process.env.CURRENTS_PROJECT_ID,
    previousCIBuildId: core.getInput('previous-ci-build-id'),
    key: core.getInput('key') ?? process.env.CURRENTS_RECORD_KEY,
    id: core.getInput('id'),
    path: core.getInput('path'),
    outputDir: core.getInput('output-dir'),
    pwOutputDir: core.getInput('pw-output-dir'),
    matrixIndex: core.getInput('matrix-index') || '1',
    matrixTotal: core.getInput('matrix-total') || '1'
  }
}

async function run(): Promise<void> {
  try {
    const inputs = getInputs()

    await exec.exec('npm install -g @currents/cmd');
    await exec.exec('npm list brace-expansion');

    const useAPI = inputs.useAPI || inputs.or8n
    core.saveState('or8n', useAPI)
    if (useAPI) {
      await or8n(inputs)
      return
    }

    const presetOutput = '.currents_env'

    const options: string[] = [
      `--preset last-run`,
      `--preset-output ${presetOutput}`,
      `--matrix-index ${inputs.matrixIndex}`,
      `--matrix-total ${inputs.matrixTotal}`,
      `--continue`
    ]

    if (inputs.key) {
      options.push(`--key ${inputs.key}`)
    }

    if (inputs.id) {
      options.push(`--id ${inputs.id}`)
    }

    if (inputs.outputDir) {
      options.push(`--output-dir ${inputs.outputDir}`)
    }

    if (inputs.debug) {
      options.push(`--debug`)
    }

    const cacheGetCommand = `npx currents cache get ${options.join(' ')}`

    const exitCode = await exec.exec(cacheGetCommand, [], {
      ignoreReturnCode: true
    })

    if (exitCode === 0) {
      const extraPwFlags = await exec.getExecOutput(`cat ${presetOutput}`)
      core.setOutput('extra-pw-flags', extraPwFlags.stdout.trim())
    }

    core.saveState('key', inputs.key)
    core.saveState('debug', inputs.debug)
    core.saveState('id', inputs.id)
    core.saveState('path', inputs.path || '')
    core.saveState('pwOutputDir', inputs.pwOutputDir)
    core.saveState('matrixIndex', inputs.matrixIndex)
    core.saveState('matrixTotal', inputs.matrixTotal)
  } catch (error) {
    core.setFailed((error as Error).message)
  }
}

async function or8n(inputs: ActionInputs): Promise<void> {
  const runAttempt = parseIntSafe(process.env.GITHUB_RUN_ATTEMPT, 1)

  if (runAttempt > 1) {
    let previousBuildId =
      inputs.previousCIBuildId && parseTemplate(inputs.previousCIBuildId)
    if (!previousBuildId) {
      const repository = process.env.GITHUB_REPOSITORY
      const runId = process.env.GITHUB_RUN_ID
      const previousRunAttempt = runAttempt - 1
      previousBuildId = `${repository}-${runId}-${previousRunAttempt}`
    }

    const lastRunFilePath = path.resolve(
      inputs.pwOutputDir ?? 'test-results',
      '.last-run.json'
    )
    const options = [
      `--pw-last-run`,
      `--ci-build-id`,
      `${previousBuildId}`,
      `--output`,
      `${lastRunFilePath}`
    ]
    const exitCode = await exec.exec(
      `npx currents api get-run ${options.join(' ')}`
    )

    if (exitCode === 0) {
      core.setOutput('extra-pw-flags', '--last-failed')
    }
  }
}

run()
