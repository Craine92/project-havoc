# Project Havoc – Offene Fragen

## Zweck und Priorisierung

Dieses Dokument sammelt fehlende Produkt-, Regel- und Designentscheidungen. Antworten sollen vom Game Director bestätigt und anschließend in GDD, Protokoll und Tests übernommen werden.

- **P0 – blockierend:** Vor Gameplay- beziehungsweise Multiplayer-Implementierung erforderlich
- **P1 – wichtig:** Vor vollständigem spielbaren Modus erforderlich
- **P2 – planbar:** Kann nach einem technischen Vertikalschnitt entschieden werden

## P0 – Spielkern und Sitzungsablauf

1. Wie viele Spielende sind minimal und maximal erlaubt – insgesamt und je Modus?
2. Was ist die zentrale Handlung beziehungsweise Entscheidung, die ein Spieler wiederholt ausführt?
3. Welche vollständigen Phasen besitzt eine Partie vom Start bis zum Ergebnis?
4. Welche Bedingungen müssen erfüllt sein, bevor der Host starten darf?
5. Darf der Host selbst mitspielen, und mit welchem Gerät beziehungsweise welcher Rolle?
6. Können Spielende nach dem Start neu beitreten, nur reconnecten oder zuschauen?
7. Was geschieht, wenn ein Spieler während Lobby, Runde, Reaktionsfenster oder Ergebnisanzeige die Verbindung verliert?
8. Was geschieht bei dauerhaftem Host-Ausfall: Pause, Host-Übertragung oder Sitzungsende?
9. Können Spielende freiwillig aufgeben oder entfernt werden? Wer darf das auslösen?
10. Welche Informationen sind öffentlich auf dem TV und welche privat auf dem Controller?

## P0 – Classic-Modus

1. Was ist das Ziel des Classic-Modus?
2. Wie beginnt und endet eine Runde, und wie viele Runden gibt es?
3. Handeln Spielende gleichzeitig oder in einer Reihenfolge?
4. Welche Aktionen sind in jeder Phase erlaubt?
5. Welche Ressourcen, Werte, Karten oder anderen Spielobjekte existieren?
6. Wie werden Aktionen aufgelöst, insbesondere bei Konflikten oder Gleichzeitigkeit?
7. Wie werden Punkte, Fortschritt oder Vorteile vergeben?
8. Was sind Sieg- und Niederlagenbedingungen?
9. Wie werden Gleichstände behandelt?
10. Gibt es Ausscheiden, und falls ja, was macht eine ausgeschiedene Person bis zum Ende?
11. Welche Zeitlimits und Standardaktionen bei Timeout gelten?

## P0 – Chaos-Modus

1. Wie lauten Name, Inhalt, Auslöser und exakte Wirkung jeder der fünf Chaos-Karten?
2. Können Chaos-Karten verhindert, verändert, kombiniert oder mehrfach angewandt werden?
3. Wie werden die fünf Karten ausgewählt, verteilt, aufgedeckt und verbraucht?
4. Wie lauten Name, Zeitpunkt, Auslöser und exakte Wirkung jedes der sechs Zeitereignisse?
5. Basieren Zeitereignisse auf Gesamtspielzeit, Rundenzeit oder anderen Auslösern?
6. Welche Reaktionen sind je Ereignis möglich, wer darf reagieren und sind sie öffentlich oder geheim?
7. Wie lang ist jedes Reaktionsfenster und welche Serverzeitregel entscheidet Grenzfälle?
8. Was geschieht bei ausbleibender, verspäteter oder mehrfacher Reaktion?
9. Wann beginnt die Finalphase, wie läuft sie ab und wie endet sie?
10. Was bedeutet die „25-Minuten-Entscheidung“ genau: harter Spielabbruch, Wertung, Sudden Death oder etwas anderes?
11. Wie wird bei Minute 25 ein Gleichstand oder ein noch offener Effekt behandelt?
12. Welche Zufallsanteile gibt es, und welche Informationen darüber sehen die Spielenden?

