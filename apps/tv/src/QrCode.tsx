import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function QrCode({ value }: { readonly value: string }): React.JSX.Element {
  const [source, setSource] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    QRCode.toDataURL(value, {
      width: 420,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#16121fff', light: '#ffffffff' },
    }).then((result) => {
      if (active) setSource(result)
    }).catch(() => {
      if (active) setSource(null)
    })
    return () => { active = false }
  }, [value])

  return (
    <div className="qr-code" data-qr-value={value}>
      {source
        ? <img src={source} alt={`QR-Code für ${value}`} />
        : <span role="status">QR-Code wird erzeugt …</span>}
    </div>
  )
}
