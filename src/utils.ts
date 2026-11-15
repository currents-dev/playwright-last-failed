import _ from 'lodash'

export function parseTemplate(value: string): string {
  try {
    return _.template(value)({})
  } catch {
    // There will be a ReferenceError if the template string will contain variables
    return value
  }
}

export function parseIntSafe(
  value: string | undefined,
  defaultValue: number
): number {
  const parsed = parseInt(value || '', 10)
  return isNaN(parsed) ? defaultValue : parsed
}

export function parseYamlBoolean(value: string): boolean | null {
  const trueValues = [
    'true',
    'True',
    'TRUE',
    'yes',
    'Yes',
    'YES',
    'on',
    'On',
    'ON'
  ]
  const falseValues = [
    'false',
    'False',
    'FALSE',
    'no',
    'No',
    'NO',
    'off',
    'Off',
    'OFF'
  ]

  if (trueValues.includes(value)) {
    return true
  } else if (falseValues.includes(value)) {
    return false
  }

  return null
}

type Env = { [name: string]: string }

// The CLI reads these from its environment. The record key goes there instead
// of the command line, which the runner prints in the log.
export function withCredentials(credentials: {
  key?: string
  projectId?: string
  oidcAudience?: string
}): Env {
  const env: Env = { ...(process.env as Env) }
  if (credentials.key) env.CURRENTS_RECORD_KEY = credentials.key
  if (credentials.projectId) env.CURRENTS_PROJECT_ID = credentials.projectId
  if (credentials.oidcAudience) {
    env.CURRENTS_OIDC_AUDIENCE = credentials.oidcAudience
  }
  return env
}
