# Project Havoc – Game Design Document

## Dokumentstatus

- Stand: Auftrag 002 – Regelrekonstruktion für Alpha 0.1
- Ziel: eigenständige Neuentwicklung des in Rune Riot beobachteten Couch-Spielkonzepts
- Regel: Quellcode, Komponenten, Assets und Implementierungen aus Rune Riot werden nicht übernommen. Die Referenz dient ausschließlich zum Verständnis des Verhaltens.

## Quellenmodell

Jede rekonstruierte Regel ist nach ihrer Herkunft eingeordnet:

- **D – dokumentiert:** ausdrücklich in einer Regel- oder Projektdokumentation beschrieben
- **I – implementiert:** aus dem tatsächlich vorhandenen Verhalten der Referenzimplementierung abgeleitet
- **T – getestet:** durch einen automatisierten Test als erwartetes Verhalten belegt
- **Offen:** widersprüchlich, unvollständig oder nicht als Zielregel für Project Havoc bestätigt

Quellen werden relativ zum Referenzprojekt `C:\Users\shark\Desktop\Rune-Riot\Rune-Riot` angegeben. Die wichtigsten Referenzen sind:

| Kürzel | Referenzdatei | Verwendung |
| --- | --- | --- |
| RR-RULES | `RULES-REFERENCE.md` | veröffentlichte Classic- und No-Mercy-Regelbeschreibung |
| RR-CHAOS-DOC | `docs/alpha-0.4-chaos-prototype-report.md` | dokumentiertes Chaos-Konzept |
| RR-COUCH-DOC | `docs/alpha-0.3-couch-mode-report.md` | Lobby-, TV-, Smartphone- und Host-Konzept |
| RR-TYPES | `shared/engine/types.ts` | Karten-, Spiel- und Zugzustände |
| RR-DECK | `shared/engine/deck.ts` | Deckzusammensetzung |
| RR-RULE-IMPL | `shared/engine/rules.ts` | Spielbarkeit, Wertung, Mercy- und Rotationsregeln |
| RR-ENGINE | `shared/engine/engine.ts` | Kartenauflösung und Zustandsübergänge |
| RR-PROTOCOL | `shared/protocol.ts` | Intents, Events und sichtbare Zustandsprojektionen |
| RR-GAME | `game-server/src/game.ts` | serverautoritative Classic-/Chaos-Aktionen |
| RR-CHAOS | `game-server/src/chaos.ts` | Chaos-Ereignisse, Timer und Zeitentscheidung |
| RR-ROOM | `game-server/src/index.ts` | Sitzung, Host, Ready, Reconnect und Timer |
| RR-SEATS | `game-server/src/seats.ts` | Spielerlimits und Wiederbelegung |
| RR-VALIDATE | `game-server/src/validate.ts` | Namens- und Eingabevalidierung |
| RR-ENGINE-TEST | `shared/engine/__tests__/engine.test.ts` | Engine-Verhaltensnachweise |
| RR-GAME-TEST | `game-server/src/game.test.ts` | Server- und Datenschutztests |
| RR-CHAOS-TEST | `game-server/src/chaos.test.ts` | Chaos-Regel- und Timertests |
| RR-UI-TV | `frontend/src/components/couch/CouchHost.vue` | tatsächlich sichtbare TV-Informationen |
| RR-UI-PHONE | `frontend/src/components/couch/CouchController.vue` | Smartphone-Aktionen und private Informationen |

Wo Dokumentation und Implementierung abweichen, beschreibt dieses GDD beides und legt keine neue Regelentscheidung fest.

## Spielvision

Project Havoc ist ein browserbasiertes lokales Multiplayer-Partyspiel. Ein gemeinsamer PC oder Fernseher zeigt den öffentlichen Spieltisch. Zwei bis acht Menschen verwenden ihre Smartphones ohne Installation als private Controller. Das gemeinsame Spiel soll schnell verständlich, reaktionsstark, überraschend und sozial lesbar sein. [D: RR-COUCH-DOC]

