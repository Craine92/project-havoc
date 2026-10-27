# Project Havoc – Technische Architektur

## Ziele und Leitplanken

Die Architektur unterstützt ein browserbasiertes Partyspiel mit einem gemeinsamen TV-Client, mehreren Smartphone-Controllern und einem autoritativen Server. Sie priorisiert klare Modulgrenzen, deterministisch testbare Regeln und kleine Entwicklungsinkremente.

Leitplanken:

- TypeScript im Strict Mode in allen Paketen
- Server entscheidet über alle spielrelevanten Zustände und Ergebnisse
- Clients senden Absichten, keine verbindlichen Zustandsänderungen
- Gemeinsame Netzwerkverträge werden zentral definiert
- Spielmodi sind voneinander getrennte Regelmodule
- In-Memory-Betrieb ist für die erste lokale Version zulässig; Persistenz wird erst bei bestätigtem Bedarf ergänzt
- Keine Abhängigkeit oder Codeübernahme aus Rune Riot

## Technologiestack

| Bereich | Vorgesehene Technologie | Zweck |
| --- | --- | --- |
| Sprache | TypeScript, Strict Mode | Durchgängige Typsicherheit |
| UI | React | TV- und Controller-Oberflächen |
| Build/Development | Vite | Schnelle Browserentwicklung und Builds |
| Server | Node.js | Sitzungsverwaltung und autoritative Spiellogik |
| Echtzeitkommunikation | Socket.IO | Bidirektionale Events, Räume und Reconnect-Unterstützung |
| Unit-/Integrationstests | Vitest | Regeln, Protokolle, Server und UI-Logik |
| End-to-End-Tests | Playwright | Mehrere Browserkontexte für TV und Controller |
| Versionsverwaltung | Git/GitHub | Nachvollziehbare Änderungen und Reviews |

Konkrete Versionen, Paketmanager und unterstützte Node-/Browser-Versionen werden zu Beginn der Implementierung festgeschrieben.

## Empfohlene Projektstruktur

```text
project-havoc/
├─ apps/
│  ├─ server/                 # Node.js-/Socket.IO-Prozess
│  ├─ tv/                     # React-Anwendung für den Hauptbildschirm
│  └─ controller/             # React-Anwendung für Smartphones
├─ packages/
│  ├─ protocol/               # Events, DTOs, Schemas und Protokollversion
│  ├─ game-core/              # Modusunabhängige Zustände und Abläufe
│  ├─ rules-classic/          # Classic-Regelwerk
│  ├─ rules-chaos/            # Chaos-Regelwerk
│  ├─ test-support/           # Geteilte Test-Builder und Fixtures
│  └─ ui/                     # Nur tatsächlich geteilte UI-Grundbausteine
├─ tests/
│  └─ e2e/                    # Systemtests mit mehreren Browserkontexten
├─ docs/
├─ package.json
├─ tsconfig.base.json
└─ AGENTS.md
```

Diese Struktur ist eine Zielstruktur für spätere Aufträge. In Auftrag 001 werden keine Codeverzeichnisse oder Konfigurationsdateien angelegt.

## Verantwortlichkeiten der Module

### `apps/server`

- Erstellt und beendet Sitzungen
- Verwaltet Lobby, Host-Rolle, Verbindungen und Spieleridentitäten
- Nimmt Client-Absichten entgegen und validiert sie
- Führt Zustandsübergänge über das aktive Regelmodul aus
- Verwaltet serverseitige Zeitgeber
- Verteilt öffentliche und gegebenenfalls spielerspezifische Projektionen
- Erzeugt strukturierte, datensparsame Diagnoseereignisse

### `apps/tv`

- Zeigt Beitrittsdaten, Lobby, gemeinsamen Spielzustand und Ergebnis
- Sendet ausschließlich erlaubte Host-Absichten
- Rendert Serverzustand; trifft keine Spielentscheidungen
- Zeigt Verbindungs- und Synchronisationszustände verständlich an

### `apps/controller`

- Erfasst Namen, Beitritt und Spieleraktionen
- Zeigt persönliche und freigegebene Informationen
- Sendet Absichten mit einer eindeutigen Aktions-ID
- Verarbeitet Bestätigung, Ablehnung und Resynchronisation
- Speichert nur die minimale lokale Reconnect-Identität

### `packages/protocol`

- Definiert Eventnamen, Payload-Typen, Fehlercodes und Zustandsprojektionen
- Enthält Laufzeitvalidierung an Vertrauensgrenzen
- Verwaltet eine explizite Protokollversion
- Enthält keine Spiellogik und keine UI-Abhängigkeiten

### `packages/game-core`

