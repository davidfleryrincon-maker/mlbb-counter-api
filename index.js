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

    // Formatear slug del héroe
    const heroSlug = heroInput.toLowerCase().trim().replace(/\s+/g, '-');
    
    // URL web original de consulta
    const webUrl = `https://mlbbhub.com/counter/${heroSlug}`;

    // Mapeo de nombres de línea a los parámetros que usa la API interna de MLBB Hub
    const laneMap = {
      gold: 'Gold Lane',
      exp: 'EXP Lane',
      mid: 'Mid Lane',
      jungle: 'Jungle',
      roam: 'Roam'
    };

    const targetLaneName = laneMap[laneInput] || 'Gold Lane';

    // 1. INTENTO DE PETICIÓN A LA API INTERNA DE DATOS DE MLBB HUB
    // Esta es la misma URL desde la que el navegador carga la sección "Counters by Lane and Role"
    const apiUrl = `https://mlbbhub.com/api/counters?hero=${heroSlug}`;

    const apiResponse = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': webUrl
      }
    });

    let counters = [];

    if (apiResponse.ok) {
      const data = await apiResponse.json();
      
      // Si la API devuelve el arreglo de contadores divididos por línea/rol
      const laneData = data.byLane || data.lanes || data.countersByLane || data;

      if (Array.isArray(laneData)) {
        // Filtrar por la línea específica que pidió el usuario
        const filtered = laneData.filter(item => {
          const itemLane = (item.lane || item.role || '').toLowerCase();
          return itemLane.includes(laneInput);
        });

        counters = filtered.map(item => ({
          name: item.heroName || item.name || item.hero,
          slug: (item.heroSlug || item.slug || item.name || '').toLowerCase().replace(/\s+/g, '-'),
          winRate: item.winRate ? `${item.winRate}%` : "Counter directo por línea"
        }));
      }
    }

    // 2. FALLBACK SI LA API REQUIERE OTRA ESTRUCTURA DE PARSEO (Next.js Data Endpoint)
    if (counters.length === 0) {
      const nextDataUrl = `https://mlbbhub.com/_next/data/latest/counter/${heroSlug}.json`;
      const nextResponse = await fetch(nextDataUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (nextResponse.ok) {
        const nextData = await nextResponse.json();
        const pageProps = nextData?.pageProps;
        const laneCounters = pageProps?.laneCounters || pageProps?.hero?.laneCounters || [];

        const targetData = laneCounters.find(l => (l.lane || l.name || '').toLowerCase().includes(laneInput));

        if (targetData && targetData.heroes) {
          counters = targetData.heroes.map(h => ({
            name: h.name,
            slug: h.slug || h.name.toLowerCase().replace(/\s+/g, '-'),
            winRate: h.winRate ? `${h.winRate}%` : "Counter por línea"
          }));
        }
      }
    }

    // Si todo lo anterior responde vacío, retornamos respuesta limpia indicando la línea
    return res.status(200).json({
      counters: counters.slice(0, 10),
      source: webUrl,
      hero: heroInput,
      lane: laneInput
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Error interno en el servidor Vercel al obtener counters', 
      details: error.message 
    });
  }
}
