# Project Havoc – Roadmap

## Planungsprinzipien

- Jede Phase liefert einen kleinen, demonstrierbaren vertikalen Schnitt.
- Serverautorität, Rollen und Datenschutz werden vor Gameplay validiert.
- Alpha 0.1 enthält bewusst keine Classic- oder Chaos-Mechanik.
- Ungeklärte Regeln werden nicht durch Implementierungsdetails entschieden.
- Tests wachsen auf derselben Ebene wie das Verhalten: Unit, Vertrag, Integration und E2E.
- Dependencies werden erst im zugehörigen Implementierungsauftrag ausgewählt und installiert.

## Abgeschlossene Dokumentationsphasen

### Auftrag 001 – Fundament

**Ergebnis:** Vision, Architektur, Entscheidungen, Roadmap, offene Fragen und Entwicklungsregeln dokumentiert.

### Auftrag 002 – Referenzanalyse und Alpha-0.1-Planung

**Ergebnis:**

- Classic- und Chaos-Konzept aus Rune Riot rekonstruiert
- dokumentierte Regeln, Implementierungsverhalten und Konflikte getrennt
- Zustandsmodell, Aktionskatalog und Akzeptanzszenarien erstellt
- Architektur um Displayrolle, eigene Reconnect-Berechtigung, Deadline-Modell und gemeinsamen Basiskartenkern präzisiert
- Alpha 0.1 in implementierbare Arbeitspakete zerlegt

**Abnahmekriterien:**

- alle fünf Chaos-Karten und sechs Ereignistypen sind mit Quellen dokumentiert,
- Classic-Zug, +4, Ruf, Sieg und Sichtbarkeit sind beschrieben,
- widersprüchliche Regeln bleiben ausdrücklich offen,
- keine Referenzimplementierung wurde kopiert,
- kein ausführbarer Anwendungscode und keine Dependency wurde angelegt.

## Alpha 0.1 – Multiplayer Foundation

### Ziel und Funktionsumfang

Alpha 0.1 ist die erste technisch überprüfbare, aber noch nicht spielbare Version. Sie umfasst:

- startbaren Node.js-Backend-Server,
- startbare React-/Vite-TV-Anwendung,
- startbare React-/Vite-Smartphone-Anwendung,
- private Sitzung mit lesbarem Raumcode,
- QR-Code und alternative Join-URL,
- zwei bis acht gleichzeitig verbundene Smartphones,
- validierte, eindeutige Spielernamen,
- Ready-Status und Spielerliste auf dem TV,
- verifizierte sitzlose Display-Hostrolle,
- Hoststart nur bei erfüllten Startbedingungen,
- serverseitigen Sitzungszustand und Zustandsrevisionen,
- grundlegenden Reconnect für TV und Spieler,
- rollenbezogene Snapshots ohne private Datenlecks,
- einen bestätigten Startzustand beziehungsweise Platzhalterbildschirm ohne Kartenmechanik.

Nicht enthalten: Kartendeck, Kartenaktionen, Classic-Züge, Chaos-Karten, Ereignisse, Wertung, persistente Partien, Accounts, Matchmaking oder Deployment.

## Implementierungsreihenfolge Alpha 0.1

### A01.1 – Workspace und Qualitätsgates

**Status:** In Auftrag 003 umgesetzt

**Abhängigkeiten:** Auftrag 002 abgeschlossen

**Lieferumfang:**

- npm-Workspace oder anderes zuvor bestätigtes Workspace-Werkzeug
- `apps/server`, `apps/tv`, `apps/controller`, `packages/protocol`, `packages/game-core`, `packages/test-support`
- gemeinsame Strict-TypeScript-Konfiguration
- Vite für beide Clients, Node.js für Server
- Vitest und Playwright-Grundkonfiguration
- Skripte für Entwicklung, Build, Typecheck und Tests

**Akzeptanzkriterien:**

- frische Installation ist reproduzierbar,
- alle drei Anwendungen starten unabhängig,
- alle Pakete bestehen Strict-Typecheck,
- keine Gameplay-Regel ist implementiert,
- CI oder lokaler Gesamtbefehl führt Typecheck und Tests aus.

**Tests:** Workspace-Smokes, Typecheck jeder App, minimaler HTTP-Healthcheck des Servers.

