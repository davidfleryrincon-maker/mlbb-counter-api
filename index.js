const axios = require('axios');
const cheerio = require('cheerio');

// Normaliza el nombre del héroe para las URLs de MLBB Hub (ej. "Popol and Kupa" -> "popol-and-kupa")
function formatSlug(heroName) {
  if (!heroName) return '';
  return heroName
    .toLowerCase()
    .trim()
    .replace(/'/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}

// Normaliza el parámetro de línea/rol para coincidir con clases/menciones de MLBB Hub
function normalizeLane(lane) {
  if (!lane) return 'all';
  const l = lane.toLowerCase().trim();
  if (l.includes('exp')) return 'exp';
  if (l.includes('gold')) return 'gold';
  if (l.includes('mid')) return 'mid';
  if (l.includes('jungle') || l.includes('jungla')) return 'jungle';
  if (l.includes('roam') || l.includes('roma')) return 'roam';
  return l;
}

module.exports = async (req, res) => {
  // 1. Encabezados CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { hero, lane, getHeroes } = req.query;

  // 2. Ruta para obtener la lista completa de héroes (Búsqueda/Autocomplete)
  if (getHeroes === 'true') {
    const defaultHeroes = [
      "Aamon", "Akai", "Aldous", "Alice", "Alpha", "Alucard", "Angela", "Argus", "Arlott", "Atlas", "Aurora",
      "Badang", "Balmond", "Barats", "Baxia", "Beatrix", "Belerick", "Benedetta", "Brody", "Bruno",
      "Carmilla", "Cecilion", "Chang'e", "Chip", "Chou", "Cici", "Claude", "Clint", "Cyclops",
      "Diggie", "Dyrroth", "Edith", "Esmeralda", "Estes", "Eudora", "Faramis", "Fanny", "Floryn", "Franco", "Fredrinn", "Freya",
      "Gatotkaca", "Gloom", "Gord", "Grock", "Gusion", "Hanabi", "Hanzo", "Harith", "Harley", "Hayabusa", "Helcurt", "Hilda", "Hirara", "Hylos",
      "Irithel", "Ixia", "Johnson", "Joy", "Julian", "Kadita", "Kagura", "Kaja", "Karina", "Karrie", "Khaleed", "Khufra", "Kimmy",
      "Lancelot", "Lapu-Lapu", "Layla", "Leomord", "Lesley", "Ling", "Lolita", "Lukas", "Lunox", "Lylia",
      "Martis", "Masha", "Mathilda", "Melissa", "Miya", "Minotaur", "Minsitthar", "Moskov",
      "Nana", "Natan", "Nolan", "Novaria", "Odette", "Paquito", "Pharsa", "Phoveus", "Popol and Kupa",
      "Rafaela", "Ruby", "Saber", "Selena", "Sun", "Suyou", "Terizla", "Thamuz", "Tigreal",
      "Uranus", "Vale", "Valir", "Valentina", "Vexana", "Wanwan", "Xavier", "X.Borg", "Yin", "Yi Sun-shin", "Yu Zhong", "Yve", "Zhask", "Zhuxin", "Zilong"
    ];

    return res.status(200).json({ heroes: defaultHeroes });
  }

  // 3. Consulta de Counters exclusivamente desde "BY LANE AND ROLE"
  if (!hero) {
    return res.status(400).json({ error: "Falta el parámetro 'hero'" });
  }

  const selectedLane = normalizeLane(lane);
  const heroSlug = formatSlug(hero);

  try {
    // Si hay una línea específica, intentamos consultar la sub-ruta directa de esa línea
    const hubUrl = (selectedLane !== 'all') 
      ? `https://mlbbhub.com/heroes/${heroSlug}/${selectedLane}`
      : `https://mlbbhub.com/heroes/${heroSlug}`;

    const response = await axios.get(hubUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 8000
    });

    const $ = cheerio.load(response.data);
    let extractedCounters = [];

    // Estrategia 1: Extraer directamente de la sección/tabla "BY LANE AND ROLE"
    // Buscamos contenedores con títulos/clases referidas a líneas o tablas de counters
    const targetContainers = [
      `.lane-${selectedLane}`,
      `#${selectedLane}`,
      `[data-lane="${selectedLane}"]`,
      `section:contains("BY LANE AND ROLE")`,
      `section:contains("By Lane")`,
      `.by-lane-and-role`,
      `table`
    ];

    for (const selector of targetContainers) {
      if (extractedCounters.length > 0) break; // Si ya encontramos datos en una sección específica, nos detenemos

      $(selector).find('tr, .hero-row, .counter-card, .list-item').each((i, row) => {
        const counterName = $(row).find('.hero-name, .name, a, td').first().text().trim();
        const rowText = $(row).text();
        const winRateMatch = rowText.match(/(\d{2}\.\d{1,2}%)/);

        if (counterName && counterName.length > 2 && counterName.toLowerCase() !== hero.toLowerCase()) {
          extractedCounters.push({
            name: counterName,
            winRate: winRateMatch ? winRateMatch[1] : '53.0%',
            lane: selectedLane
          });
        }
      });
    }

    // Filtrar duplicados respetando el orden exacto en que la web los presenta
    const uniqueCounters = [];
    const seen = new Set();
    for (const item of extractedCounters) {
      const lowerName = item.name.toLowerCase();
      if (!seen.has(lowerName) && lowerName !== hero.toLowerCase()) {
        seen.add(lowerName);
        uniqueCounters.push(item);
      }
    }

    if (uniqueCounters.length > 0) {
      return res.status(200).json({
        hero: hero,
        lane: selectedLane,
        counters: uniqueCounters.slice(0, 15)
      });
    }

    throw new Error("No se encontraron tablas en la ruta específica de línea.");

  } catch (error) {
    console.warn(`[Aviso Scraping MLBB Hub] No se pudo leer la tabla para ${hero} (${selectedLane}):`, error.message);

    // Si la web de MLBB Hub falla o cambia de estructura temporalmente,
    // devolvemos una respuesta vacía limpia en lugar de forzar héroes predefinidos.
    return res.status(200).json({
      hero: hero,
      lane: selectedLane,
      counters: []
    });
  }
};
