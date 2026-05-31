export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { rechtbank = 'amsterdam' } = req.query;

  const rechtbankSlugs = {
    amsterdam: 'rechtbank-amsterdam',
    denhaag: 'rechtbank-den-haag',
    rotterdam: 'rechtbank-rotterdam',
    utrecht: 'rechtbank-midden-nederland',
    haarlem: 'rechtbank-noord-holland',
    zwolle: 'rechtbank-overijssel',
    arnhem: 'rechtbank-gelderland',
    groningen: 'rechtbank-noord-nederland',
    denbosch: 'rechtbank-oost-brabant',
    breda: 'rechtbank-zeeland-west-brabant',
    maastricht: 'rechtbank-limburg',
  };

  const slug = rechtbankSlugs[rechtbank];
  if (!slug) {
    return res.status(400).json({ error: 'Onbekende rechtbank' });
  }

  const url = `https://www.rechtspraak.nl/organisatie-en-contact/organisatie/rechtbanken/${slug}/zittingsrooster`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'rechtspraak-wegwijzer/1.0' },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    res.status(200).json({
      rechtbank: slug,
      roosterUrl: url,
      beschikbaar: true,
      bericht: 'Klik de knop om het actuele rooster te bekijken op rechtspraak.nl',
    });
  } catch (error) {
    res.status(200).json({
      rechtbank: slug,
      roosterUrl: url,
      beschikbaar: false,
      bericht: 'Rooster tijdelijk niet beschikbaar — probeer het later opnieuw',
    });
  }
}
