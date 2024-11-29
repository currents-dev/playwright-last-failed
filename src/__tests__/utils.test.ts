import { parseIntSafe, parseTemplate, parseYamlBoolean } from '../utils'

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
