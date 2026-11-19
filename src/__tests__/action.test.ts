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
  delete process.env.CURRENTS_OIDC_AUDIENCE
  delete process.env.CURRENTS_PROJECT_ID
  jest.mocked(core.getInput).mockImplementation(name => inputs[name] || '')
  jest.mocked(core.getState).mockImplementation(name => state[name] || '')
  jest.mocked(core.saveState).mockImplementation((name, value) => {
    state[name] = String(value)
  })
  jest.mocked(exec.exec).mockResolvedValue(0)
  jest.mocked(exec.getExecOutput).mockImplementation(async command => ({
    exitCode: 0,
    stdout: command === 'currents' ? 'temporary-key\n' : '--last-failed\n',
    stderr: ''
  }))
})

afterEach(() => {
  process.env = originalEnv
})

it('obtains, masks, saves and reuses an OIDC key through cache upload and revocation', async () => {
  inputs['project-id'] = 'project'
  inputs['oidc-audience'] = 'custom-audience'
  await main()
  expect(exec.exec).toHaveBeenCalledWith('npm install -g @currents/cmd@^3.3.0')
  expect(exec.getExecOutput).toHaveBeenCalledWith(
    'currents',
    [
      'ci',
      'auth',
      'get-record-key',
      '--oidc-provider',
      'github-actions',
      '--audience',
      'custom-audience'
    ],
    expect.objectContaining({
      silent: true,
      env: expect.objectContaining({ CURRENTS_PROJECT_ID: 'project' })
    })
  )
  expect(core.setSecret).toHaveBeenCalledWith('temporary-key')
  expect(core.saveState).toHaveBeenCalledWith('oidcRecordKey', 'temporary-key')
  await post()
  for (const command of ['get', 'set']) {
    expect(exec.exec).toHaveBeenCalledWith(
      expect.stringContaining(`cache ${command}`),
      [],
      expect.objectContaining({
        env: expect.objectContaining({ CURRENTS_RECORD_KEY: 'temporary-key' })
      })
    )
  }
  expect(exec.exec).toHaveBeenLastCalledWith(
    'currents',
    ['ci', 'auth', 'revoke', '--stdin'],
    {
      input: Buffer.from('temporary-key\n')
    }
  )
  expect(core.setFailed).not.toHaveBeenCalled()
})

it('preserves environment project and audience when inputs are empty', async () => {
  process.env.CURRENTS_PROJECT_ID = 'env-project'
  process.env.CURRENTS_OIDC_AUDIENCE = 'env-audience'
  await main()
  expect(exec.getExecOutput).toHaveBeenCalledWith(
    'currents',
    ['ci', 'auth', 'get-record-key', '--oidc-provider', 'github-actions'],
    expect.objectContaining({
      silent: true,
      env: expect.objectContaining({
        CURRENTS_PROJECT_ID: 'env-project',
        CURRENTS_OIDC_AUDIENCE: 'env-audience'
      })
    })
  )
})

it.each(['input', 'environment'])(
  'does not obtain or revoke a supplied %s key',
  async source => {
    if (source === 'input') inputs.key = 'provided-key'
    else process.env.CURRENTS_RECORD_KEY = 'provided-key'
    await main()
    await post()
    expect(exec.getExecOutput).not.toHaveBeenCalledWith(
      'currents',
      expect.anything(),
      expect.anything()
    )
    expect(core.saveState).not.toHaveBeenCalledWith(
      'oidcRecordKey',
      expect.anything()
    )
    expect(exec.exec).not.toHaveBeenCalledWith(
      'currents',
      expect.anything(),
      expect.anything()
    )
    expect(exec.exec).toHaveBeenCalledWith(
      expect.stringContaining('cache set'),
      [],
      expect.objectContaining({
        env: expect.objectContaining({ CURRENTS_RECORD_KEY: 'provided-key' })
      })
    )
  }
)

it.each(['use-api', 'or8n'])(
  'skips record key authentication and revocation in %s mode',
  async mode => {
    inputs[mode] = 'true'
    await main()
    await post()
    expect(exec.getExecOutput).not.toHaveBeenCalled()
    expect(exec.exec).toHaveBeenCalledTimes(1)
  }
)

it.each(['rejected', 'empty'])(
  'fails without running cache commands when authentication is %s',
  async failure => {
    if (failure === 'rejected')
      jest
        .mocked(exec.getExecOutput)
        .mockRejectedValue(new Error('Authentication failed'))
    else
      jest
        .mocked(exec.getExecOutput)
        .mockResolvedValue({ exitCode: 0, stdout: '\n', stderr: '' })
    await main()
    expect(core.setFailed).toHaveBeenCalled()
    expect(exec.exec).toHaveBeenCalledTimes(1)
    expect(core.saveState).not.toHaveBeenCalledWith(
      'oidcRecordKey',
      expect.anything()
    )
  }
)

it('revokes the obtained key even when cache download and upload fail', async () => {
  jest.mocked(exec.exec).mockImplementation(async command => {
    if (command.includes('cache')) throw new Error('Cache failed')
    return 0
  })
  await main()
  await post()
  expect(core.setFailed).toHaveBeenCalledTimes(2)
  expect(exec.exec).toHaveBeenLastCalledWith(
    'currents',
    ['ci', 'auth', 'revoke', '--stdin'],
    expect.objectContaining({ input: Buffer.from('temporary-key\n') })
  )
})

it('warns without failing when revocation fails', async () => {
  state.oidcRecordKey = 'temporary-key'
  jest.mocked(exec.exec).mockImplementation(async command => {
    if (command === 'currents') throw new Error('Revoke failed')
    return 0
  })
  await post()
  expect(core.warning).toHaveBeenCalledWith(
    'Failed to revoke the OIDC record key'
  )
  expect(core.setFailed).not.toHaveBeenCalled()
})