Project Havoc übernimmt das rekonstruierte Gameplay-Konzept, entsteht aber als unabhängige TypeScript-/React-/Node-Codebasis mit eigener visueller Identität. Namen, Quellcode, Komponenten, Assets und Implementierungsdetails aus Rune Riot sind keine Produktionsgrundlage.

## Modusabgrenzung

Die Referenzimplementierung kennt technisch drei Regelsätze: `mercy`, `classic` und `chaos`. Der Couch Mode bietet **Classic** und **Chaos** an; der ältere `mercy`-Regelsatz gehört zu einem separaten Online-/Bestandspfad. [I: RR-TYPES, RR-ROOM] Auftrag 002 verlangt die Rekonstruktion von Classic und Chaos. Ob ein dritter Mercy-Modus später Teil von Project Havoc wird, bleibt eine bewusste Produktentscheidung.

## Zielgruppe und Nutzungskontext

- Lokale Gruppen mit zwei bis acht Spielenden [D/I: RR-COUCH-DOC, RR-SEATS]
- Gemeinsamer TV-/PC-Bildschirm als öffentlicher Mittelpunkt
- Persönliche Smartphones für Handkarten, Auswahl und Reaktionen
- Browserbeitritt per QR-Code oder sichtbarer URL/Raumcode
- Kurze Einstiegshürde ohne Installation

Alterszielgruppe, unterstützte Sprachen, offizielle Geräte-/Browsermatrix und Barrierefreiheitsniveau sind noch nicht festgelegt.

## Sitzungs- und Lobbyablauf

1. Der Host öffnet die TV-Oberfläche und erstellt einen privaten Couch-Raum.
2. Der Server weist einen Raumcode zu; der TV zeigt QR-Code, Raumcode und vollständigen Beitrittslink.
3. Smartphones treten mit stabiler serverseitiger Benutzeridentität und Anzeigename bei.
4. Namen müssen 2–16 Unicode-Codepoints lang sein. Whitespace wird normalisiert; Namen sind nach Unicode-Normalisierung ohne Beachtung der Groß-/Kleinschreibung eindeutig. [D/I/T: RR-COUCH-DOC, RR-VALIDATE, `game-server/src/validate.test.ts`]
5. Jeder Smartphone-Spieler setzt seinen Ready-Status.
6. Der TV-Host wählt Classic oder Chaos.
7. Start ist nur durch die verifizierte Display-Rolle möglich, wenn mindestens zwei Spieler verbunden und alle für den Start berücksichtigten verbundenen Spieler bereit sind. [D/I: RR-COUCH-DOC, RR-ROOM]
8. Nur verbundene Spieler werden für die neue Partie gesetzt; der TV belegt keinen Spielersitz.
9. Nach dem Ergebnis kann der Host im selben Raum in die Lobby zurückkehren und eine neue Partie starten.

Der Host darf in der Lobby Spieler entfernen, aber nicht während einer laufenden Couch-Partie. Er kann den Raum schließen oder nach Partieende zur Lobby zurückkehren. [I: `game-server/src/couchHostActions.ts`, RR-ROOM]

## Gemeinsame Spielgrundlage

Classic und Chaos verwenden dieselben Basisregeln. Chaos ergänzt sie um fünf Karten, sechs Ereignistypen, Reaktionen und ein Zeitlimit.

### Vorbereitung

- Sitzreihenfolge entspricht der Beitrittsreihenfolge. [I: RR-GAME]
- Jeder Spieler erhält sieben Karten. [D/I: RR-CHAOS-DOC, RR-GAME]
- Startreihenfolge ist zunächst vorwärts; der Spieler an Sitz 0 beginnt, sofern die offene Startkarte dies nicht verändert. [I: RR-GAME, RR-ENGINE]
- Eine Nicht-Wild-Karte wird als erste Ablage aufgedeckt. Wild-Karten werden zurückgemischt, bis eine farbige Karte gezogen wurde. [I: RR-ENGINE]
- Eine offene Skip-Karte überspringt den ersten Spieler. Reverse dreht bei mindestens drei Spielern die Richtung; bei zwei Spielern wird der erste Spieler übersprungen. Eine offene +2 erzeugt unmittelbar die entsprechende Ziehstrafe. [I: RR-ENGINE]

