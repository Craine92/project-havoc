# Project Havoc – Aktionskatalog

## Konventionen

Der Katalog beschreibt fachliche Intents. Namen sind noch keine verbindlichen Netzwerk-Eventnamen. Jede Aktion benötigt eine eindeutige Aktions-ID und wird serverseitig auf Form, Rolle, Sitzung, Phase, Akteur, Ziel, Wertebereich und Wiederholung geprüft.

Erwartete Ablehnungsgruppen:

- `INVALID_PAYLOAD`: Form, Länge oder Wertebereich ungültig
- `NOT_AUTHORIZED`: Rolle oder Identität unzulässig
- `WRONG_PHASE`: Sitzung oder Zug in anderem Zustand
- `NOT_YOUR_TURN`: Spieler ist nicht der aktuelle Entscheider
- `INVALID_TARGET`: Ziel fehlt, ist der Akteur, ausgeschieden oder anderweitig unzulässig
- `ACTION_NOT_ALLOWED`: Karte/Fähigkeit/Aktion erfüllt die Regel nicht
- `DUPLICATE_ACTION`: Aktions-ID bereits verarbeitet
- `STALE_REVISION`: Aktion basiert auf einem nicht mehr gültigen Zustand

## Sitzungs- und Lobbyaktionen

| Aktion | Akteur | Voraussetzungen | Serverwirkung | Typische Fehler | Referenz |
| --- | --- | --- | --- | --- | --- |
| Raum erstellen | TV-Host | gültige Hostidentität; Erstellrate erlaubt | private Sitzung mit Raumcode und Hostberechtigung anlegen | Rate Limit, Erzeugungsfehler | D/I: RR-COUCH-DOC, RR-ROOM |
| Display verbinden | TV-Host | Raum existiert; gültige Hostberechtigung | öffentliche Displayprojektion verbinden; kein Spielersitz | falscher Host, Raum beendet | D/I: RR-COUCH-DOC, RR-ROOM |
| Spieler beitreten | Smartphone | Lobby oder bestehender eigener Sitz; gültiger Name/Join-Nachweis | neuen Sitz bis Limit 8 anlegen oder eigenen Sitz reconnecten | Raum voll, Name ungültig/belegt, Raum beendet | D/I/T: RR-SEATS, RR-VALIDATE, RR-ROOM |
| Namen ändern | Smartphone-Spieler | `LOBBY`; 2–16 Unicode-Codepoints; eindeutig | Anzeigename aktualisieren und verteilen | falsche Phase, ungültig, Duplikat | D/I: RR-COUCH-DOC, RR-VALIDATE |
| Ready setzen | Smartphone-Spieler | `LOBBY`; eigener Sitz | Ready-Flag setzen oder entfernen | falsche Phase/Rolle | D/I: RR-ROOM |
| Modus wählen | Display-Host | `LOBBY`; `classic` oder `chaos` | Modus für nächste Partie speichern | falscher Host/Phase/Modus | D/I: RR-CHAOS-DOC, RR-ROOM |
| Spieler entfernen | Display-Host | `LOBBY`; Ziel ist Spieler | Sitz entfernen und Verbindung schließen | falscher Host/Phase/Ziel | I: RR-ROOM |
| Partie starten | Display-Host | `LOBBY`; 2–8 verbundene Spieler; alle gesetzt und ready | Roster einfrieren, Deck erzeugen, austeilen, `PLAYING` | zu wenige Spieler, nicht alle ready, doppelt gestartet | D/I: RR-COUCH-DOC, RR-ROOM |
| Zur Lobby | Display-Host | `FINISHED` | Partie entfernen; Ready zurücksetzen; Roster behalten | falscher Host/Phase | I: RR-ROOM |
| Raum schließen | Display-Host | Raum aktiv | Clients informieren, Sitzung schließen | falscher Host | I: RR-ROOM |
| Reconnect | Display oder Spieler | gültige bestehende Berechtigung | Verbindung ersetzen/ergänzen; vollständigen rollenbezogenen Snapshot senden | Token ungültig/abgelaufen, Raum beendet | D/I: RR-COUCH-DOC, RR-ROOM |

## Gemeinsame Gameplay-Aktionen

