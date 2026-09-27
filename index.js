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

// DICCIONARIO DE ALIAS/SLUGS (Resuelve discordancias como Suyou vs Suyu, Kaela vs Calea, etc.)
const HERO_ALIASES = {
  "suyou": { name: "Suyou", slug: "suyu" },
  "suyu": { name: "Suyou", slug: "suyu" },
  "kaela": { name: "Kaela", slug: "kaela" },
  "calea": { name: "Kaela", slug: "kaela" },
  "minotauro": { name: "Minotaur", slug: "minotaur" },
  "minotaur": { name: "Minotaur", slug: "minotaur" },
  "popol": { name: "Popol and Kupa", slug: "popol-and-kupa" }
};

const HERO_LOOKUP = new Map(OFFICIAL_HEROES.map(h => [h.toLowerCase(), h]));

// Mapeo unificado por línea
const HEROES_BY_LANE = {
  jungle: [
    "Lukas", "Barats", "Baxia", "Fredrinn", "Akai", "Hayabusa", "Ling", "Suyou", "Alpha",
    "Alucard", "Aamon", "Fanny", "Gusion", "Lancelot", "Helcurt", "Hanzo", "Karina", "Martis",
    "Nolan", "Joy", "Julian", "Harley", "Yi Sun-shin", "Saber", "Yin"
  ],
  exp: [
    "Terizla", "Dyrroth", "Thamuz", "Yu Zhong", "Cici", "Lukas", "Ruby", "Arlott", "Badang",
    "Benedetta", "Esmeralda", "Gatotkaca", "Hilda", "Lapu-Lapu", "Paquito", "Phoveus", "Sun",
    "X.Borg", "Argus", "Chou", "Khaleed", "Masha", "Zilong", "Suyou"
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

function resolveHeroNameAndSlug(heroInput) {
  if (!heroInput) return { officialName: '', slug: '' };
  const cleanInput = heroInput.toLowerCase().trim();

  // Si existe en la tabla de alias explícitos
  if (HERO_ALIASES[cleanInput]) {
    return {
      officialName: HERO_ALIASES[cleanInput].name,
      slug: HERO_ALIASES[cleanInput].slug
    };
  }

  // Búsqueda en la lista oficial
  const matched = HERO_LOOKUP.get(cleanInput);
  const officialName = matched || heroInput;
  const slug = officialName.toLowerCase().trim().replace(/'/g, '').replace(/\./g, '').replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');

  return { officialName, slug };
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
  const { officialName, slug: heroSlug } = resolveHeroNameAndSlug(hero);

  try {
    const hubUrl = `https://mlbbhub.com/counter/${heroSlug}`;

    let response;
    try {
      response = await axios.get(hubUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 9000
      });
    } catch (fetchErr) {
      // Si con el slug primario da 404 y se buscaba Suyou/Suyu, intenta con el alternativo
      if (heroSlug === 'suyu') {
        const altUrl = `https://mlbbhub.com/counter/suyou`;
        response = await axios.get(altUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          timeout: 9000
        });
      } else {
        throw fetchErr;
      }
    }

    const $ = cheerio.load(response.data);
    let extractedCounters = [];

    // --- ESTRATEGIA 1: Extracción de __NEXT_DATA__ ---
    const nextDataScript = $('#__NEXT_DATA__').html();
    if (nextDataScript) {
      try {
        const nextData = JSON.parse(nextDataScript);
        const pageProps = nextData?.props?.pageProps;

        const parseItems = (list) => {
          if (!Array.isArray(list)) return;
          list.forEach(item => {
            const rawName = item.name || item.heroName || item.hero;
            if (rawName && typeof rawName === 'string') {
              const matched = HERO_LOOKUP.get(rawName.toLowerCase()) || rawName;
              if (matched.toLowerCase() !== officialName.toLowerCase()) {
                extractedCounters.push({
                  name: matched,
                  winRate: item.winRate || item.win_rate || item.wr || (item.winrate ? `${item.winrate}%` : '52.5%'),
                  role: (item.role || item.class || '').toLowerCase()
                });
              }
            }
          });
        };

        const targetNodes = [
          pageProps?.roleCounters,
          pageProps?.roles,
          pageProps?.byRole,
          pageProps?.counters,
          pageProps?.heroData?.counters
        ];

        targetNodes.forEach(node => {
          if (!node) return;
          if (Array.isArray(node)) {
            parseItems(node);
          } else if (typeof node === 'object') {
            Object.values(node).forEach(group => parseItems(group));
          }
        });
      } catch (err) {
        console.warn("Error parseando JSON interno:", err.message);
      }
    }

    // --- ESTRATEGIA 2: Scraping HTML de Resguardo (Fallback Si JSON falla) ---
    if (extractedCounters.length === 0) {
      $('[class*="counter"], [class*="card"], [class*="hero-row"], a[href*="/counter/"]').each((i, el) => {
        const text = $(el).text().trim();
        const href = $(el).attr('href') || '';
        
        OFFICIAL_HEROES.forEach(hName => {
          if (hName.toLowerCase() !== officialName.toLowerCase()) {
            if (text.toLowerCase().includes(hName.toLowerCase()) || href.includes(formatSlug(hName))) {
              // Buscar porcentaje en texto cercano
              const wrMatch = text.match(/(\d{2}(\.\d+)?%)/);
              extractedCounters.push({
                name: hName,
                winRate: wrMatch ? wrMatch[1] : '52.0%',
                role: ''
              });
            }
          }
        });
      });
    }

    // Limpieza de duplicados preservando la primera coincidencia
    const uniqueCounters = [];
    const seen = new Set();
    for (const item of extractedCounters) {
      const lower = item.name.toLowerCase();
      if (!seen.has(lower) && lower !== officialName.toLowerCase()) {
        seen.add(lower);
        uniqueCounters.push(item);
      }
    }

    let finalCounters = uniqueCounters;

    // Filtrar y ordenar según HEROES_BY_LANE
    if (selectedLane && HEROES_BY_LANE[selectedLane]) {
      const lanePriorityList = HEROES_BY_LANE[selectedLane].map(h => h.toLowerCase());
      const allowedInLane = new Set(lanePriorityList);

      const filtered = uniqueCounters.filter(item => allowedInLane.has(item.name.toLowerCase()));

      if (filtered.length > 0) {
        finalCounters = filtered.sort((a, b) => {
          const idxA = lanePriorityList.indexOf(a.name.toLowerCase());
          const idxB = lanePriorityList.indexOf(b.name.toLowerCase());
          return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
        });
      }
    }

    return res.status(200).json({
      hero: officialName,
      lane: selectedLane || 'all',
      counters: finalCounters.slice(0, 15)
    });

  } catch (error) {
    return res.status(200).json({
      hero: officialName,
      lane: selectedLane || 'all',
      counters: []
    });
  }
};

function formatSlug(heroName) {
  if (!heroName) return '';
  return heroName.toLowerCase().trim().replace(/'/g, '').replace(/\./g, '').replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
}
