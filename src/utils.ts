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
