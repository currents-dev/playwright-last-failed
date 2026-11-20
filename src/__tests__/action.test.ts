import * as core from '@actions/core'
import * as exec from '@actions/exec'

jest.mock('@actions/core')
jest.mock('@actions/exec')

const inputs: Record<string, string> = {}
const state: Record<string, string> = {}
const originalEnv = process.env

async function main(): Promise<void> {
  await jest.isolateModulesAsync(async () => {
    jest.requireActual('../index')
    await new Promise(resolve => setImmediate(resolve))
  })
}

async function post(): Promise<void> {
  await jest.isolateModulesAsync(async () => {
    jest.requireActual('../post')
    await new Promise(resolve => setImmediate(resolve))
  })
}

beforeEach(() => {
  jest.resetAllMocks()
  for (const key of Object.keys(inputs)) delete inputs[key]
  for (const key of Object.keys(state)) delete state[key]
  process.env = { ...originalEnv }
  delete process.env.CURRENTS_RECORD_KEY
  delete process.env.CURRENTS_PROJECT_ID
  jest.mocked(core.getInput).mockImplementation(name => inputs[name] || '')
  jest.mocked(core.getState).mockImplementation(name => state[name] || '')
  jest.mocked(core.saveState).mockImplementation((name, value) => {
    state[name] = String(value)
  })
  jest.mocked(exec.exec).mockResolvedValue(0)
  jest.mocked(exec.getExecOutput).mockResolvedValue({
    exitCode: 0,
    stdout: '--last-failed\n',
    stderr: ''
  })
})

afterEach(() => {
  process.env = originalEnv
})

it.each(['input', 'environment'])(
  'masks a %s key and passes it to cache get and cache set',
  async source => {
    if (source === 'input') inputs.key = 'provided-key'
    else process.env.CURRENTS_RECORD_KEY = 'provided-key'
    await main()
    await post()
    expect(exec.exec).toHaveBeenCalledWith(
      'npm install -g @currents/cmd@^3.4.0'
    )
    expect(core.setSecret).toHaveBeenCalledWith('provided-key')
    for (const command of ['get', 'set']) {
      expect(exec.exec).toHaveBeenCalledWith(
        expect.stringContaining(`cache ${command}`),
        [],
        expect.objectContaining({
          env: expect.objectContaining({ CURRENTS_RECORD_KEY: 'provided-key' })
        })
      )
    }
    expect(core.setFailed).not.toHaveBeenCalled()
  }
)

it('runs no currents ci auth command without a key', async () => {
  await main()
  await post()
  expect(exec.getExecOutput).not.toHaveBeenCalledWith(
    'currents',
    expect.anything(),
    expect.anything()
  )
  expect(exec.exec).not.toHaveBeenCalledWith(
    'currents',
    expect.anything(),
    expect.anything()
  )
  expect(exec.exec).toHaveBeenCalledWith(
    expect.stringContaining('cache get'),
    [],
    expect.objectContaining({
      env: expect.not.objectContaining({
        CURRENTS_RECORD_KEY: expect.anything()
      })
    })
  )
})

it.each(['use-api', 'or8n'])('skips the cache in %s mode', async mode => {
  inputs[mode] = 'true'
  await main()
  await post()
  expect(exec.getExecOutput).not.toHaveBeenCalled()
  expect(exec.exec).toHaveBeenCalledTimes(1)
})
