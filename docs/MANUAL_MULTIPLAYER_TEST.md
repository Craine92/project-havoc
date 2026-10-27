# Manueller Multiplayer-Test unter Windows

## Voraussetzungen

- PC und Smartphones befinden sich im selben vertrauenswürdigen WLAN.
- Node.js 22.12+, npm 11 und die Projektabhängigkeiten sind installiert.
- Das WLAN erlaubt Kommunikation zwischen Geräten; ein Gastnetz mit Client-Isolation funktioniert nicht.
- Windows darf Node.js in privaten Netzwerken akzeptieren. Eine Firewall-Regel nur nach dem normalen Windows-Dialog und nur für private Netze freigeben; keine Firewall deaktivieren.

## 1. LAN-Adresse des PCs ermitteln

In PowerShell:

```powershell
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
  Select-Object InterfaceAlias, IPAddress
```

Die Adresse des aktiven WLAN-Adapters verwenden, beispielsweise `192.168.1.20`. VPN-, Hyper-V- und inaktive Adapter ignorieren. Im Folgenden diese Beispieladresse ersetzen.

## 2. Browserkonfiguration anlegen

`apps/tv/.env.local`:

```dotenv
VITE_HAVOC_SERVER_URL=http://192.168.1.20:3000
VITE_PUBLIC_JOIN_URL=http://192.168.1.20:5174/
```

`apps/controller/.env.local`:

```dotenv
VITE_HAVOC_SERVER_URL=http://192.168.1.20:3000
```

Die `.env.local`-Dateien sind ignoriert und dürfen keine echten Produktionsgeheimnisse enthalten.

## 3. Drei Terminals starten

Terminal 1 – Server:

```powershell
$env:HOST='0.0.0.0'
$env:PORT='3000'
$env:CORS_ORIGINS='http://192.168.1.20:5173,http://192.168.1.20:5174'
$env:RECONNECT_TOKEN_SECRET='replace-with-at-least-32-random-bytes-for-this-test'
npm run dev:server
```

Terminal 2 – TV:

```powershell
npm run dev:tv -- --host 0.0.0.0 --port 5173
```

Terminal 3 – Controller:

```powershell
npm run dev:controller -- --host 0.0.0.0 --port 5174
```

Vom PC aus `http://192.168.1.20:5173` öffnen. Auf einem Smartphone testweise `http://192.168.1.20:5174` aufrufen. Wenn die Seite nicht lädt, zuerst WLAN-Isolation, gewählte IP und den Windows-Firewall-Dialog prüfen.

## 4. Vollständiger Ablauf

1. Auf dem TV `Neues Spiel` wählen.
2. Prüfen, dass Raumcode, Join-URL und QR-Code dieselbe Raumkennung enthalten.
3. QR-Code mit Smartphone 1 scannen; Name eingeben und beitreten.
4. QR-Code mit Smartphone 2 scannen; einen anderen Namen verwenden.
5. Prüfen, dass beide Namen sofort auf dem TV erscheinen.
6. Auf beiden Smartphones `Bereit machen` wählen; TV muss beide als bereit zeigen.
7. Auf dem TV zwischen Classic und Chaos wechseln; beide Smartphones müssen den Modus anzeigen.
8. Auf dem TV `Spiel starten` wählen; TV und beide Smartphones müssen in den neutralen Started-Zustand wechseln.

## 5. Reconnect prüfen

1. Vor einem neuen Startdurchlauf Smartphone 1 in der Lobby verbinden.
2. Browserseite neu laden. Derselbe Name und Sitz müssen zurückkehren; auf dem TV darf kein zweiter Sitz entstehen.
3. WLAN am Smartphone kurz deaktivieren. Der TV muss `Verbindung getrennt` anzeigen.
4. WLAN wieder aktivieren und Seite geöffnet lassen. Smartphone und TV müssen denselben Sitz automatisch wieder als verbunden zeigen.
5. Optional die Seite in einem zweiten Tab desselben Browsers öffnen: Die gültige raumspezifische Berechtigung ersetzt die ältere Verbindung sicher.

## 6. Raum schließen

1. Auf dem TV `Raum schließen` wählen.
2. Dialog zunächst abbrechen und prüfen, dass die Sitzung bestehen bleibt.
3. Erneut öffnen und bestätigen.
4. TV und Smartphones müssen jeweils den geschlossenen Zustand zeigen; ein Reconnect darf die Sitzung nicht wieder öffnen.

## Sicherheits- und Betriebsgrenzen

- Reconnect-Tokens stehen niemals im QR-Code oder in der URL.
- Spieler-Credentials liegen raumspezifisch in `localStorage`; sie sind gegen andere Origins isoliert, aber nicht gegen schädliche Scripts desselben Origins.
- Der Server speichert Räume nur im Arbeitsspeicher. Ein Neustart beendet alle Sitzungen.
- HTTP ist nur für das vertrauenswürdige lokale Alpha-Netz vorgesehen. Für öffentlichen Betrieb sind HTTPS und ein erweitertes Bedrohungsmodell erforderlich.
