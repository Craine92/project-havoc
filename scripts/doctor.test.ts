import { describe, expect, it } from 'vitest'

import { serviceDiagnosis } from './doctor-utils.js'

describe('LAN service diagnosis', () => {
  it('distinguishes LAN reachability, local-only binding, occupied ports, and stopped services', () => {
    expect(serviceDiagnosis('Backend', true, true, true)).toBe('über LAN erreichbar')
    expect(serviceDiagnosis('Backend', false, true, true)).toContain('nur lokal erreichbar')
    expect(serviceDiagnosis('Controller', false, false, true)).toContain('Port belegt')
    expect(serviceDiagnosis('Controller', false, false, false)).toBe('Controller nicht gestartet')
  })
})
