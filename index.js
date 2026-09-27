export default async function handler(req, res) {
  // Permisos de conexión CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { hero, lane } = req.query;

  if (!hero) {
    return res.status(400).json({ error: 'Debes proporcionar un nombre de héroe' });
  }

  const formattedHero = hero.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const targetUrl = `https://mlbbhub.com/counter/${formattedHero}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      return res.status(200).json({ counters: [], source: targetUrl, lane: lane || 'all', error: 'Héroe no encontrado' });
    }

    const html = await response.text();
    const counters = [];
    const seen = new Set();

    const regex = /href=["'](?:\/counter\/|https?:\/\/mlbbhub\.com\/counter\/)([a-z0-9-]+)["']/gi;
    let match;

    while ((match = regex.exec(html)) !== null) {
      let heroSlug = match[1].toLowerCase();

      if (heroSlug !== formattedHero && !seen.has(heroSlug)) {
        seen.add(heroSlug);
        let cleanName = heroSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        
        counters.push({
          name: cleanName,
          slug: heroSlug,
          winRate: 'Ventaja confirmada'
        });

        // Extraemos hasta 30 héroes para asegurar que el frontend tenga un pool amplio al filtrar por línea
        if (counters.length >= 30) break;
      }
    }

    return res.status(200).json({ counters, source: targetUrl, lane: lane || 'all' });

  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar datos', details: error.message });
  }
}
