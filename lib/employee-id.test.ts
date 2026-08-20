import { describe, it, expect } from 'vitest'
import { formatEmployeeIdInput } from './employee-id'

describe('formatEmployeeIdInput', () => {
  it('uppercases and inserts the dash when digits follow letters', () => {
    expect(formatEmployeeIdInput('ab')).toBe('AB')
    expect(formatEmployeeIdInput('ab1')).toBe('AB-1')
    expect(formatEmployeeIdInput('abc1')).toBe('ABC-1')
    expect(formatEmployeeIdInput('abc-1234')).toBe('ABC-1234')
    expect(formatEmployeeIdInput('ab1234')).toBe('AB-1234')
  })
  it('handles deletion back across the dash', () => {
    expect(formatEmployeeIdInput('AB-')).toBe('AB')
    expect(formatEmployeeIdInput('AB')).toBe('AB')
  })
  it('strips junk and caps lengths', () => {
    expect(formatEmployeeIdInput(' a b!c#1 2 ')).toBe('ABC-12')
    expect(formatEmployeeIdInput('abcd12345')).toBe('ABC-1234')
    expect(formatEmployeeIdInput('')).toBe('')
  })
  it('ignores digits before any letters', () => {
    expect(formatEmployeeIdInput('12ab')).toBe('AB')
  })
})
