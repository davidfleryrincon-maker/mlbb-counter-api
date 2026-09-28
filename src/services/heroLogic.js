const { HERO_ALIASES, HERO_LOOKUP } = require('../data/heroes');

function getCounterReason(counterHero, enemyHero) {
  const counter = counterHero.toLowerCase();

  if (counter === 'baxia') return `Reduce drásticamente la curación y regeneración de ${enemyHero} con su pasiva anti-heal integrada.`;
  if (counter === 'diggie') return `Invalida todo el control de masas (CC) e iniciaciones de ${enemyHero} gracias a su Ultimate.`;
  if (counter === 'khufra') return `Interrumpe los desplazamientos, dashes y habilidades de entrada de ${enemyHero} con su bola de rebote.`;
  if (counter === 'phoveus') return `Genera escudos y saltos automáticos adicionales cada vez que ${enemyHero} realiza un dash o parpadeo.`;
  if (counter === 'minsitthar') return `Bloquea el uso de habilidades de parpadeo y movilidad de ${enemyHero} dentro de su dominio Real.`;
  if (counter === 'karrie') return `Derrite la barra de vida de ${enemyHero} con daño verdadero porcentual ignorando su defensa.`;
  if (counter === 'lolita') return `Bloquea y refleja proyectiles, habilidades a distancia y ataques clave de ${enemyHero}.`;
  if (counter === 'valir') return `Mantiene a distancia a ${enemyHero} interrumpiendo su avance con empujones y ralentizaciones continuas.`;
  if (counter === 'saber' || counter === 'kaja' || counter === 'franco') return `Fija e inmoviliza a ${enemyHero} con CC supresor antes de que pueda ejecutar su combo o escapar.`;
  if (counter === 'hayabusa' || counter === 'ling' || counter === 'fanny') return `Explotará la falta de movilidad o fragilidad de ${enemyHero} ejecutando picks rápidos.`;
  if (counter === 'lunox') return `Tiene invulnerabilidad para esquivar el combo de ${enemyHero} y penetración mágica para destruirlo.`;
  if (counter === 'esmeralda') return `Absorbe constantemente los escudos de ${enemyHero} y los convierte en vida propia.`;
  if (counter === 'belerick') return `Devuelve el daño de los ataques rápidos de ${enemyHero} provocándole la muerte por su propia velocidad.`;

  const assassinList = ["fanny", "ling", "hayabusa", "helcurt", "gusion", "aamon", "saber", "lancelot", "joy", "nolan", "karina"];
  const tankList = ["baxia", "khufra", "tigreal", "atlas", "hylos", "grock", "minotaur", "akai", "fredrinn", "johnson"];
  const mageList = ["eudora", "aurora", "kadita", "kagura", "lunox", "xavier", "lylia", "pharsa", "vale", "vexana"];
  const mmList = ["claude", "karrie", "brody", "clint", "melissa", "beatrix", "wanwan", "bruno"];

  if (assassinList.includes(counter)) return `Tiene la movilidad y burst suficiente para cazar y eliminar a ${enemyHero} desposicionado.`;
  if (tankList.includes(counter)) return `Aporta control de masas masivo y durabilidad para neutralizar a ${enemyHero} en peleas de equipo.`;
  if (mageList.includes(counter)) return `Aplica daño en área, zonificación y burst mágico para denegar la posición de ${enemyHero}.`;
  if (mmList.includes(counter)) return `Supera el rango o el daño por segundo (DPS) de ${enemyHero} en las fases media y tardía del juego.`;

  return `Supera la fase de líneas y escala con mayor impacto táctico en peleas de equipo frente a ${enemyHero}.`;
}

function resolveHeroNameAndSlug(heroInput) {
  if (!heroInput) return { officialName: '', slug: '' };
  const cleanInput = heroInput.toLowerCase().trim();

  if (HERO_ALIASES[cleanInput]) {
    return {
      officialName: HERO_ALIASES[cleanInput].name,
      slug: HERO_ALIASES[cleanInput].slug
    };
  }

  const matched = HERO_LOOKUP.get(cleanInput);
  const officialName = matched || heroInput;
  return { officialName, slug: formatSlug(officialName) };
}

function normalizeLane(lane) {
  if (!lane) return '';
  const normalizedLane = lane.toLowerCase().trim();
  if (normalizedLane.includes('exp')) return 'exp';
  if (normalizedLane.includes('gold')) return 'gold';
  if (normalizedLane.includes('mid')) return 'mid';
  if (normalizedLane.includes('jungle') || normalizedLane.includes('jungla')) return 'jungle';
  if (normalizedLane.includes('roam') || normalizedLane.includes('roma')) return 'roam';
  return normalizedLane;
}

function formatSlug(heroName) {
  if (!heroName) return '';
  return heroName.toLowerCase().trim().replace(/'/g, '').replace(/\./g, '').replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
}

module.exports = { getCounterReason, resolveHeroNameAndSlug, normalizeLane, formatSlug };