### A01.2 – Protokoll und Lobby-Domäne

**Status:** In Auftrag 003 umgesetzt

**Abhängigkeiten:** A01.1

**Lieferumfang:**

- versionierte Client-/Servernachrichten mit Laufzeitschemas
- Sitzungsphasen `lobby`, neutraler atomarer Zustand `started` und `closed`; `starting` wird erst bei realer asynchroner Startarbeit eingeführt
- Rollen `display-host` und `player`
- Raumcode, stabile Spieler-ID, Host-/Reconnect-Berechtigung
- Roster, Name, Ready, Verbindung, Modusfeld und Revision
- Aktions-ID und Deduplizierungsvertrag

**Akzeptanzkriterien:**

- jede Nachricht besitzt TypeScript-Typ und Laufzeitschema,
- unbekannte Felder beziehungsweise ungültige Werte werden nach festgelegter Policy behandelt,
- Name ist nach bestätigter Regel 2–16 Unicode-Codepoints lang und normalisiert eindeutig,
- TV- und Spielerprojektion enthalten keine Berechtigungsgeheimnisse,
- Zustandsübergänge funktionieren ohne Socket.IO oder React in Unit-Tests.

**Tests:** Schema-Positiv-/Negativtests, Namensnormalisierung, Kapazität 8, Reconnect am vollen Raum, Zustandsinvarianten, Deduplizierung.

### A01.3 – Autoritativer Sitzungsserver

**Status:** In Auftrag 004 umgesetzt

**Abhängigkeiten:** A01.2

**Lieferumfang:**

- Sitzung erstellen und schließen
- Socket.IO-Verbindung und Raumzuordnung
- Join, Rename, Ready und Hoststart
- In-Memory-Sitzungsrepository mit Ablaufbereinigung
- vollständige Snapshots mit monotoner Revision
- strukturierte Fehlercodes und datensparsame Logs

**Akzeptanzkriterien:**

- Raumcodes sind ausreichend nicht erratbar beziehungsweise gegen systematisches Probieren begrenzt,
- nur der Display-Host darf starten oder schließen,
- neue Spieler werden bei acht Sitzen abgelehnt, Reconnects nicht,
- Start erfordert 2–8 verbundene und bereite Spieler,
- parallele Aktionen einer Sitzung werden seriell verarbeitet,
- doppelte Aktions-IDs haben keine doppelte Wirkung.

**Tests:** Serverintegration mit mindestens einem Display und acht simulierten Spielern; Berechtigungs-, Rate-/Größen-, Konkurrenz-, Deduplizierungs- und Fehlerpfadtests.

**Umsetzung:** Kontrollierbarer HTTP-/Socket.IO-Server, In-Memory-Repository, kryptografische Raumcodes, serielle Warteschlange je Raum, rollenbezogene Vollsnapshots, Spieler-/Host-Reconnect, konfigurierbare Retention, strukturierte Logs, CORS-/Payload-/Rate-Grenzen und 28 echte Socket.IO-Integrationsszenarien.

### A01.4 – TV-Lobby

**Status:** In Auftrag 005 umgesetzt

**Abhängigkeiten:** A01.2 und stabiler Serverpfad aus A01.3

**Lieferumfang:**

- Serververbindung und Displayauthentifizierung
- Sitzungserstellung
- großer Raumcode, Join-URL und lokal erzeugter QR-Code
- Liste mit Namen, Verbindung und Ready
- Startschaltfläche mit verständlicher Sperrbegründung
- Reconnect-/Fehler-/Raum-beendet-Zustände
- Start-Platzhalter ohne Gameplay

**Akzeptanzkriterien:**

- TV belegt keinen Spielersitz,
- QR-Inhalt entspricht exakt der sichtbaren Join-URL,
- Liste bleibt aus typischem TV-Abstand lesbar,
- Serverablehnung bleibt autoritativ, auch wenn die UI eine Schaltfläche fälschlich aktiv hätte,
- Neuladen stellt dieselbe Sitzung mit gültiger Hostberechtigung wieder her.

**Tests:** Komponenten-/Interaktionstests, QR-Payload-Test, Playwright für Erstellen, Reconnect, Startgate und Fehlerzustände.