| Aktion | Voraussetzungen und Validierung | Auswirkung | Fehlerfälle | Referenz |
| --- | --- | --- | --- | --- |
| Karte spielen | `TURN_ACTION`; eigener Zug; Karte in eigener Hand; Karte passt; benötigte Farbe/Ziel vorhanden | Karte entfernen, auf Ablage legen, Wirkung ausführen, Sieg/Ruf prüfen | fremde/unbekannte/unpassende Karte, falscher Zug, fehlende Auswahl | D/I: RR-RULES, RR-RULE-IMPL, RR-GAME |
| Karte ziehen | `TURN_ACTION`; eigener Zug | Classic/Chaos: exakt eine Karte; danach `DRAWN_CARD_DECISION`, falls spielbar, sonst Zugende | falscher Zug/Phase | D/I: RR-RULES, RR-GAME |
| Gezogene Karte spielen | `DRAWN_CARD_DECISION`; exakt die markierte Karte; weiterhin regelkonform | wie normales Spiel; keine andere Handkarte zulässig | andere Karte, veraltete Entscheidung, fehlende Farbe | I: RR-GAME |
| Gezogene Karte behalten | `DRAWN_CARD_DECISION`; exakt eine Entscheidung offen | Karte behalten, Zug beenden | falscher Zug/Phase, keine gezogene Karte | I: RR-GAME |
| Farbe wählen | ausstehende Wild-/Chaos-Farbwahl; eine von Rot/Blau/Grün/Gelb | aktive Farbe setzen und Auflösung fortsetzen | `wild` oder unbekannter Wert, falscher Entscheider | D/I: RR-RULES, RR-VALIDATE, RR-GAME |
| +4 annehmen | `DRAW4_DECISION`; Akteur ist Opfer | vier Karten ziehen, Opfer setzt aus, ggf. vorgemerkten Sieg bestätigen | kein offenes +4, falsches Opfer | D/I: RR-RULES, RR-GAME |
| +4 anfechten | `DRAW4_DECISION`; Akteur ist Opfer | legal: Opfer zieht sechs und setzt aus; illegal: Täter zieht vier, Opfer behält Zug | kein offenes +4, falsches Opfer, doppelte Entscheidung | D/I: RR-RULES, RR-GAME |
| Ruf abgeben | eigener aktiver Sitz; Referenz erlaubt höchstens zwei Handkarten | Rufstatus setzen und Fangfenster verhindern/schließen | zu viele Karten, ausgeschieden | D/I: RR-RULES, RR-GAME |
| Rufversäumnis fangen | achtsekündiges Fenster; anderer aktiver Spieler; Ziel hat genau eine Karte und nicht gerufen | Ziel zieht zwei Karten | eigenes Ziel, Fenster abgelaufen, Ziel bereits gerufen/ungeeignet | D/I: RR-ROOM, RR-GAME |

## Wirkungen der Basiskarten

| Karte | Zusätzliche Validierung | Auswirkung |
| --- | --- | --- |
| Zahl | gleiche Farbe oder Zahl | keine zusätzliche Wirkung |
| Skip | gleiche Farbe oder Symbol | nächsten aktiven Spieler überspringen |
| Reverse | gleiche Farbe oder Symbol | Richtung umkehren; bei zwei Spielern Gegner überspringen |
| +2 | gleiche Farbe oder Symbol; keine offene Reaktion außer Chaos-Schutz | Ziel zieht zwei und setzt aus |
| Wild | gültige Farbauswahl | aktive Farbe setzen |
| Wild +4 | gültige Farbauswahl; Legalität anhand vorher aktiver Farbe privat speichern | `DRAW4_DECISION`; in Chaos davor gegebenenfalls `CHAOS_REACTION` |

## Chaos-Kartenaktionen

| Aktion/Karte | Voraussetzungen | Auswirkung | Fehlerfälle | Referenz |
| --- | --- | --- | --- | --- |
| Schicksalstausch spielen | Chaos; eigener Zug; Karte in Hand; andere aktive Zielperson; Farbe | Karte ablegen, Resthände atomar tauschen, neuen Handzustand auf Sieg prüfen | eigenes oder ausgeschiedenes Ziel, fehlende Farbe | D/I/T: RR-CHAOS-DOC, RR-GAME, RR-CHAOS-TEST |
| Würfelfluch spielen | Chaos; eigener Zug; anderes aktives Ziel; Farbe | Server-W6 erzeugt 1–6 Strafe; optional Reaktionsfenster | ungültiges Ziel/Farbe | D/I: RR-CHAOS-DOC, RR-GAME |
| Runenwirbel spielen | Chaos; eigener Zug; Farbe | aktive Hände gleichzeitig in Richtung rotieren | fehlende Farbe, falscher Zug | D/I: RR-CHAOS-DOC, RR-GAME |
| Runenschild einsetzen | Spieler ist Reaktionsziel; konkrete Schildkarte in Hand | Schild verbrauchen, gesamte Strafe verhindern | falsches Ziel, Karte fehlt, Fenster geschlossen | D/I/T: RR-CHAOS-DOC, RR-GAME, RR-CHAOS-TEST |
| Fluchspiegel einsetzen | Spieler ist Reaktionsziel; Spiegel in Hand; anderes aktives Ziel | Spiegel verbrauchen, volle Strafe einmalig umleiten | Ziel ungültig, bereits reflektiert, Fenster geschlossen | D/I/T: RR-CHAOS-DOC, RR-GAME, RR-CHAOS-TEST |
| Chaos-Reaktion ablehnen | Spieler ist Reaktionsziel | Strafe anwenden oder bei +4 zur Anfechtung wechseln | falsches Ziel/Fenster geschlossen | D/I: RR-CHAOS-DOC, RR-GAME |

