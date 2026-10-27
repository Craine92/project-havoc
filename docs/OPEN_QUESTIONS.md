# Project Havoc – Offene Fragen

## Status nach Auftrag 002

Die Referenzanalyse hat wesentliche Fragen aus Auftrag 001 beantwortet:

- Couch-Spielerzahl: 2–8
- sieben Startkarten
- Classic-Deck: 108 Karten
- Chaos-Deck: 113 Karten
- fünf Chaos-Karten und ihre Prototypwirkungen
- sechs Chaos-Ereignisse und ihre Prototypwirkungen
- Reaktionsfrist: 12 Sekunden
- Ereignis-Ergebnisfenster: 4 Sekunden
- Finalphase ab Minute 20
- harte Chaos-Entscheidung bei Minute 25
- Zeitwertung: Handgröße, Wertsumme, W6-Stechen
- TV als sitzlose öffentliche Hostanzeige
- Smartphone als private Spieleransicht
- Referenz-Disconnect-Frist des aktiven Spielers: 20 Sekunden
- Workspace: npm Workspaces, npm 11 und Node.js ab 22.12
- Laufzeitvalidierung: Zod 4
- Alpha-0.1A-Startzustand: atomarer neutraler Zustand `started`

Diese Werte sind rekonstruiert, aber nicht automatisch als finales Balancing freigegeben.

## Priorisierung

- **P0-A01:** vor Implementierung von Alpha 0.1 erforderlich
- **P0-Game:** vor Classic-/Chaos-Implementierung erforderlich
- **P1:** vor einer vollständigen Gameplay-Alpha erforderlich
- **P2:** vor Release beziehungsweise öffentlichem Betrieb erforderlich

## P0-A01 – Technische Produktgrenzen

1. Soll Alpha 0.1 ausschließlich im lokalen Heimnetz laufen, über einen zentral gehosteten Server oder zunächst beides unterstützen?
2. Wie entsteht die auf Smartphones erreichbare Join-URL im lokalen Netz, insbesondere bei mehreren Netzwerkadaptern, VPN und Firewall?
3. Ist HTTPS bereits für die lokale Alpha erforderlich, und wie werden Zertifikate beziehungsweise Browserwarnungen behandelt?
4. Wie lange bleiben leere Räume, Hostberechtigungen und Spieler-Reconnect-Tokens gültig?
5. Soll ein verlorenes Hosttoken wiederherstellbar sein oder endet die administrierbare Sitzung damit?
6. Welche minimale Browsermatrix muss die erste technische Alpha bestehen?
7. Wie lange müssen verarbeitete Aktions-IDs aufbewahrt werden, bevor Deduplizierungseinträge sicher entfernt werden dürfen?

## P0-Game – Classic-Konflikte

1. Ist Project Havoc Classic eine einzelne Runde oder ein Match über mehrere Runden?
2. Falls Match: Welche Zielpunktzahl gilt, bleiben die rekonstruierten Kartenwerte erhalten und wie wird eine Revanche von einer Folgerunde unterschieden?
3. Darf der Ruf bereits bei zwei Karten separat erfolgen, oder muss er atomar beim Ablegen der vorletzten Karte ausgelöst werden?
4. Wie heißt der Ruf in Project Havoc und welche audiovisuelle Rückmeldung erhält er?
5. Darf eine normale Wild-Karte als erste Ablage erscheinen? Wie wird die Startfarbe bestimmt?
6. Werden Skip, Reverse und +2 als Startkarte exakt wie im Referenzverhalten angewandt?
7. Bleibt der achtsekündige Fangzeitraum unverändert?
8. Soll das Ziehen freiwillig erlaubt bleiben, obwohl bereits eine spielbare Karte auf der Hand liegt?

## P0-Game – Chaos-Balancing und Reihenfolge

