# Project Havoc – Architekturentscheidungen

## Verwendung dieses Dokuments

Dieses Dokument ist ein leichtgewichtiges Entscheidungsprotokoll. Der Status lautet `Entschieden`, `Vorgeschlagen` oder `Offen`. Eine getroffene Entscheidung wird nicht still überschrieben; Änderungen erhalten einen neuen Eintrag mit Verweis auf die ersetzte Entscheidung.

## D-001 – TypeScript im Strict Mode

**Status:** Entschieden

**Entscheidung:** Sämtlicher künftiger Anwendungs- und Testcode wird in TypeScript mit aktiviertem Strict Mode geschrieben.

**Begründung:** Gemeinsame Verträge zwischen Server, TV und Controller werden früh geprüft; unklare Null- und Union-Fälle werden sichtbar.

**Verworfene Alternativen:** JavaScript ohne statische Typen; unterschiedliche Strenge pro Paket. Beide erhöhen Integrationsrisiken.

## D-002 – Server als einzige Autorität

**Status:** Entschieden

**Entscheidung:** Nur der Server darf verbindliche Spielzustände, Zeitentscheidungen, Punkte und Ergebnisse erzeugen.

**Begründung:** Mehrere Clients benötigen eine konsistente Wahrheit; Clientdaten sind nicht vertrauenswürdig.

**Verworfene Alternativen:** Clientautorität oder Mehrheitsentscheidung der Clients. Beides erschwert Validierung, Reconnect und Manipulationsschutz.

## D-003 – Getrennte Anwendungen in einem Monorepo

**Status:** Vorgeschlagen

**Entscheidung:** Server, TV und Controller werden als getrennte Apps in einem gemeinsamen Workspace geführt; Protokoll, Domäne und Regelwerke liegen in fokussierten Paketen.

**Begründung:** Eine Versionierungs- und Testbasis bei klaren Laufzeitgrenzen. Gemeinsame Typen können ohne Kopieren genutzt werden.

**Verworfene Alternativen:** Mehrere Repositories erzeugen vorerst unnötigen Versions- und Releaseaufwand. Eine einzige ungetrennte Anwendung vermischt Rollen und Vertrauensgrenzen.

## D-004 – Gemeinsames, versioniertes Protokollpaket

**Status:** Vorgeschlagen

**Entscheidung:** Events, DTOs, Laufzeitschemas, Fehlercodes und Protokollversion werden in `packages/protocol` definiert.

**Begründung:** Compile-Time-Typen allein validieren keine Netzwerkdaten. Eine zentrale Definition reduziert Drift.

**Verworfene Alternativen:** Doppelte Typdefinitionen je App; frei geformte Eventpayloads.

## D-005 – Regelwerke als transportfreie Module

**Status:** Entschieden

**Entscheidung:** Classic und Chaos werden in getrennten Modulen implementiert, ohne React- oder Socket.IO-Abhängigkeit.

**Begründung:** Regeln bleiben isoliert, deterministisch testbar und austauschbar. Unvollständige Regeln eines Modus beeinflussen den anderen nicht.

**Verworfene Alternativen:** Große zentrale Game-Engine mit Modusverzweigungen. Dafür gibt es noch keinen Bedarf und sie erhöht Kopplung.

## D-006 – Absichten statt Clientzustand übertragen

**Status:** Entschieden

**Entscheidung:** Clients senden kleine, validierbare Absichten. Der Server antwortet mit Ergebnis und autoritativer Zustandsprojektion.

**Begründung:** Verhindert, dass Clients Ergebnisse setzen, und macht Ablehnungsgründe sowie Tests klar.

**Verworfene Alternativen:** Vollständige Clientzustände übernehmen oder Client-Patches ungeprüft anwenden.

## D-007 – Revisionen, Aktions-IDs und vollständige Resynchronisation

**Status:** Vorgeschlagen

**Entscheidung:** Serverseitige Zustände besitzen Revisionen; verändernde Clientaktionen eindeutige IDs. Nach Reconnect wird ein vollständiger, rollenbezogener Snapshot geliefert.

**Begründung:** Unterstützt Reihenfolgeprüfung, Deduplizierung und robuste Wiederherstellung nach Eventverlust.

**Verworfene Alternativen:** Ausschließlich inkrementelle Events ohne Snapshot; Vertrauen auf Socket-Verbindung als Identität.

## D-008 – Serielle Verarbeitung je Sitzung

**Status:** Vorgeschlagen

