import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

interface PackageManifest {
  readonly scripts?: Readonly<Record<string, string>>
}

function readManifest(relativePath: string): PackageManifest {
  return JSON.parse(readFileSync(resolve(process.cwd(), relativePath), 'utf8')) as PackageManifest
}

describe('Windows development start commands', () => {
  it('forwards root TV and controller arguments across the npm workspace boundary', () => {
    const scripts = readManifest('package.json').scripts

    expect(scripts?.dev).toBe('npm run dev:lan')
    expect(scripts?.['dev:tv']).toBe('npm run dev --workspace @project-havoc/tv --')
    expect(scripts?.['dev:controller']).toBe('npm run dev --workspace @project-havoc/controller --')
  })

  it.each(['apps/tv/package.json', 'apps/controller/package.json'])(
    '%s starts Vite without positional arguments',
    (manifestPath) => {
      expect(readManifest(manifestPath).scripts?.dev).toBe('vite')
    },
  )

  it.each(['README.md', 'docs/MANUAL_MULTIPLAYER_TEST.md'])(
    '%s documents the forwarding separator and explicit ports',
    (documentPath) => {
      const contents = readFileSync(resolve(process.cwd(), documentPath), 'utf8')
      expect(contents).toContain('npm run dev:tv -- --host 0.0.0.0 --port 5173')
      expect(contents).toContain('npm run dev:controller -- --host 0.0.0.0 --port 5174')
    },
  )
})
