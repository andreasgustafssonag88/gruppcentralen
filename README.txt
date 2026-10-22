GRUPPCENTRALEN 6.6.3 - KORRIGERAD ENSIDESUTSKRIFT

Byggd direkt pa version 6.6.2.

ORSAK
Den tidigare losningen anvande transform: scale. Chrome visade klassrummet mindre men beraknade sidbrytningen fran den oskalade klassrumsytan. Darfor kunde en tom eller halv sida 2 skapas.

ATGARDAT
- Utskriften anvander nu CSS zoom, som skalar bade innehall och layoutbox.
- Klassrummet anpassas till A4 liggande med sakerhetsutrymme for sidhuvud och sidfot.
- Utskriftsramens verkliga storlek motsvarar den skalade klassrumsytan.
- Overflod doljs och sidbrytning inne i klassrummet blockeras.
- Endast klassrummet skrivs ut.
- Samma losning anvands vid Spara som PDF.

TIPS
For maximalt utrymme kan Sidhuvud och sidfot stangas av i webblasaren. Det ska dock inte langre kravdes for att klassrummet ska hamna pa en sida.

INSTALLATION
Ersatt index.html, styles.css och app.js. Behall jszip.min.js och service-worker.js. Publicera och gor Ctrl+F5.