**Entscheidung:** Aktionen und Timerereignisse einer Sitzung werden in einer eindeutigen Reihenfolge verarbeitet.

**Begründung:** Vermeidet konkurrierende Zustandsänderungen und macht zeitkritische Regeln reproduzierbar.

**Verworfene Alternativen:** Parallele Mutation desselben Sitzungszustands mit nachträglicher Konfliktauflösung. Für die erwartete lokale Last unnötig komplex.

## D-009 – Injizierbare Zeit und Zufallsquelle

**Status:** Vorgeschlagen

**Entscheidung:** Regelcode liest Zeit und Zufall nicht direkt aus globalen APIs, sondern über kleine Schnittstellen.

**Begründung:** Zeitlimits, Ereignisse und zufällige Effekte werden deterministisch testbar und diagnostizierbar.

**Verworfene Alternativen:** Direkte Nutzung von Systemzeit und globalem Zufall im Regelcode.

## D-010 – In-Memory-Sitzungen als Startpunkt

**Status:** Vorgeschlagen

**Entscheidung:** Die erste lokale Version hält aktive Sitzungen im Serverprozess hinter einer Repository-Schnittstelle.

**Begründung:** Minimiert Infrastruktur, solange Neustart-Wiederherstellung und horizontale Skalierung nicht gefordert sind.

**Verworfene Alternativen:** Sofortige Datenbank- oder Event-Sourcing-Einführung. Der bestätigte Nutzen rechtfertigt die Komplexität noch nicht.

## D-011 – Getrennte TV- und Controller-Projektionen

**Status:** Entschieden

**Entscheidung:** Der Server erzeugt empfängerbezogene Zustandsansichten; private Daten werden nicht an alle Clients gesendet und nur in der UI verborgen.

**Begründung:** UI-Verbergen ist keine Sicherheitsgrenze und würde geheime Spielerinformationen offenlegen.

**Verworfene Alternativen:** Einheitlicher Vollzustand für alle Clients.

## D-012 – Wiederverwendung erst bei nachgewiesenem Bedarf

**Status:** Entschieden

**Entscheidung:** Geteilte UI-Komponenten werden erst extrahiert, wenn TV und Controller tatsächlich dieselbe Semantik benötigen. Protokoll und Domänentypen dürfen von Anfang an geteilt werden.

**Begründung:** TV und Smartphone haben unterschiedliche Interaktions- und Darstellungsanforderungen. Verfrühte Abstraktion verlangsamt Änderungen.

**Verworfene Alternativen:** Ein universelles Komponentenpaket vor Entwicklung der ersten Ansichten.

## D-013 – Classic und Chaos als bestätigter Zielkern

**Status:** Entschieden für Alpha-Planung

**Entscheidung:** Project Havoc plant zunächst Classic und Chaos. Der in Rune Riot zusätzlich vorhandene `mercy`-Bestandspfad ist kein stillschweigender dritter Zielmodus.

**Begründung:** Auftrag 002 fordert ausdrücklich Classic und Chaos. Der Mercy-Pfad enthält mehrere dokumentarische Konflikte und würde Umfang sowie Regelrisiko vergrößern.

**Verworfene Alternativen:** Alle drei Referenzregeln ungeprüft übernehmen.

## D-014 – Gemeinsamer Basiskartenkern, getrennte Moduskomposition

**Status:** Entschieden

**Entscheidung:** Gemeinsame Karten-, Zug- und +4-Regeln liegen in `game-core`. Classic und Chaos konfigurieren beziehungsweise erweitern diesen Kern in getrennten Paketen; keines importiert das andere.

**Begründung:** Chaos verwendet nachweislich die Classic-Basis. Duplizierung würde zu Regelabweichungen führen, eine direkte Chaos-zu-Classic-Abhängigkeit würde die Modusgrenze verwischen.

**Verworfene Alternativen:** Kopierte Regelimplementierungen; ein einziges Modul mit verstreuten `if (chaos)`-Verzweigungen.

## D-015 – TV als sitzlose `display-host`-Rolle

**Status:** Entschieden

**Entscheidung:** Die TV-Verbindung besitzt eine eigene Rolle, zählt nicht als Spieler und darf keine Gameplay-Intents senden. Sie erhält eine serverseitig erzeugte öffentliche Projektion.

**Begründung:** Das entspricht dem rekonstruierten Couch-Konzept und verhindert versehentliche Preisgabe privater Hände.

