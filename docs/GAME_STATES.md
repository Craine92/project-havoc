# Project Havoc – Spielzustände und Übergänge

## Zweck

Dieses Dokument übersetzt das rekonstruierte Rune-Riot-Verhalten in ein technologieunabhängiges Zustandsmodell für Project Havoc. Es beschreibt Fachzustände, keine zu kopierende Implementierung. Quellenkürzel entsprechen `docs/GDD.md`.

## Ebenen des Zustandsmodells

Project Havoc trennt drei gleichzeitig relevante Ebenen:

1. **Sitzung:** Existenz, Lobby, laufende Partie, Ergebnis und Ende des Raums
2. **Zug:** normale Aktion oder eine ausstehende Folgeentscheidung
3. **Chaos-Unterzustand:** Zeitereignis oder Ziehstrafenreaktion

Nur der Server ändert diese Zustände. Clients übermitteln Intents.

## Sitzungszustände

| Zustand | Bedeutung | Erlaubte Hauptaktionen | Übergang |
| --- | --- | --- | --- |
| `ROOM_CREATED` | Privater Raum existiert; Display kann verbinden. | Display verbinden, Spieler beitreten | automatisch zu `LOBBY` beim ersten Snapshot |
| `LOBBY` | Namen, Verbindungen, Ready und Modus werden verwaltet. | beitreten, reconnecten, umbenennen, Ready ändern, Modus wählen, Spieler entfernen, starten, Raum schließen | `STARTING`, wenn Host gültig startet; `CLOSED`, wenn Host schließt |
| `STARTING` | Roster wird eingefroren, Deck erzeugt und ausgeteilt. | keine Client-Spielaktion | `PLAYING`, sobald Initialzustand atomar erstellt ist; bei Fehler zurück zu `LOBBY` |
| `PLAYING` | Autoritative Classic- oder Chaos-Partie läuft. | nur zum Zug-/Chaos-Zustand passende Intents | `FINISHED` bei leerer Hand oder Chaos-Zeitentscheidung |
| `FINISHED` | Gewinner und Gewinnart stehen fest. | zur Lobby zurückkehren, Raum schließen | `LOBBY` oder `CLOSED` |
| `CLOSED` | Sitzung ist beendet und nicht mehr beitretbar. | keine | terminal |

Startbedingung im beobachteten Couch-Verhalten: 2–8 verbundene Spieler und alle verbundenen, gesetzten Spieler bereit; nur die authentifizierte Display-Hostrolle darf starten. [D/I: RR-COUCH-DOC, RR-ROOM]

## Zugzustände

Die Bezeichnungen sind Project-Havoc-Fachnamen. In Klammern steht der entsprechende Referenzzustand, sofern vorhanden.

| Zustand | Aktiver Entscheider | Gültige Aktionen | Übergangsbedingung |
| --- | --- | --- | --- |
| `DEALING` | Server | keine | Austeilen und Startkarte beendet → `TURN_ACTION` |
| `TURN_ACTION` (`WAITING_FOR_ACTION`) | aktiver Spieler | passende Karte spielen, ziehen, Ruf; in Chaos verwendbaren Schatz einsetzen | Karte oder Zug wird aufgelöst |
| `DRAWN_CARD_DECISION` (`CHOOSING_DRAWN_CARD`) | aktiver Spieler | ausschließlich frisch gezogene Karte spielen oder behalten | spielen → Kartenauflösung; behalten → nächster Zug |
| `COLOR_CHOICE` (`CHOOSING_COLOR`/`CHOOSING_DRAWN_WILD_COLOR`) | aktiver Spieler | Rot, Blau, Grün oder Gelb wählen | gewählte Farbe anwenden, dann Kartenauflösung |
| `DRAW4_DECISION` (`AWAITING_DRAW4_CHALLENGE`) | betroffenes Opfer | +4 annehmen oder anfechten | Strafe auflösen; gegebenenfalls Spielende nach letzter +4 |
| `CHAOS_TARGET_CHOICE` | aktiver Spieler | anderes aktives Ziel wählen | Chaos-Karte atomar auflösen |
| `CHAOS_REACTION` (`AWAITING_CHAOS_REACTION`) | betroffenes Opfer | Schild, Spiegel, Schatzschild oder ablehnen | erste gültige Reaktion oder Timeout schließt Zustand |
| `UNO_CATCH_WINDOW` | parallel; andere aktive Spieler | versäumten Ruf melden | Fang, Ruf oder acht Sekunden schließen Fenster |
| `CHAOS_EVENT` | alle beziehungsweise ausgewählter Gewinner | zur Ereignisphase passende Entscheidung | alle fertig oder 12-Sekunden-Timeout → Ergebnis |
| `CHAOS_EVENT_RESULT` | Server/Anzeige | keine | vier Sekunden → vorheriger stabiler Zugzustand |
| `GAME_OVER` | Server | keine Gameplay-Aktion | Sitzung wechselt zu `FINISHED` |