1. Sind die fünf prototypischen Kartenwirkungen final bestätigt?
2. Sind die drei Schatzfähigkeiten final bestätigt?
3. Sind alle sechs Ereigniswirkungen final bestätigt?
4. Bleiben Ereignisintervall, Reaktionsfrist, Ergebnisfenster, Finalphase und Matchlimit exakt bei 3 Minuten, 12 Sekunden, 4 Sekunden, Minute 20 und Minute 25?
5. Sollen Ereignisse deterministisch rotieren, einmalig gemischt, frei zufällig oder gewichtet ausgewählt werden?
6. Dürfen Ereignistypen innerhalb einer Partie mehrfach auftreten?
7. Soll in der Finalphase weiterhin jedes der vier verbleibenden Ereignisse möglich sein, auch wenn dadurch eine frühere Reihenfolge verschoben wird?
8. Ersetzt eine neu gewonnene Schatzfähigkeit eine vorhandene, oder darf ein Spieler wählen beziehungsweise mehrere halten?
9. Darf „eine Karte abwerfen“ jede Karte einschließlich Chaos-Reaktionskarte entfernen?
10. Soll der 64-Runden-Sicherheitsabbruch bei W6-Gleichständen beibehalten oder anders gelöst werden?

## P1 – Disconnect und Sitzungsregeln

1. Bleibt die 20-Sekunden-Frist für einen getrennten aktiven Spieler bestehen?
2. Soll eine Partie bei Disconnect weiterlaufen, pausieren oder abhängig vom Modus reagieren?
3. Was geschieht nach dauerhaftem Host-/TV-Ausfall: automatische Fortsetzung, neuer Host, Pause oder Sitzungsende?
4. Dürfen Spieler nach Partiestart erstmals neu beitreten, nur reconnecten oder zuschauen?
5. Kann ein Spieler eine laufende Partie freiwillig verlassen, und wie wird sein Sitz behandelt?
6. Darf der Host eine laufende Partie abbrechen? Welche Ergebnis-/Statistikfolge hat das?
7. Muss eine Sitzung einen Serverprozess-Neustart überleben?

## P1 – Abgrenzung zum Mercy-Modus

1. Soll der separate `mercy`-Regelsatz der Referenz später überhaupt Teil von Project Havoc werden?
2. Falls ja: Welche Stapelregel gilt – Vergleich mit letzter Ziehkarte oder mit der kumulierten Strafe?
3. Wird eine gleichwertige Ziehkarte zur Gesamtstrafe addiert oder nur weitergereicht?
4. Gewinnt eine als letzte Karte gespielte 7 sofort oder muss der Handtausch erfolgen?
5. Wen trifft Wild Reverse +4 bei zwei Spielern?
6. Wie werden eliminierte Hände beim Nachziehen wiederverwendet?

Diese Fragen sind für Alpha 0.1 sowie Classic/Chaos nicht blockierend.

## P1 – UX und visuelle Identität

1. Welche eigenständige Welt, Tonalität und Namenssprache besitzt Project Havoc?
2. Welche neuen Namen erhalten Karten, Farben, Ruf und Ereignisse?
3. Gibt es freigegebene Logo-, Farb-, Typografie- oder Figurenkonzepte?
4. Welche Informationen müssen aus welchem TV-Abstand lesbar sein?
5. Welche Smartphone-Größen, Safe Areas und Ausrichtungen sind Mindestziel?
6. Welche Sprachen werden zuerst unterstützt?
7. Welches Barrierefreiheitsziel gilt für Kontrast, Farbwahrnehmung, Bewegung, Audio und Screenreader?
8. Welche Aktionen erhalten Haptik, Sound oder Animation?
9. Wie werden Regeln erklärt: Intro, kontextuelle Hinweise, Nachschlageansicht oder Kombination?

## P2 – Betrieb, Datenschutz und Qualität

1. Welche maximale Anzahl gleichzeitiger Sitzungen und Verbindungen wird erwartet?
2. Welche Diagnose-, Telemetrie- oder Spielstatistiken dürfen gespeichert werden?
3. Welche Aufbewahrungs- und Löschregeln gelten?
4. Welche Hosting-, Monitoring- und Supportumgebung ist vorgesehen?
5. Welche Latenz-, Reconnect- und Verfügbarkeitsziele gelten?
6. Welche Geräte-/Browserkombinationen werden offiziell unterstützt?
7. Benötigt ein Release Schutz gegen öffentliches Raumcode-Raten, Missbrauch und Denial of Service über lokale Grenzen hinaus?

## Technischer Stand nach Auftrag 004

