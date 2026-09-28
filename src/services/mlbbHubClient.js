const axios = require('axios');
const cheerio = require('cheerio');
const { OFFICIAL_HEROES, HERO_LOOKUP } = require('../data/heroes');
const { formatSlug } = require('./heroLogic');

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9'
};

async function fetchLiveHeroesFromMLBBHub() {
  try {
    const response = await axios.get('https://mlbbhub.com/counter', {
      headers: REQUEST_HEADERS,
      timeout: 6000
    });

    const $ = cheerio.load(response.data);
    const extractedHeroes = new Set(OFFICIAL_HEROES);

    $('select option').each((index, element) => {
      const name = $(element).text().trim();
      if (name && name.length > 1 && !name.toLowerCase().includes('select')) {
        extractedHeroes.add(name);
      }
    });

    const nextDataScript = $('#__NEXT_DATA__').html();
    if (nextDataScript) {
      try {
        const nextData = JSON.parse(nextDataScript);
        const heroes = nextData?.props?.pageProps?.heroes || nextData?.props?.pageProps?.allHeroes;
        if (Array.isArray(heroes)) {
          heroes.forEach(hero => {
            const name = hero.name || hero.heroName || hero;
            if (typeof name === 'string') extractedHeroes.add(name);
          });
        }
      } catch (error) {
        // La lista oficial sirve como respaldo si el JSON de la página no es válido.
      }
    }

    return Array.from(extractedHeroes);
  } catch (error) {
    console.warn('No se pudo obtener la lista en vivo de MLBB Hub, usando lista local:', error.message);
    return OFFICIAL_HEROES;
  }
}

async function fetchCountersFromMLBBHub(heroName, heroSlug) {
  const url = `https://mlbbhub.com/counter/${heroSlug}`;
  let response;

  try {
    response = await axios.get(url, { headers: REQUEST_HEADERS, timeout: 9000 });
  } catch (fetchError) {
    if (heroSlug !== 'suyu') throw fetchError;
    response = await axios.get('https://mlbbhub.com/counter/suyou', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 9000
    });
  }

  const $ = cheerio.load(response.data);
  const extractedCounters = [];
  const nextDataScript = $('#__NEXT_DATA__').html();

  if (nextDataScript) {
    try {
      const nextData = JSON.parse(nextDataScript);
      const pageProps = nextData?.props?.pageProps;

      const parseItems = list => {
        if (!Array.isArray(list)) return;
        list.forEach(item => {
          const rawName = item.name || item.heroName || item.hero;
          if (!rawName || typeof rawName !== 'string') return;

          const matchedName = HERO_LOOKUP.get(rawName.toLowerCase()) || rawName;
          if (matchedName.toLowerCase() === heroName.toLowerCase()) return;

          const winRate = item.winRate || item.win_rate || item.wr || (item.winrate ? `${item.winrate}%` : null);
          extractedCounters.push({
            name: matchedName,
            winRate,
            role: (item.role || item.class || '').toLowerCase()
          });
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
    } catch (error) {
      console.warn('Error parseando JSON interno:', error.message);
    }
  }

  if (extractedCounters.length === 0) {
    $('[class*="counter"], [class*="card"], [class*="hero-row"], a[href*="/counter/"]').each((index, element) => {
      const text = $(element).text().trim();
      const href = $(element).attr('href') || '';

      OFFICIAL_HEROES.forEach(name => {
        if (name.toLowerCase() === heroName.toLowerCase()) return;
        if (!text.toLowerCase().includes(name.toLowerCase()) && !href.includes(formatSlug(name))) return;

        const winRateMatch = text.match(/(\d{2}(\.\d+)?%)/);
        extractedCounters.push({ name, winRate: winRateMatch ? winRateMatch[1] : null, role: '' });
      });
    });
  }

  return extractedCounters;
}

module.exports = { fetchLiveHeroesFromMLBBHub, fetchCountersFromMLBBHub };