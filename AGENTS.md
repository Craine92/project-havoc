# Project Havoc – Verbindliche Entwicklungsregeln

## Geltungsbereich und Priorität

Diese Regeln gelten für das gesamte Repository. Spezifischere `AGENTS.md`-Dateien in Unterverzeichnissen dürfen ergänzen, aber zentrale Sicherheits-, Qualitäts- und Architekturregeln nicht abschwächen. Direkte, aktuelle Anweisungen des Auftraggebers haben Vorrang.

## Arbeitsweise

- Vor Änderungen Auftrag, betroffene Dokumentation, aktuellen Branch und Git-Status prüfen.
- Nur den ausdrücklich beauftragten Umfang bearbeiten.
- Kleine, zusammenhängende und überprüfbare Änderungen bevorzugen.
- Fehlende Anforderungen als offene Frage dokumentieren; keine Spielregeln erfinden.
- Bestehende Nutzeränderungen bewahren und nicht ungefragt zurücksetzen oder überschreiben.
- Keine Änderungen außerhalb dieses Repositories.
- Das Rune-Riot-Projekt weder verändern noch Quellcode, Komponenten oder Implementierungen daraus übernehmen.
- Keine Dependencies, Tools, Dienste oder Infrastruktur ohne Auftrag hinzufügen.

## Architekturgrenzen

- Der Server ist für Zustand, Regeln, Zeitentscheidungen, Zufall, Punkte und Ergebnisse autoritativ.
- Clients senden Absichten und dürfen keine verbindlichen Ergebnisse festlegen.
- Netzwerkdaten werden an der Servergrenze zur Laufzeit validiert.
- `protocol` enthält Verträge und Schemas, aber keine UI- oder Spielregeln.
- `game-core` und Regelpakete kennen weder React noch Socket.IO.
- Classic und Chaos bleiben getrennte Regelmodule und importieren einander nicht.
- TV und Controller erhalten rollenbezogene Zustandsprojektionen; private Daten werden nicht lediglich clientseitig versteckt.
- Socket-Verbindungs-IDs sind keine dauerhaften Spieleridentitäten.
- Zeit und Zufall werden im Regelcode injiziert, damit Tests deterministisch bleiben.
- Neue Abstraktionen brauchen einen konkreten Anwendungsfall; keine vorsorglichen Frameworks.

## TypeScript-Standards

- Strict Mode bleibt aktiviert; seine Prüfungen werden nicht lokal abgeschwächt.
- Kein `any`, außer an unvermeidbaren Fremdschnittstellen und dann mit Begründung sowie sofortiger Eingrenzung auf `unknown`/validierte Typen.
- Öffentliche Schnittstellen und Netzwerkgrenzen erhalten explizite Typen.
- Diskriminierte Unions und exhaustive Checks für Zustände, Events und Ergebnisse bevorzugen.
- Zustandsobjekte nicht unkontrolliert mutieren; Übergänge als klar benannte Funktionen modellieren.
- Domänentypen bilden fachliche Einschränkungen ab, ohne unnötige Typakrobatik.
- Keine nicht-null Assertions oder Typecasts verwenden, um echte Unsicherheit zu verdecken.
- Fehler werden als erwartbare, typisierte Ergebnisse oder als echte unerwartete Ausnahmen behandelt; keine stillen Catch-Blöcke.

## Protokoll- und Sicherheitsstandards

- Jede eingehende Payload auf Form, Größe, Berechtigung, Sitzung, Phase und Wertebereich prüfen.
- Eventnamen, Schemata, Fehlercodes und Protokollversion zentral definieren.
- Verändernde Aktionen tragen eine eindeutige Aktions-ID; der Server verhindert doppelte Wirkung.
- Zustandsnachrichten tragen eine Revision oder einen gleichwertigen Ordnungsmechanismus.
- Spielerspezifische Geheimnisse niemals in gemeinsame Broadcasts aufnehmen.
- Tokens, Zugangsdaten und personenbezogene Daten nicht protokollieren oder committen.
- Namen und sonstige Nutzereingaben sicher ausgeben und begrenzen.
- Keine Sicherheit allein durch ausgeblendete UI oder TypeScript-Typen annehmen.

## Teststrategie

