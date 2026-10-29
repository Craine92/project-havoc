# Auftrag: Chaos-Modus komplett ausbauen

> **Für Claude Code in VS Code.** Diese Datei ist ein fertiger Arbeitsauftrag.
> Start-Prompt: *„Lies docs/NEXT_CHAOS_EXPANSION.md und AGENTS.md und setz Paket 1 um.“*
> Danach Paket für Paket weitermachen, jeweils mit Tests und eigenem Commit.

## Ausgangslage

Branch `feat/chaos-light-friday` enthält eine spielbare „Chaos-Light“-Version:

- Regeln: `packages/rules-chaos/src/engine.ts` (reine Funktionen, Zeit und Zufall injiziert)
- Texte und Erklärungen: `packages/rules-chaos/src/labels.ts` (**einzige Quelle für Karten- und Ereignistexte**)
- Server-Anbindung: `apps/server/src/dispatcher.ts` (`game.action`, `game.rematch`, `game.snapshot`, Ticker alle 400 ms)
- Handy: `apps/controller/src/game/GameScreen.tsx`
- TV: `apps/tv/src/game/TvGameScreen.tsx`
- Erklärungen auf TV und Handy: `ChaosGuide.tsx` (in beiden Apps als identische Kopie)
- Assets: `apps/tv/public/assets/` (Controller nutzt denselben Ordner über `publicDir`), Liste in `assets/README.md`, Prüfung mit `npm run assets:check`

Bewusst vereinfacht und jetzt nachzurüsten: siehe Pakete unten. Die Vorlage ist `docs/GDD.md`, Abschnitt „Chaos-Modus“.

## Arbeitsregeln

- Neuer Branch von `feat/chaos-light-friday`, z. B. `feat/chaos-full`.
- `AGENTS.md` gilt. Keine Regeln erfinden: Was nicht hier oder im GDD steht, als Frage in `docs/OPEN_QUESTIONS.md` notieren.
- Thema: Karibik-Piraten mit **eigenen** Namen. Keine Namen oder Figuren aus „Fluch der Karibik“.
- Jede neue Karte und jedes neue Ereignis bekommt in `labels.ts` einen Namen, ein Icon und **eine kurze Erklärung** (1–2 Sätze, Du-Form, verständlich für Leute, die nur Uno kennen). `ChaosGuide`, TV-Einblendung und Handy zeigen diese Texte automatisch.
- Jede neue Karte/jedes neue Ereignis bekommt einen Eintrag in `apps/tv/public/assets/README.md` (Dateiname, Größe, Erklärung, ChatGPT-Prompt im gemeinsamen Stil) und in `scripts/check-assets.ts`. Bilder werden wie bestehende Kartenbilder optional geladen (Fallback auf Icon).
- Die bestehende 300-Partien-Simulation in `engine.test.ts` muss weiter grün sein und die neuen Mechaniken mit abdecken.
- Vor jedem Commit: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

## Paket 1 – Ereignisse mit Auswahl auf dem Handy

Neuer Zug-Zustand `event-choice` mit 12-Sekunden-Frist; fehlende Auswahl wählt der Server zufällig (siehe GDD „Ereignis-Timeouts“). Normale Züge sind währenddessen gesperrt.

| Neuer Name | GDD-Vorbild | Ablauf |
| --- | --- | --- |
| Tauschhandel | Goblin-Handel | Jeder wählt geheim eine Handkarte, danach wandern alle gleichzeitig zum Nachbarn. Ersetzt die zufällige „Plünderung“. |
| Fernrohr | Orakelblick | Jeder wählt einen Gegner, der Server zeigt nur ihm eine zufällige Karte davon. Ersetzt die zufällige „Flaschenpost“. |
| Sturm | Sturm der Farben | Alle würfeln, der Höchste **wählt** die neue Farbe (statt Zufall). |
| Planke | Runenprüfung | Alle würfeln, bei 4–6 darf man eine Karte abwerfen (nicht die letzte). |

Handy: Auswahl-Sheet mit Countdown. TV: wer schon gewählt hat (ohne Inhalt zu verraten), Würfelergebnisse.
Protokoll: neue `game.action`-Variante `event-choice` mit Karte, Ziel oder Farbe.

## Paket 2 – Schatztruhe und Schatzfähigkeiten

Ereignis „Schatztruhe“ aus dem GDD: Alle würfeln, der eindeutige Höchste bekommt zufällig eine Fähigkeit (max. eine pro Spieler):

- **Kaperbrief:** Gegner zieht 3 (im eigenen Zug, kann abgewehrt werden)
- **Über Bord:** eine eigene Karte abwerfen (nicht die letzte, kein direkter Sieg)
- **Schutzpatron:** eine Ziehstrafe blockieren (im Reaktionsfenster, wie Rettungsring)

Handy: Fähigkeit als goldener Knopf mit Erklärung. TV: Truhen-Symbol am Sitz.
Finalphase: Schatztruhe und Kraken werden ab Minute 20 nicht mehr gestartet (GDD).

## Paket 3 – Breitseite anfechten

Klassische +4-Anfechtung aus dem GDD: Das Opfer kann die Breitseite annehmen oder anfechten. War sie unerlaubt, zieht der Leger 4; sonst zieht das Opfer 6. Reihenfolge mit Rettungsring/Rückschlag laut GDD-Reaktionsmechanik Punkt 7.

## Paket 4 – Feinschliff

- Ereignis-Reihenfolge und Balancing prüfen (Simulation: Ø Partiedauer, wie oft gewinnt die Zeit?)
- Animation, wenn Karten zwischen Spielern wandern (Meuterei, Strudel, Tauschhandel)
- Sound-Hooks für neue Ereignisse in `apps/tv/src/game/audio.ts`
- Playwright-E2E: TV + 2 Handys spielen eine Partie mit beschleunigter Uhr (`HAVOC_EVENT_SECONDS`)

## Offene Fragen an Phil (vor Paket 1 klären)

1. Sollen die zufälligen Varianten (Plünderung, Flaschenpost) ganz ersetzt werden oder zusätzlich bleiben?
2. Bleiben die Chaos-Karten bei je 3 Kopien?
3. Neue Chaos-Karten gewünscht? Ideen: „Schatzkarte“ (sieh dir eine ganze Gegnerhand an), „Flaute“ (nächster Spieler muss ziehen statt legen).