**Umsetzung:** Eigenständiges Dark-Fantasy-TV-Design, echter Socket.IO-Adapter, Raumerstellung, sessionStorage-Reconnect, Raumcode und konfigurierbare Join-URL, vorbereiteter QR-Bereich, Live-Roster, Moduswahl, serverseitiges Start-Gate, Close-Bestätigung, Started-/Fehlerzustände sowie Komponenten- und Mehrclient-Playwright-Tests.

### A01.5 – Smartphone-Join und Lobby

**Status:** In Auftrag 006 umgesetzt

**Abhängigkeiten:** A01.2 und A01.3

**Lieferumfang:**

- Deep Link aus QR-/Join-URL
- Namenseingabe und verständliche Validierungsfehler
- Join, Rename, Ready und Leave in der Lobby
- Verbindungsstatus und automatische Wiederverbindung
- lokale, raumspezifische Aufbewahrung der Reconnect-Berechtigung
- Start-Platzhalter nach Hoststart

**Akzeptanzkriterien:**

- auf schmalen Hochformat-Displays ohne horizontales Scrollen nutzbar,
- Name allein kann keinen fremden Sitz übernehmen,
- wiederholtes Tippen erzeugt keine doppelte Aktion,
- Reload/Reconnect erzeugt keinen zusätzlichen Sitz,
- abgelaufene oder widerrufene Berechtigungen führen in einen verständlichen Join-Zustand.

**Tests:** UI-Tests für Name/Ready/Fehler; Playwright auf 320-, 390- und 430-Pixel-Viewports; Reconnect-Integration.

**Umsetzung:** QR-/Deep-Link-Join, manuelle Codeeingabe, geteilte Namensvalidierung, private Spieleransicht, Ready/Rename, raumspezifischer Reconnect, Started-/Closed-Zustände, vier Smartphone-Breiten und reale Mehrbrowser-Tests bis acht Spieler.

### A01.6 – Mehrclient-E2E und Stabilisierung

**Abhängigkeiten:** A01.3 bis A01.5

**Lieferumfang:**

- automatisierter End-to-End-Fluss mit TV und mehreren Smartphones
- Netzwerkunterbrechungs- und Reconnect-Fälle
- Dokumentation für lokalen Start im Heimnetz
- überprüfte CORS-/Origin- und Bindungsstrategie
- bekannte Einschränkungen und Hardware-Abnahmecheckliste

**Akzeptanzkriterien:**

- TV erstellt Raum, zwei Smartphones treten bei, setzen Ready und Host startet,
- gleichzeitig eintreffende Join-/Ready-/Startaktionen erzeugen konsistent genau einen Zustand,
- TV- und Spielerreload stellen den Zustand wieder her,
- ein neunter Spieler wird abgelehnt, einer der acht reconnectet erfolgreich,
- keine privaten Tokens in URL, UI, Logs oder fremden Snapshots,
- Server, TV und Controller lassen sich über dokumentierte Befehle starten.

**Tests:** vollständige Szenarien `PH-A01-001` bis `PH-A01-012`; Playwright mit getrennten Kontexten; Socket-Integration; manuelle Prüfung auf realem TV/PC plus mindestens zwei Smartphones im selben WLAN.

## Alpha 0.1 – empfohlene Pull-Request-Schnitte

1. Workspace, TypeScript und Testgates
2. Protokollschemas und reine Lobby-Domäne
3. Sitzungsserver und Integrationstests
4. TV-Lobby
5. Smartphone-Join/Lobby
6. Reconnect, Mehrclient-E2E und Dokumentation

Jeder Schnitt soll für sich buildbar und testbar sein. Ein PR führt keine nachgelagerte Gameplay-Abstraktion „auf Vorrat“ ein.

## Alpha 0.2 – Classic Vertical Slice

**Abhängigkeiten:** Alpha 0.1; Entscheidungen zu Startkarte, Rufsemantik und Einzelrunde/Match

**Lieferumfang:** 108-Karten-Deck, sieben Startkarten, passende Karten, Zieh-eine, Skip, Reverse, +2, Wild, +4-Prüfung, Ruf/Fangfenster, Sieg und Reconnect in allen Classic-Zuständen.

