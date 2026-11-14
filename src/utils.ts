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

// The CLI reads the project ID from CURRENTS_PROJECT_ID. A record key from OIDC
// is issued for one project, so the CLI needs it when no key is set.
export function withProjectId(projectId?: string): { [key: string]: string } {
  const env = process.env as { [key: string]: string }
  return projectId ? { ...env, CURRENTS_PROJECT_ID: projectId } : env
}
