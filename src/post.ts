import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { withCredentials } from './utils'

interface PostState {
  or8n?: boolean
  key?: string
  projectId?: string
  oidcAudience?: string
  debug?: boolean
  id?: string
  path?: string
  pwOutputDir?: string
  matrixIndex?: string
  matrixTotal?: string
}

function getPostState(): PostState {
  return {
    or8n:
      core.getState('or8n') === 'true' || core.getState('useAPI') === 'true',
    key: core.getInput('key'),
    projectId: core.getState('projectId'),
    oidcAudience: core.getInput('oidc-audience'),
    debug: core.getState('debug') === 'true',
    id: core.getState('id'),
    path: core.getState('path'),
    pwOutputDir: core.getState('pwOutputDir'),
    matrixIndex: core.getState('matrixIndex'),
    matrixTotal: core.getState('matrixTotal')
  }
}

async function run(): Promise<void> {
  try {
    const state = getPostState()
    if (state.key) core.setSecret(state.key)

    if (state.or8n) {
      return
    }

    // Prepare cache set command with dynamic inputs
    const options: string[] = [
      `--preset last-run`,
      `--matrix-index ${state.matrixIndex}`,
      `--matrix-total ${state.matrixTotal}`,
      `--continue`
    ]

    if (state.id) {
      options.push(`--id ${state.id}`)
    }

    if (state.path) {
      options.push(`--path ${state.path}`)
    }

    if (state.pwOutputDir) {
      options.push(`--pw-output-dir ${state.pwOutputDir}`)
    }

    if (state.debug) {
      options.push(`--debug`)
    }

    const cacheSetCommand = `npx currents cache set ${options.join(' ')}`

    await exec.exec(cacheSetCommand, [], {
      env: withCredentials(state)
    })
  } catch (error) {
    core.setFailed((error as Error).message)
  }
}

run()
