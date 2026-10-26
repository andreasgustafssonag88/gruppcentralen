GRUPPCENTRALEN 6.6.6 - UTSKRIFT MED VERKLIGA KLASSRUMSMATT

Byggd pa 6.6.5 och innehaller tillfalliga elever.

ORSAK TILL FELET
Tidigare versioner anvande i forsta hand sparade canvasWidth/canvasHeight. Den synliga klassrumsytan kunde vara hogre an de sparade matten. Utskriftsramen blev da for lag och nederdelen beskars.

ATGARDAT
- Matt hamtas nu fran den faktiska synliga klassrumsytan.
- scrollWidth, scrollHeight, offsetWidth, offsetHeight och moblernas ytterkanter kontrolleras.
- Den klonade utskriftsytan far de verkliga matten som inline-format.
- Utskriftsramen raknas fran den faktiska skalade bredden och hojden.
- contain och all klippning stangs av i utskriftslaget.
- Hela klassrummet skalas till en A4 liggande sida.
- Endast klassrummet skrivs ut.

INSTALLATION
Ersatt index.html, styles.css och app.js. Behall jszip.min.js och service-worker.js. Publicera och gor Ctrl+F5.
