# Project Havoc – Akzeptanzszenarien

## Verwendung

Die Szenarien bilden den gewünschten Verhaltensvertrag für die eigenständige Neuentwicklung. `A01` markiert Alpha-0.1-Umfang. `Later` dokumentiert rekonstruierte Gameplay-Anforderungen für spätere Aufträge. Zeit und Zufall werden in Tests kontrolliert; keine Prüfung wartet real mehrere Minuten.

## Alpha 0.1 – Sitzung und Lobby

### PH-A01-001 – Raum und öffentlicher TV

**Gegeben:** Ein Host öffnet die TV-Anwendung.  
**Wenn:** Er einen Raum erstellt.  
**Dann:** Der Server erzeugt eine eindeutige Sitzung; der TV zeigt Raumcode, Join-URL und daraus erzeugbaren QR-Code, besitzt aber keinen Spielersitz.  
**Test:** Serverintegration plus Playwright-TV-Smoke.  
**Quelle:** RR-COUCH-DOC, RR-ROOM.

### PH-A01-002 – Zwei Smartphones treten bei

**Gegeben:** Eine offene Lobby.  
**Wenn:** Zwei unterschiedliche Controller mit gültigen, eindeutigen Namen beitreten.  
**Dann:** Beide erhalten unterschiedliche stabile Spieleridentitäten; der TV zeigt beide als verbunden.  
**Test:** Integration mit zwei Socket-Clients und E2E mit drei Browserkontexten.

### PH-A01-003 – Namen validieren

**Gegeben:** Eine offene Lobby.  
**Wenn:** Ein Name weniger als 2 oder mehr als 16 Unicode-Codepoints besitzt oder nach NFKC/case folding bereits vergeben ist.  
**Dann:** Der Server lehnt ihn ab und verändert das Roster nicht. Whitespace wird für einen gültigen Namen vereinheitlicht.  
**Test:** tabellarischer Unit-Test plus Integration.  
**Quelle:** RR-VALIDATE, `game-server/src/validate.test.ts`.

### PH-A01-004 – Maximale Spielerzahl

**Gegeben:** Acht unterschiedliche Sitze sind belegt.  
**Wenn:** Ein neunter neuer Spieler beitreten will.  
**Dann:** Der Server lehnt mit stabilem Fehlercode ab. Ein bereits gesetzter Spieler darf weiterhin reconnecten.  
**Test:** Unit- und Integrationstest.  
**Quelle:** RR-SEATS, `game-server/src/seats.test.ts`.

### PH-A01-005 – Ready synchronisieren

**Gegeben:** Zwei Spieler sind in der Lobby.  
**Wenn:** Sie ihren Ready-Status ändern.  
**Dann:** Server und TV zeigen den aktuellen Zustand; ein fremder Client kann den Ready-Status nicht für sie setzen.  
**Test:** Serverintegration und UI-Test.

### PH-A01-006 – Startbedingungen

**Gegeben:** Weniger als zwei verbundene Spieler oder mindestens ein gesetzter Spieler ist nicht ready.  
**Wenn:** Der Host den Start anfordert.  
**Dann:** Der Server lehnt ab und bleibt in der Lobby.  
**Und gegeben:** 2–8 verbundene Spieler sind ready.  
**Wenn:** der verifizierte Display-Host startet.  
**Dann:** genau ein atomarer Startübergang wird erzeugt.  
**Test:** Integration; doppelter Start und gleichzeitige Startintents einschließen.  
**Quelle:** RR-COUCH-DOC, RR-ROOM.

### PH-A01-007 – Nur Host darf starten

**Gegeben:** Eine startbereite Lobby.  
**Wenn:** ein Spieler oder ein fremdes Display den Start anfordert.  
**Dann:** Der Server lehnt ohne Zustandsänderung ab.  
**Test:** Berechtigungs-Integrationstest.

### PH-A01-008 – Reconnect mit vollständigem Snapshot

**Gegeben:** Ein gesetzter Spieler verliert die Verbindung.  
**Wenn:** Er mit gültiger Reconnect-Berechtigung erneut verbindet.  
**Dann:** Derselbe Sitz und Name werden verwendet; der Client erhält einen vollständigen aktuellen Snapshot, und es entsteht kein zusätzlicher Spieler.  
**Test:** Integration mit Socket-Abbruch und Neuverbindung.

