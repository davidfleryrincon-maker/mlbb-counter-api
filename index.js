export default async function handler(req, res) {
  // Permisos CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { hero, lane } = req.query;

  if (!hero) {
    return res.status(400).json({ error: 'Debes proporcionar un nombre de héroe' });
  }

  const formattedHero = hero.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const selectedLane = (lane || 'exp').toLowerCase().trim();
  const targetUrl = `https://mlbbhub.com/counter/${formattedHero}`;

  // BASE DE DATOS LOCAL DE ROLES Y LÍNEAS PARA FILTRAR RESULTADOS
  const LANE_HEROES_DATABASE = {
    gold: [
      "Beatrix", "Brody", "Clint", "Bruno", "Wanwan", "Lesley", "Irithel", 
      "Claude", "Karrie", "Moskov", "Hanabi", "Melissa", "Natan", "Layla", 
      "Miya", "Popol and Kupa", "Ixia", "Harith", "Lunox"
    ],
    exp: [
      "Terizla", "Yu Zhong", "Lapu-Lapu", "Paquito", "Chou", "Ruby", "Dyrroth", 
      "Thamuz", "Khaleed", "Arlott", "Cici", "Phoveus", "Alpha", "Edith", 
      "Esmeralda", "Uranus", "Badang", "Argus", "Sun", "Zilong", "Benedetta", "Gatotkaca"
    ],
    mid: [
      "Pharsa", "Kagura", "Lylia", "Lunox", "Yve", "Valentina", "Xavier", 
      "Cecilion", "Novaria", "Zhuxin", "Vale", "Valir", "Eudora", "Aurora", 
      "Gord", "Chang'e", "Cyclops", "Nana", "Odette", "Vexana", "Zhask"
    ],
    jungle: [
      "Fanny", "Hayabusa", "Ling", "Lancelot", "Gusion", "Nolan", "Baxia", 
      "Fredrinn", "Barats", "Martis", "Alpha", "Aamon", "Saber", "Helcurt", 
      "Karina", "Alucard", "Yi Sun-shin", "Harley", "Julian", "Suyou"
    ],
    roam: [
      "Tigreal", "Minotauro", "Minotaur", "Khufra", "Atlas", "Franco", "Akai", 
      "Gloo", "Grock", "Hylos", "Belerick", "Gatotkaca", "Lolita", "Angela", 
      "Estes", "Floryn", "Rafaela", "Mathilda", "Diggie", "Kaja", "Carmilla", "Chip"
    ]
  };

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      return res.status(200).json({ counters: [], source: targetUrl, lane: selectedLane, error: 'Héroe no encontrado' });
    }

    const html = await response.text();
    const rawCounters = [];
    const seen = new Set();

    // Extraer todos los héroes recomendados presentes en el HTML
    const regex = /href=["'](?:\/counter\/|https?:\/\/mlbbhub\.com\/counter\/)([a-z0-9-]+)["']/gi;
    let match;

    while ((match = regex.exec(html)) !== null) {
      let heroSlug = match[1].toLowerCase();

      if (heroSlug !== formattedHero && !seen.has(heroSlug)) {
        seen.add(heroSlug);
        let cleanName = heroSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        rawCounters.push(cleanName);
      }
    }

    // FILTRADO ESTRICTO POR LÍNEA
    const allowedForLane = LANE_HEROES_DATABASE[selectedLane] || [];
    
    let filteredCounters = rawCounters
      .filter(name => allowedForLane.some(allowed => allowed.toLowerCase() === name.toLowerCase()))
      .map(name => ({
        name: name,
        winRate: 'Ventaja confirmada'
      }));

    // Respaldar con la lista predeterminada de la línea si la raspadura pública no arrojó héroes coincidentes
    if (filteredCounters.length === 0) {
      filteredCounters = allowedForLane.slice(0, 8).map(name => ({
        name: name,
        winRate: 'Recomendación de línea'
      }));
    }

    return res.status(200).json({ 
      counters: filteredCounters.slice(0, 10), 
      source: targetUrl, 
      lane: selectedLane 
    });

  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar datos', details: error.message });
  }
}
