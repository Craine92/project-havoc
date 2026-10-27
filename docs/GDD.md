# Project Havoc – Game Design Document

## Dokumentstatus

- Status: Fundament / Vorproduktion
- Gültig für: Auftrag 001
- Regel: Dieses Dokument beschreibt nur bestätigte Anforderungen. Nicht definierte Regeln sind ausdrücklich als offen gekennzeichnet.

## Spielvision

Project Havoc ist ein browserbasiertes lokales Multiplayer-Partyspiel. Ein PC oder Fernseher zeigt das gemeinsame Spielgeschehen, während alle Mitspielenden ihr eigenes Smartphone ohne Installation als persönlichen Controller verwenden.

Das Spielerlebnis soll schnell verständlich, chaotisch, unterhaltsam und unmittelbar sein. Die gemeinsame Anzeige erzeugt den sozialen Mittelpunkt; private Eingaben und individuelle Informationen können auf den Smartphones erscheinen. Project Havoc wird vollständig neu entwickelt. Aus Rune Riot werden weder Quellcode noch Komponenten oder Implementierungsdetails übernommen, und das bestehende Rune-Riot-Projekt bleibt unverändert.

## Zielgruppe und Nutzungskontext

### Primäre Zielgruppe

- Gruppen, die gemeinsam vor einem PC oder Fernseher spielen
- Gelegenheitsspielende mit unterschiedlichen Erfahrungsstufen
- Spielrunden, die ohne Installation und mit kurzer Einstiegshürde starten möchten

### Nutzungskontext

- Gemeinsamer Hauptbildschirm mit größerem Betrachtungsabstand
- Persönliche Smartphones als Controller
- Lokale Spielgruppe, technisch über eine browserbasierte Sitzung verbunden
- Kurze Erklärungszeit und klar erkennbare Handlungsaufforderungen

Konkrete Angaben zu Mindest- und Maximalspielerzahl, Alterszielgruppe, Barrierefreiheitsumfang, Plattform- und Browserunterstützung sowie gewünschter Sitzungsdauer sind noch offen.

## Grundlegender Spielablauf

Der bestätigte Ablauf auf Produktebene ist:

1. Ein Host öffnet die TV-Oberfläche und erstellt eine Sitzung.
2. Die TV-Oberfläche zeigt einen QR-Code und eine alternative Beitrittsmöglichkeit.
3. Spielende öffnen die Controller-Oberfläche auf ihren Smartphones und treten der Sitzung bei.
4. Die Spielenden wählen beziehungsweise bestätigen ihre Namen und erscheinen in der Lobby.
5. Der Host startet das Spiel, sobald die dafür erforderlichen Bedingungen erfüllt sind.
6. Der Server führt den ausgewählten Spielmodus autoritativ aus und synchronisiert relevante Zustände.
7. Die Spielenden geben Aktionen über ihre Controller ab; der Server validiert und verarbeitet sie.
8. Die TV-Oberfläche stellt den gemeinsamen Verlauf und das Ergebnis dar.
9. Unterbrochene Clients können sich im vorgesehenen Reconnect-Fenster wieder mit ihrer Spieleridentität verbinden.

Welche Aktionen, Rundenphasen, Wertungen und Siegbedingungen dabei gelten, ist noch nicht vollständig festgelegt.

## Spielmodi

### Classic-Modus

Bestätigt sind:

- ein eigenständiges Regelwerk
- ein rundenbasierter Ablauf
- Eingaben beziehungsweise Aktionen der Spielenden
- eine definierte Siegbedingung
- eindeutige serverseitige Regelprüfung

Noch nicht definiert sind unter anderem Rundenstruktur, erlaubte Aktionen, Zugreihenfolge, Ressourcen, Punktevergabe, Konfliktauflösung, Ausscheiden, Gleichstände und genaue Siegbedingungen. Bis zur Freigabe dieser Regeln darf keine konkrete Classic-Mechanik implementiert werden.

### Chaos-Modus

Bestätigt sind:

- ein eigenständiges Regelwerk
- genau fünf Chaos-Karten
- genau sechs Zeitereignisse
- Reaktionsmöglichkeiten für Spielende
- Zeitlimits und definiertes Timeout-Verhalten
- eine Finalphase
- eine Entscheidung im Zusammenhang mit 25 Minuten