Runenschild und Fluchspiegel sind keine normalen Zugkarten. Der Server weist einen Versuch zurück, sie regulär auszuspielen. [D/I: RR-CHAOS-DOC, RR-GAME]

## Schatzaktionen

| Aktion | Voraussetzungen | Auswirkung | Fehlerfälle |
| --- | --- | --- | --- |
| „Gegner zieht 3“ | eigener normaler Zug; Fähigkeit vorhanden; anderes aktives Ziel | Fähigkeit verbrauchen; Ziel reagiert gegebenenfalls, sonst zieht es drei; Zug bleibt beim Anwender | ungültiges Ziel, falsche Phase, Fähigkeit fehlt |
| „Eine Karte abwerfen“ | eigener normaler Zug; Fähigkeit vorhanden; gewählte eigene Karte; mindestens zwei Handkarten | Fähigkeit verbrauchen; Karte ablegen; kein direkter Sieg möglich | nur eine Karte, Karte fehlt, falsche Phase |
| „Strafe blockieren“ | eigenes Reaktionsfenster; Fähigkeit vorhanden | Fähigkeit verbrauchen; gesamte Strafe verhindern | kein Reaktionsfenster, falsches Ziel, Fähigkeit fehlt |

[D/I: RR-CHAOS-DOC, RR-GAME]

## Chaos-Ereignisaktionen

| Aktion | Voraussetzungen | Auswirkung | Fehlerfälle |
| --- | --- | --- | --- |
| W6 würfeln | aktives Ereignis in `ROLLING`; eigener Status `waiting` | Server erzeugt W6, Status `done`; bei allen fertig nächste Phase/Auflösung | doppelt, falsche Phase, nicht beteiligt |
| Ereigniskarte wählen | Goblin-Handel `waiting` oder Runenprüfung `eligible`; Karte in eigener Hand; bei Runenprüfung >1 Karte | geheime Auswahl speichern; erst gemeinsam auflösen | fremde Karte, nicht berechtigt, letzte Karte bei Runenprüfung |
| Ereignisziel wählen | Orakelblick; anderes aktives Ziel mit mindestens einer Karte | geheimes Ziel speichern; private zufällige Karte nach Gesamtauflösung | eigenes/leeres/ausgeschiedenes Ziel |
| Ereignisfarbe wählen | Sturm der Farben; Akteur ist eindeutiger Gewinner | aktive Farbe setzen, Ergebnisphase beginnen | falscher Spieler, `wild`, falsche Phase |

Nach zwölf Sekunden ersetzt der Server jede fehlende gültige Entscheidung durch eine zufällige, regelkonforme Auswahl. [D/I: RR-CHAOS-DOC, RR-CHAOS]

## Automatische Serveraktionen

| Aktion | Auslöser | Wirkung |
| --- | --- | --- |
| Ruf-Fenster schließen | acht Sekunden | Fangmöglichkeit entfernen |
| Getrennten Zug auflösen | aktiver Spieler 20 Sekunden getrennt | Pflichtstrafe/-auswahl automatisch; sonst minimal ziehen und weitergeben |
| Chaos-Reaktion ablehnen | zwölf Sekunden | als explizite Ablehnung behandeln |
| Ereignisentscheidung ergänzen | zwölf Sekunden | faire Serverauswahl für alle offenen Teilnehmer |
| Ereignisergebnis schließen | vier Sekunden | vorherigen Zugzustand wiederherstellen; nächsten Ereignistermin setzen |
| Finalphase aktivieren | Minute 20 | Schatztruhe/Drachenfluch für neue Ereignisse sperren |
| Chaos-Zeitentscheidung | Minute 25 | offene Arbeit abschließen; Gewinner serverseitig bestimmen; Spiel beenden |

## Alpha-0.1-relevanter Ausschnitt

Alpha 0.1 implementiert nur Raum erstellen, Display verbinden, Spieler beitreten/reconnecten, Namen, Ready, Moduswahl als vorbereitete Lobbyinformation und Hoststart bis zu einem bestätigten Start-/Platzhalterzustand. Keine Karten-, Ruf-, Chaos-, Schatz- oder Ereignisaktion gehört in Alpha 0.1.