Die Behandlung einer Wild-Karte als erste Ablage ist in der allgemeinen Regelreferenz anders beziehungsweise nur teilweise beschrieben und wird unter „Konflikte“ geführt.

### Normaler Zug

Ein Spieler darf genau eine passende Karte spielen oder freiwillig ziehen. Eine Karte ist passend, wenn mindestens eine Bedingung erfüllt ist:

- ihre Farbe entspricht der aktiven Farbe,
- ihre Zahl entspricht der obersten Zahl,
- ihr Aktionssymbol entspricht dem obersten Aktionssymbol,
- sie ist eine als normal spielbar definierte Wild-Karte.

[D/I: RR-RULES, RR-RULE-IMPL]

Nach einem freiwilligen Zug wird in Classic und Chaos genau eine Karte gezogen:

- Ist sie nicht spielbar, endet der Zug.
- Ist sie spielbar, darf ausschließlich diese frisch gezogene Karte gespielt oder behalten werden; beim Behalten endet der Zug.
- Benötigt sie eine Farbauswahl, wartet der Server auf diese Auswahl.

[D/I: RR-RULES, RR-GAME]

### Basiskarten

| Karte | Rekonstruierte Wirkung | Quellenstatus |
| --- | --- | --- |
| Zahl 0–9 | Keine Zusatzwirkung in Classic/Chaos; wird über Farbe oder gleiche Zahl gespielt. | D/I: RR-RULES, RR-ENGINE |
| Skip | Überspringt den nächsten aktiven Spieler. | D/I: RR-RULES, RR-ENGINE |
| Reverse | Kehrt die Spielrichtung um; bei zwei Spielern wirkt sie wie Skip. | D/I: RR-RULES, RR-ENGINE |
| +2 | Der nächste Spieler zieht zwei Karten und setzt aus. In Classic/Chaos nicht stapelbar. | D/I: RR-CHAOS-DOC, RR-RULE-IMPL, RR-GAME |
| Wild | Auf jede Karte spielbar; der Ausspielende wählt eine der vier aktiven Farben. | D/I: RR-RULES, RR-GAME |
| Wild +4 | Farbe wählen; der nächste Spieler muss annehmen oder anfechten. In Classic/Chaos nicht stapelbar. | D/I: RR-RULES, RR-GAME |

### Wild-+4-Prüfung

- +4 gilt als legal, wenn der Ausspielende vor dem Ablegen keine andere Handkarte in der zuvor aktiven Farbe hatte.
- Die Karte kann technisch auch illegal gespielt werden; der Server merkt sich die Legalität privat.
- Bei Annahme zieht das Opfer vier Karten und setzt aus.
- Bei erfolgreicher Anfechtung zieht der Ausspielende vier Karten; der Anfechtende behält seinen Zug.
- Bei erfolgloser Anfechtung zieht der Anfechtende sechs Karten und setzt aus.
- Wird +4 als letzte Karte gespielt, wird der Sieg erst nach Abschluss von Annahme oder Anfechtung festgestellt.

[D/I: RR-RULES, RR-GAME]

### UNO-/RUNE-Ruf

- Der Spieler kann serverseitig rufen, sobald er höchstens zwei Karten hält. [I: RR-GAME]
- Wer nach dem Ablegen genau eine Karte besitzt und nicht gerufen hat, öffnet ein achtsekündiges Fangfenster. [I: RR-ENGINE, RR-ROOM]
- Ein anderer Spieler kann während dieses Fensters den Versäumnisfall melden.
- Die Strafe beträgt in Classic und Chaos zwei Karten. [D/I: RR-RULES, RR-GAME]
- Nach Ablauf des Fensters ist kein nachträgliches Fangen mehr möglich.

Ob Project Havoc den Ruf bereits bei zwei Karten als eigenständige Vorabaktion erlaubt oder ihn atomar mit dem Ablegen der vorletzten Karte verbindet, ist noch zu entscheiden.

### Ende und Wertung

