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

## Offene technische Entscheidungen

| ID | Frage | Benötigt vor |
| --- | --- | --- |
| O-001 | Welcher Paketmanager und welches Workspace-Werkzeug werden verwendet? | Phase 2 |
| O-002 | Welche Node.js-, Browser- und Geräteversionen werden unterstützt? | Phase 2 / Releaseplanung |
| O-003 | Welche Bibliothek übernimmt Laufzeit-Schemavalidierung? | Phase 3 |
| O-004 | Wie werden TV und Smartphones im Zielnetz verbunden und wie lautet die öffentliche Join-URL? | Phase 4 |
| O-005 | Ist HTTPS im lokalen Zielbetrieb erforderlich und wie werden Zertifikate bereitgestellt? | Phase 4 |
| O-006 | Wie lange bleiben Sitzungen und Reconnect-Berechtigungen gültig? | Phase 4 |
| O-007 | Muss eine Sitzung einen Serverneustart überleben? | Vor Persistenzentscheidung |
| O-008 | Welche Last- und Skalierungsziele gelten? | Vor Phase 8 |
| O-009 | Welche Telemetrie ist erlaubt und wie lange wird sie gespeichert? | Vor produktivem Betrieb |
| O-010 | Wird TV-Steuerung nur über Browser-UI, zusätzlich per Controller oder anderweitig ausgelöst? | Phase 1 / 4 |

## Ausdrücklich nicht entschieden

- Konkrete Classic- oder Chaos-Regeln
- Effekte der Chaos-Karten und Zeitereignisse
- Visueller Stil, Audio-Stil und Markenidentität
- Hosting-Anbieter, Datenbank und Deploymentplattform
- Monetarisierung oder Accountsystem

Diese Punkte dürfen nicht implizit durch eine technische Implementierung vorweggenommen werden.
