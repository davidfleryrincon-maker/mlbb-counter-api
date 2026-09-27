import { load } from 'cheerio';

// Cache temporal en memoria de Vercel para evitar descargar la lista en cada petición
let cachedHeroesList = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 60 * 12; // 12 horas

/**
 * Obtiene la lista completa de héroes de MLBB automáticamente
 */
async function fetchAllHeroesAuto() {
  const now = Date.now();
  if (cachedHeroesList && (now - lastFetchTime < CACHE_DURATION)) {
    return cachedHeroesList;
  }

  try {
    // API pública y actualizada con todos los héroes de MLBB
    const res = await fetch('https://raw.githubusercontent.com/mlbb-api/mlbb-api/main/data/heroes.json');
    if (res.ok) {
      const data = await res.json();
      // Extraer nombres de héroes
      const heroNames = data.map(h => h.name || h.hero_name).filter(Boolean);
      if (heroNames.length > 100) {
        cachedHeroesList = heroNames;
        lastFetchTime = now;
        return cachedHeroesList;
      }
    }
  } catch (e) {
    console.warn('Error fetching dynamic heroes list, using fallback:', e.message);
  }

  // Lista de respaldo extendida en caso de que la API externa falle
  return [
    "Aamon", "Akai", "Aldous", "Alice", "Alpha", "Alucard", "Angela", "Argus", "Arlott", "Atlas", "Aurora",
    "Badang", "Balmond", "Barats", "Baxia", "Beatrix", "Belerick", "Benedetta", "Brody", "Bruno",
    "Carmilla", "Cecilion", "Chang'e", "Chip", "Chou", "Cici", "Claude", "Clint", "Cyclops",
    "Diggie", "Dyrroth", "Edith", "Esmeralda", "Estes", "Eudora", "Faramis", "Fanny", "Floryn", "Franco", "Fredrinn", "Freya",
    "Gatotkaca", "Gloom", "Gord", "Grock", "Gusion", "Hanabi", "Hanzo", "Harith", "Harley", "Hayabusa", "Helcurt", "Hilda", "Hirara", "Hylos",
    "Irithel", "Ixia", "Johnson", "Joy", "Julian", "Kadita", "Kagura", "Kaja", "Karina", "Karrie", "Khaleed", "Khufra", "Kimmy",
    "Lancelot", "Lapu-Lapu", "Layla", "Leomord", "Lesley", "Ling", "Lolita", "Lunox", "Lylia",
    "Martis", "Masha", "Mathilda", "Melissa", "Miya", "Minotaur", "Minsitthar", "Moskov",
    "Nana", "Natan", "Nolan", "Novaria", "Odette", "Paquito", "Pharsa", "Phoveus", "Popol and Kupa",
    "Rafaela", "Ruby", "Saber", "Selena", "Sun", "Suyou", "Terizla", "Thamuz", "Tigreal",
    "Uranus", "Vale", "Valir", "Valentina", "Vexana", "Wanwan", "Xavier", "X.Borg", "Yin", "Yi Sun-shin", "Yu Zhong", "Yve", "Zhask", "Zhuxin", "Zilong"
  ];
}

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

    // Normalizar slug del héroe
    const heroSlug = heroInput.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const url = `https://mlbbhub.com/counter/${heroSlug}`;

    // Cargar la base de datos de héroes completa automáticamente
    const allHeroes = await fetchAllHeroesAuto();

    // 1. PETICIÓN A MLBB HUB
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });

    let scrapedHeroes = [];

    if (response.ok) {
      const html = await response.text();
      const $ = load(html);

      $('a[href*="/counter/"], a[href*="/hero/"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const slug = href.split('/').filter(Boolean).pop()?.toLowerCase();
        const blacklist = ['counter', 'hero', heroSlug, 'tier-list', 'guides', 'privacy', 'terms'];

        if (slug && !blacklist.includes(slug) && slug.length > 2) {
          const cleanName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          if (!scrapedHeroes.some(h => h.toLowerCase() === cleanName.toLowerCase())) {
            scrapedHeroes.push(cleanName);
          }
        }
      });
    }

    // 2. MAPEO FLEXIBLE POR LÍNEAS (Incluye a Faramis, Hirara y soporte para héroes híbridos)
    const LANE_ROSTER = {
      gold: ["Beatrix", "Brody", "Clint", "Bruno", "Wanwan", "Lesley", "Irithel", "Claude", "Karrie", "Moskov", "Hanabi", "Melissa", "Natan", "Layla", "Miya", "Popol and Kupa", "Ixia", "Harith", "Lunox"],
      exp: ["Terizla", "Yu Zhong", "Lapu-Lapu", "Paquito", "Chou", "Ruby", "Dyrroth", "Thamuz", "Khaleed", "Arlott", "Cici", "Phoveus", "Alpha", "Edith", "Esmeralda", "Uranus", "Badang", "Argus", "Sun", "Zilong", "Benedetta", "Gatotkaca", "Masha", "Joy", "Hilda"],
      mid: ["Faramis", "Pharsa", "Kagura", "Lylia", "Lunox", "Yve", "Valentina", "Xavier", "Cecilion", "Novaria", "Zhuxin", "Vale", "Valir", "Eudora", "Aurora", "Gord", "Chang'e", "Cyclops", "Nana", "Odette", "Vexana", "Zhask", "Kadita"],
      jungle: ["Hirara", "Suyou", "Nolan", "Joy", "Fanny", "Hayabusa", "Ling", "Lancelot", "Gusion", "Baxia", "Fredrinn", "Barats", "Martis", "Alpha", "Aamon", "Saber", "Helcurt", "Karina", "Alucard", "Yi Sun-shin", "Harley", "Julian"],
      roam: ["Faramis", "Chip", "Minotauro", "Minotaur", "Tigreal", "Khufra", "Atlas", "Franco", "Akai", "Gloo", "Grock", "Hylos", "Belerick", "Gatotkaca", "Lolita", "Angela", "Estes", "Floryn", "Rafaela", "Mathilda", "Diggie", "Kaja", "Carmilla", "Hilda"]
    };

    const validHeroesForLane = LANE_ROSTER[laneInput] || LANE_ROSTER.gold;

    // 3. FILTRADO
    let finalCounters = scrapedHeroes.filter(heroName => {
      const lowerName = heroName.toLowerCase();
      // Si el héroe está asignado a la línea seleccionada
      if (validHeroesForLane.some(valid => valid.toLowerCase() === lowerName)) return true;
      // Si es un héroe nuevo o recuperado dinámicamente que no está restringido estrictamente
      if (!allHeroes.some(h => h.toLowerCase() === lowerName)) return true;
      return false;
    });

    if (finalCounters.length === 0) {
      finalCounters = validHeroesForLane;
    }

    const formattedResult = finalCounters.slice(0, 5).map(name => ({
      name: name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      winRate: `Counter para ${laneInput.toUpperCase()}`
    }));

    return res.status(200).json({
      counters: formattedResult,
      totalHeroesAvailable: allHeroes.length,
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