- Eine Runde endet, wenn ein Spieler seine Hand regulär leert.
- Eine als letzte Karte gespielte +2 oder +4 wird vollständig gegen das Ziel abgewickelt, bevor der Sieg bestätigt wird. [I: RR-GAME]
- Classic und Chaos verwenden keine 25-Karten-Eliminierung. [I: RR-ENGINE]
- Die Referenzengine berechnet einen Rundenscore aus gegnerischen Restkarten: Zahlen zum Nennwert, farbige Aktionen mit 20 und Wild-Karten mit 50 Punkten. [D/I: RR-RULES, RR-RULE-IMPL]
- Die Couch-Implementierung beendet jedoch jede Partie nach einer Runde und setzt bei einer Revanche die Scores neu; ein Match bis 500 Punkte ist nicht umgesetzt. [I: RR-GAME]

Damit ist „erste leere Hand gewinnt die Partie“ das beobachtete Couch-Verhalten. Eine rundenübergreifende Classic-Wertung ist offen.

## Classic-Modus

### Deck

Classic besitzt 108 Karten: [D/I/T: RR-CHAOS-DOC, RR-DECK, RR-CHAOS-TEST]

- je Farbe eine 0 und je zwei Karten 1–9,
- je Farbe zweimal Skip, Reverse und +2,
- vier Wild-Karten,
- vier Wild-+4-Karten.

Die Mercy-spezifischen 0-/7-Handeffekte, das Stapeln, Draw-to-Match, die 25-Karten-Eliminierung und die zusätzlichen No-Mercy-Karten gelten in Classic nicht.

### Vollständiger Ablauf

1. Host startet mit 2–8 verbundenen und bereiten Spielern.
2. Server mischt das 108-Karten-Deck, teilt je sieben Karten aus und bestimmt die erste Nicht-Wild-Ablage.
3. Aktiver Spieler spielt eine passende Karte oder zieht genau eine.
4. Server prüft Karte, Zugberechtigung, Farbe/Symbol/Zahl und gegebenenfalls Ziel/Farbe.
5. Kartenwirkung wird vollständig aufgelöst; bei +4 folgt die Opferentscheidung.
6. Bei genau einer Karte wird der Rufstatus beziehungsweise das Fangfenster relevant.
7. Zug wechselt gemäß Richtung und Kartenwirkung.
8. Leert ein Spieler seine Hand, werden abschließende +2/+4-Strafen noch abgewickelt; danach endet die Partie.
9. TV und Smartphones zeigen den Gewinner; der Host kann zur Lobby zurückkehren.

## Chaos-Modus

### Deck und Basis

Chaos verwendet das vollständige Classic-Deck plus genau je eine der fünf Chaos-Karten, insgesamt 113 Karten. [D/I/T: RR-CHAOS-DOC, RR-DECK, RR-CHAOS-TEST]

Chaos übernimmt Zieh-eine, freiwilliges Ausspielen der gezogenen Karte, nicht stapelbare Strafen, +4-Prüfung und Zwei-Karten-Strafe für einen verpassten Ruf aus Classic. [D/I: RR-CHAOS-DOC, RR-GAME]

### Fünf Chaos-Karten

| Karte | Ausspielen/Reaktion | Eindeutige Wirkung | Quellenstatus |
| --- | --- | --- | --- |
| Schicksalstausch | Normaler Zug; aktive Farbe und anderer aktiver Spieler werden gewählt. | Nach Ablegen der Karte tauschen Ausspielender und Ziel ihre vollständigen verbleibenden Hände atomar. | D/I/T: RR-CHAOS-DOC, RR-GAME, RR-CHAOS-TEST |
| Fluchspiegel | Nur Reaktion auf eine Ziehstrafe; nicht als normaler Zug spielbar. | Karte wird verbraucht; ein anderer aktiver Spieler zieht die vollständige Strafe. Es entsteht kein weiteres Reaktionsfenster. | D/I/T: RR-CHAOS-DOC, RR-GAME, RR-CHAOS-TEST |
| Würfelfluch | Normaler Zug; aktive Farbe und anderer aktiver Spieler werden gewählt. | Server würfelt W6; Ziel erhält eine Ziehstrafe von 1–6. Schild, Spiegel oder Schatzschild können reagieren. | D/I: RR-CHAOS-DOC, RR-GAME |
| Runenschild | Nur Reaktion auf eine Ziehstrafe; nicht als normaler Zug spielbar. | Karte wird verbraucht und verhindert die gesamte aktuelle Strafe. | D/I/T: RR-CHAOS-DOC, RR-GAME, RR-CHAOS-TEST |
| Runenwirbel | Normaler Zug; aktive Farbe wird gewählt. | Alle aktiven Hände rotieren gleichzeitig in aktueller Spielrichtung. | D/I: RR-CHAOS-DOC, RR-GAME, RR-ENGINE |