- Definiert modusunabhängige Domänenbegriffe und Phasenübergänge
- Enthält die von Classic und Chaos gemeinsam verwendeten Basiskartenregeln, ohne selbst einen konkreten Modus auszuwählen
- Stellt Schnittstellen für Regelmodule, Uhr und Zufallsquelle bereit
- Enthält reine Zustandsübergänge, soweit fachlich möglich
- Kennt keine Socket.IO- oder React-Details

### `packages/rules-classic` und `packages/rules-chaos`

- Implementieren jeweils nur das freigegebene Regelwerk des Modus
- Komponieren gemeinsame Basiskartenregeln aus `game-core`; Chaos ergänzt diese, importiert aber nicht das Classic-Modul
- Prüfen Aktionen gegen Zustand, Phase, Akteur und Zeitpunkt
- Liefern explizite Folgeeffekte beziehungsweise Zustandsänderungen
- Verwenden injizierbare Uhr und Zufallsquelle für reproduzierbare Tests
- Importieren einander nicht

### `packages/ui`

- Enthält erst dann gemeinsame Tokens oder Komponenten, wenn echte Wiederverwendung zwischen TV und Controller nachgewiesen ist
- Enthält keine Spielregeln und keine Netzwerksteuerung

## Serverautoritative Architektur

Der Server hält pro Sitzung den kanonischen Zustand. Ein Client sendet eine Absicht, beispielsweise „Aktion X ausführen“, zusammen mit Sitzungsbezug, Aktions-ID und den minimal notwendigen Eingabedaten. Der Server:

1. ordnet die Verbindung einer autorisierten Spieler- oder Host-Identität zu,
2. validiert Form und Größenlimits der Nachricht,
3. prüft Sitzung, Phase, Berechtigung, Zeitpunkt und Regelbedingungen,
4. wendet bei Erfolg genau einen gültigen Zustandsübergang an,
5. bestätigt oder verwirft die Aktion mit einem stabilen Ergebniscode,
6. verteilt neue, empfängerbezogene Zustandsprojektionen.

Clientseitige Animationen dürfen optimistisch reagieren, aber niemals das verbindliche Ergebnis bestimmen. Punkte, Gewinner, Zeitlimits, Karteneffekte und Phasenwechsel entstehen ausschließlich auf dem Server.

## Kommunikationsmodell

### Transport und Räume

- Socket.IO stellt die Echtzeitverbindung bereit.
- Jede Spielsitzung verwendet einen serverseitig kontrollierten Raum.
- TV und Controller besitzen getrennte Rollen und erlaubte Eventmengen.
- Eine HTTP-Einstiegsroute kann die Webanwendungen ausliefern; Gameplay läuft über versionierte Socket-Events.

### Eventkategorien

- Client-Absichten: Beitritt, Name setzen, Host-Start, Spieleraktion, Reconnect
- Serverbestätigungen: akzeptiert oder abgelehnt, jeweils mit Aktions-ID und Fehlercode
- Zustandsverteilung: Lobby-, Spiel-, Zeit- und Ergebnisprojektionen
- Lebenszyklus: verbunden, getrennt, Reconnect bestätigt, Sitzung beendet

Die konkreten Eventnamen und Payloads werden in einer separaten Protokollspezifikation festgelegt, bevor Netzwerkcode entsteht.

### Reihenfolge und Idempotenz

- Zustände tragen eine monoton steigende Revisionsnummer.
- Aktionen tragen eine vom Client erzeugte eindeutige ID und werden serverseitig dedupliziert.
- Veraltete oder doppelte Aktionen werden ohne erneute Spielwirkung beantwortet.
- Nach Reconnect fordert der Client einen vollständigen Snapshot an; inkrementelle Events allein sind keine Wiederherstellungsstrategie.

## Zustandsverwaltung

### Serverseitig

- Ein Sitzungsaggregat besitzt Zustand, Revision, Teilnehmerzuordnung und aktives Regelmodul.
- Zustandsänderungen erfolgen über explizite Commands/Intents und reine Regelübergänge.
- Zeitgeber werden als Domänenereignisse in die gleiche Verarbeitungsreihenfolge wie Spieleraktionen eingespeist.
- Pro Sitzung werden Aktionen seriell verarbeitet, um Race Conditions zu vermeiden.
- Zufall wird über eine kontrollierte Quelle erzeugt; Seed beziehungsweise relevante Ergebnisse müssen für Tests und Diagnose nachvollziehbar sein.

### Clientseitig

