import { parseProduction } from "./auxiliares";

/**
 * Encuentra el prefijo común más largo (como un array de tokens)
 * entre un grupo de producciones.
 * @param {string[]} productions - Un array de cadenas de producción.
 * @returns {string[]} - Un array de tokens que representa el prefijo común.
 */
function findLongestCommonPrefix(productions) {
  if (!productions || productions.length < 2) {
    return [];
  }

  // Parsear todas las producciones a arrays de tokens
  const parsedProductions = productions.map(p => parseProduction(p.trim()));

  // Tomar la primera producción como referencia
  const reference = parsedProductions[0];
  let prefixLength = 0;

  for (let i = 0; i < reference.length; i++) {
    const token = reference[i];
    // Verificar si este token existe en la misma posición en todas las demás producciones
    for (let j = 1; j < parsedProductions.length; j++) {
      if (i >= parsedProductions[j].length || parsedProductions[j][i] !== token) {
        // Se encontró una diferencia, el prefijo termina aquí.
        return reference.slice(0, prefixLength);
      }
    }
    // Si el token es común a todas, incrementamos la longitud del prefijo
    prefixLength++;
  }

  return reference.slice(0, prefixLength);
}

/**
 * Crea un nuevo nombre de no-terminal único (ej: <A'>, <A''>) para evitar colisiones.
 */
function createNewNonTerminalName(baseName, existingKeys) {
  let newName = baseName.slice(0, -1) + "'>";
  while (existingKeys.includes(newName)) {
    newName = newName.slice(0, -1) + "'>";
  }
  return newName;
}

/**
 * Realiza la factorización izquierda en una gramática para eliminar prefijos comunes.
 * El proceso se repite hasta que no se pueden realizar más factorizaciones.
 *
 * @param {Object.<string, string[]>} gramaticaOriginal - La gramática en formato de objeto.
 * @returns {Object.<string, string[]>} - Una nueva gramática factorizada por la izquierda.
 */
export function factorizarIzquierda(gramaticaOriginal) {
  let gramaticaProcesada = JSON.parse(JSON.stringify(gramaticaOriginal));
  let seHizoFactorizacion = true;

  // Repetir el proceso mientras se sigan realizando cambios
  while (seHizoFactorizacion) {
    seHizoFactorizacion = false;
    const nonTerminals = Object.keys(gramaticaProcesada);
    const nuevaGramaticaTemporal = {};

    for (const nonTerminalA of nonTerminals) {
      const producciones = gramaticaProcesada[nonTerminalA];
      
      // Agrupar producciones por su primer token para encontrar candidatos a factorización
      const grupos = {};
      for (const prod of producciones) {
        const parsedProd = parseProduction(prod.trim());
        if (parsedProd.length === 0) continue;
        const primerToken = parsedProd[0];
        if (!grupos[primerToken]) {
          grupos[primerToken] = [];
        }
        grupos[primerToken].push(prod);
      }

      const nuevasProduccionesParaA = [];
      let seFactorizoEsteNT = false;

      // Procesar cada grupo
      for (const primerToken in grupos) {
        const grupo = grupos[primerToken];
        
        // Si el grupo tiene 2 o más producciones, necesita ser factorizado
        if (grupo.length > 1) {
          seFactorizoEsteNT = true;
          const prefijoComunTokens = findLongestCommonPrefix(grupo);
          
          if (prefijoComunTokens.length > 0) {
            const prefijoComunStr = prefijoComunTokens.join('');
            
            // Crear el nuevo no-terminal A'
            const nuevoNoTerminalA_prime = createNewNonTerminalName(nonTerminalA, Object.keys(gramaticaProcesada).concat(Object.keys(nuevaGramaticaTemporal)));
            
            // Crear la regla A -> αA'
            nuevasProduccionesParaA.push(prefijoComunStr + nuevoNoTerminalA_prime);
            
            // Crear las reglas para A' -> β
            const produccionesParaA_prime = grupo.map(prod => {
              const sufijo = prod.trim().substring(prefijoComunStr.length);
              return sufijo === "" ? "λ" : sufijo; // Si el sufijo es vacío, usar λ
            });
            
            // Añadir la nueva regla A' a la gramática
            nuevaGramaticaTemporal[nuevoNoTerminalA_prime] = produccionesParaA_prime;
          } else {
             // No hay prefijo común, así que las reglas se quedan como están
             nuevasProduccionesParaA.push(...grupo);
          }
        } else {
          // El grupo solo tiene una producción (δ), se mantiene igual
          nuevasProduccionesParaA.push(grupo[0]);
        }
      }

      if (seFactorizoEsteNT) {
        // Si se factorizó, actualizamos la gramática y marcamos para otra iteración
        seHizoFactorizacion = true;
        nuevaGramaticaTemporal[nonTerminalA] = nuevasProduccionesParaA;
      } else {
        // Si no, simplemente copiamos las reglas originales a la nueva gramática temporal
        nuevaGramaticaTemporal[nonTerminalA] = gramaticaProcesada[nonTerminalA];
      }
    }
    // Actualizamos la gramática principal con los resultados de la pasada
    gramaticaProcesada = nuevaGramaticaTemporal;
  }
  
  return gramaticaProcesada;
}