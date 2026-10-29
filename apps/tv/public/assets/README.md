# Bilder, Sounds und Stimmen

Alle Dateien liegen **nur hier** (`apps/tv/public/assets/`). TV und Handys benutzen denselben Ordner.

1. Datei mit **genau dem Namen aus der Tabelle** in den passenden Ordner legen.
2. Seite neu laden. Fertig.
3. `npm run assets:check` zeigt dir, was schon da ist und was noch fehlt.

Fehlt eine Datei, läuft das Spiel trotzdem. Dann siehst du das Symbol bzw. hörst nichts.

---

## 🎨 Einheitlicher Stil (für alle Bilder)

Schreib diesen Satz bei ChatGPT **vor jeden** Bild-Prompt, damit alles zusammenpasst:

> Stil: gemalte Fantasy-Illustration, Karibik-Piraten im 18. Jahrhundert, dunkle Nacht mit Mondlicht, warme Goldakzente, kräftige Farben, leicht verwittert wie eine alte Schatzkarte, keine Schrift, keine bekannten Filmfiguren.

Keine Namen oder Figuren aus „Fluch der Karibik“ verwenden (Jack Sparrow, Black Pearl usw.), die gehören Disney.

---

## 🖼 Bilder allgemein (`img/`)

| Datei | Größe | Wofür | Prompt |
| --- | --- | --- | --- |
| `img/logo.png` | 800×320, transparent | Logo oben links am TV | „Schriftzug PROJECT HAVOC als Piraten-Logo, goldene Buchstaben, kleiner Totenkopf mit gekreuzten Säbeln, transparenter Hintergrund“ |
| `img/table.jpg` | 1920×1080 | Hintergrund hinter dem Spieltisch | „Dunkles Holzdeck eines Geisterschiffs bei Mondlicht, Nebel, Laternen am Rand, Blick von oben, die Mitte ruhig und dunkel“ |

## 🃏 Kartenbilder (`img/cards/`, Hochformat 500×760)

Das Bild füllt die ganze Karte. Name und Ecken legt das Spiel selbst darüber, also **keine Schrift** ins Bild.

| Datei | Karte | Was sie macht | Prompt |
| --- | --- | --- | --- |
| `cards/back.png` | Kartenrückseite | – | „Kartenrückseite: goldener Totenkopf mit gekreuzten Säbeln auf dunkelrotem Samt, verzierter Goldrahmen, symmetrisch“ |
| `cards/compass.png` | Kompass | Passt immer, du wählst die Farbe | „Alter Messingkompass auf einer Schatzkarte, die Nadel leuchtet in vier Farben: rot, gold, grün, blau“ |
| `cards/broadside.png` | Breitseite +4 | Farbe wählen, der Nächste zieht 4 | „Piratenschiff feuert eine volle Breitseite, vier Kanonen, Mündungsfeuer und Rauch, nachts auf dem Meer“ |
| `cards/mutiny.png` | ⚔ Meuterei | Hand mit einem Gegner tauschen | „Zwei Piraten kreuzen auf Deck die Säbel, Funken fliegen, Matrosen jubeln im Hintergrund“ |
| `cards/maelstrom.png` | 🌀 Strudel | Alle Hände wandern weiter | „Riesiger Meeresstrudel von oben, Spielkarten wirbeln im Kreis hinein, türkis leuchtendes Wasser“ |
| `cards/cursed-dice.png` | 🎲 Davy Jones' Würfel | Gegner zieht 1–6 Karten | „Knochenhand mit Algen und Muscheln wirft einen leuchtenden grünen Würfel, unheimlicher Nebel“ |
| `cards/lifebuoy.png` | 🛟 Rettungsring | Strafe komplett abwehren | „Rot-weißer Rettungsring treibt im Mondlicht auf ruhigem Wasser, heller Lichtschein, Hoffnung“ |
| `cards/backfire.png` | 💥 Kanonenrückschlag | Strafe auf jemand anderen umlenken | „Kanonenkugel prallt von einem Schild ab und fliegt zurück, Explosion, orangefarbenes Feuer“ |