- Server-Snapshots sind die Quelle der Wahrheit.
- Lokaler UI-Zustand wie offene Hinweise oder Animationen bleibt vom Domänenzustand getrennt.
- TV und Controller erhalten nur die für ihre Rolle bestimmten Projektionen.
- Sensible oder geheime Spielerinformationen dürfen nie in einem gemeinsamen Broadcast landen.

### Persistenz

Für eine erste lokale Version ist ein begrenzter In-Memory-Sitzungsspeicher die einfachste Option. Dauerhafte Speicherung, horizontale Skalierung und Wiederherstellung nach Serverneustart sind offene Produkt- und Betriebsentscheidungen. Die Sitzungsablage soll hinter einer kleinen Schnittstelle liegen, damit später ein anderer Adapter ergänzt werden kann.

## Identität, Host und Reconnect

- Socket-IDs sind kurzlebige Verbindungskennungen, keine dauerhaften Spieleridentitäten.
- Beim ersten erfolgreichen Beitritt erzeugt der Server eine nicht erratbare Reconnect-Berechtigung.
- Der Controller speichert sie lokal und sendet sie bei Wiederverbindung.
- Der Server rotiert oder widerruft Berechtigungen nach definierten Regeln.
- Der TV besitzt eine eigene Rolle `display-host`, zählt nicht zum Spielerlimit und erhält ausschließlich eine öffentliche Projektion.
- Host-Rechte werden separat geprüft und nicht aus Clientdarstellung, Anzeigename oder Eventnamen abgeleitet.
- Alpha 0.1 benötigt keinen externen Accountdienst: Raum-, Host- und Reconnect-Berechtigungen werden vom Project-Havoc-Server ausgestellt.
- Verhalten bei dauerhaftem Host-Ausfall bleibt bis zur Produktentscheidung offen.

## Abgleich mit dem rekonstruierten Spielkonzept

Die Architektur aus Auftrag 001 trägt Classic und Chaos grundsätzlich, benötigt aber folgende Präzisierungen:

- Das Sitzungsaggregat trennt Sitzungsphase, normalen Zugzustand und optionalen Chaos-Unterzustand. Das vollständige Modell steht in `GAME_STATES.md`.
- Der TV ist eine explizite, sitzlose Hostrolle. Er darf Lobby-/Sitzungsaktionen, aber niemals Spielerintents senden.
- Classic und Chaos teilen einen kleinen Basiskartenkern. Chaos ist eine Komposition aus diesem Kern, fünf Chaos-Karten, Ereignisautomat und Gesamtzeituhr; es ist keine Kopie der Classic-Engine.
- Der Scheduler speichert absolute Serverdeadlines für Ruf-Fenster, Disconnect-Frist, Chaos-Reaktion, Ereignisentscheidung, Ergebnisfenster, Finalphase und Matchende.
- Timer feuern als Commands in dieselbe serielle Warteschlange wie Clientintents. Ein Timer darf keinen halbfertigen Zustandsübergang unterbrechen.
- Private Projektionen werden auf dem Server erzeugt: Display, allgemeiner Spieler und betroffener Spieler erhalten unterschiedliche Datenformen.
- Zufällige Decks, W6, automatische Ziele/Karten und Tie-Breaks laufen ausschließlich über eine injizierbare serverseitige Zufallsquelle.
- Alpha 0.1 implementiert nur Sitzung, Lobby, Rollen und Reconnect. Gameplay-Zustände werden dokumentiert, aber noch nicht codiert.

### Sitzungsaggregat

Ein künftiges Aggregat enthält mindestens:

- Sitzungscode, Phase, Revision und Erstell-/Ablaufzeit
- Hostberechtigung und Displayverbindungen
- Sitze mit stabiler Spieler-ID, Name, Ready und Verbindungsstatus
- gewählten Modus
- optionalen Partiezustand mit Zugzustand
- registrierte absolute Deadlines
- Deduplizierungsresultate kürzlich verarbeiteter Aktions-IDs

Ein einzelner serverseitiger Dispatcher verarbeitet alle Commands pro Sitzung nacheinander und veröffentlicht erst danach Revision und Projektionen.

### Timer- und Deadline-Modell

Eine Deadline enthält Typ, Sitzung, erwartete Zustandsrevision beziehungsweise fachliche Vorbedingung und absoluten Serverzeitpunkt. Beim Auslösen prüft der Server erneut, ob sie noch gültig ist. Dadurch werden alte Timer nach Reconnect, Zustandswechsel oder bereits getroffener Entscheidung zu sicheren No-ops.

Für Prozessneustarts reicht in Alpha 0.1 In-Memory-Betrieb; ein späterer Sitzungsadapter muss Deadlines gemeinsam mit dem Zustand persistieren, falls Neustart-Wiederherstellung gefordert wird.