Die Referenz enthält weitere Zustände für den nicht beauftragten Mercy-Modus (`CHOOSING_PLAYER_TO_SWAP`, `ROULETTE_DRAWING`, `CHOOSING_ROULETTE_COLOR`, `CHOOSING_DISCARD_ALL_TOP`, `STACKING_RESPONSE`). Diese gehören nicht zum rekonstruierten Classic-/Chaos-Zielkern und werden für Project Havoc nicht vorab eingeplant. [I: RR-TYPES]

## Normaler Classic-Zug

```text
TURN_ACTION
├─ gültige normale Karte ─> Wirkung ─> nächster TURN_ACTION
├─ Skip/Reverse ──────────> Wirkung ─> bestimmter nächster TURN_ACTION
├─ +2 ────────────────────> Opfer zieht 2 und setzt aus ─> nächster TURN_ACTION
├─ Wild ──────────────────> COLOR_CHOICE ─> nächster TURN_ACTION
├─ Wild +4 ───────────────> COLOR_CHOICE ─> DRAW4_DECISION ─> nächster TURN_ACTION
└─ Ziehen
   ├─ unspielbar ─────────> nächster TURN_ACTION
   └─ spielbar ───────────> DRAWN_CARD_DECISION
                            ├─ spielen ─> reguläre Kartenauflösung
                            └─ behalten ─> nächster TURN_ACTION
```

Leert die gespielte Karte die Hand, wechselt das Spiel grundsätzlich zu `GAME_OVER`. Bei letzter +2/+4 wird der Gewinner vorgemerkt und erst nach vollständiger Strafe bestätigt. [I: RR-GAME]

## Chaos-Kartenübergänge

| Karte | Ausgang | Zwischenschritte | Abschluss |
| --- | --- | --- | --- |
| Schicksalstausch | `TURN_ACTION` | Farbe und Ziel müssen feststehen; Karte entfernen; Hände tauschen | Sieg nur, wenn der Ausspielende nach dem Tausch leer ist; sonst nächster Zug |
| Würfelfluch | `TURN_ACTION` | Farbe/Ziel; Server-W6; optional `CHAOS_REACTION` | Ziel zieht 1–6 oder Strafe wird blockiert/umgeleitet; vorgemerkten Sieg prüfen |
| Runenwirbel | `TURN_ACTION` | Farbe; alle aktiven Hände gleichzeitig rotieren | Sieg nur anhand des Zustands nach Rotation prüfen; nächster Zug |
| Runenschild | `CHAOS_REACTION` | Karte verbrauchen | Strafe entfällt; Fortsetzungszustand wiederherstellen |
| Fluchspiegel | `CHAOS_REACTION` | Karte und anderes Ziel wählen | Ziel zieht volle Strafe ohne weitere Reaktion; Fortsetzungszustand wiederherstellen |

## Chaos-Ereignisautomat

### Fälligkeit

- Erstes Ereignis: drei Minuten nach Partiestart.
- Weiteres Ereignis: drei Minuten nach dem Ende des vorherigen Ergebnisfensters.
- Fälligkeit unterbricht keinen laufenden Zug oder Entscheidungszustand.
- Start nur an einer stabilen `TURN_ACTION`-Grenze ohne Reaktion.