Schicksalstausch und Runenwirbel können durch ihre Handveränderung verhindern, dass der Ausspielende nach seiner vermeintlich letzten Karte tatsächlich leer bleibt. Beim Würfelfluch wird ein möglicher Sieg erst nach der Zielstrafe beziehungsweise deren Reaktion abgeschlossen. [I: RR-GAME]

### Reaktionsmechanik

1. Eine neue unterstützte Ziehstrafe bestimmt genau ein betroffenes Ziel.
2. Besitzt das Ziel Runenschild, Fluchspiegel oder die Schatzfähigkeit „Strafe blockieren“, öffnet der Server ein Reaktionsfenster von zwölf Sekunden.
3. Das Ziel kann genau eine Alternative nutzen oder ablehnen.
4. Runenschild beziehungsweise Schatzschild verhindert die gesamte Strafe.
5. Fluchspiegel verbraucht die Karte, verlangt ein anderes aktives Ziel und leitet die volle Strafe einmalig weiter.
6. Das Spiegelziel erhält kein zweites Reaktionsfenster.
7. Ablehnung oder Timeout führt die ursprüngliche Strafe aus. Bei Wild +4 folgt nach Ablehnung zuerst die klassische Annahme-/Anfechtungsentscheidung.
8. Die erste gültige Serveraktion schließt das Fenster; weitere oder doppelte Reaktionen werden abgewiesen.

[D/I/T: RR-CHAOS-DOC, RR-GAME, RR-CHAOS-TEST]

### Sechs Zeitereignisse

Ein Ereignis wird grundsätzlich drei Minuten nach Spielstart beziehungsweise drei Minuten nach Abschluss des vorherigen Ereignisses fällig. Es unterbricht keinen laufenden Zug, sondern beginnt erst nach einer abgeschlossenen normalen Aktion im stabilen Zugzustand. Normale Karten- und Schatzaktionen sind während eines Ereignisses gesperrt. [D/I/T: RR-CHAOS-DOC, RR-CHAOS, RR-CHAOS-TEST]

| Ereignis | Spieleraktion | Auflösung | Quellenstatus |
| --- | --- | --- | --- |
| Schatztruhe | Alle aktiven Spieler würfeln serverseitig einen W6. | Eindeutiger Höchstwurf erhält zufällig eine von drei Fähigkeiten: anderer Spieler zieht 3, eine eigene Karte abwerfen oder eine Ziehstrafe blockieren. Pro Spieler besteht höchstens eine Fähigkeit. | D/I: RR-CHAOS-DOC, RR-CHAOS |
| Goblin-Handel | Jeder aktive Spieler wählt geheim eine eigene Handkarte. | Nach allen Auswahlen werden die gewählten Karten gleichzeitig in Spielrichtung an den nächsten Sitz weitergereicht. | D/I: RR-CHAOS-DOC, RR-CHAOS |
| Runenprüfung | Alle würfeln; bei 4–6 wählt der Spieler eine Karte. | Berechtigte Spieler werfen je eine Karte ab. Mit nur einer Handkarte besteht keine Berechtigung; das Ereignis kann keinen regulären Sieg erzeugen. | D/I: RR-CHAOS-DOC, RR-CHAOS |
| Orakelblick | Jeder wählt einen anderen aktiven Spieler mit mindestens einer Karte. | Server wählt zufällig eine Zielkarte; nur der auswählende Spieler sieht diese Karte. | D/I/T: RR-CHAOS-DOC, RR-CHAOS, RR-CHAOS-TEST |
| Sturm der Farben | Alle würfeln; eindeutiger Höchstwurf wird bestimmt. | Gewinner wählt eine der vier aktiven Farben. | D/I: RR-CHAOS-DOC, RR-CHAOS |
| Drachenfluch | Alle würfeln; Höchst- und Tiefstplatz werden bestimmt. | Höchstplatz wirft eine zufällige Karte ab, sofern mindestens zwei verbleiben; Tiefstplatz zieht eine Karte. | D/I: RR-CHAOS-DOC, RR-CHAOS |

