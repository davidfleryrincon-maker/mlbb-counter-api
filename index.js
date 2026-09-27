import { load } from 'cheerio';

// Cache en memoria para no saturar mlbbhub.com en cada petición
let cachedHeroesList = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 60 * 6; // Guardar en caché por 6 horas

/**
 * Extrae la lista completa de personajes directamente de https://mlbbhub.com/counter
 */
async function fetchAllHeroesFromMLBBHub() {
  const now = Date.now();
  if (cachedHeroesList && (now - lastFetchTime < CACHE_DURATION)) {
    return cachedHeroesList;
  }

  try {
    const res = await fetch('https://mlbbhub.com/counter', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });

    if (res.ok) {
      const html = await res.text();
      const $ = load(html);
      const heroesSet = new Set();

      // Buscar todos los enlaces que llevan a /counter/[hero] en la página principal
      $('a[href*="/counter/"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const parts = href.split('/').filter(Boolean);
        const slug = parts.pop()?.toLowerCase();

        // Ignorar enlaces de navegación general
        const blacklist = ['counter', 'hero', 'tier-list', 'guides', 'privacy', 'terms'];
        if (slug && !blacklist.includes(slug) && slug.length > 1) {
          // Convertir slug ("popol-and-kupa") a nombre bonito ("Popol And Kupa")
          const cleanName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          heroesSet.add(cleanName);
        }
      });

      const heroesList = Array.from(heroesSet);
      if (heroesList.length > 50) {
        cachedHeroesList = heroesList;
        lastFetchTime = now;
        return cachedHeroesList;
      }
    }
  } catch (e) {
    console.warn('Error al extraer héroes desde MLBB Hub:', e.message);
  }

  // Lista de seguridad por si la web falla temporalmente
  return ["Faramis", "Hirara", "Hilda", "Miya", "Beatrix", "Layla"];
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

    // 1. OBTENER LA BASE DE DATOS DE HÉROES EN TIEMPO REAL DESDE MLBB HUB
    const allHeroesFromHub = await fetchAllHeroesFromMLBBHub();

    // Normalizar slug del héroe consultado
    const heroSlug = heroInput.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const url = `https://mlbbhub.com/counter/${heroSlug}`;

    // Si la petición es solo para obtener la lista de todos los héroes (para el Frontend)
    if (req.query.getHeroes === 'true') {
      return res.status(200).json({
        heroes: allHeroesFromHub,
        total: allHeroesFromHub.length
      });
    }

    // 2. CONSULTAR COUNTERS DEL HÉROES SELECCIONADO
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

        if (slug && !blacklist.includes(slug) && slug.length > 1) {
          const cleanName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          if (!scrapedHeroes.some(h => h.toLowerCase() === cleanName.toLowerCase())) {
            scrapedHeroes.push(cleanName);
          }
        }
      });
    }

    // 3. ROSTER BASE DE LÍNEAS (Para filtrado primario)
    const LANE_ROSTER = {
      gold: ["Beatrix", "Brody", "Clint", "Bruno", "Wanwan", "Lesley", "Irithel", "Claude", "Karrie", "Moskov", "Hanabi", "Melissa", "Natan", "Layla", "Miya", "Popol and Kupa", "Ixia", "Harith", "Lunox"],
      exp: ["Terizla", "Yu Zhong", "Lapu-Lapu", "Paquito", "Chou", "Ruby", "Dyrroth", "Thamuz", "Khaleed", "Arlott", "Cici", "Phoveus", "Alpha", "Edith", "Esmeralda", "Uranus", "Badang", "Argus", "Sun", "Zilong", "Benedetta", "Gatotkaca", "Masha", "Joy", "Hilda"],
      mid: ["Faramis", "Pharsa", "Kagura", "Lylia", "Lunox", "Yve", "Valentina", "Xavier", "Cecilion", "Novaria", "Zhuxin", "Vale", "Valir", "Eudora", "Aurora", "Gord", "Chang'e", "Cyclops", "Nana", "Odette", "Vexana", "Zhask", "Kadita"],
      jungle: ["Hirara", "Suyou", "Nolan", "Joy", "Fanny", "Hayabusa", "Ling", "Lancelot", "Gusion", "Baxia", "Fredrinn", "Barats", "Martis", "Alpha", "Aamon", "Saber", "Helcurt", "Karina", "Alucard", "Yi Sun-shin", "Harley", "Julian"],
      roam: ["Faramis", "Chip", "Minotauro", "Minotaur", "Tigreal", "Khufra", "Atlas", "Franco", "Akai", "Gloo", "Grock", "Hylos", "Belerick", "Gatotkaca", "Lolita", "Angela", "Estes", "Floryn", "Rafaela", "Mathilda", "Diggie", "Kaja", "Carmilla", "Hilda"]
    };

    const validHeroesForLane = LANE_ROSTER[laneInput] || LANE_ROSTER.gold;

    // 4. FILTRAR RESULTADOS
    let finalCounters = scrapedHeroes.filter(heroName => {
      const lowerName = heroName.toLowerCase();
      // Pertenece a la línea
      if (validHeroesForLane.some(valid => valid.toLowerCase() === lowerName)) return true;
      // Es un personaje nuevo presente en MLBB Hub pero no categorizado aún
      const isKnownInHub = allHeroesFromHub.some(h => h.toLowerCase() === lowerName);
      if (isKnownInHub && !Object.values(LANE_ROSTER).flat().some(h => h.toLowerCase() === lowerName)) {
        return true;
      }
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
      totalHubHeroes: allHeroesFromHub.length,
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
