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

    // Normalizar slug del héroe (ej. "hirara" -> "hirara", "popol and kupa" -> "popol-and-kupa")
    const heroSlug = heroInput.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const url = `https://mlbbhub.com/counter/${heroSlug}`;

    // 1. BASE DE DATOS DE LÍNEAS (Incluyendo héroes recientes como Hirara, Suyou, Zhuxin, Cici, Nolan, Chip, etc.)
    const LANE_ROSTER = {
      gold: [
        "Beatrix", "Brody", "Clint", "Bruno", "Wanwan", "Lesley", "Irithel", 
        "Claude", "Karrie", "Moskov", "Hanabi", "Melissa", "Natan", "Layla", 
        "Miya", "Popol and Kupa", "Ixia", "Harith", "Lunox"
      ],
      exp: [
        "Terizla", "Yu Zhong", "Lapu-Lapu", "Paquito", "Chou", "Ruby", "Dyrroth", 
        "Thamuz", "Khaleed", "Arlott", "Cici", "Phoveus", "Alpha", "Edith", 
        "Esmeralda", "Uranus", "Badang", "Argus", "Sun", "Zilong", "Benedetta", 
        "Gatotkaca", "Masha", "Joy"
      ],
      mid: [
        "Pharsa", "Kagura", "Lylia", "Lunox", "Yve", "Valentina", "Xavier", 
        "Cecilion", "Novaria", "Zhuxin", "Vale", "Valir", "Eudora", "Aurora", 
        "Gord", "Chang'e", "Cyclops", "Nana", "Odette", "Vexana", "Zhask", "Kadita"
      ],
      jungle: [
        "Hirara", "Suyou", "Nolan", "Joy", "Fanny", "Hayabusa", "Ling", "Lancelot", 
        "Gusion", "Baxia", "Fredrinn", "Barats", "Martis", "Alpha", "Aamon", 
        "Saber", "Helcurt", "Karina", "Alucard", "Yi Sun-shin", "Harley", "Julian"
      ],
      roam: [
        "Chip", "Minotauro", "Minotaur", "Tigreal", "Khufra", "Atlas", "Franco", 
        "Akai", "Gloo", "Grock", "Hylos", "Belerick", "Gatotkaca", "Lolita", 
        "Angela", "Estes", "Floryn", "Rafaela", "Mathilda", "Diggie", "Kaja", "Carmilla"
      ]
    };

    // Crear un conjunto global de todos los héroes conocidos en la matriz
    const ALL_KNOWN_HEROES = new Set(
      Object.values(LANE_ROSTER).flat().map(h => h.toLowerCase())
    );

    // 2. PETICIÓN DE DATOS A MLBB HUB
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });

    let scrapedHeroes = [];

    if (response.ok) {
      const html = await response.text();
      const $ = load(html);

      // Extraer enlaces de héroes
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

    // 3. FILTRADO INTELIGENTE
    const validHeroesForLane = LANE_ROSTER[laneInput] || LANE_ROSTER.gold;

    let finalCounters = scrapedHeroes.filter(heroName => {
      const lowerName = heroName.toLowerCase();
      
      // Regla A: Si el héroe está asignado a la línea seleccionada en nuestra base de datos, pasa.
      const isAssignedToLane = validHeroesForLane.some(valid => valid.toLowerCase() === lowerName);
      if (isAssignedToLane) return true;

      // Regla B: Si es un héroe NUEVO (no está registrado en ninguna otra línea de nuestra matriz),
      // lo dejamos pasar dinámicamente para no bloquear personajes nuevos como Hirara.
      const isNewUnknownHero = !ALL_KNOWN_HEROES.has(lowerName);
      if (isNewUnknownHero) return true;

      return false;
    });

    // Respaldar con la lista predeterminada de la línea si no se encontraron héroes
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
