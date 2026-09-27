const axios = require('axios');
const cheerio = require('cheerio');

// Lista global oficial solo para evitar que se cuelen textos de menús o botones
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

  const { hero, getHeroes } = req.query;

  if (getHeroes === 'true') {
    return res.status(200).json({ heroes: OFFICIAL_HEROES });
  }

  if (!hero) {
    return res.status(400).json({ error: "Falta el parámetro 'hero'" });
  }

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

    // 1. Extraer directo del JSON de la página
    const nextDataScript = $('#__NEXT_DATA__').html();
    
    if (nextDataScript) {
      try {
        const nextData = JSON.parse(nextDataScript);
        
        const extractDirect = (node) => {
          if (!node || typeof node !== 'object') return;

          if (Array.isArray(node)) {
            node.forEach(item => extractDirect(item));
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
                extractDirect(val);
              }
            }
          }
        };

        extractDirect(nextData?.props?.pageProps || nextData);
      } catch (err) {
        console.warn("Error leyendo JSON estático:", err.message);
      }
    }

    // 2. Extraer directo del HTML del body (limpiando menús)
    if (extractedCounters.length === 0) {
      $('nav, header, footer, [class*="nav"], [class*="header"]').remove();

      $('main, div#__next, body').find('tr, li, div, a').each((i, el) => {
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

    // Limpieza de duplicados simple manteniéndolos en el orden que venían de la página
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
        counters: uniqueCounters
      });
    }

    return res.status(404).json({ error: `No se encontraron counters para ${hero}` });

  } catch (error) {
    return res.status(500).json({
      error: `Error al consultar MLBB Hub: ${error.message}`
    });
  }
};