**Verworfene Alternativen:** TV als Spieler mit versteckter Hand; ein Vollsnapshot, aus dem die UI Felder ausblendet.

## D-016 – Eigenständige Reconnect-Berechtigungen ohne Accountpflicht

**Status:** Entschieden für Alpha 0.1

**Entscheidung:** Der Project-Havoc-Server stellt nicht erratbare Host- und Spieler-Reconnect-Berechtigungen aus. Alpha 0.1 verlangt keinen externen Account- oder Supabase-Dienst.

**Begründung:** Lokale Spielrunden sollen ohne Installation und unnötige externe Infrastruktur funktionieren. Anzeigename und Socket-ID sind keine sichere Identität.

**Verworfene Alternativen:** Identität nur über Namen; Socket-ID als Sitz; Übernahme der Supabase-Abhängigkeit der Referenz.

## D-017 – Serverdeadlines als serialisierte Commands

**Status:** Entschieden

**Entscheidung:** Alle fachlichen Timer verwenden absolute Serverdeadlines und treten bei Fälligkeit als Commands in dieselbe serielle Sitzungsverarbeitung wie Clientaktionen ein.

**Begründung:** Chaos-Ereignisse dürfen laufende Auflösungen nicht unterbrechen. Reconnect und verzögerte Nachrichten benötigen eine eindeutige Reihenfolge.

**Verworfene Alternativen:** Verbindliche Clienttimer; voneinander unabhängige Callbacks, die denselben Zustand parallel mutieren.

## D-018 – Mehrschichtiges Zustandsmodell

**Status:** Entschieden

**Entscheidung:** Sitzungsphase, Zugzustand und Chaos-Unterzustand werden getrennt modelliert. Übergänge sind explizite, vollständig validierte Commands.

**Begründung:** Reaktion, Ereignis und Sitzungslobby haben unterschiedliche Akteure und Berechtigungen. Ein einzelnes unspezifisches Statusfeld würde ungültige Kombinationen begünstigen.

**Verworfene Alternativen:** UI-gesteuerte Boolesche Flags; frei kombinierbare Statusfelder ohne Invarianten.

## D-019 – Alpha 0.1 als vertikaler Lobby-Schnitt

**Status:** Entschieden

**Entscheidung:** Alpha 0.1 endet bei einem startbaren Server, startbaren TV-/Controller-Apps, QR-/Code-Beitritt, Namen, Ready, mehreren Clients, Hoststart-Gate und grundlegendem Reconnect. Es enthält keine Kartenengine.

**Begründung:** Der Schnitt validiert Netzwerk, Rollen, Privatsphäre und Gerätefluss, bevor Regelkomplexität hinzukommt.

**Verworfene Alternativen:** Bereits in Alpha 0.1 einen unvollständigen Classic-Zug implementieren.

## D-020 – npm Workspaces und Laufzeitbasis

**Status:** Entschieden und umgesetzt

**Entscheidung:** Das Monorepo verwendet npm Workspaces, npm 11 und Node.js ab Version 22.12. Die installierte Umgebung verwendet Node.js 24 und erzeugt eine Lockdatei im Format 3.

**Begründung:** npm ist Teil der vorhandenen Node-Installation und erfüllt den kleinen Workspace ohne zusätzliches Orchestrierungswerkzeug. Die Untergrenze deckt die Anforderungen des aktuellen Vite-Toolings ab.

**Verworfene Alternativen:** pnpm, Yarn und ein zusätzliches Monorepo-Framework ohne belegten Bedarf.

## D-021 – Zod für Wire-Validierung

**Status:** Entschieden und umgesetzt

**Entscheidung:** `packages/protocol` verwendet Zod 4 und strikt geschlossene Objektschemas. Die interne Lobby-Domäne besitzt davon getrennte Typen und Regeln.

**Begründung:** Netzwerkdaten benötigen Laufzeitprüfung; Zod liefert Typableitung und verständliche Validierungsfehler bei geringer Zusatzarchitektur.

**Verworfene Alternativen:** ausschließlich TypeScript-Typen; eigene allgemeine Schema-Engine.

## D-022 – Reconnect-Token als deterministisches HMAC-Credential

**Status:** Entschieden und umgesetzt

**Entscheidung:** Ein Serveradapter leitet ein opakes Token deterministisch aus einem eindeutigen Credential-Subject und einem mindestens 32 Byte langen Servergeheimnis ab. Die Domäne speichert ausschließlich den SHA-256-Digest und verwendet konstante Zeit beim Vergleich.

