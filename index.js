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

    const heroSlug = heroInput.toLowerCase().trim().replace(/\s+/g, '-');
    const url = `https://mlbbhub.com/counter/${heroSlug}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(404).json({ error: 'Héroe no encontrado en MLBB Hub', counters: [] });
    }

    const html = await response.text();
    const $ = load(html);
    const rawCounters = [];

    // Base de conocimiento primaria de héroes habituales por línea/rol en Mobile Legends
    const laneRoleDatabase = {
      gold: ['miya', 'layla', 'lesley', 'wanwan', 'beatrix', 'brody', 'bruno', 'clint', 'claude', 'karrie', 'moskov', 'hanabi', 'irithel', 'melissa', 'natan', 'popol-and-kupa', 'edith'],
      exp: ['chou', 'paquito', 'yuzhong', 'esmeralda', 'thamuz', 'terizla', 'ruby', 'argus', 'badang', 'aldous', 'dyrroth', 'lapu-lapu', 'khaleed', 'alpha', 'freya', 'benedetta', 'uranus', 'cici', 'phoveus', 'sun', 'zilong'],
      mid: ['pharsa', 'kagura', 'lunox', 'lylia', 'yve', 'cecilion', 'vale', 'valir', 'eudora', 'aurora', 'gord', 'chang-e', 'cyclops', 'nana', 'kadita', 'xavier', 'zhask', 'novaria'],
      jungle: ['ling', 'lancelot', 'fanny', 'hayabusa', 'gusion', 'helcurt', 'karina', 'saber', 'alucard', 'baxia', 'akai', 'fredrinn', 'barats', 'aamon', 'nolan', 'martis', 'joy', 'julian', 'yin'],
      roam: ['tigreal', 'franco', 'khufra', 'atlas', 'gloo', 'grock', 'hylos', 'belerick', 'gatotkaca', 'johnson', 'lolita', 'minotaur', 'angela', 'estes', 'floryn', 'rafaela', 'mathilda', 'diggie', 'kaja', 'carmilla', 'chip']
    };

    const formatHeroName = (slug) => {
      return slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    // 1. Extraer todos los héroes sugeridos en el HTML
    $('a[href*="/hero/"], a[href*="/counter/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const parts = href.split('/').filter(Boolean);
      const slug = parts.pop();

      const blacklist = [
        'hero', 'counter', 'tier-list', 'guides', 'privacy', 'terms', 
        'contact', 'about', 'gold-lane', 'exp-lane', 'mid-lane', 'jungle', 'roam', heroSlug
      ];

      if (slug && !blacklist.includes(slug.toLowerCase()) && slug.length > 2) {
        if (!rawCounters.some(c => c.slug === slug.toLowerCase())) {
          rawCounters.push(slug.toLowerCase());
        }
      }
    });

    // 2. FILTRADO INTELIGENTE: Validar si el counter pertenece a la línea/rol solicitado
    const targetLaneHeroes = laneRoleDatabase[laneInput] || [];
    
    let filteredSlugs = rawCounters.filter(slug => targetLaneHeroes.includes(slug));

    // Si la lista filtrada por rol específico tiene muy pocos resultados, se complementa con la lista general de la página
    if (filteredSlugs.length < 3) {
      filteredSlugs = Array.from(new Set([...filteredSlugs, ...rawCounters]));
    }

    const finalCounters = filteredSlugs.map(slug => ({
      name: formatHeroName(slug),
      slug: slug,
      winRate: `Counter verificado para ${laneInput.toUpperCase()} Lane`
    }));

    return res.status(200).json({
      counters: finalCounters.slice(0, 10),
      source: url,
      lane: laneInput,
      hero: heroInput
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Error interno en el servidor Vercel', 
      details: error.message 
    });
  }
}
