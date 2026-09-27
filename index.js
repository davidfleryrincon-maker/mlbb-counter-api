const axios = require('axios');
const cheerio = require('cheerio');

// Lista global de héroes oficiales
const OFFICIAL_HEROES = [
  "Aamon", "Akai", "Aldous", "Alice", "Alpha", "Alucard", "Angela", "Argus", "Arlott", "Atlas", "Aurora",
  "Badang", "Balmond", "Barats", "Baxia", "Beatrix", "Belerick", "Benedetta", "Brody", "Bruno",
  "Carmilla", "Cecilion", "Chang'e", "Chip", "Chou", "Cici", "Claude", "Clint", "Cyclops",
  "Diggie", "Dyrroth", "Edith", "Esmeralda", "Estes", "Eudora", "Faramis", "Fanny", "Floryn", "Franco", "Fredrinn", "Freya",
  "Gatotkaca", "Gloom", "Gord", "Grock", "Gusion", "Hanabi", "Hanzo", "Harith", "Harley", "Hayabusa", "Helcurt", "Hilda", "Hylos",
  "Irithel", "Ixia", "Johnson", "Joy", "Julian", "Kadita", "Kagura", "Kaja", "Karina", "Karrie", "Khaleed", "Khufra", "Kimmy",
  "Lancelot", "Lapu-Lapu", "Layla", "Leomord", "Lesley", "Ling", "Lolita", "Lukas", "Lunox", "Lylia",
  "Martis", "Masha", "Mathilda", "Melissa", "Miya", "Minotaur", "Minsitthar", "Moskov",
  "Nana", "Natan", "Nolan", "Novaria", "Odette", "Paquito", "Pharsa", "Phoveus", "Popol and Kupa",
  "Rafaela", "Ruby", "Saber", "Selena", "Sun", "Suyou", "Terizla", "Thamuz", "Tigreal",
  "Uranus", "Vale", "Valir", "Valentina", "Vexana", "Wanwan", "Xavier", "X.Borg", "Yin", "Yi Sun-shin", "Yu Zhong", "Yve", "Zhask", "Zhuxin", "Zilong"
];

const HERO_LOOKUP = new Map(OFFICIAL_HEROES.map(h => [h.toLowerCase(), h]));

// Mapeo oficial por línea (el orden importa para forzar prioridad de línea)
const HEROES_BY_LANE = {
  jungle: [
    "Lukas", "Barats", "Baxia", "Fredrinn", "Akai", "Hayabusa", "Ling", "Suyou", "Alpha",
    "Alucard", "Aamon", "Fanny", "Gusion", "Lancelot", "Helcurt", "Hanzo", "Karina", "Martis",
    "Nolan", "Joy", "Julian", "Harley", "Yi Sun-shin", "Saber", "Yin"
  ],
  exp: [
    "Terizla", "Dyrroth", "Thamuz", "Yu Zhong", "Cici", "Lukas", "Ruby", "Arlott", "Badang",
    "Benedetta", "Esmeralda", "Gatotkaca", "Hilda", "Lapu-Lapu", "Paquito", "Phoveus", "Sun",
    "X.Borg", "Argus", "Chou", "Khaleed", "Masha", "Zilong"
  ],
  gold: [
    "Claude", "Irithel", "Brody", "Melissa", "Clint", "Karrie", "Beatrix", "Bruno", "Hanabi",
    "Ixia", "Layla", "Lesley", "Miya", "Moskov", "Natan", "Popol and Kupa", "Wanwan"
  ],
  mid: [
    "Valentina", "Lylia", "Kadita", "Xavier", "Lunox", "Zhuxin", "Cecilion", "Chang'e", "Cyclops",
    "Eudora", "Gord", "Harith", "Kagura", "Nana", "Novaria", "Odette", "Pharsa", "Vale",
    "Valir", "Vexana", "Yve", "Zhask"
  ],
  roam: [
    "Diggie", "Khufra", "Mathilda", "Chip", "Ruby", "Kaja", "Angela", "Atlas", "Belerick",
    "Carmilla", "Estes", "Faramis", "Floryn", "Franco", "Gloom", "Hylos", "Johnson", "Lolita",
    "Minotaur", "Rafaela", "Tigreal"
  ]
};

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

function normalizeLane(lane) {
  if (!lane) return '';
  const l = lane.toLowerCase().trim();
  if (l.includes('exp')) return 'exp';
  if (l.includes('gold')) return 'gold';
  if (l.includes('mid')) return 'mid';
  if (l.includes('jungle') || l.includes('jungla')) return 'jungle';
  if (l.includes('roam') || l.includes('roma')) return 'roam';
  return l;
}