- Jede Fehlerkorrektur erhält nach Möglichkeit zuerst oder gemeinsam einen Regressionstest.
- Regelmodule werden primär mit schnellen Unit-Tests und kontrollierter Uhr/Zufallsquelle geprüft.
- Protokollschemas erhalten Positiv-, Negativ- und Kompatibilitätstests.
- Serverintegrationstests decken mehrere Clients, Berechtigungen, Reihenfolge, Deduplizierung, Timer und Reconnect ab.
- Kritische Nutzerabläufe werden mit Playwright in getrennten TV- und Controller-Kontexten getestet.
- Tests prüfen beobachtbares Verhalten statt interne Implementierungsdetails.
- Keine instabilen Sleeps; auf explizite Zustände oder kontrollierte Zeit warten.
- Geänderte Bereiche lokal mit den kleinsten relevanten Prüfungen testen, vor Abschluss zusätzlich die vereinbarte Gesamtsuite ausführen.
- Tests nicht überspringen, abschwächen oder löschen, nur um einen Build grün zu machen.

## UI- und UX-Regeln

- TV- und Controller-Ansichten als unterschiedliche Nutzungskontexte behandeln.
- Touch-Ziele, Lesbarkeit, Fokus, Kontrast, reduzierte Bewegung und Verbindungszustände von Anfang an berücksichtigen.
- Für Laden, leere Zustände, Fehler, Ablehnung, Timeout und Reconnect explizite UI-Zustände vorsehen.
- Animationen unterstützen Verständnis und dürfen verbindliche Serverzustände nicht vortäuschen.
- Erst nach nachgewiesener semantischer Wiederverwendung gemeinsame UI-Komponenten extrahieren.

## Änderungen an bestehenden Komponenten

- Vor einer Änderung Aufrufer, Tests, öffentliche Schnittstellen und Dokumentation ermitteln.
- Bestehendes Verhalten nur verändern, wenn der Auftrag dies verlangt oder ein bestätigter Fehler vorliegt.
- Rückwärtsinkompatible Protokolländerungen ausdrücklich kennzeichnen und versionieren.
- Refactorings vom fachlichen Verhalten trennen, wenn dies Review und Risiko verbessert.
- Tote Pfade erst entfernen, wenn ihre Nichtverwendung geprüft ist.
- Keine großflächige Formatierung oder Umbenennung in sachfremden Dateien.

## Dokumentation und Entscheidungen

- GDD beschreibt bestätigtes Verhalten und markiert offene Regeln sichtbar.
- Architekturänderungen aktualisieren `docs/ARCHITECTURE.md` und relevante Einträge in `docs/DECISIONS.md`.
- Neue blockierende Produktfragen kommen priorisiert in `docs/OPEN_QUESTIONS.md`.
- Roadmap und Akzeptanzkriterien werden angepasst, wenn sich Abhängigkeiten ändern.
- Kommentare erklären Gründe und Invarianten, nicht offensichtliche Syntax.

## Git- und Branch-Konventionen

- Nicht ungefragt auf `main` arbeiten oder dorthin wechseln.
- Keine ungefragten Commits, Pushes, Pull Requests, Tags, Rebases oder Force-Pushes.
- Branches folgen einem zweckbezogenen Muster wie `docs/...`, `feat/...`, `fix/...`, `test/...` oder `chore/...`.
- Commits sollen klein und thematisch geschlossen sein; sofern Commits beauftragt sind, imperative und verständliche Nachrichten verwenden.
- Vor Übergabe `git status` und `git diff` prüfen und nur eigene Änderungen berichten.
- Keine generierten Artefakte, Logs, lokale Umgebungsdateien, Secrets oder Editorzustände committen.

## Umgang mit Fehlern und technischer Schuld

- Ursachen beheben, nicht Symptome durch pauschale Retries, Timeouts oder Typunterdrückung verdecken.
- Erwartbare Fehler erhalten stabile Codes und nutzbare Meldungen.
- Unerwartete Fehler mit ausreichend Kontext, aber ohne Geheimnisse, diagnostizierbar machen.
- Technische Schuld nicht still einführen. Falls sie zur Einhaltung eines Auftrags unvermeidbar ist, Umfang, Grund, Risiko und konkreten Folgepunkt dokumentieren.
- Sicherheits-, Datenverlust- und Zustandskonsistenzprobleme blockieren die Fertigmeldung.

## Abschlusscheck

Vor Abschluss einer Änderung:

1. Umfang und Akzeptanzkriterien erneut prüfen.
2. Relevante Tests, Typecheck und statische Prüfungen ausführen.
3. Diff auf Fremdänderungen, Geheimnisse, Debugreste und unnötige Komplexität prüfen.
4. Dokumentation und offene Fragen aktualisieren.
5. Im Abschlussbericht geänderte Dateien, Ergebnis, Prüfungen und verbleibende Risiken nennen.
