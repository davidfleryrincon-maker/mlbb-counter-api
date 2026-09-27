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

    // Normalizar slug para la URL (ej: "popol-and-kupa")
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
    const rawCounters = [];

    // Función para formatear Slugs a Nombres Propios Limpios (ej: "popol-and-kupa" -> "Popol And Kupa")
    const formatHeroName = (slug) => {
      return slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    // Extraer únicamente los enlaces que apuntan a perfiles de héroes
    $('a[href*="/hero/"], a[href*="/counter/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const parts = href.split('/').filter(Boolean);
      const slug = parts.pop();

      // Términos en inglés de la interfaz que debemos ignorar
      const blacklist = [
        'hero', 'counter', 'tier-list', 'guides', 'privacy', 'terms', 
        'contact', 'about', 'gold-lane', 'exp-lane', 'mid-lane', 'jungle', 'roam', heroSlug
      ];

      if (slug && !blacklist.includes(slug.toLowerCase()) && slug.length > 2) {
        // Formatear el nombre de forma limpia a partir del slug de la URL
        const cleanName = formatHeroName(slug);

        // Evitar duplicados
        if (!rawCounters.some(c => c.slug === slug)) {
          rawCounters.push({
            name: cleanName,
            slug: slug,
            winRate: "Counter por línea"
          });
        }
      }
    });

    // Retornamos los resultados limpios
    return res.status(200).json({
      counters: rawCounters.slice(0, 10),
      source: url,
      lane: laneInput,
      hero: heroInput
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Error interno en el servidor Vercel', 
      details: error.message 
    });
  }
}