Gleichstände werden durch serverseitige W6-Stechen aufgelöst. Nach 64 unmittelbar aufeinanderfolgenden Gleichständen wählt der Server zufällig aus den noch Gebundenen. [D/I: RR-CHAOS-DOC, RR-CHAOS]

### Ereignis-Timeouts

- Jede Würfel- oder Auswahlphase besitzt zwölf Sekunden.
- Fehlende Würfe, Farben, Karten und Ziele werden serverseitig zufällig und regelkonform gewählt.
- Ein abgeschlossenes Ergebnis bleibt vier Sekunden sichtbar.
- Danach wird der vorherige Zugzustand wiederhergestellt und das nächste Ereignis geplant.

[D/I/T: RR-CHAOS-DOC, RR-CHAOS, RR-CHAOS-TEST]

### Schatzfähigkeiten

| Fähigkeit | Verwendung | Einschränkung |
| --- | --- | --- |
| Gegner zieht drei | Im eigenen normalen Zug gegen einen anderen aktiven Spieler; eröffnet gegebenenfalls ein Reaktionsfenster. | Verbraucht sich bei Nutzung. |
| Eine Karte abwerfen | Im eigenen normalen Zug wird eine gewählte eigene Karte entfernt. | Bei nur einer Handkarte verboten; erzeugt keinen direkten Sieg. |
| Ziehstrafe blockieren | Im Reaktionsfenster statt Schildkarte. | Nur gegen die aktuelle Strafe; verbraucht sich bei Nutzung. |

[D/I: RR-CHAOS-DOC, RR-GAME]

### Finalphase und 25-Minuten-Entscheidung

- Ab Minute 20 ist die Finalphase aktiv.
- In der Finalphase werden Schatztruhe und Drachenfluch nicht mehr neu gestartet; die übrigen vier Ereignistypen bleiben möglich.
- Minute 25 ist eine harte serverseitige Deadline.
- Ein offenes Ereignis wird automatisch vervollständigt; eine offene Reaktion wird abgelehnt.
- Gewinner ist zunächst der aktive Spieler mit den wenigsten Handkarten.
- Bei Gleichstand gewinnt die niedrigste Summe der Kartenwerte: Zahlen zum Nennwert, farbige Aktionen mit 20, Wild-/Chaos-Karten mit 50.
- Bleibt Gleichstand, entscheidet serverseitiges W6-Stechen; nach 64 Gleichstandsrunden folgt eine Zufallsauswahl.
- Das Ergebnis unterscheidet sichtbar zwischen normalem Ablegen und Zeitentscheidung.

[D/I/T: RR-CHAOS-DOC, RR-CHAOS, RR-CHAOS-TEST]

## Sichtbare Informationen

### TV-/Hauptbildschirm

Der TV erhält eine ausdrücklich öffentliche Projektion ohne eigene Hand oder private Auswahlfelder. Sichtbar sind: [D/I/T: RR-COUCH-DOC, RR-PROTOCOL, RR-GAME-TEST, RR-UI-TV]

- Raumcode, QR-Code und Join-Link in der Lobby
- gewählter Modus, Namen, Sitzreihenfolge, Verbindung und Ready-Status
- im Spiel: Namen, Handkartenzahlen, aktiver Spieler, Richtung, aktive Farbe
- oberste Ablagekarte, Anzahl im Zieh- und Ablagestapel sowie offene Ziehstrafe
- Chaos-Restzeit, Finalphase, nächstes Ereignis, Ereignisname, Teilnehmerstatus und öffentliche Würfe
- öffentliches Ereignisergebnis und gewählte Farbe
- Gewinner, Restkartenzahlen und Gewinnart