**Begründung:** Derselbe erfolgreiche Join kann bei wiederholter Aktions-ID dieselbe private Antwort liefern, ohne Roh-Tokens im Sitzungszustand zu speichern. Die Domäne bleibt durch Injektion unabhängig von Node-Kryptografie.

**Verworfene Alternativen:** Anzeigename oder Socket-ID als Identität; Klartexttoken im öffentlichen oder Domänenzustand; zufällige Neuausgabe bei jedem Retry.

## D-023 – Atomarer neutraler Startzustand

**Status:** Entschieden für Alpha 0.1A

**Entscheidung:** Der reine Lobby-Command wechselt atomar von `lobby` nach `started`. Ein persistierter Zustand `starting` wird erst eingeführt, wenn eine spätere Startsequenz tatsächlich asynchrone oder wiederaufnehmbare Teilschritte besitzt.

**Begründung:** Alpha 0.1A erzeugt weder Deck noch Netzwerknebenwirkungen. Ein derzeit unbeobachtbarer Zwischenzustand hätte keine Invariante und wäre vorsorgliche Komplexität.

**Verworfene Alternativen:** Ein sofort wieder verlassener `starting`-Status ohne fachlich mögliche Beobachtung.

## D-024 – Ein versioniertes Socket.IO-Nachrichtenpaar

**Status:** Entschieden und umgesetzt

**Entscheidung:** Clients senden ausschließlich `client.message`; der Server sendet ausschließlich `server.message`. Der Nachrichtentyp im validierten Payload bestimmt die konkrete Aktion oder Antwort.

**Begründung:** Eine zentrale Vertrauensgrenze erzwingt Größen-, Versions- und Schemavalidierung konsistent. Neue Aktionen benötigen keine parallel gepflegte Socket-Eventtypisierung.

**Verworfene Alternativen:** Ein unvalidiertes Socket-Event pro Aktion; Transporttypen direkt in `game-core`.

## D-025 – Serielle Warteschlange je Raum

**Status:** Entschieden und umgesetzt

**Entscheidung:** Jeder Raum besitzt eine unabhängige Promise-Warteschlange. Der Dispatcher liest, verarbeitet und speichert ein Domänenresultat innerhalb derselben seriellen Operation; verschiedene Räume blockieren einander nicht.

**Begründung:** Damit können konkurrierende Smartphone-Aktionen keinen Zustand überschreiben, während die kleine lokale Alpha keine globale Queue oder externe Lock-Infrastruktur benötigt.

**Verworfene Alternativen:** Globale Serverwarteschlange; ungeschützte nebenläufige Mutation; Datenbanklock ohne Datenbankbedarf.

## D-026 – Konservative In-Memory-Retention

**Status:** Entschieden für Alpha 0.1B

**Entscheidung:** Verbundene Räume werden nie zeitbasiert entfernt. Ohne Verbindungen gelten sechs Stunden Inaktivität, 30 Minuten für verwaiste Host-Sitzungen und fünf Minuten nach explizitem Schließen. Alle Werte sind konfigurierbar.

**Begründung:** Aktive Runden bleiben sicher erhalten; lokale Entwicklungsprozesse geben verlassenen Speicher dennoch automatisch frei.

**Verworfene Alternativen:** Unbegrenzte Aufbewahrung; Bereinigung trotz aktiver Verbindungen; Datenbankpersistenz in Alpha 0.1B.

## D-027 – Transportseitige Revision für Mitgliedschaftsoperationen

**Status:** Entschieden und umgesetzt

**Entscheidung:** Join und Reconnect werden innerhalb der Raumwarteschlange mit der aktuellen Serverrevision an die Domäne übergeben. Authentifizierte Folgebefehle müssen die vom Client zuletzt empfangene Revision exakt angeben.

**Begründung:** Ein noch nicht gebundener oder gerade getrennter Client kann die durch andere Teilnehmer beziehungsweise seinen Disconnect erhöhte Revision nicht zuverlässig kennen. Idempotenz bleibt über die Aktions-ID erhalten; normale konkurrierende Änderungen bleiben strikt revisionsgeschützt.

**Verworfene Alternativen:** Reconnect mit zwangsläufig veralteter Revision ablehnen; Revisionsprüfung für alle Befehle abschalten.

## D-028 – Additive Erweiterung der unveröffentlichten Protokollversion 1

**Status:** Entschieden und umgesetzt

