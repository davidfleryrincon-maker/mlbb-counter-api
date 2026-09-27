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

    // Normalizar slug del héroe (ej. "popol and kupa" -> "popol-and-kupa")
    const heroSlug = heroInput.toLowerCase().trim().replace(/\s+/g, '-');
    const url = `https://mlbbhub.com/counter/${heroSlug}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(404).json({ error: 'Héroe no encontrado en MLBB Hub', counters: [] });
    }

    const html = await response.text();
    const $ = load(html);
    const counters = [];

    const formatHeroName = (slug) => {
      return slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    // ESTRATEGIA 1: Buscar datos JSON inyectados en la página (Next.js / Nuxt / State)
    let jsonFound = false;

    $('script').each((_, script) => {
      const content = $(script).html() || '';
      if (content.includes('props') || content.includes('counters') || content.includes('byLane')) {
        try {
          // Si la página usa Next.js (muy común en MLBB Hub)
          if (script.attribs.id === '__NEXT_DATA__') {
            const parsedData = JSON.parse(content);
            const pageProps = parsedData?.props?.pageProps;
            
            // Extraer contadores por línea del objeto JSON de la página
            const laneCounters = pageProps?.laneCounters || pageProps?.countersByLane || [];
            
            if (Array.isArray(laneCounters)) {
              laneCounters.forEach(item => {
                const itemLane = (item.lane || item.role || '').toLowerCase();
                if (itemLane.includes(laneInput) || laneInput.includes(itemLane)) {
                  const slug = item.heroSlug || item.slug || item.name?.toLowerCase().replace(/\s+/g, '-');
                  if (slug && slug !== heroSlug) {
                    counters.push({
                      name: item.name || formatHeroName(slug),
                      slug: slug,
                      winRate: item.winRate ? `${item.winRate}%` : "Counter por línea y rol"
                    });
                  }
                }
              });
              if (counters.length > 0) jsonFound = true;
            }
          }
        } catch (e) {
          // Si falla el parseo de un script individual, continúa con el siguiente
        }
      }
    });

    // ESTRATEGIA 2: Si no hay JSON incrustado, buscar la sección "COUNTERS FOR [HEROE] BY LANE AND ROLE" en el DOM
    if (!jsonFound) {
      // Ubicar el elemento que contenga la frase exacta del héroe
      let sectionContainer = null;

      $('*').each((_, el) => {
        const text = $(el).text().toUpperCase().replace(/\s+/g, ' ');
        const targetPhrase = `COUNTERS FOR ${heroSlug.replace(/-/g, ' ')} BY LANE AND ROLE`.toUpperCase();
        
        if ((text.includes('COUNTERS FOR') && text.includes('BY LANE AND ROLE')) || text.includes(targetPhrase)) {
          if (!sectionContainer) {
            sectionContainer = $(el).closest('section, div.container, div.wrapper, main, body');
          }
        }
      });

      const scope = sectionContainer && sectionContainer.length > 0 ? sectionContainer : $.root();

      // Buscar enlaces de héroes dentro del área acotada
      scope.find('a[href*="/hero/"], a[href*="/counter/"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const parts = href.split('/').filter(Boolean);
        const slug = parts.pop()?.toLowerCase();

        const blacklist = [
          'hero', 'counter', 'tier-list', 'guides', 'privacy', 'terms', 
          'contact', 'about', 'gold-lane', 'exp-lane', 'mid-lane', 'jungle', 'roam', heroSlug
        ];

        if (slug && !blacklist.includes(slug) && slug.length > 2) {
          if (!counters.some(c => c.slug === slug)) {
            counters.push({
              name: formatHeroName(slug),
              slug: slug,
              winRate: "Counter por línea y rol"
            });
          }
        }
      });
    }

    return res.status(200).json({
      counters: counters.slice(0, 10),
      source: url,
      hero: heroInput,
      lane: laneInput
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Error interno en el servidor Vercel', 
      details: error.message 
    });
  }
}
