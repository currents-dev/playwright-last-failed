import {
  parseIntSafe,
  parseTemplate,
  parseYamlBoolean,
  rerunPreviousCIBuildId,
  withCredentials
} from '../utils'

describe('rerunPreviousCIBuildId', () => {
  it('returns the input on a re-run', () => {
    expect(rerunPreviousCIBuildId(2, 'currents-100-1')).toBe('currents-100-1')
  })

  it('evaluates a template in the input', () => {
    expect(rerunPreviousCIBuildId(3, 'currents-100-<%= 3 - 1 %>')).toBe(
      'currents-100-2'
    )
  })

  it.each([
    [1, 'currents-100-0'],
    [2, ''],
    [2, undefined]
  ])('returns nothing on attempt %d with the input %p', (runAttempt, input) => {
    expect(rerunPreviousCIBuildId(runAttempt, input)).toBeUndefined()
  })
})

describe('parseTemplate', () => {
  it.each([
    ['Hello, world!', 'Hello, world!'],
    ['<%= 1 + 2 %>', '3'],
    ['<%= 3 * 4 %>', '12'],
    ['<%= 10 / 2 %>', '5'],
    ['<%= 5 - 3 %>', '2'],
    [
      '<%= user.isActive ? "Active" : "Inactive" %>',
      '<%= user.isActive ? "Active" : "Inactive" %>'
    ],
    ['<%- user.name %>', '<%- user.name %>'],
    ['<%= user.name %>', '<%= user.name %>'],
    ['<%= user.name', '<%= user.name'],
    ['user.name %>', 'user.name %>'],
    ['<%= 5 + 3 %> and <%= 2 * 2 %>', '8 and 4']
  ])(
    'should return the correct result for template "%s"',
    (input, expected) => {
      expect(parseTemplate(input)).toBe(expected)
    }
  )
})

describe('parseIntSafe', () => {
  it.each([
    ['42', 0, 42],
    ['invalid', 10, 10],
    [undefined, 5, 5],
    ['', 7, 7]
  ])(
    'should parse %s safely and return %d',
    (input, defaultValue, expected) => {
      expect(parseIntSafe(input, defaultValue)).toBe(expected)
    }
  )
})

describe('parseYamlBoolean', () => {
  it.each([
    ['true', true],
    ['True', true],
    ['TRUE', true],
    ['yes', true],
    ['Yes', true],
    ['YES', true],
    ['on', true],
    ['On', true],
    ['ON', true],
    ['false', false],
    ['False', false],
    ['FALSE', false],
    ['no', false],
    ['No', false],
    ['NO', false],
    ['off', false],
    ['Off', false],
    ['OFF', false]
  ])(
    'should return %p for valid true/false-like value %s',
    (input, expected) => {
      expect(parseYamlBoolean(input)).toBe(expected)
    }
  )

  it.each([
    ['maybe', null],
    ['1', null],
    ['0', null],
    ['', null],
    ['null', null],
    ['undefined', null]
  ])('should return null for invalid boolean value %s', (input, expected) => {
    expect(parseYamlBoolean(input)).toBe(expected)
  })
})

describe('withCredentials', () => {
  const names = [
    'CURRENTS_PROJECT_ID',
    'CURRENTS_RECORD_KEY',
    'CURRENTS_API_KEY',
    'CURRENTS_OIDC_AUDIENCE'
  ] as const
  const before = Object.fromEntries(names.map(n => [n, process.env[n]]))

  afterEach(() => {
    for (const n of names) {
      if (before[n] === undefined) delete process.env[n]
      else process.env[n] = before[n]
    }
  })

  it('sets the record key and project ID given', () => {
    const env = withCredentials({ key: 'a-key', projectId: 'my-project' })
    expect(env.CURRENTS_RECORD_KEY).toBe('a-key')
    expect(env.CURRENTS_PROJECT_ID).toBe('my-project')
  })

  it('sets the API key given', () => {
    expect(withCredentials({ apiKey: 'an-api-key' })).toMatchObject({
      CURRENTS_API_KEY: 'an-api-key'
    })
  })

  it('sets the OIDC audience given', () => {
    expect(
      withCredentials({ oidcAudience: 'currents:record-key:acme' })
    ).toMatchObject({
      CURRENTS_OIDC_AUDIENCE: 'currents:record-key:acme'
    })
  })

  it('keeps the values of the job when the inputs are empty', () => {
    process.env.CURRENTS_PROJECT_ID = 'from-env'
    process.env.CURRENTS_RECORD_KEY = 'key-from-env'
    process.env.CURRENTS_API_KEY = 'api-key-from-env'
    process.env.CURRENTS_OIDC_AUDIENCE = 'audience-from-env'
    for (const empty of [
      { key: '', apiKey: '', projectId: '', oidcAudience: '' },
      {}
    ]) {
      const env = withCredentials(empty)
      expect(env.CURRENTS_PROJECT_ID).toBe('from-env')
      expect(env.CURRENTS_RECORD_KEY).toBe('key-from-env')
      expect(env.CURRENTS_API_KEY).toBe('api-key-from-env')
      expect(env.CURRENTS_OIDC_AUDIENCE).toBe('audience-from-env')
    }
  })
})
