export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { rechtsgebied = 'Arbeidsrecht', postcode = '', offset = 0 } = req.query;

  const rechtsgebiedMap = {
    huur: 'Huurrecht',
    arbeid: 'Arbeidsrecht',
    straf: 'Strafrecht',
    bestuur: 'Bestuursrecht',
    belasting: 'Belastingrecht',
    familie: 'Familierecht',
    verkeer: 'Verkeersrecht',
    letsel: 'Letselschaderecht',
    insolventie: 'Insolventierecht',
    onderneming: 'Ondernemingsrecht',
  };

  const novaLabel = rechtsgebiedMap[rechtsgebied] || rechtsgebied;

  const params = new URLSearchParams({
    'jurisdictions[]': novaLabel,
    limit: 20,
    offset,
    sort: 'relevance',
  });
  if (postcode) params.append('location', postcode);

  try {
    const response = await fetch(
      `https://zoekeenadvocaat.advocatenorde.nl/api/search?${params}`,
      {
        headers: {
          'Accept': 'application/json',
          'Referer': 'https://zoekeenadvocaat.advocatenorde.nl/zoeken',
          'User-Agent': 'Mozilla/5.0 (compatible; rechtspraak-wegwijzer/1.0)',
          'X-Requested-With': 'XMLHttpRequest',
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) throw new Error(`NOvA API: ${response.status}`);
    const data = await response.json();

    const advocaten = (data.results || data.data || []).map(a => ({
      naam: a.name || a.title || '',
      kantoor: a.firm || a.organization || '',
      stad: a.city || a.location || '',
      rechtsgebieden: a.jurisdictions || [],
      telefoon: a.phone || '',
      email: a.email || '',
      website: a.website || '',
      toevoeging: a.subsidized || false,
      url: a.url ? `https://zoekeenadvocaat.advocatenorde.nl${a.url}` : '',
    }));

    res.setHeader('Cache-Control', 's-maxage=3600');
    res.status(200).json({
      totaal: data.total || advocaten.length,
      rechtsgebied: novaLabel,
      advocaten,
    });
  } catch (err) {
    // Fallback: return instruction to use NOvA directly
    res.status(200).json({
      totaal: 0,
      rechtsgebied: novaLabel,
      advocaten: [],
      fallback: true,
      fallbackUrl: 'https://zoekeenadvocaat.advocatenorde.nl/zoeken',
      fallbackInstructie: `Selecteer "${novaLabel}" onder Rechtsgebieden`,
    });
  }
}