Nicht sichtbar sind fremde Karten, geheime Ereignisauswahlen, konkrete gezogene Karten, private Orakelkarte und persönliche Schatzfähigkeit.

### Smartphone

Jeder Controller sieht beziehungsweise bedient: [D/I: RR-COUCH-DOC, RR-PROTOCOL, RR-UI-PHONE]

- eigenen Namen, Raum, Verbindung und Ready-Status
- eigene vollständige Hand
- aktive Farbe, oberste Ablage, Richtung, offene Ziehstrafe und Zugstatus
- gültige Kartenwahl, Ziehen, Spielen, Farbauswahl und +4-Entscheidung
- Ruf und Fangen eines offenen Versäumnisses
- Chaos-Zielwahl, Schild-/Spiegel-/Schatzreaktion und Schatznutzung
- persönlichen Ereignisstatus und notwendige geheime Auswahl
- private Orakelkarte nur für den berechtigten Empfänger
- Gewinner oder Niederlage

Andere Hände werden nur als Anzahl repräsentiert.

## Reconnect- und Disconnect-Verhalten

- Die Referenz ordnet einen Spieler über eine stabile authentifizierte Benutzer-ID wieder seinem bestehenden Sitz zu; der Anzeigename ist nicht die Identität. [D/I: RR-COUCH-DOC, RR-ROOM]
- Ein erneut verbundener Spieler erhält einen vollständigen personalisierten Snapshot.
- Bereits belegte Sitze dürfen auch bei voller Lobby wieder verbunden werden. [I/T: RR-SEATS, `game-server/src/seats.test.ts`]
- Verlässt ein Spieler die Lobby ausdrücklich, wird sein Sitz entfernt. Während einer Partie bleibt der Eintrag für Reconnect bestehen.
- Ist der aktive Spieler getrennt, wartet der Server 20 Sekunden. Danach löst er den Zug minimal automatisch auf: offene Strafe akzeptieren, sonst eine Karte ziehen, notwendige Auswahl automatisch treffen beziehungsweise eine frisch gezogene Classic-Karte behalten. [I: RR-ROOM, RR-GAME]
- Ein Reconnect innerhalb der Frist hebt den Watchdog auf.

Project Havoc übernimmt das fachliche Prinzip, aber nicht die Supabase-Abhängigkeit. Die konkrete Reconnect-Berechtigung wird als eigenes, nicht erratbares Sitzungstoken geplant.

## Widersprüche und unklare Regeln

| Thema | Dokumentierter Stand | Beobachtetes Verhalten | Status für Project Havoc |
| --- | --- | --- | --- |
| Stapelschwelle im Mercy-Bestandspfad | RR-RULES nennt teils „mindestens Gesamtsumme“, teils Gleichwertigkeit zur zuletzt gespielten Karte. | RR-RULE-IMPL vergleicht mit dem Wert der obersten Ziehkarte und addiert jeden Wert zur Gesamtstrafe. | Betrifft nicht Classic/Chaos; vor einem möglichen Mercy-Modus neu entscheiden. |
| Gleichwertige Ziehkarte | Ein Beispiel in RR-RULES behauptet, +4 auf +4 lasse die Gesamtsumme bei 4. | RR-ENGINE addiert auf 8; andere Beispiele in RR-RULES stützen Addition. | Dokumentationskonflikt. Nicht auf Classic/Chaos übertragbar, da dort kein Stapeln gilt. |
| Letzte 7 im Mercy-Modus | RR-RULES behauptet einmal verpflichtenden Tausch ohne Sieg, später sofortigen Sieg vor dem Tausch. | RR-ENGINE beendet das Spiel bei leerer Hand. | Offen nur für späteren Mercy-Modus. |
| Reverse +4 bei zwei Spielern | RR-RULES beschreibt eine Selbststrafe des Ausspielenden. | RR-ENGINE richtet die Strafe gegen den Gegner. | Offener Legacy-Konflikt; nicht im Classic-/Chaos-Deck enthalten. |
| Erste Wild-Karte | Allgemeine Regeln erlauben beziehungsweise behandeln zumindest normale Wilds als Startkarte. | RR-ENGINE mischt jede Wild-Karte zurück und startet nur mit farbiger Karte. | Project Havoc muss das Startkartenverfahren ausdrücklich bestätigen. |
| Classic-Matchwertung | RR-RULES beschreibt Rundenpunkte bis 500. | Couch-Partie endet nach einer Runde; Revanche initialisiert Scores neu. | P0-Entscheidung: Einzelrunde oder Matchwertung. |
| UNO-Rufzeitpunkt | RR-RULES verlangt den Ruf beim Ablegen der vorletzten Karte. | RR-GAME erlaubt `CALL_UNO` bereits bei zwei Karten als separaten Intent. | P0-Entscheidung zur exakten Eingabesemantik. |
| Sechs Chaos-Ereignisse | RR-CHAOS-DOC beschreibt sechs Ereignistypen im Dreiminutenrhythmus. | RR-CHAOS rotiert die Typen und kann sie wiederholen; ab Minute 20 werden zwei Typen herausgefiltert. | Typen und Rhythmus klar; gewünschte Verteilung/Balancing bleibt offen. |
| Classic-Regeltests | Bericht nennt vollständige Regressionssuite. | Spezifische neue Serverfälle für Zieh-eine, +4-Anfechtung und letzten +2/+4-Sieg sind in den untersuchten Testnamen nicht eindeutig ausgewiesen. | Project Havoc erhält explizite Akzeptanz- und Vertragstests. |

