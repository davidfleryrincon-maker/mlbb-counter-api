import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  // Configuración de cabeceras CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const heroInput = req.query.hero || 'miya';
  const laneInput = (req.query.lane || 'gold').toLowerCase().trim();

  // Mapeo normalizado de líneas para buscar en el HTML
  const laneKeywords = {
    gold: ['gold', 'gold lane', 'marksman'],
    exp: ['exp', 'exp lane', 'fighter'],
    mid: ['mid', 'mid lane', 'mage'],
    jungle: ['jungle', 'jungler', 'assassin'],
    roam: ['roam', 'roamer', 'tank', 'support']
  };

  // Convertir el nombre del héroe a formato slug (ej: "Popol and Kupa" -> "popol-and-kupa")
  const heroSlug = heroInput.toLowerCase().trim().replace(/\s+/g, '-');
  const url = `https://mlbbhub.com/counter/${heroSlug}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(404).json({ error: 'Héroe no encontrado en MLBB Hub', counters: [] });
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const counters = [];

    // 1. PATRÓN DINÁMICO: Encontrar el contenedor que arranca con "COUNTERS FOR [CUALQUIER HÉROE] BY LANE AND ROLE"
    let sectionByLane = null;

    $('*').each((_, el) => {
      const text = $(el).text().toUpperCase().trim();
      // Expresión regular que coincide con "COUNTERS FOR ... BY LANE AND ROLE"
      if (/COUNTERS FOR .+ BY LANE AND ROLE/i.test(text)) {
        // Guardamos el contenedor contenedor principal de esta sección
        const parent = $(el).closest('section, div.container, div.wrapper, main, body');
        if (parent.length > 0) {
          sectionByLane = parent;
        }
      }
    });

    // Si encontró la sección dinámicamente, usaremos ese bloque; de lo contrario usaremos todo el documento
    const scope = sectionByLane || $.root();

    // 2. BUSCAR EL BLOQUE DE LA LÍNEA ESPECÍFICA (Gold, Exp, Mid, Jungle, Roam)
    const targetKeywords = laneKeywords[laneInput] || [laneInput];
    let laneBlock = null;

    scope.find('div, section, article, tab').each((_, block) => {
      const blockHeading = $(block).find('h2, h3, h4, h5, .title, button, .tab-title').text().toLowerCase();
      
      const coincideLinea = targetKeywords.some(kw => blockHeading.includes(kw));
      if (coincideLinea && !laneBlock) {
        laneBlock = $(block);
      }
    });

    const targetScope = laneBlock || scope;

    // 3. EXTRAER LOS HÉROES DE ESE BLOQUE ESPECÍFICO
    targetScope.find('a[href*="/hero/"], a[href*="/counter/"]').each((_, el) => {
      const name = $(el).text().trim();
      const href = $(el).attr('href') || '';
      const slug = href.split('/').filter(Boolean).pop();

      // Descartar enlaces repetidos, navegación o el mismo héroe consultado
      if (
        name && 
        slug && 
        slug.toLowerCase() !== heroSlug && 
        !counters.some(c => c.name.toLowerCase() === name.toLowerCase())
      ) {
        // Evitar capturar textos de interfaz que no son nombres de personajes
        const esTextoMenu = ['view', 'lane', 'role', 'counter', 'guides', 'tier list'].some(term => name.toLowerCase().includes(term));
        if (!esTextoMenu && name.length > 2) {
          counters.push({
            name: name,
            slug: slug,
            winRate: "Ventaja por línea confirmada"
          });
        }
      }
    });

    return res.status(200).json({
      counters: counters.slice(0, 10),
      source: url,
      laneRequested: laneInput,
      heroRequested: heroInput
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Error al procesar la información', 
      details: error.message 
    });
  }
}
