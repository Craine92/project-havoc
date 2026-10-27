// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { QrCode } from './QrCode.js'

afterEach(cleanup)

describe('TV QR code', () => {
  it('generates a local image for the complete join URL', async () => {
    const url = 'http://havoc-box.local:5174/join?room=HVC234'
    const { container } = render(<QrCode value={url} />)
    expect(container.querySelector('.qr-code')?.getAttribute('data-qr-value')).toBe(url)
    await waitFor(() => expect(screen.getByRole('img').getAttribute('src')).toMatch(/^data:image\/png;base64,/))
    expect(screen.getByRole('img').getAttribute('alt')).toContain(url)
  })
})