### PH-A01-009 – Identitätsdiebstahl verhindern

**Gegeben:** Ein Spielername und Sitz existieren.  
**Wenn:** ein anderer Client nur denselben Anzeigenamen oder eine manipulierte Spieler-ID sendet.  
**Dann:** Er erhält nicht den bestehenden Sitz; geheime Reconnect-Daten werden benötigt.  
**Test:** negativer Sicherheitsintegrationstest.

### PH-A01-010 – Rollenbezogene Projektion

**Gegeben:** TV und mehrere Controller sind verbunden.  
**Wenn:** der Server Lobbyzustand verteilt.  
**Dann:** Jede Rolle erhält nur die vorgesehenen Felder; Reconnect-Geheimnisse oder andere private Daten erscheinen weder beim TV noch bei anderen Spielern.  
**Test:** Vertrags-/Snapshot-Test.

### PH-A01-011 – Doppelte und veraltete Aktion

**Gegeben:** Eine bereits verarbeitete Aktions-ID oder alte Zustandsrevision.  
**Wenn:** derselbe Intent erneut eintrifft.  
**Dann:** Er bewirkt keine zweite Zustandsänderung und erhält ein deterministisches Ergebnis.  
**Test:** Integrationstest für Deduplizierung und Revision.

### PH-A01-012 – TV-Reconnect

**Gegeben:** Eine bestehende Lobby und getrenntes Hostdisplay.  
**Wenn:** der Host erneut verbindet.  
**Dann:** Raumcode, Roster, Ready und Modus werden aus dem Serverzustand wiederhergestellt; kein neuer Raum wird erzeugt.  
**Test:** Playwright-/Integrationstest.

## Classic – spätere Gameplay-Abnahme

### PH-CL-001 – Startdeal und Sichtbarkeit

**Gegeben:** Eine startbereite Classic-Lobby mit drei Spielern.  
**Wenn:** die Partie startet.  
**Dann:** Jeder hält sieben Karten aus einem 108-Karten-Deck; der TV sieht nur je sieben als Anzahl, niemals Kartenidentitäten.  
**Quelle:** RR-DECK, RR-GAME, RR-PROTOCOL.

### PH-CL-002 – Passende und unpassende Karte

**Gegeben:** Rot 5 liegt und Rot ist aktiv.  
**Wenn:** der aktive Spieler Rot 9, Blau 5 oder Wild spielt.  
**Dann:** jede Aktion ist gültig. Blau 7 ist ungültig und verändert nichts.  
**Quelle:** RR-RULES, RR-RULE-IMPL.

### PH-CL-003 – Freiwillig eine Karte ziehen

**Gegeben:** Der aktive Spieler könnte bereits spielen.  
**Wenn:** er trotzdem zieht.  
**Dann:** genau eine Karte wird gezogen; nur diese darf bei Spielbarkeit noch gespielt werden, alternativ darf sie behalten werden.  
**Quelle:** RR-RULES, RR-GAME.

### PH-CL-004 – Nicht stapelbare +2

**Gegeben:** Eine +2 richtet sich gegen den aktuellen Spieler, der selbst eine +2 hält.  
**Wenn:** er versucht, seine +2 zu spielen.  
**Dann:** der Server lehnt ab; er muss zwei ziehen und setzt aus.  
**Quelle:** RR-CHAOS-DOC, RR-RULE-IMPL.

### PH-CL-005 – Legale +4 anfechten

**Gegeben:** Der Täter hatte keine Karte der zuvor aktiven Farbe.  
**Wenn:** das Opfer anficht.  
**Dann:** das Opfer zieht sechs und setzt aus; keine fremde Hand wird offengelegt.  
**Quelle:** RR-RULES, RR-GAME.

### PH-CL-006 – Illegale +4 anfechten

**Gegeben:** Der Täter hatte eine Karte der zuvor aktiven Farbe.  
**Wenn:** das Opfer anficht.  
**Dann:** der Täter zieht vier; das Opfer bleibt am Zug.  
**Quelle:** RR-RULES, RR-GAME.