module.exports = async (req, res) => {
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

  if (getHeroes === 'true') {
    return res.status(200).json({ heroes: OFFICIAL_HEROES });
  }

  if (!hero) {
    return res.status(400).json({ error: "Falta el parámetro 'hero'" });
  }

  const selectedLane = normalizeLane(lane);
  const heroSlug = formatSlug(hero);

  try {
    const hubUrl = `https://mlbbhub.com/heroes/${heroSlug}`;

    const response = await axios.get(hubUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 9000
    });

    const $ = cheerio.load(response.data);
    let extractedCounters = [];

    const nextDataScript = $('#__NEXT_DATA__').html();
    
    if (nextDataScript) {
      try {
        const nextData = JSON.parse(nextDataScript);
        const pageProps = nextData?.props?.pageProps;

        // Intentar buscar específicamente el objeto o array de "By Lane and Role"
        let laneDataNode = null;

        if (pageProps) {
          // Buscar en las propiedades habituales de la API de MLBB Hub
          laneDataNode = pageProps.byLane || pageProps.laneCounters || pageProps.roleCounters || pageProps.roles || pageProps.lanes;
        }

        const extractFromObj = (node) => {
          if (!node || typeof node !== 'object') return;
          if (Array.isArray(node)) {
            node.forEach(item => extractFromObj(item));
          } else {
            for (let key in node) {
              const val = node[key];
              if (typeof val === 'object' && val !== null) {
                const nameCandidate = val.name || val.heroName || val.hero || (typeof val === 'string' ? val : null);
                if (nameCandidate && typeof nameCandidate === 'string') {
                  const matched = HERO_LOOKUP.get(nameCandidate.toLowerCase());
                  if (matched && matched.toLowerCase() !== hero.toLowerCase()) {
                    extractedCounters.push({
                      name: matched,
                      winRate: val.winRate || val.win_rate || val.wr || 'N/A'
                    });
                  }
                }
                extractFromObj(val);
              }
            }
          }
        };

        // Si encontramos el nodo de "byLane", extraemos preferentemente de allí
        if (laneDataNode) {
          extractFromObj(laneDataNode);
        }

        // Si no se encontró o devolvió vacío, extraer del objeto general
        if (extractedCounters.length === 0) {
          extractFromObj(pageProps || nextData);
        }

      } catch (err) {
        console.warn("Error leyendo JSON estático:", err.message);
      }
    }

    // Respaldar con parseo del HTML de la sección "BY LANE AND ROLE" si no extrajo del JSON
    if (extractedCounters.length === 0) {
      $('nav, header, footer').remove();

      // Buscar el contenedor que sigue al título "BY LANE AND ROLE"
      let laneSection = $('*:contains("BY LANE AND ROLE")').last().closest('div, section');
      if (laneSection.length === 0) {
        laneSection = $('main, body');
      }

      laneSection.find('tr, li, div, a').each((i, el) => {
        const text = $(el).text().trim();
        const winRateMatch = text.match(/(\d{2}\.\d{1,2}%)/);

        for (const [lowerHero, officialName] of HERO_LOOKUP.entries()) {
          if (lowerHero === hero.toLowerCase()) continue;

          const regex = new RegExp(`\\b${lowerHero.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (regex.test(text)) {
            extractedCounters.push({
              name: officialName,
              winRate: winRateMatch ? winRateMatch[1] : 'N/A'
            });
            break;
          }
        }
      });
    }

    // Limpieza de duplicados preservando el orden en que se encontraron
    const uniqueCounters = [];
    const seen = new Set();
    for (const item of extractedCounters) {
      const lowerName = item.name.toLowerCase();
      if (!seen.has(lowerName) && lowerName !== hero.toLowerCase()) {
        seen.add(lowerName);
        uniqueCounters.push(item);
      }
    }

    let finalCounters = uniqueCounters;

    // Si se especificó una línea, ordenamos y filtramos basándonos en la prioridad definida por la línea
    if (selectedLane && HEROES_BY_LANE[selectedLane]) {
      const lanePriorityList = HEROES_BY_LANE[selectedLane].map(h => h.toLowerCase());
      const allowedInLane = new Set(lanePriorityList);

      // Filtrar solo los pertenecientes a la línea
      const filtered = uniqueCounters.filter(item => allowedInLane.has(item.name.toLowerCase()));

      // Ordenar respetando exactamente la prioridad definida para esa línea (ej: Lukas primero, Barats segundo)
      finalCounters = filtered.sort((a, b) => {
        const indexA = lanePriorityList.indexOf(a.name.toLowerCase());
        const indexB = lanePriorityList.indexOf(b.name.toLowerCase());
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
      });
    }

    if (finalCounters.length > 0) {
      return res.status(200).json({
        hero: hero,
        lane: selectedLane || 'all',
        counters: finalCounters.slice(0, 15)
      });
    }

    return res.status(404).json({ error: `No se encontraron counters para ${hero} en la línea ${selectedLane}` });

  } catch (error) {
    return res.status(500).json({
      error: `Error al consultar MLBB Hub: ${error.message}`
    });
  }
};
