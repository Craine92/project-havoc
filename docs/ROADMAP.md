# Project Havoc – Roadmap

## Planungsprinzipien

- Jede Phase liefert ein kleines, prüfbares Ergebnis.
- Spielregeln werden erst nach fachlicher Freigabe implementiert.
- Protokoll und Serverlogik entstehen vor dekorativer Ausgestaltung.
- Jede Phase erfüllt ihre Akzeptanzkriterien und Tests, bevor abhängige Arbeit beginnt.
- Umfang und Reihenfolge werden nach neuen Regelentscheidungen aktualisiert.

## Phase 0 – Projektfundament (Auftrag 001)

**Ziel:** Gemeinsames Produkt- und Architekturverständnis dokumentieren.

**Abhängigkeiten:** keine

**Lieferumfang:** GDD, Architektur, Roadmap, Entscheidungen, offene Fragen und Entwicklungsregeln.

**Akzeptanzkriterien:**

- Alle sechs geforderten Dokumente existieren.
- Bestätigte Anforderungen und offene Punkte sind klar getrennt.
- Es wurden keine Spielregeln erfunden.
- Es existiert noch kein Anwendungs- oder Konfigurationscode.
- Architektur und Roadmap widersprechen einander nicht.

**Tests/Prüfungen:** manuelle Konsistenzprüfung, Link-/Pfadprüfung und Git-Diff-Prüfung.

## Phase 1 – Regel- und UX-Spezifikation

**Ziel:** Implementierbare, vom Game Director freigegebene Regeln und Kernabläufe erhalten.

**Abhängigkeiten:** Phase 0; Antworten auf die priorisierten Fragen

**Lieferumfang:** vollständige Zustandsdiagramme, Aktionskataloge, Siegbedingungen, Chaos-Karten, Zeitereignisse, Timeout- und Reconnect-Regeln sowie Low-Fidelity-Flows für TV und Controller.

**Akzeptanzkriterien:**

- Jeder Modus besitzt eindeutige Phasen, Übergänge und Endbedingungen.
- Für jede Aktion sind Akteur, Voraussetzungen, Eingaben und Ergebnis definiert.
- Alle fünf Chaos-Karten und sechs Zeitereignisse sind fachlich beschrieben.
- Sonderfälle wie Gleichstand, Disconnect und Host-Ausfall sind entschieden.
- Begriffe sind in allen Dokumenten konsistent.

**Tests/Prüfungen:** beispielbasierte Regeldurchläufe und Review durch Game Director; noch kein Anwendungscode.

## Phase 2 – Workspace und Qualitätsbasis

**Ziel:** Minimales, reproduzierbares TypeScript-Monorepo aufsetzen.

**Abhängigkeiten:** Phase 0; Entscheidungen zu Paketmanager und Laufzeitversionen

**Lieferumfang:** Workspace, Strict-TypeScript-Konfiguration, Linting/Formatierung, Vitest, Playwright-Grundkonfiguration und CI-Basis.

**Akzeptanzkriterien:**

- Frische Installation und alle Skripte funktionieren dokumentiert und reproduzierbar.
- Alle Pakete verwenden Strict TypeScript.
- Leere/minimale Apps und Pakete respektieren die festgelegten Abhängigkeitsgrenzen.
- CI führt Typprüfung, statische Prüfung und Tests aus.

**Tests:** Smoke-Test für jeden Workspace; Typecheck-, Lint- und Testbefehle in CI.

## Phase 3 – Protokoll und reine Domäne

**Ziel:** Netzwerkverträge und testbares Zustandsmodell ohne UI und echten Socket-Transport implementieren.

**Abhängigkeiten:** Phasen 1 und 2

**Lieferumfang:** versionierte Events/Schemas, Sitzungs- und Spieleridentitäten, Phasenmodell, Regelmodul-Schnittstelle, kontrollierte Uhr und Zufallsquelle.

**Akzeptanzkriterien:**

- Jede externe Nachricht besitzt Typ und Laufzeitschema.
- Ungültige Zustandsübergänge liefern definierte Fehler.
- Domänenpakete importieren weder React noch Socket.IO.
- Öffentliche und private Zustandsprojektionen sind getrennt.

**Tests:** Schema-Vertragstests, Zustandsübergangstests, Eigenschafts-/Randfalltests für IDs und Revisionen.

## Phase 4 – Sitzung, Lobby und Reconnect

**Ziel:** Vertikaler Multiplayer-Schnitt vom TV-Beitrittsbild bis zur stabilen Lobby.

**Abhängigkeiten:** Phasen 2 und 3

**Lieferumfang:** Serverprozess, Sitzungserstellung, QR-/Code-Beitritt, Namen, Lobby, Host-Startfreigabe, Verbindungsstatus und Reconnect.

**Akzeptanzkriterien:**

- Ein TV kann eine Sitzung erstellen und Beitrittsdaten anzeigen.
- Mehrere Controller können beitreten und erscheinen synchron in der Lobby.
- Doppelte oder ungültige Aktionen verändern den Zustand nicht.
- Ein Controller kann nach Verbindungsabbruch seine Identität und den aktuellen Zustand wiederherstellen.
- Nur ein autorisierter Host kann den Start anfordern.

**Tests:** Serverintegration mit mehreren Clients; E2E mit TV plus mindestens zwei Controller-Kontexten; Negativtests für ungültige Sitzung, Name, Rolle und Reconnect-Token.

