import { load } from 'cheerio';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const heroInput = req.query.hero || 'miya';
    const laneInput = (req.query.lane || 'gold').toLowerCase().trim();

    // 1. Construir la URL directa del personaje
    const heroSlug = heroInput.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const url = `https://mlbbhub.com/counter/${heroSlug}`;

    // 2. Hacer la petición a MLBB Hub con headers de navegador real
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      return res.status(404).json({ error: `Héroe '${heroInput}' no encontrado`, counters: [] });
    }

    const html = await response.text();
    const $ = load(html);
    let extractedCounters = [];

    // 3. BUSCAR EN EL ESTADO INYECTADO (Script tag donde MLBB Hub guarda la información de la página)
    $('script').each((_, script) => {
      const content = $(script).html() || '';
      
      // Buscar estructuras JSON dentro del código de la página
      if (content.includes('counters') || content.includes('byLane') || content.includes('hero')) {
        try {
          const jsonMatch = content.match(/\{.*"lane.*?\}/s) || content.match(/\[.*"hero".*?\]/s);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            if (Array.isArray(data)) {
              data.forEach(item => {
                if (item.name || item.hero) {
                  extractedCounters.push(item.name || item.hero);
                }
              });
            }
          }
        } catch (e) {
          // Ignorar scripts que no contengan JSON válido
        }
      }
    });

    // 4. SI NO SE HALLÓ EN SCRIPT, EXTRAER DE LOS ENLACES DE LA PÁGINA
    if (extractedCounters.length === 0) {
      const links = $('a[href*="/counter/"], a[href*="/hero/"]');
      const ignoreSlugs = ['counter', 'hero', heroSlug, 'tier-list', 'builds'];

      links.each((_, el) => {
        const href = $(el).attr('href') || '';
        const slug = href.split('/').filter(Boolean).pop()?.toLowerCase();

        if (slug && !ignoreSlugs.includes(slug) && slug.length > 2) {
          const formattedName = slug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          if (!extractedCounters.includes(formattedName)) {
            extractedCounters.push(formattedName);
          }
        }
      });
    }

    // 5. FORMATEAR LOS 5 PRIMEROS COUNTERS OBLIGATORIOS PARA EL BLOQUE 2
    const finalCounters = extractedCounters.slice(0, 5).map(name => ({
      name: name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      winRate: 'Counter directo'
    }));

    // Retornar los datos para que el frontend organice Bloque 1 (intersección con héroes del usuario) y Bloque 2
    return res.status(200).json({
      counters: finalCounters,
      source: url,
      hero: heroInput,
      lane: laneInput
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Error procesando la solicitud',
      details: error.message
    });
  }
}