### Phasen je Ereignis

| Ereignis | Startphase | Folgephase | Ergebnisbedingung |
| --- | --- | --- | --- |
| Schatztruhe | `ROLLING` | keine | alle Würfe/Timeout; Höchstwurf und Fähigkeit bestimmt |
| Goblin-Handel | `SELECT_CARD` | keine | alle Karten/Timeout; simultane Weitergabe |
| Runenprüfung | `ROLLING` | `SELECT_CARD` für Würfe 4–6 mit >1 Karte | alle Berechtigten fertig/Timeout |
| Orakelblick | `SELECT_PLAYER` | keine | alle Ziele/Timeout; private Karten bestimmt |
| Sturm der Farben | `ROLLING` | `SELECT_COLOR` durch Höchstwurf | Farbe gewählt/Timeout |
| Drachenfluch | `ROLLING` | keine | alle Würfe/Timeout; Höchst-/Tiefstwirkung ausgeführt |

Jede aktive Entscheidungsphase dauert zwölf Sekunden. Danach ergänzt der Server fehlende Entscheidungen. `RESOLVED` bleibt vier Sekunden sichtbar und kehrt danach zum gespeicherten Zugzustand zurück. [D/I: RR-CHAOS-DOC, RR-CHAOS]

## Chaos-Gesamtuhr

```text
00:00  Chaos-Partie startet
03:00  erstes Ereignis wird fällig; tatsächlicher Start an nächster stabiler Zuggrenze
20:00  Finalphase; Schatztruhe und Drachenfluch werden nicht mehr neu gestartet
25:00  harte Serverdeadline
        ├─ offenes Ereignis automatisch vervollständigen
        ├─ offene Reaktion ablehnen und auflösen
        └─ Gewinner bestimmen → GAME_OVER
```

Zeitgewinner: wenigste Karten, danach niedrigste Kartenwertsumme, danach serverseitiges W6-Stechen. [D/I/T: RR-CHAOS-DOC, RR-CHAOS, RR-CHAOS-TEST]

## Disconnect-Zustand

Verbindung ist ein Attribut eines Sitzes, kein eigener Spielzustand.

- Nicht aktiver Spieler getrennt: Partie läuft weiter; vollständiger Snapshot bei Reconnect.
- Aktiver Spieler getrennt: 20-Sekunden-Serverfrist.
- Reconnect vor Frist: Timer entfernen, Zustand unverändert fortsetzen.
- Frist abgelaufen: offene Pflichtentscheidung sicher automatisch auflösen; ansonsten minimal ziehen und Zug weitergeben.
- Ausdrückliches Verlassen in der Lobby entfernt den Sitz; während der Partie bleibt er reconnectbar.

[I: RR-ROOM, RR-GAME]

## Invarianten

- Genau eine Sitzung besitzt höchstens eine aktive Partie.
- Jede Partie besitzt genau einen kanonischen Serverzustand und eine monoton steigende Revision.
- Höchstens ein normaler Spieler ist gleichzeitig am Zug.
- Ein aktives Chaos-Ereignis sperrt normale Spiel- und Schatzaktionen.
- Ein aktives Reaktionsfenster akzeptiert ausschließlich Aktionen des betroffenen Spielers.
- Private Hände, geheime Auswahlen und Orakelinformationen erscheinen nie in der TV-Projektion.
- Ein Timeout ist ein serverseitiges Ereignis und wird in derselben seriellen Reihenfolge wie Spieleraktionen verarbeitet.
- Nach `GAME_OVER` sind alle Gameplay-Intents ungültig.

## Noch nicht festgelegte Übergänge

- Genaue Behandlung einer Wild-Startkarte
- Atomarer Zeitpunkt des UNO-/Havoc-Rufs
- Classic als Einzelrunde oder Match mit Zielpunktzahl
- Produktentscheidung, ob der prototypische 20-Sekunden-Disconnect-Autozug unverändert bleibt
- Ereignisreihenfolge beziehungsweise Zufallsgewichtung im finalen Chaos-Regelwerk