### PH-CL-007 – Letzte Strafkarte

**Gegeben:** Die letzte Karte eines Spielers ist +2 oder +4.  
**Wenn:** sie gültig gespielt wird.  
**Dann:** die Zielstrafe beziehungsweise +4-Entscheidung wird vollständig abgewickelt, erst danach wird der vorgemerkte Spieler Gewinner.  
**Quelle:** RR-GAME.

### PH-CL-008 – Rufversäumnis

**Gegeben:** Ein Spieler endet nach dem Ablegen bei einer Karte ohne Ruf.  
**Wenn:** ein anderer Spieler ihn innerhalb von acht Sekunden fängt.  
**Dann:** das Ziel zieht zwei. Nach Fristablauf oder gültigem Ruf wird ein Fang abgelehnt.  
**Quelle:** RR-ROOM, RR-GAME.

### PH-CL-009 – Reverse bei zwei Spielern

**Gegeben:** Zwei aktive Spieler.  
**Wenn:** der aktive Spieler Reverse spielt.  
**Dann:** der Gegner wird übersprungen und der Ausspielende ist erneut am Zug.  
**Quelle:** RR-RULES, RR-ENGINE.

### PH-CL-010 – Reconnect während des Zuges

**Gegeben:** Der aktive Spieler trennt sich.  
**Wenn:** er vor Ablauf der konfigurierten Frist reconnectet.  
**Dann:** er erhält Hand und Entscheidungszustand zurück. Läuft die Frist ab, löst der Server den Zug einmalig minimal auf.  
**Quelle:** RR-ROOM, RR-GAME.

## Chaos-Karten – spätere Gameplay-Abnahme

### PH-CH-C01 – Deckzusammensetzung

Eine Chaos-Partie besitzt exakt 113 Karten: Classic 108 plus genau je ein Schicksalstausch, Fluchspiegel, Würfelfluch, Runenschild und Runenwirbel.  
**Quelle:** RR-DECK, RR-CHAOS-TEST.

### PH-CH-C02 – Schicksalstausch bleibt privat

Nach gültiger Zielwahl werden beide Resthände atomar getauscht. Beteiligte sehen nur ihre neue eigene Hand; TV und andere Spieler sehen ausschließlich neue Anzahlen.  
**Quelle:** RR-GAME, RR-CHAOS-TEST.

### PH-CH-C03 – Schild verhindert volle Strafe

Bei einer Ziehstrafe verbraucht der Betroffene seinen Runenschild. Er zieht keine Karte; derselbe Intent kann nicht erneut wirken.  
**Quelle:** RR-GAME, RR-CHAOS-TEST.

### PH-CH-C04 – Spiegel erzeugt keine Kette

Der Betroffene verbraucht den Fluchspiegel und wählt ein gültiges anderes Ziel. Dieses zieht die volle Strafe unmittelbar und erhält kein Reaktionsfenster.  
**Quelle:** RR-GAME, RR-CHAOS-TEST.

### PH-CH-C05 – Würfelfluch deterministisch testbar

Mit kontrollierter Zufallsquelle, die eine 4 erzeugt, erhält das Ziel exakt vier Karten beziehungsweise ein Reaktionsfenster über vier. Nur der Server bestimmt den Wurf.  
**Quelle:** RR-GAME, RR-CHAOS.

### PH-CH-C06 – Runenwirbel

Bei drei aktiven Spielern rotieren alle vollständigen Hände gleichzeitig in aktueller Richtung. Kein Client darf die neuen Karten anderer Spieler erhalten.  
**Quelle:** RR-GAME, RR-ENGINE.

### PH-CH-C07 – Reaktions-Timeout

Reagiert das Ziel zwölf Sekunden lang nicht, behandelt der Server dies einmalig wie Ablehnen und führt die Strafe aus.  
**Quelle:** RR-CHAOS-DOC, RR-CHAOS-TEST.

## Chaos-Ereignisse – spätere Gameplay-Abnahme

### PH-CH-E01 – Ereignis unterbricht keinen Zug

Wird bei Minute 3 ein Ereignis fällig, während eine Folgeentscheidung läuft, startet es nicht. Nach der nächsten vollständig abgeschlossenen Aktion startet es im stabilen Zugzustand.  
**Quelle:** RR-CHAOS, RR-CHAOS-TEST.