**Akzeptanzkriterien:** Szenarien `PH-CL-001` bis `PH-CL-010`; serverseitige Privatsphäre; vollständige Partie mit deterministischem Deck; keine Chaoslogik.

**Tests:** reine Regeltests, Protokollverträge, Serverintegration kompletter Partien und TV-/Controller-E2E.

## Alpha 0.3 – Chaos Vertical Slice

**Abhängigkeiten:** stabile Classic-Basis; bestätigte Zeitwerte und Ereignisreihenfolge

**Lieferumfang:** 113-Karten-Deck, fünf Chaos-Karten, Reaktionsfenster, drei Schatzfähigkeiten, sechs Ereignisse, Finalphase und Zeitentscheidung.

**Akzeptanzkriterien:** alle `PH-CH-*`-Szenarien; kontrollierte Uhr/Zufallsquelle; private Orakelsicht; keine Timer-Race-Condition.

**Tests:** Unit je Karte/Ereignis, Deadline-/Tie-Break-Tests, Mehrclient-Integration und komplette Chaos-E2E-Partie mit beschleunigter Testuhr.

## Alpha 0.4 – Game-UI und Zugänglichkeit

**Abhängigkeiten:** stabile Classic-/Chaos-Abläufe; visuelle Freigabe

**Lieferumfang:** eigene Project-Havoc-Identität, responsive Spieloberflächen, Motion-/Audiofeedback, Regelhilfe, Kontrast- und Reduced-Motion-Unterstützung.

**Tests:** visuelle Regression, Zielgeräte-/Viewport-Matrix, Tastatur-, Kontrast- und Screenreader-Prüfungen, moderierte Verständlichkeitstests.

## Release-Vorbereitung

**Abhängigkeiten:** Hosting-, Datenschutz-, Browser- und Lastziele

**Lieferumfang:** Last-/Soak-Stabilisierung, Monitoring, Sicherheitsreview, Deployment-/Rollback-Dokumentation und Supportmatrix.

## Abhängigkeiten

```text
Auftrag 001 ─> Auftrag 002 ─> A01.1 ─> A01.2 ─> A01.3 ─┬─> A01.4 ─┐
                                                        └─> A01.5 ─┴─> A01.6
                                                                        │
                                                                        v
                                                              Alpha 0.2 Classic
                                                                        │
                                                                        v
                                                               Alpha 0.3 Chaos
                                                                        │
                                                                        v
                                                              UI / Release-Härtung
```

## Definition of Done

Ein Arbeitspaket ist fertig, wenn:

- alle zugeordneten Akzeptanzkriterien erfüllt sind,
- TypeScript Strict, Linting, Unit- und relevante Integrationstests bestehen,
- kritische Nutzerpfade als E2E-Test bestehen,
- Netzwerkgrenzen laufzeitvalidiert und Berechtigungen serverseitig geprüft sind,
- private Informationen durch Projektion statt UI-Verbergen geschützt sind,
- Timer und Zufall deterministisch testbar sind,
- neue Fehler- und Reconnect-Zustände gestaltet sind,
- keine unbestätigte Regel implementiert wurde,
- Dokumentation und Entscheidungsprotokoll aktuell sind,
- keine Geheimnisse, Debugreste oder ungeklärte kritische Risiken verbleiben,
- Diff und Git-Status geprüft und keine ungefragten Commits oder Pushes erfolgt sind.

## Alpha 0.2A – Classic-Engine-Grundlage

**Umgesetzt:** 108-Karten-Modell, injizierbares Mischen/Uhr, zwei bis acht Spieler, reine Zugtransitionen, Basis- und Sonderkarten, +4-Challenge, verzögerte Siegerbestätigung, private/öffentliche Projektionen, stabile Fehlercodes sowie deterministische Mehrpartien-Simulation.

**Bewusst nicht integriert:** Socket.IO-Gameplay, Lobby-Startkopplung, TV-/Controller-Karten-UI und Chaos. Die vorhandene Alpha-0.1-Lobby bleibt unverändert.

**Vor Alpha 0.2B zu entscheiden:** Startkarte, atomare Rufsemantik und verbindliches Runden-/Matchmodell. Danach folgen Gameplay-Protokollschemas und Serveradapter, Reconnect in Spielzuständen sowie echte Mehrclient-E2E-Partien.