## ⚡ Ereignisbilder (`img/events/`, Querformat 1600×600)

Erscheinen groß auf dem TV, wenn das Ereignis passiert.

| Datei | Ereignis | Was passiert | Prompt |
| --- | --- | --- | --- |
| `events/kraken.png` | 🐙 Kraken-Angriff | Alle würfeln: Höchster wirft eine Karte ab, Niedrigster zieht eine | „Gigantischer Krake schlingt seine Tentakel um ein Piratenschiff, Sturmwellen, Blitze“ |
| `events/storm.png` | ⛈ Sturm | Die Farbe auf dem Tisch wechselt zufällig | „Heftiger Sturm auf dem Meer, Blitze in vier Farben (rot, gold, grün, blau), Schiff in hohen Wellen“ |
| `events/plunder.png` | 💰 Plünderung | Jeder gibt eine zufällige Karte an den Nachbarn | „Piraten reichen sich Goldmünzen und Schmuck aus einer offenen Schatztruhe weiter, Fackellicht“ |
| `events/bottle.png` | 📜 Flaschenpost | Jeder sieht heimlich eine Karte eines Gegners | „Flaschenpost mit eingerollter Karte strandet im Mondlicht an einem Strand, geheimnisvolles Leuchten“ |

---

## 🔊 Soundeffekte (`sfx/`, MP3)

Kostenlose Quellen: **Kenney.nl** („Casino Audio“ für Karten und Würfel, frei nutzbar), **Pixabay Sound Effects**, **Mixkit**.

| Datei | Wann | Suchbegriff |
| --- | --- | --- |
| `sfx/shuffle.mp3` | Spielstart | card shuffle |
| `sfx/card-play.mp3` | Karte gelegt | card place / card slide |
| `sfx/card-draw.mp3` | Karte gezogen | card flip |
| `sfx/penalty.mp3` | Strafkarten | negative / fail short |
| `sfx/shield.mp3` | Rettungsring | water splash |
| `sfx/cannon.mp3` | Kanonenrückschlag | cannon shot |
| `sfx/swords.mp3` | Meuterei | sword clash |
| `sfx/whirlpool.mp3` | Strudel | whirlpool / water swirl |
| `sfx/dice.mp3` | Würfel | dice roll |
| `sfx/ship-bell.mp3` | Ereignis beginnt | ship bell |
| `sfx/kraken.mp3` | Kraken | monster roar underwater |
| `sfx/thunder.mp3` | Sturm | thunder |
| `sfx/coins.mp3` | Plünderung | coins |
| `sfx/bottle.mp3` | Flaschenpost | cork pop / glass bottle |

## 🗣 Stimmen (`voice/`, MP3 – z. B. ElevenLabs)

Tipp: eine raue Piratenstimme wählen und für alle Sätze dieselbe benutzen.

| Datei | Text |
| --- | --- |
| `voice/havoc.mp3` | „HAAAVOC!“ |
| `voice/caught.mp3` | „Erwischt, du Landratte! Zwei Karten für dich!“ |
| `voice/win.mp3` | „Wir haben einen neuen Piratenkönig!“ |
| `voice/final.mp3` | „Das Finale beginnt! Nur noch fünf Minuten, ihr Halunken!“ |
| `voice/event.mp3` | „Achtung, an Deck!“ |
| `voice/mutiny.mp3` | „Meuterei!“ |
| `voice/dice.mp3` | „Davy Jones würfelt …“ |

## 🎵 Musik (`music/`)

| Datei | Wann |
| --- | --- |
| `music/theme.mp3` | Läuft leise in Schleife, im Finale etwas schneller. Suchbegriff: „pirate adventure loop“ |

Der Lautsprecher-Knopf oben rechts am TV schaltet alles stumm.