Karteneffekte, Auslösebedingungen, Reihenfolge und Wirkung der Zeitereignisse, erlaubte Reaktionen, Fristen, Timeout-Folgen, Übergang in die Finalphase sowie die genaue Bedeutung der 25-Minuten-Entscheidung sind offen. Es werden keine Platzhaltereffekte als vermeintliche Regeln festgelegt.

## Bekannte funktionale Anforderungen

- Lokale Multiplayer-Sitzungen
- Beitritt per QR-Code
- Smartphone-Controller ohne Installation
- Lobby und Spielernamen
- Spielstart durch den Host
- Reconnect von Spielenden
- synchronisierte Spielzustände
- mehrere gleichzeitig verbundene Clients
- serverautoritative Entscheidungen und Ergebnisse
- getrennte Regelwerke für Classic und Chaos

## UX- und Designprinzipien

### Gemeinsame Prinzipien

- Jede Ansicht hat eine klar erkennbare Hauptaktion.
- Zustandswechsel erhalten unmittelbares visuelles Feedback.
- Texte und Interaktionen verwenden konsistente Begriffe.
- Fehler erklären knapp, was passiert ist und wie es weitergeht.
- Animation unterstützt Orientierung und Feedback, blockiert aber keine Eingabe unnötig.
- Kritische Zustände werden nicht ausschließlich über Farbe kommuniziert.
- Verbindungsstatus und Wiederverbindung sind jederzeit verständlich.
- Technische Details wie Socket-IDs erscheinen nicht als Spieleridentität.

### TV-Oberfläche

- Aus mehreren Metern Entfernung gut lesbar
- Große Typografie und starke visuelle Hierarchie
- QR-Code mit zusätzlichem Kurzcode beziehungsweise lesbarer Beitrittsinformation
- Klar erkennbare Lobby-, Spiel-, Pausen-, Reconnect- und Ergebniszustände
- Keine Bedienung voraussetzen, die dauerhaft eine Person am PC bindet

### Smartphone-Controller

- Für schmale Hochformat-Displays optimiert
- Große Touch-Ziele und ausreichende Abstände
- Keine Hover-abhängigen Interaktionen
- Eindeutige Anzeige, ob eine Aktion empfangen, akzeptiert oder abgelehnt wurde
- Robustes Verhalten bei Rotation, Hintergrundwechsel und kurzzeitigem Netzverlust
- Private Informationen bleiben auf dem persönlichen Controller, sofern die späteren Regeln dies verlangen

## Nichtfunktionale Qualitätsziele

- Konsistenter Zustand für alle Clients trotz kurzzeitiger Verbindungsprobleme
- Reaktionsschnelle Eingaben in einem lokalen Netzwerk
- Nachvollziehbare serverseitige Entscheidungen
- Testbare, voneinander unabhängige Regelmodule
- Bedienbarkeit ohne App-Installation
- Erweiterbarkeit um weitere Modi, ohne bestehende Regeln zu vermischen

Messbare Zielwerte für Latenz, unterstützte Clientzahl, Reconnect-Dauer, Browsermatrix und Barrierefreiheit werden erst nach Produktentscheidung festgelegt.

## Fehlende Regeldefinitionen

Vor einer Gameplay-Implementierung müssen mindestens folgende Bereiche spezifiziert und freigegeben werden:

- Spielerzahl und Voraussetzungen für den Spielstart
- vollständige Runden- und Phasenmodelle beider Modi
- sämtliche zulässigen Spieleraktionen und ihre Validierungsregeln
- Reihenfolge und Gleichzeitigkeit von Aktionen
- Punkte-, Fortschritts-, Sieg-, Niederlagen- und Gleichstandsregeln
- Inhalt und Wirkung der fünf Chaos-Karten
- Inhalt, Zeitpunkte und Wirkung der sechs Zeitereignisse
- Reaktionsfenster und Timeout-Folgen
- Finalphase und 25-Minuten-Entscheidung
- Verhalten bei Disconnect, Reconnect, Aufgabe und Host-Ausfall
- gewünschter Umgang mit Zuschauenden und nachträglich Beitretenden

Die priorisierte Frageliste befindet sich in `OPEN_QUESTIONS.md`.

## Bewusste Abgrenzung

Nicht Bestandteil dieses Dokuments beziehungsweise von Auftrag 001 sind konkrete Spielregeln, Balancing, audiovisuelle Assets, Monetarisierung, Deployment und lauffähiger Anwendungscode.