## UX- und Designprinzipien

- Der TV ist öffentliche Darstellung und Host-Steuerung, kein Spieler.
- Smartphones sind private Controller; geheime Daten werden serverseitig gefiltert.
- Jede Phase zeigt genau die aktuell erlaubten Hauptaktionen.
- Serverbestätigung unterscheidet empfangen, akzeptiert, abgelehnt und automatisch aufgelöst.
- Touch-Ziele sind groß, hochformatgeeignet und nicht hoverabhängig.
- TV-Informationen bleiben aus mehreren Metern lesbar.
- Status wird nicht ausschließlich durch Farbe vermittelt.
- Timer zeigen Serverdeadlines, nicht clientseitig erzeugte Wahrheiten.
- Reconnect, Warten, Timeout, Fehler und Ergebnis besitzen eigenständige UI-Zustände.
- Project Havoc entwickelt eine eigene visuelle und sprachliche Identität; Referenzassets und Markentexte werden nicht übernommen.

## Bekannte Einschränkungen der Referenz

- Reale Mehrgeräteprüfung mit TV sowie mehreren iOS-/Android-Geräten im selben WLAN ist laut Berichten offen.
- Die Chaos-Zielspielzeit und das Balancing wurden nicht ausreichend durch reale Runden validiert.
- Die Referenz benötigt für Couch-Identitäten weiterhin Internetzugang und Supabase.
- Browser-, Touch-, Safe-Area- und Heimnetzverhalten sind nicht abschließend freigegeben.
- Die Ereignisreihenfolge ist prototypisch deterministisch; Zufall und Balancing sind nicht als finales Design bestätigt.

## Noch erforderliche Produktentscheidungen

- Soll Project Havoc nur Classic und Chaos oder später auch den separaten Mercy-Regelsatz enthalten?
- Endet Classic nach einer Runde oder als Match mit Zielpunktzahl?
- Wie wird der UNO-/Havoc-Ruf exakt ausgelöst und benannt?
- Welche Startkarte ist erlaubt, und wie werden ihre Effekte behandelt?
- Soll Chaos die prototypische Ereignisreihenfolge beibehalten, zufällig mischen oder anders gewichten?
- Bleiben alle Zeitwerte exakt bei 3 Minuten, 12 Sekunden, 4 Sekunden, Minute 20 und Minute 25?
- Soll der 20-Sekunden-Autozug bei Disconnect unverändert gelten?
- Welche Namen, Texte und audiovisuelle Identität ersetzen die Referenzbegriffe?

Diese Entscheidungen blockieren nicht das Alpha-0.1-Lobbyfundament, müssen aber vor der jeweiligen Gameplay-Implementierung bestätigt werden.
