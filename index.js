import { load } from 'cheerio';

export default async function handler(req, res) {
  // Configuración de cabeceras CORS para permitir peticiones desde tu frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const heroInput = req.query.hero || 'miya';
    const laneInput = (req.query.lane || 'gold').toLowerCase().trim();

    // Normalizar el slug del héroe para la URL de MLBB Hub (ej. "popol and kupa" -> "popol-and-kupa")
    const heroSlug = heroInput.toLowerCase().trim().replace(/\s+/g, '-');
    const url = `https://mlbbhub.com/counter/${heroSlug}`;

    // Petición HTTP usando el fetch nativo de Node.js/Vercel
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(404).json({ 
        error: 'Héroe no encontrado en MLBB Hub', 
        counters: [] 
      });
    }

    const html = await response.text();
    const $ = load(html);
    const counters = [];

    // Mapeo de términos para identificar la línea seleccionada
    const laneKeywords = {
      gold: ['gold', 'marksman'],
      exp: ['exp', 'fighter'],
      mid: ['mid', 'mage'],
      jungle: ['jungle', 'jungler', 'assassin'],
      roam: ['roam', 'roamer', 'tank', 'support']
    };

    const targetKeywords = laneKeywords[laneInput] || [laneInput];

    // 1. LOCALIZAR LA SECCIÓN "COUNTERS ... BY LANE AND ROLE"
    // Buscamos cualquier elemento de texto que contenga "BY LANE AND ROLE"
    let laneSection = null;

    $('*').each((_, el) => {
      const text = $(el).text().toUpperCase();
      if (text.includes('BY LANE AND ROLE') && !laneSection) {
        // Obtenemos el contenedor padre general de esa sección
        laneSection = $(el).closest('section, div.container, div, main');
      }
    });

    const searchScope = laneSection && laneSection.length > 0 ? laneSection : $.root();

    // 2. BUSCAR EL BLOQUE DE LA LÍNEA SOLICITADA DENTRO DE ESA SECCIÓN
    let targetBlock = null;

    searchScope.find('div, section, article, table').each((_, block) => {
      const blockText = $(block).find('h2, h3, h4, h5, header, .title, button').text().toLowerCase();
      
      const matchesLane = targetKeywords.some(kw => blockText.includes(kw));
      if (matchesLane && !targetBlock) {
        targetBlock = $(block);
      }
    });

    const finalScope = targetBlock && targetBlock.length > 0 ? targetBlock : searchScope;

    // 3. EXTRAER LOS NOMBRES Y SLUGS DE LOS HÉROES
    finalScope.find('a[href*="/hero/"], a[href*="/counter/"]').each((_, el) => {
      const name = $(el).text().trim();
      const href = $(el).attr('href') || '';
      const slug = href.split('/').filter(Boolean).pop();

      // Validación de filtros para ignorar links genéricos y evitar duplicados
      if (
        name && 
        slug && 
        slug.toLowerCase() !== heroSlug && 
        !counters.some(c => c.name.toLowerCase() === name.toLowerCase())
      ) {
        const isMenuText = ['view', 'lane', 'role', 'counter', 'tier list', 'guides'].some(term => name.toLowerCase().includes(term));
        if (!isMenuText && name.length > 2) {
          counters.push({
            name: name,
            slug: slug,
            winRate: "Counter por línea"
          });
        }
      }
    });

    return res.status(200).json({
      counters: counters.slice(0, 10),
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
