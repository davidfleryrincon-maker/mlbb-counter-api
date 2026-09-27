const axios = require('axios');
const cheerio = require('cheerio');

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

// Mapeo de Línea -> Roles permitidos en la página objetivo
const LANE_TO_ROLES = {
  jungle: ['assassin', 'fighter', 'tank'],
  exp: ['fighter', 'tank'],
  mid: ['mage'],
  gold: ['marksman'],
  roam: ['support', 'tank']
};

// Mapeo unificado por línea (DEBE SER IDÉNTICO EN index.html e index.js)
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
  return heroName.toLowerCase().trim().replace(/'/g, '').replace(/\./g, '').replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
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
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();

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
    const hubUrl = `https://mlbbhub.com/counter/${heroSlug}`;

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

        // Extraer los bloques etiquetados por ROL
        const roleDataNode = pageProps?.roleCounters || pageProps?.roles || pageProps?.byRole;

        const parseItems = (list) => {
          if (!Array.isArray(list)) return;
          list.forEach(item => {
            const rawName = item.name || item.heroName || item.hero;
            if (rawName && typeof rawName === 'string') {
              const matched = HERO_LOOKUP.get(rawName.toLowerCase());
              if (matched && matched.toLowerCase() !== hero.toLowerCase()) {
                extractedCounters.push({
                  name: matched,
                  winRate: item.winRate || item.win_rate || item.wr || 'N/A',
                  role: (item.role || item.class || '').toLowerCase()
                });
              }
            }
          });
        };

        if (roleDataNode) {
          if (Array.isArray(roleDataNode)) {
            parseItems(roleDataNode);
          } else if (typeof roleDataNode === 'object') {
            Object.values(roleDataNode).forEach(roleGroup => parseItems(roleGroup));
          }
        }
      } catch (err) {
        console.warn("Error leyendo JSON de roles:", err.message);
      }
    }

    // Limpiar duplicados preservando el primero encontrado
    const uniqueCounters = [];
    const seen = new Set();
    for (const item of extractedCounters) {
      const lower = item.name.toLowerCase();
      if (!seen.has(lower) && lower !== hero.toLowerCase()) {
        seen.add(lower);
        uniqueCounters.push(item);
      }
    }

    let finalCounters = uniqueCounters;

    // Aplicar orden e inclusión según la lista unificada HEROES_BY_LANE
    if (selectedLane && HEROES_BY_LANE[selectedLane]) {
      const lanePriorityList = HEROES_BY_LANE[selectedLane].map(h => h.toLowerCase());
      const allowedInLane = new Set(lanePriorityList);

      const filtered = uniqueCounters.filter(item => allowedInLane.has(item.name.toLowerCase()));

      // Orden estricto según la lista dada para la línea (Lukas #1, Barats #2, etc.)
      finalCounters = filtered.sort((a, b) => {
        const idxA = lanePriorityList.indexOf(a.name.toLowerCase());
        const idxB = lanePriorityList.indexOf(b.name.toLowerCase());
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
      });
    }

    return res.status(200).json({
      hero: hero,
      lane: selectedLane || 'all',
      counters: finalCounters.slice(0, 15)
    });

  } catch (error) {
    return res.status(500).json({
      error: `Error al consultar MLBB Hub: ${error.message}`
    });
  }
};