### PH-CH-E02 – Schatztruhe

Alle aktiven Spieler würfeln; Gleichstände werden serverseitig gestochen. Genau ein Gewinner erhält genau eine der drei Fähigkeiten; bestehende Fähigkeit desselben Spielers wird ersetzt.  
**Quelle:** RR-CHAOS.

### PH-CH-E03 – Goblin-Handel atomar

Auswahlen bleiben geheim. Erst wenn alle gewählt haben oder der Timeout ergänzt hat, werden alle Karten in aktueller Richtung gleichzeitig weitergereicht.  
**Quelle:** RR-CHAOS-DOC, RR-CHAOS.

### PH-CH-E04 – Runenprüfung schützt die letzte Karte

Ein Wurf von 4–6 berechtigt nur bei mehr als einer Handkarte zum Abwurf. Ein Spieler mit einer Karte kann über das Ereignis nicht gewinnen.  
**Quelle:** RR-CHAOS-DOC, RR-CHAOS.

### PH-CH-E05 – Orakel bleibt privat

Jeder wählt ein anderes nichtleeres Ziel. Die zufällige Karte erscheint nur beim jeweiligen Betrachter; TV und alle anderen erhalten `null` beziehungsweise kein Feld.  
**Quelle:** RR-CHAOS, RR-CHAOS-TEST.

### PH-CH-E06 – Sturm der Farben

Der eindeutige Höchstwurf darf eine der vier Farben wählen. Andere Spieler und `wild` werden abgelehnt. Nach Timeout wählt der Server gültig.  
**Quelle:** RR-CHAOS.

### PH-CH-E07 – Drachenfluch

Höchstplatz wirft eine zufällige Karte nur bei mindestens zwei Karten ab; Tiefstplatz zieht eine. Bei Gleichstand werden beide Rollen eindeutig serverseitig bestimmt.  
**Quelle:** RR-CHAOS.

### PH-CH-E08 – Ergebnisfenster

Nach Ereignisauflösung bleibt das öffentliche Ergebnis mit kontrollierter Uhr vier Sekunden bestehen. Danach wird der vorherige Zugzustand wiederhergestellt und der nächste Termin drei Minuten später gesetzt.  
**Quelle:** RR-CHAOS, RR-CHAOS-TEST.

## Chaos-Zeitentscheidung – spätere Gameplay-Abnahme

### PH-CH-T01 – Finalphase

Ab Minute 20 meldet der Zustand Finalphase. Neu fällige Schatztruhen und Drachenflüche werden nicht gestartet; andere Ereignisse bleiben zulässig.  
**Quelle:** RR-CHAOS-DOC, RR-CHAOS-TEST.

### PH-CH-T02 – Reihenfolge der Zeitwertung

Bei Minute 25 gewinnt zuerst die geringste Handgröße, dann die geringste Wertsumme und erst dann das höhere serverseitige W6-Stechen.  
**Quelle:** RR-CHAOS, RR-CHAOS-TEST.

### PH-CH-T03 – Offene Entscheidung bei Minute 25

Ein offenes Ereignis wird regelkonform automatisch vervollständigt; eine offene Reaktion wird abgelehnt. Danach erfolgt genau eine Zeitentscheidung und das Spiel nimmt keine weiteren Intents an.  
**Quelle:** RR-CHAOS-DOC, RR-GAME.

## Nichtfunktionale Abnahme

- Alle Netzwerkpayloads werden zur Laufzeit validiert.
- TV-Snapshots enthalten niemals private Karten oder Reconnect-Geheimnisse.
- Mehrere Aktionen derselben Sitzung werden seriell verarbeitet.
- Tests für Timer verwenden kontrollierte Uhr, Tests für Würfel/Deck kontrollierte Zufallsquelle.
- Kein Test benötigt instabile reale Wartezeiten.
- E2E-Tests verwenden getrennte Browserkontexte für TV und mindestens zwei Smartphones.
- Project Havoc enthält keinen kopierten Rune-Riot-Code, keine Referenzassets und keine Abhängigkeit auf dessen Repository.