## Sicherheit und Validierung

- Laufzeitvalidierung jeder externen Payload trotz TypeScript-Typen
- Positivlisten für Events, Felder, Längen, Wertebereiche und Zustandsphasen
- Serverseitige Berechtigungsprüfung für jede Aktion
- Begrenzung von Eventrate, Payloadgröße, Namenslänge und Sitzungsversuchen
- Nicht erratbare Sitzungscodes beziehungsweise Schutz gegen systematisches Durchprobieren; genaue UX-Abwägung ist offen
- Escaping und sichere Darstellung nutzergenerierter Namen
- Keine Geheimnisse oder vollständigen Reconnect-Tokens in Logs
- Generische Clientfehler, detailliertere strukturierte Serverdiagnose
- Abhängigkeiten und Sicherheitsupdates werden ab Implementierungsbeginn automatisiert geprüft

Das Bedrohungsmodell wird vor öffentlichem Internetbetrieb erweitert. Die lokale Zielumgebung reduziert, beseitigt aber keine Risiken.

## Erweiterbarkeit

Ein Regelmodul soll eine kleine, stabile Schnittstelle erfüllen, beispielsweise Initialisierung, erlaubte Aktionen, Verarbeitung von Absichten und Zeitereignissen sowie Erzeugung rollenspezifischer Projektionen. Neue Modi werden registriert, ohne bestehende Modi oder Transportcode zu verzweigen. Erweiterungspunkte werden erst abstrahiert, wenn ein konkreter zweiter Anwendungsfall existiert.

## Testbarkeit

- Reine Regeltests ohne Netzwerk oder echte Uhr
- Vertrags- und Schemataests für alle Protokollnachrichten
- Serverintegrationstests mit mehreren simulierten Clients
- Reconnect-, Deduplizierungs-, Reihenfolge- und Timeout-Tests
- Komponenten- beziehungsweise Interaktionstests für kritische UI-Zustände
- Playwright-End-to-End-Tests mit getrennten Browserkontexten für TV und mehrere Controller
- Deterministische Tests durch injizierbare Uhr und Zufallsquelle

## Beobachtbarkeit und Fehlerbehandlung

- Strukturierte Logs mit Sitzungskorrelation, aber ohne geheime Tokens
- Explizite, stabile Fehlercodes für erwartbare Ablehnungen
- Unerwartete Fehler werden zentral erfasst und führen nicht stillschweigend zu Teilzuständen
- Metriken für aktive Sitzungen, Verbindungen, Reconnects, abgelehnte Aktionen und Laufzeiten werden erst mit dem Betriebsmodell konkretisiert

## Noch offene technische Punkte

- Browser- und Geräte-Supportmatrix; Node.js ist für das Fundament auf mindestens 22.12 festgelegt
- Hosting- und Netzwerkmodell, insbesondere Smartphone-Erreichbarkeit im lokalen Netz
- TLS-Anforderungen für produktive Smartphone-Browser
- Persistenz und Verhalten bei Serverneustart
- horizontale Skalierung und Socket.IO-Adapter
- Umfang von Telemetrie, Datenschutz und Aufbewahrung
- konkrete Reconnect-Fristen und Host-Übernahme

## Implementierter Stand Alpha 0.1A

- npm Workspaces mit Node.js ab 22.12
- TypeScript 6 im Strict Mode mit zusätzlichen Prüfungen für unsichere Indexzugriffe und optionale Felder
- Zod 4 für strikt geschlossene Wire-Schemas
- React/Vite-Minimaleinstiege für TV und Controller ohne visuelle Oberfläche
- Node-HTTP-Minimalprozess mit `GET /health`, noch ohne Socket.IO
- reine Lobby-Domäne in `packages/game-core`, ohne React-, Browser-, Socket.IO- oder Node-Abhängigkeit
- injizierte Uhr, ID-Erzeugung und Reconnect-Token-Strategie
- HMAC-basierter Node-Adapter: deterministische Token-Ausgabe für idempotente Antworten, nur Digest im Domänenzustand
- Vitest für Domänen-/Vertragstests und vorbereitete Playwright-Konfiguration ohne künstliche UI-Tests

Der dokumentierte Zwischenzustand `STARTING` wird in Alpha 0.1A nicht als beobachtbarer Zustand gespeichert: Der reine Start-Command besitzt noch keine asynchrone Arbeit und wechselt atomar von `lobby` in den neutralen Zustand `started`. Sobald eine spätere Startsequenz tatsächlich mehrere fehlbare Schritte besitzt, wird ein eigener Zwischenzustand erneut bewertet.