**Entscheidung:** Protokollversion 1 erhält vor dem ersten UI-Client die Aktion `room.close`, rollenbezogene `allowedActions` und die Fehlercodes `RATE_LIMITED` sowie `PAYLOAD_TOO_LARGE`.

**Begründung:** Es existiert noch kein veröffentlichter oder unterstützter Client. Ein Versionssprung würde daher keine reale Kompatibilitätsgrenze schützen; ab Auftrag 005 gelten diese Schemas als Clientvertrag.

**Verworfene Alternativen:** Eine Version 2 ohne existierenden Version-1-Verbraucher; Transportfehler außerhalb des Protokolls.

## D-029 – Tab-begrenzte Host-Credentials

**Status:** Entschieden für Alpha 0.1C

**Entscheidung:** Der TV speichert Host-Credentials und die letzte bekannte Revision in `sessionStorage`, nicht in `localStorage`, URL oder Cookie.

**Begründung:** Ein Reload kann dieselbe Sitzung wiederherstellen, während das Credential nach dem Ende der Browser-Tab-Sitzung nicht dauerhaft verbleibt. Der Server bleibt für jede Wiederverbindung prüfende Autorität.

**Verworfene Alternativen:** Token in der Join-URL; nur flüchtiger React-Zustand ohne Reload; langfristiges `localStorage` ohne bestätigten Produktbedarf.

## D-030 – Explizite öffentliche Join-URL

**Status:** Entschieden und umgesetzt

**Entscheidung:** Serverendpunkt und öffentliche Controller-Join-Basis sind getrennte Vite-Konfigurationen. Der Client errät keine LAN-IP und zeigt fehlende Join-Konfiguration sichtbar an.

**Begründung:** `localhost` verweist auf einem Smartphone auf das Smartphone. Mehrere Adapter, VPNs und Firewalls verhindern eine verlässliche sichere Browser-Autodetektion.

**Verworfene Alternativen:** Fest codierte private IP; automatische Veröffentlichung; stillschweigende Anzeige einer wahrscheinlich unerreichbaren URL.

## D-031 – Autoritative UI ohne optimistische Lobbyänderung

**Status:** Entschieden und umgesetzt

**Entscheidung:** Modus, Roster, Ready, Start und Raumphase werden ausschließlich aus Server-Snapshots gerendert. Die UI markiert eine Anfrage als ausstehend, verändert den fachlichen Zustand aber nicht vor Bestätigung.

**Begründung:** Ablehnungen und konkurrierende Aktionen bleiben sichtbar konsistent; Geschäftsregeln und `allowedActions` leben in der Domänenprojektion.

**Verworfene Alternativen:** Lokale Modusumschaltung mit späterem Rollback; im React-Code duplizierte Startregeln.

## Offene technische Entscheidungen

| ID | Frage | Benötigt vor |
| --- | --- | --- |
| O-002 | Welche Browser- und Geräteversionen werden unterstützt? | Releaseplanung |
| O-004 | Wie werden TV und Smartphones im Zielnetz verbunden und wie lautet die öffentliche Join-URL? | Phase 4 |
| O-005 | Ist HTTPS im lokalen Zielbetrieb erforderlich und wie werden Zertifikate bereitgestellt? | Phase 4 |
| O-006 | Wie lange bleiben Sitzungen und Reconnect-Berechtigungen gültig? | Phase 4 |
| O-007 | Muss eine Sitzung einen Serverneustart überleben? | Vor Persistenzentscheidung |
| O-008 | Welche Last- und Skalierungsziele gelten? | Vor Phase 8 |
| O-009 | Welche Telemetrie ist erlaubt und wie lange wird sie gespeichert? | Vor produktivem Betrieb |
| O-010 | Welche konkrete Ablauf- und Widerrufspolitik gilt für Host- und Reconnect-Berechtigungen? | Alpha 0.1 |
| O-011 | Wie lange müssen verarbeitete Aktions-IDs für Deduplizierung aufbewahrt werden? | Vor langlebigen/produktiven Sitzungen |

## Ausdrücklich nicht entschieden

- Die in `GDD.md` markierten widersprüchlichen Classic-Regeln
- finales Balancing, Reihenfolge und Benennung der Chaos-Karten und Zeitereignisse
- Visueller Stil, Audio-Stil und Markenidentität
- Hosting-Anbieter, Datenbank und Deploymentplattform
- Monetarisierung oder Accountsystem

Diese Punkte dürfen nicht implizit durch eine technische Implementierung vorweggenommen werden.
