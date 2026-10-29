# Manueller Multiplayer-Test unter Windows

## Schnellstart

Voraussetzungen: Node.js 22.12+, npm 11, installierte Abhängigkeiten sowie PC und Smartphones im selben vertrauenswürdigen WLAN.

1. PowerShell öffnen.
2. In `C:\\Users\\shark\\Desktop\\Project-Havoc` wechseln.
3. `npm run dev` ausführen. Der Befehl startet den LAN-Launcher für Backend, TV und Controller.
4. Die ausgegebene TV-Adresse auf dem PC öffnen.
5. Auf `Neues Spiel` klicken und den QR-Code mit dem Smartphone scannen.
6. Namen eingeben, beitreten und spielen.

Der Launcher erkennt die aktive IPv4-Adresse anhand der Windows-Standardroute, startet Backend, TV und Controller, konfiguriert die exakten CORS-Origins und zeigt beispielsweise:

```text
LAN-IP:       192.168.x.x (automatisch erkannt)
TV:           http://192.168.x.x:5173
Smartphone:   http://192.168.x.x:5174
Backend:      http://192.168.x.x:3000
```

Die konkreten Werte stammen immer vom eigenen PC. Mit `Strg+C` werden alle drei gestarteten Prozesse beendet.

## Diagnose und manueller Fallback

Diese Prüfung verändert keine Systemeinstellungen:

```powershell
npm run doctor
```

Sie zeigt die ausgewählte LAN-IP, Ports und die lokale Erreichbarkeit aller Dienste. Findet Windows mehrere geeignete Standardrouten, bricht der Launcher sicher ab und zeigt Kandidaten. Dann eine tatsächlich am PC konfigurierte Adresse wählen:

```powershell
$env:HAVOC_LAN_IP='192.168.x.x'
npm run dev
```

Den Platzhalter nicht unverändert übernehmen. Die aktuelle IPv4-Konfiguration lässt sich zusätzlich mit `ipconfig` anzeigen.

Für Sonderfälle bleiben `VITE_HAVOC_SERVER_URL`, `VITE_PUBLIC_JOIN_URL`, `CORS_ORIGINS` und die Einzelbefehle verfügbar. Beim normalen LAN-Start sind keine `.env.local`-Dateien notwendig.

### Manueller Drei-Terminal-Start

Nur falls der automatische Launcher nicht verwendet werden kann, die tatsächlich ermittelte LAN-IP statt `192.168.x.x` einsetzen und passende `.env.local`-Werte für TV und Controller anlegen.

Terminal 1:

```powershell
$env:HOST='0.0.0.0'
$env:PORT='3000'
$env:CORS_ORIGINS='http://192.168.x.x:5173,http://192.168.x.x:5174'
$env:RECONNECT_TOKEN_SECRET='replace-with-at-least-32-random-bytes-for-this-test'
npm run dev:server
```

Terminal 2:

```powershell
npm run dev:tv -- --host 0.0.0.0 --port 5173
```

Terminal 3:

```powershell
npm run dev:controller -- --host 0.0.0.0 --port 5174
```

Das `--` nach dem Root-Skriptnamen leitet die Vite-Optionen korrekt durch den npm-Workspace-Wrapper.

## Windows-Firewall und WLAN

- Den Node.js-Zugriff im Windows-Dialog ausschließlich für private Netzwerke erlauben.
- Die Firewall nicht deaktivieren; der Launcher verändert keine Firewall-Regel.
- Gastnetze oder WLANs mit Client-/AP-Isolation verhindern die Verbindung zwischen Smartphone und PC.
- VPNs können eine zweite Standardroute erzeugen. Bei Mehrdeutigkeit VPN deaktivieren oder `HAVOC_LAN_IP` bewusst setzen.
- Der Launcher bindet alle drei Dienste nur an die ausgewählte LAN-Adresse, öffnet keine Router-Ports und richtet kein Internet-Deployment ein.

## Vollständiger Smartphone-Test

1. `npm run dev` starten und alle drei ausgegebenen Adressen prüfen.
2. Die TV-Adresse am PC öffnen und `Neues Spiel` wählen.
3. Sicherstellen, dass Join-Link und QR-Code Port 5174, dieselbe LAN-IP und denselben Raumcode enthalten.
4. QR-Code mit Smartphone 1 scannen, einen Namen eingeben und beitreten.
5. QR-Code mit Smartphone 2 scannen und einen anderen Namen verwenden.
6. Prüfen, dass beide Namen unmittelbar am TV erscheinen.
7. Beide Smartphones bereit schalten; der TV muss beide als bereit anzeigen.
8. Am TV zwischen Classic und Chaos wechseln; beide Smartphones müssen den Modus anzeigen.
9. Spiel starten; TV und Smartphones müssen in den neutralen Started-Zustand wechseln.

## Reconnect und Raumende

1. Vor dem Spielstart eine Controller-Seite neu laden. Derselbe Sitz muss ohne Duplikat wiederhergestellt werden.
2. WLAN am Smartphone kurz deaktivieren. TV und Controller müssen den Verbindungsverlust anzeigen.
3. WLAN wieder aktivieren und die Seite geöffnet lassen. Derselbe Spieler muss automatisch zurückkehren.
4. `Raum schließen` am TV zunächst abbrechen und anschließend bestätigen.
5. TV und Controller müssen den geschlossenen Zustand anzeigen; der Raum darf nicht durch Reconnect wieder geöffnet werden.

## Was automatisiert geprüft wird

- Auswahl und Ablehnung von LAN-Adressen bei einem oder mehreren Adaptern
- Port-, URL-, Join-Link- und CORS-Erzeugung
- Unterdrückung falscher TV-/localhost-QR-Codes
- QR-Inhalt und URL-Kodierung
- echter lokaler Socket.IO-Verbund mit TV und mehreren Controller-Browserkontexten
- Reload, Disconnect, Reconnect, ungültige Credentials und acht Spieler
- Startbereitschaft, Prozessgruppen-Shutdown und HTTP-Diagnose

Ein Browser-E2E-Test auf demselben PC kann weder WLAN-Client-Isolation noch Windows-Firewallregeln, Kamera-Scan, mobile Browserbesonderheiten oder echte Funkunterbrechungen beweisen. Diese Punkte müssen mindestens einmal mit einem physischen Smartphone im Ziel-WLAN geprüft werden.

## Sicherheits- und Betriebsgrenzen

- Reconnect-Tokens stehen niemals im QR-Code oder in der URL.
- Spieler-Credentials liegen raumspezifisch in `localStorage`; sie schützen nicht vor schädlichem JavaScript desselben Origins.
- Räume existieren nur im Arbeitsspeicher und enden bei einem Serverneustart.
- HTTP ist ausschließlich für die lokale Alpha in einem vertrauenswürdigen privaten Netzwerk vorgesehen.
