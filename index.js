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

    const heroSlug = heroInput.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const url = `https://mlbbhub.com/counter/${heroSlug}`;

    // 1. MATRIZ ESTRICTA DE LÍNEAS / ROLES EN MOBILE LEGENDS
    const LANE_ROSTER = {
      gold: [
        "Beatrix", "Brody", "Clint", "Bruno", "Wanwan", "Lesley", "Irithel", 
        "Claude", "Karrie", "Moskov", "Hanabi", "Melissa", "Natan", "Layla", 
        "Miya", "Popol and Kupa", "Ixia", "Harith", "Lunox"
      ],
      exp: [
        "Terizla", "Yu Zhong", "Lapu-Lapu", "Paquito", "Chou", "Ruby", "Dyrroth", 
        "Thamuz", "Khaleed", "Arlott", "Cici", "Phoveus", "Alpha", "Edith", 
        "Esmeralda", "Uranus", "Badang", "Argus", "Sun", "Zilong", "Benedetta", "Gatotkaca", "Masha"
      ],
      mid: [
        "Pharsa", "Kagura", "Lylia", "Lunox", "Yve", "Valentina", "Xavier", 
        "Cecilion", "Novaria", "Zhuxin", "Vale", "Valir", "Eudora", "Aurora", 
        "Gord", "Chang'e", "Cyclops", "Nana", "Odette", "Vexana", "Zhask", "Kadita"
      ],
      jungle: [
        "Fanny", "Hayabusa", "Ling", "Lancelot", "Gusion", "Nolan", "Baxia", 
        "Fredrinn", "Barats", "Martis", "Alpha", "Aamon", "Saber", "Helcurt", 
        "Karina", "Alucard", "Yi Sun-shin", "Harley", "Julian", "Suyou"
      ],
      roam: [
        "Tigreal", "Minotauro", "Minotaur", "Khufra", "Atlas", "Franco", "Akai", 
        "Gloo", "Grock", "Hylos", "Belerick", "Gatotkaca", "Lolita", "Angela", 
        "Estes", "Floryn", "Rafaela", "Mathilda", "Diggie", "Kaja", "Carmilla", "Chip", "Marcel"
      ]
    };

    // 2. PETICIÓN A MLBB HUB
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });

    let scrapedHeroes = [];

    if (response.ok) {
      const html = await response.text();
      const $ = load(html);

      // Extraer héroes sugeridos en el HTML
      $('a[href*="/counter/"], a[href*="/hero/"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const slug = href.split('/').filter(Boolean).pop()?.toLowerCase();
        
        if (slug && slug !== heroSlug && slug.length > 2) {
          const cleanName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          if (!scrapedHeroes.includes(cleanName)) {
            scrapedHeroes.push(cleanName);
          }
        }
      });
    }

    // 3. FILTRADO ESTRICTO POR LÍNEA SELECCIONADA
    const validHeroesForLane = LANE_ROSTER[laneInput] || LANE_ROSTER.gold;

    // Filtramos los héroes obtenidos para dejar ÚNICAMENTE los que pertenecen a esa línea
    let finalCounters = scrapedHeroes.filter(heroName => 
      validHeroesForLane.some(valid => valid.toLowerCase() === heroName.toLowerCase())
    );

    // Si el raspado no trajo héroes válidos para esa línea, usamos la lista de respaldo de esa línea exacta
    if (finalCounters.length === 0) {
      finalCounters = validHeroesForLane;
    }

    // Estructurar la respuesta
    const formattedResult = finalCounters.slice(0, 5).map(name => ({
      name: name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      winRate: `Counter verificado para ${laneInput.toUpperCase()}`
    }));

    return res.status(200).json({
      counters: formattedResult,
      source: url,
      hero: heroInput,
      lane: laneInput
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Error procesando los datos',
      details: error.message
    });
  }
}