Workspace, Node-Untergrenze, Validator, Token-Grundstrategie und neutraler Startzustand wurden mit Auftrag 003 entschieden. Auftrag 004 setzt folgende konservative Alpha-Defaults um:

- Moduswahl wird gespeichert, startet aber nur einen neutralen Platzhalterzustand.
- Sitzungen sind zunächst In-Memory und überleben keinen Serverneustart.
- Spieler- und Hostidentität beruhen auf servergenerierten, lokal gespeicherten Tokens.
- Die Alpha wird zuerst im lokalen Heimnetz getestet, ohne Deployment.
- Verbundene Räume werden nicht zeitbasiert entfernt; ohne Verbindungen gelten sechs Stunden Inaktivität, 30 Minuten Host-Verwaisung und fünf Minuten Closed-Retention.
- Reconnect-Credentials gelten für die Lebenszeit des In-Memory-Raums und werden in dieser Alpha noch nicht rotiert.
- Der Server läuft als einzelner Prozess; horizontale Skalierung und externe Socket.IO-Adapter bleiben offen.

Gameplay-Konflikte bleiben bis Alpha 0.2 dokumentiert offen und dürfen in Auftrag 004 nicht implementiert werden.

## Priorisierte Entscheidungen für Auftrag 005

- Festlegen, wie TV und Controller die Serverbasis-URL im lokalen Netz erhalten.
- Festlegen, welche exakten Development-Origins für die beiden Vite-Apps verwendet werden.
- Entscheiden, ob Host-Credentials zunächst in `sessionStorage` oder raumspezifisch in `localStorage` aufbewahrt werden.
- Definieren, wie die TV-Lobby einen dauerhaft verlorenen Hostzugang erklärt; eine Wiederherstellung ohne Token existiert nicht.

## Technischer Stand nach Auftrag 005

- Die TV-Lobby nutzt `sessionStorage` für Reload-Recovery innerhalb derselben Tab-Sitzung.
- Server- und öffentliche Join-URL sind getrennt konfigurierbar; LAN-Adressen werden nicht automatisch geraten.
- Die UI rendert ausschließlich validierte Server-Snapshots und serverseitige `allowedActions`.
- Der QR-Bereich ist vorbereitet, enthält aber bewusst noch keinen generierten QR-Code.
- Ein verlorenes oder ungültiges Hosttoken führt in einen expliziten Fehlerzustand; automatische Hostübernahme existiert nicht.

## Priorisierte Entscheidungen für Auftrag 006

- Konkreter Controller-Pfad und Deep-Link-Format für `VITE_PUBLIC_JOIN_URL`.
- Raumspezifische Speicherung der Spieler-Credentials und Verhalten bei mehreren Räumen.
- QR-Bibliothek beziehungsweise kleine lokale QR-Implementierung ohne externen Dienst.
- Smartphone-Mindestbrowser und Ziel-Viewports 320, 390 und 430 Pixel.
- Nutzerführung bei ungültigem Code, vollem Raum, doppeltem Namen und verlorenem Spieler-Credential.

## Technischer Stand nach Auftrag 006

- Controller-Deep-Link verwendet den Queryparameter `room`; manuelle Eingabe bleibt möglich.
- QR-Codes entstehen lokal und enthalten keine Credentials.
- Spieler-Credentials liegen raumspezifisch in `localStorage` und werden bei invalidem Token oder Raumende entfernt.
- Zielbreiten 320, 375, 390 und 430 Pixel sind automatisiert geprüft.
- TV, zwei getrennte Smartphone-Kontexte und ein Acht-Spieler-Beitritt sind mit dem echten Server getestet.

## Priorisierte Entscheidungen für Auftrag 007

- Ob A01.6 zunächst als Hardware-/Netzwerkstabilisierung oder bereits als Einstieg in Alpha 0.2 Classic geschnitten wird.
- Verbindliche Browser-/Gerätematrix und reales TV-/Smartphone-Abnahmeprotokoll.
- HTTPS-Strategie im Heimnetz und Umgang mit iOS-/Android-Browserbeschränkungen.
- Aufbewahrungsdauer und Rotation von Host-/Spieler-Credentials vor länger laufenden Tests.
