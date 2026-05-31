export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    query = '',
    rechtsgebied = '',
    instantie = '',
    datum_van = '',
    datum_tot = '',
    pagina = 1,
    aantal = 10,
  } = req.query;

  const params = new URLSearchParams();
  if (query) params.append('q', query);
  if (rechtsgebied) params.append('rechtsgebied', rechtsgebied);
  if (instantie) params.append('instantie', instantie);
  if (datum_van) params.append('datum_van', datum_van);
  if (datum_tot) params.append('datum_tot', datum_tot);
  params.append('from', (pagina - 1) * aantal);
  params.append('size', aantal);
  params.append('sort', 'Relevance');

  const apiUrl = `https://uitspraken.rechtspraak.nl/api/zoek?${params.toString()}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'rechtspraak-wegwijzer/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Rechtspraak API responded with ${response.status}`);
    }

    const data = await response.json();

    const genormaliseerd = {
      totaal: data.TotalResults || 0,
      pagina: parseInt(pagina),
      resultaten: (data.Results || []).map(u => ({
        ecli: u.Id || '',
        titel: u.Title || 'Geen titel',
        datum: u.Date || '',
        instantie: u.Creator || '',
        rechtsgebied: u.Subject || '',
        samenvatting: u.Abstract || '',
        url: `https://uitspraken.rechtspraak.nl/details?id=${u.Id}`,
      })),
    };

    res.status(200).json(genormaliseerd);
  } catch (error) {
    console.error('Rechtspraak API error:', error);
    res.status(500).json({
      error: 'Kon uitspraken niet ophalen',
      details: error.message,
    });
  }
}
