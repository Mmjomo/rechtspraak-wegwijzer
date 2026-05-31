export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { keyword = '', subject = '', creator = '', dateFrom = '', dateTo = '', from = 0, max = 10 } = req.query;

  const params = new URLSearchParams();
  if (keyword) params.append('keyword', keyword);
  if (subject) params.append('subject', subject);
  if (creator) params.append('creator', creator);
  if (dateFrom) params.append('date', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  params.append('from', from);
  params.append('max', max);
  params.append('sort', 'DESC');
  params.append('return', 'DOC');

  const apiUrl = `https://data.rechtspraak.nl/uitspraken/zoeken?${params.toString()}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'rechtspraak-wegwijzer/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Rechtspraak API: HTTP ${response.status}`);
    }

    const xml = await response.text();

    // Parse XML entries
    const items = [];
    const itemMatches = xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g);

    for (const match of itemMatches) {
      const block = match[1];
      const get = (tag) => {
        const m = block.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`));
        return m ? m[1].trim() : '';
      };
      const getAttr = (tag, attr) => {
        const m = block.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"[^>]*>`));
        return m ? m[1].trim() : '';
      };

      const ecli = get('id') || get('dcterms:identifier');
      if (!ecli) continue;

      // Determine rechtsgebied from subject URI
      const subjectUri = getAttr('psi:rechtsgebied', 'resourceIdentifier') || get('subject') || '';
      let rechtsgebied = 'Overig';
      if (subjectUri.includes('civielRecht')) rechtsgebied = 'Civiel';
      else if (subjectUri.includes('strafrecht')) rechtsgebied = 'Strafrecht';
      else if (subjectUri.includes('bestuursrecht')) rechtsgebied = 'Bestuursrecht';
      else if (subjectUri.includes('belastingrecht') || subjectUri.includes('belastingRecht')) rechtsgebied = 'Belastingrecht';

      items.push({
        ecli,
        titel: get('title') || ecli,
        datum: get('dcterms:date') || get('updated') || '',
        instantie: get('dcterms:creator') || '',
        rechtsgebied,
        samenvatting: get('summary') || get('dcterms:abstract') || '',
        url: `https://uitspraken.rechtspraak.nl/details?id=${encodeURIComponent(ecli)}`,
      });
    }

    // Get total from feed
    const totalMatch = xml.match(/<opensearch:totalResults>(\d+)<\/opensearch:totalResults>/);
    const totaal = totalMatch ? parseInt(totalMatch[1]) : items.length;

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json({ totaal, van: parseInt(from), resultaten: items });
  } catch (error) {
    console.error('Rechtspraak API fout:', error.message);
    res.status(500).json({
      error: 'Kon uitspraken niet ophalen',
      details: error.message,
      fallback: 'https://uitspraken.rechtspraak.nl',
    });
  }
}
