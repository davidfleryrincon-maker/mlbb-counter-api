/**
 * Función que obtiene la lista completa de héroes directamente de MLBB Hub vía el backend
 */
async function cargarHeroesDinamicos() {
  try {
    const res = await fetch(`${VERCEL_URL}/?getHeroes=true`);
    if (res.ok) {
      const data = await res.json();
      if (data.heroes && data.heroes.length > 0) {
        // Combinar lista dinámica con la base local asegurando no duplicar y limpiar espacios
        const combinados = new Set([...HERO_DATABASE, ...data.heroes]);
        HERO_DATABASE = Array.from(combinados).map(h => h.trim());
        console.log(`Base de datos actualizada con ${HERO_DATABASE.length} héroes.`);
      }
    }
  } catch (err) {
    console.warn("No se pudo cargar la lista dinámica, usando base local:", err.message);
  }
}

/**
 * Identifica si el texto ingresado es un héroe.
 * NO autocorregirá si el texto coincide de forma exacta con alguno de la lista.
 */
function identificarHeroe(entrada) {
  if (!entrada) return entrada;
  
  const limpia = entrada.toLowerCase().trim();

  // 1. Verificación Exacta: Si el nombre ya existe en la base de datos, devolverlo tal cual.
  const coincidenciaExacta = HERO_DATABASE.find(heroe => heroe.toLowerCase() === limpia);
  if (coincidenciaExacta) {
    return coincidenciaExacta;
  }

  // 2. Si no hay coincidencia exacta, buscar la menor distancia Levenshtein
  let mejorCoincidencia = entrada.trim();
  let menorDistancia = Infinity;

  HERO_DATABASE.forEach(heroe => {
    const distancia = levenshtein(limpia, heroe.toLowerCase());
    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      mejorCoincidencia = heroe;
    }
  });

  // Solo autocorregir si la diferencia es de 1 o 2 caracteres Y el texto ingresado tiene más de 3 letras
  if (menorDistancia <= 2 && limpia.length > 3) {
    return mejorCoincidencia;
  }

  // En caso contrario, respetar exactamente lo que escribió el usuario
  return entrada.trim();
}
