const OFFICIAL_HEROES = [
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

const HERO_ALIASES = {
  "suyou": { name: "Suyou", slug: "suyu" },
  "suyu": { name: "Suyou", slug: "suyu" },
  "kaela": { name: "Kaela", slug: "kaela" },
  "calea": { name: "Kaela", slug: "kaela" },
  "hirara": { name: "Hirara", slug: "hirara" },
  "minotauro": { name: "Minotaur", slug: "minotaur" },
  "minotaur": { name: "Minotaur", slug: "minotaur" },
  "popol": { name: "Popol and Kupa", slug: "popol-and-kupa" }
};

const HERO_LOOKUP = new Map(OFFICIAL_HEROES.map(hero => [hero.toLowerCase(), hero]));

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
    "Valir", "Vexana", "Yve", "Zhask", "Faramis"
  ],
  roam: [
    "Diggie", "Khufra", "Mathilda", "Chip", "Ruby", "Kaja", "Angela", "Atlas", "Belerick",
    "Carmilla", "Estes", "Faramis", "Floryn", "Franco", "Gloom", "Hylos", "Johnson", "Lolita",
    "Minotaur", "Rafaela", "Tigreal", "Hilda"
  ]
};

module.exports = { OFFICIAL_HEROES, HERO_ALIASES, HERO_LOOKUP, HEROES_BY_LANE };