## P1 – Lobby, Identität und Reconnect

1. Wie werden Sitzungen benannt oder identifiziert, und ist zusätzlich zum QR-Code ein Kurzcode erforderlich?
2. Welche Zeichen und Länge sind für Spielernamen erlaubt; müssen Namen eindeutig sein?
3. Dürfen Namen nach dem Beitritt geändert werden?
4. Gibt es Avatare, Farben oder andere Spielerkennzeichen, und wie werden Konflikte gelöst?
5. Wie lange darf ein Spieler getrennt sein, bevor sein Platz freigegeben wird?
6. Muss der Zustand einen Neuladevorgang, Browserwechsel oder Serverneustart überstehen?
7. Was sieht die Gruppe während eines Reconnects: Pause, Countdown oder unveränderter Ablauf?
8. Ist absichtliches Pausieren erlaubt, und wer darf es auslösen?

## P1 – UX und visuelle Identität

1. Welche Tonalität und Welt besitzt Project Havoc: humorvoll, düster, abstrakt oder anders?
2. Gibt es Logo, Farben, Typografie, Figuren oder Referenzmaterial, das verwendet werden darf?
3. Welche Informationen müssen aus welchem typischen TV-Abstand lesbar sein?
4. Welche Smartphone-Größen, Ausrichtungen und Eingabemethoden sind Mindestziel?
5. Welche Sprachen werden zum ersten Release unterstützt?
6. Welches Barrierefreiheitsniveau ist Ziel, insbesondere für Farbe, Bewegung, Audio und Screenreader?
7. Welche Rückmeldungen benötigen Sound, Haptik und Animation?
8. Wie viel Regelerklärung soll vor dem Spiel, kontextuell und jederzeit abrufbar erscheinen?
9. Soll der Controller private taktische Informationen anzeigen?
10. Welche Zustände benötigen eigene Artworks oder Animationen?

## P1 – Fehler- und Sonderfälle

1. Was geschieht bei zwei nahezu gleichzeitigen Aktionen?
2. Welche Aktionen dürfen nach Netzwerkverzögerung noch gelten?
3. Wie werden unvollständige Runden nach Aufgabe oder Disconnect gewertet?
4. Kann eine Partie neu gestartet oder wiederholt werden, und bleiben Spieler in derselben Lobby?
5. Darf der Host einen laufenden Modus abbrechen oder wechseln?
6. Welche verständlichen Meldungen sollen bei voller, abgelaufener oder unbekannter Sitzung erscheinen?

## P2 – Technik und Betrieb

1. Läuft der Server nur lokal, im Internet oder in beiden Varianten?
2. Wie entdecken Smartphones die Join-Adresse, wenn der Host im lokalen Netzwerk läuft?
3. Muss das Spiel ohne Internetzugang vollständig funktionieren?
4. Welche Zielbrowser und Betriebssysteme werden offiziell unterstützt?
5. Welche maximale Anzahl paralleler Sitzungen und Clients wird erwartet?
6. Sollen Partien, Statistiken oder Diagnosedaten gespeichert werden?
7. Welche Datenschutz- und Löschanforderungen gelten?
8. Welche Deployment-, Monitoring- und Supportumgebung ist vorgesehen?

## Empfohlene erste Entscheidungsrunde

Für Auftrag 002 sollten zuerst diese Themen beantwortet werden:

1. Spielerzahl, Host-Rolle und Beitritt nach Spielstart
2. vollständiger Classic-Rundenablauf inklusive Aktionen und Siegbedingung
3. vollständige Definition aller fünf Chaos-Karten
4. vollständige Definition aller sechs Zeitereignisse
5. Reaktionsfenster, Timeout-Verhalten, Finalphase und 25-Minuten-Entscheidung
6. öffentliche und private Informationen je Bildschirm
7. Disconnect-, Reconnect- und Host-Ausfallregeln

Ohne diese Antworten kann das technische Grundgerüst vorbereitet werden, aber keine belastbare Gameplay-Implementierung beginnen.