## Phase 5 – Classic-Modus, spielbarer Vertikalschnitt

**Ziel:** Vollständiger Classic-Ablauf nach freigegebener Spezifikation.

**Abhängigkeiten:** Phasen 1, 3 und 4

**Lieferumfang:** Classic-Regelmodul, Controller-Aktionen, TV-Darstellung, Runden- und Ergebnisfluss.

**Akzeptanzkriterien:**

- Jede freigegebene Classic-Regel ist serverseitig umgesetzt.
- Illegale, verspätete und doppelte Aktionen werden konsistent abgelehnt.
- Eine vollständige Partie erreicht deterministisch ein gültiges Ergebnis.
- Reconnect funktioniert in jeder erlaubten Classic-Phase.

**Tests:** Unit-Tests jeder Regel und Randbedingung; Integrationstests kompletter Partien; E2E-Happy-Path und zentrale Fehlerpfade.

## Phase 6 – Chaos-Modus

**Ziel:** Vollständiger Chaos-Ablauf nach freigegebener Spezifikation.

**Abhängigkeiten:** Phasen 1, 3, 4 und Erkenntnisse aus Phase 5

**Lieferumfang:** Chaos-Regelmodul, fünf Karten, sechs Zeitereignisse, Reaktionsfenster, Timeouts, Finalphase und 25-Minuten-Entscheidung.

**Akzeptanzkriterien:**

- Alle bestätigten Karten und Ereignisse sind exakt gemäß Spezifikation umgesetzt.
- Gleichzeitige Reaktionen und Grenzzeitpunkte werden deterministisch entschieden.
- Serverzeit ist für Fristen verbindlich.
- Finalphase und 25-Minuten-Entscheidung haben vollständig getestete Übergänge.

**Tests:** Unit-Tests je Karte/Ereignis; Tests mit kontrollierter Uhr und Zufallsquelle; Integrations- und E2E-Tests für Timeout, Reconnect und Finalphase.

## Phase 7 – Game-UI, Zugänglichkeit und Feedback

**Ziel:** Den technisch vollständigen Ablauf auf kommerzielle Indie-Qualität heben.

**Abhängigkeiten:** stabile Abläufe aus Phasen 4 bis 6; freigegebene visuelle Richtung

**Lieferumfang:** Design-Tokens, responsive Controller-UI, TV-Darstellung, Motion-System, Audio-/Feedbackkonzept und Zugänglichkeitsverbesserungen.

**Akzeptanzkriterien:**

- Kernaktionen sind auf Zielgeräten eindeutig und mit ausreichend großen Touch-Zielen bedienbar.
- TV-Inhalte bleiben auf definiertem Betrachtungsabstand lesbar.
- Lade-, Fehler-, Disconnect-, Warte- und Ergebniszustände sind gestaltet.
- Animationen respektieren reduzierte Bewegung, sofern als Ziel bestätigt.

**Tests:** visuelle Regression für Kernansichten; Geräte-/Viewport-Matrix; Tastatur-, Kontrast- und Screenreader-Prüfungen nach festgelegtem Zielniveau; moderierte Verständlichkeitstests.

## Phase 8 – Stabilisierung und Release-Vorbereitung

**Ziel:** Belastbarer Release-Kandidat für die festgelegte Betriebsumgebung.

**Abhängigkeiten:** Phasen 4 bis 7; Hosting- und Supportentscheidungen

**Lieferumfang:** Performance- und Lastverbesserungen, Monitoring, Sicherheitsreview, Browserfreigabe, Betriebs- und Release-Dokumentation.

**Akzeptanzkriterien:**

- Definierte Anzahl gleichzeitiger Sitzungen und Clients erfüllt die Zielwerte.
- Unterstützte Browser bestehen die Kernabläufe.
- Keine bekannten kritischen Sicherheits- oder Datenverlustfehler.
- Betrieb, Rollback und Diagnose sind dokumentiert.

**Tests:** Last-, Soak-, Netzwerkunterbrechungs-, Browserkompatibilitäts-, Sicherheits- und vollständige E2E-Regressionstests.

## Abhängigkeitsübersicht

```text
Phase 0 ─┬─> Phase 1 ─┬─> Phase 3 ─> Phase 4 ─> Phase 5 ─┐
         │            │                                  ├─> Phase 7 ─> Phase 8
         └─> Phase 2 ─┘                    └─> Phase 6 ──┘
```

Phase 2 kann nach den technischen Grundentscheidungen parallel zur fachlichen Spezifikation erfolgen. Gameplay-Code in Phasen 3, 5 und 6 wartet auf die jeweils benötigten freigegebenen Regeln.

## Definition of Done für jedes Arbeitspaket

Ein Arbeitspaket ist fertig, wenn:

- die vereinbarten Akzeptanzkriterien erfüllt sind,
- keine unbestätigten Regeln als Produktverhalten eingebaut wurden,
- TypeScript ohne Fehler im Strict Mode prüft,
- relevante Unit-, Integrations- und E2E-Tests bestehen,
- neue Randfälle und Fehlerpfade getestet sind,
- Architektur- und Abhängigkeitsgrenzen eingehalten werden,
- nutzerrelevante Zustände inklusive Fehlern gestaltet sind,
- Dokumentation und Entscheidungen aktualisiert sind,
- keine Geheimnisse, Debug-Ausgaben oder unbegründeten Ausnahmen verbleiben,
- die Änderung reviewbar, klein genug und ohne bekannte kritische Regression ist.
