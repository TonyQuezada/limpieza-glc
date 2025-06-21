/**
 * Determina si una cadena representa un símbolo no terminal (ej: "<S>").
 * @param {string} s - La cadena a verificar.
 * @returns {boolean} - True si es un no terminal.
 */
function isNonTerminal(s) {
  return typeof s === 'string' && s.startsWith('<') && s.endsWith('>') && s.length > 2;
}

/**
 * Parsea una cadena de producción en una lista de tokens (terminales y no terminales).
 * Es un helper necesario para analizar las producciones.
 * @param {string} str - La cadena de producción a parsear.
 * @returns {string[]} - Un array de tokens.
 */
function parseProduction(str) {
  if (typeof str !== 'string' || str.trim() === '') return [];
  const regex = /<[^>]+>|\[[^\]]+\]|\S/g;
  return str.match(regex) || [];
}

/**
 * Determina si una producción es una regla de denominación (unitaria), es decir, de la forma A -> B.
 * @param {string} prodStr - La cadena de producción.
 * @returns {boolean} - True si es una producción unitaria.
 */
function isUnitProduction(prodStr) {
  const parsed = parseProduction(prodStr);
  return parsed.length === 1 && isNonTerminal(parsed[0]);
}

/**
 * Elimina las producciones nulas (epsilon) de una gramática.
 * Este proceso implica dos fases principales:
 * 1. Identificar todos los símbolos no terminales que pueden derivar en la cadena vacía (nulables).
 * 2. Construir una nueva gramática donde se añaden producciones que simulan la "desaparición"
 *    de los símbolos nulables, y finalmente se eliminan las producciones directas a la cadena vacía.
 *
 * @param {Object.<string, string[]>} gramaticaOriginal - La gramática en formato de objeto.
 * @returns {Object.<string, string[]>} - Una nueva gramática sin producciones nulas.
 */
export function eliminarProduccionesNulas(gramaticaOriginal) {
  // PASO 1: Duplicar la gramática para no modificar el original (copia profunda).
  const gramatica = JSON.parse(JSON.stringify(gramaticaOriginal));

  // --- FASE I: Encontrar todos los símbolos no terminales nulables ---
  
  const nullables = new Set();
  let seAgregoNuevo = true;

  // Repetir hasta que no se puedan encontrar más símbolos nulables en una pasada completa.
  while (seAgregoNuevo) {
    seAgregoNuevo = false;
    for (const [lhs, rhsProductions] of Object.entries(gramatica)) {
      // Si el símbolo ya es nulable, continuar.
      if (nullables.has(lhs)) {
        continue;
      }

      for (const prod of rhsProductions) {
        // Caso 1: Regla directa a la cadena vacía (A -> "").
        if (prod === "") {
          nullables.add(lhs);
          seAgregoNuevo = true;
          break; // Pasamos al siguiente símbolo (lhs)
        }

        // Caso 2: La producción consiste enteramente de símbolos ya nulables (B -> C D, donde C y D son nulables).
        const parsedProd = parseProduction(prod);
        // `every` verifica si todos los elementos del array cumplen la condición.
        if (parsedProd.length > 0 && parsedProd.every(token => nullables.has(token))) {
          nullables.add(lhs);
          seAgregoNuevo = true;
          break;
        }
      }
    }
  }

  // --- FASE II: Construir la nueva gramática sin producciones nulas ---

  const nuevaGramatica = {};

  for (const [lhs, rhsProductions] of Object.entries(gramatica)) {
    const nuevasProducciones = new Set(); // Usar un Set para evitar duplicados automáticamente.

    for (const prod of rhsProductions) {
      const parsedProd = parseProduction(prod);
      const indicesNulables = [];
      
      // Encontrar los índices de todos los símbolos nulables en esta producción
      parsedProd.forEach((token, index) => {
        if (nullables.has(token)) {
          indicesNulables.push(index);
        }
      });

      if (indicesNulables.length > 0) {
        // Generar todas las combinaciones posibles de producciones
        // excluyendo algunos de los símbolos nulables.
        // Usamos un contador binario (bitmask) para generar todos los subconjuntos.
        const numCombinations = 1 << indicesNulables.length; // 2^n
        
        for (let i = 0; i < numCombinations; i++) {
          const tempProd = [...parsedProd]; // Copia de la producción parseada

          // Iterar a través de los símbolos nulables
          for (let j = 0; j < indicesNulables.length; j++) {
            // Si el j-ésimo bit de i está encendido, "eliminamos" ese símbolo nulable.
            if ((i >> j) & 1) {
              tempProd[indicesNulables[j]] = null; // Marcar para eliminar
            }
          }
          // Construir la nueva cadena de producción
          const nuevaProdStr = tempProd.filter(t => t !== null).join('');
          nuevasProducciones.add(nuevaProdStr);
        }
      } else {
        // Si no hay símbolos nulables, la producción se mantiene como está.
        nuevasProducciones.add(prod);
      }
    }

    // Limpiar: Eliminar producciones que resultaron en cadena vacía ""
    nuevasProducciones.delete("");
    
    // Si después de la limpieza quedan producciones, se añaden a la gramática final.
    if (nuevasProducciones.size > 0) {
      nuevaGramatica[lhs] = Array.from(nuevasProducciones);
    }
  }

  return nuevaGramatica;
}

/**
 * Elimina las reglas de denominación (producciones unitarias) de una gramática.
 * Resuelve las cadenas de dependencias como S -> G -> B.
 *
 * @param {Object.<string, string[]>} gramaticaOriginal - La gramática en formato de objeto.
 * @returns {Object.<string, string[]>} - Una nueva gramática sin reglas de denominación.
 */
export function eliminarReglasDeDenominacion(gramaticaOriginal) {
  // Se crea una copia para no modificar el objeto original.
  const gramatica = JSON.parse(JSON.stringify(gramaticaOriginal));
  const nonTerminals = Object.keys(gramatica);

  // --- FASE 1: Calcular la clausura transitiva de las dependencias unitarias ---
  // El mapa 'dependencies' almacenará para cada no terminal, el conjunto de
  // no terminales a los que puede derivar usando solo reglas de denominación.
  const dependencies = {};

  // Inicialización: cada no terminal depende de sí mismo.
  for (const lhs of nonTerminals) {
    dependencies[lhs] = new Set([lhs]);
  }

  // Iterar hasta que no haya más cambios, asegurando que se resuelvan todas las cadenas.
  let seHizoUnCambio = true;
  while (seHizoUnCambio) {
    seHizoUnCambio = false;
    for (const lhs of nonTerminals) {
      const currentProductions = gramatica[lhs] || [];
      const initialSize = dependencies[lhs].size;
      
      // Para cada producción del no terminal actual...
      for (const prod of currentProductions) {
        // Si es una regla de denominación (ej: A -> B)...
        if (isUnitProduction(prod)) {
          const derivedLhs = parseProduction(prod)[0]; // Obtiene 'B'
          
          // Añadir todas las dependencias de 'B' a 'A'.
          if (dependencies[derivedLhs]) {
            for (const dep of dependencies[derivedLhs]) {
              dependencies[lhs].add(dep);
            }
          }
        }
      }
      
      // Si el tamaño del conjunto de dependencias cambió, necesitamos otra iteración.
      if (dependencies[lhs].size > initialSize) {
        seHizoUnCambio = true;
      }
    }
  }

  // --- FASE 2: Construir la nueva gramática usando el mapa de dependencias ---
  const nuevaGramatica = {};

  for (const lhs of nonTerminals) {
    const nuevasProducciones = new Set(); // Usar Set para evitar duplicados.

    // Para cada no terminal 'derivedLhs' que 'lhs' puede generar (incluido él mismo)...
    const deps = dependencies[lhs] || new Set();
    for (const derivedLhs of deps) {
      // Tomar las producciones del no terminal derivado de la gramática ORIGINAL.
      const productionsToCopy = gramaticaOriginal[derivedLhs] || [];

      // Añadir solo las que NO son reglas de denominación.
      for (const prod of productionsToCopy) {
        if (!isUnitProduction(prod)) {
          nuevasProducciones.add(prod);
        }
      }
    }

    // Si el no terminal tiene al menos una producción, añadirlo a la gramática final.
    if (nuevasProducciones.size > 0) {
      nuevaGramatica[lhs] = Array.from(nuevasProducciones);
    }
  }

  return nuevaGramatica;
}


// console.log(eliminarProduccionesNulas( //tipo 2
//     {
//     "<S>": [
//         "a<S>a",
//         "b<S>b",
//         "c",
//         "[a-z0-9]<N>"
//     ],
//     "<N>": [
//         "<N>[a-z0-9]"
//     ],
//     "<I>": [
//         "b<S>b",
//         "a<S>a"
//     ]
// }
// ))

// console.log(eliminarProduccionesNulas( // 
// {
//     "<S>": [
//         "[0-9]<BA><AA>",
//         "<CA>",
//         "<HA>"
//     ],
//     "<AA>": [
//         "c<GA>d",
//         "<GA>"
//     ],
//     "<BA>": [
//         "<EA>",
//         "[a-z]<S>",
//         "<BA>a",
//         "[0-9]"
//     ],
//     "<CA>": [
//         "g<DA>",
//         "h<DA>t",
//         "g<DA>tr",
//         "g<DA>tr[0-9]"
//     ],
//     "<DA>": [
//         "x",
//         "y",
//         "z",
//         "<CA>"
//     ],
//     "<EA>": [
//         "<AA><HA>",
//         "c<BA>"
//     ],
//     "<FA>": [
//         "<AA><BA>",
//         " <GA>a"
//     ],
//     "<GA>": [
//         "<FA><GA>",
//         "<GA><HA>"
//     ],
//     "<HA>": [
//         "<HA>a",
//         "<BA><HA>",
//         "<EA>"
//     ],
//     "<JA>": [
//         "<HA>a",
//         "<BA><EA>",
//         "asa"
//     ]
// }
// ))

// console.log(eliminarProduccionesNulas(
// {
//     "<sent_asig>": [
//         " <var>=<expresion>"
//     ],
//     "<expresion>": [
//         " <expresion>+<termino>",
//         "<expresion>-<termino>",
//         "<termino>"
//     ],
//     "<termino>": [
//         "<termino>*<factor>",
//         "<termino>/<factor>",
//         "<factor>"
//     ],
//     "<factor>": [
//         "(<expresion>)",
//         "<var>",
//         "<num>"
//     ],
//     "<var>": [
//         " a",
//         "b",
//         "c",
//         "d",
//         "e",
//         "f",
//         "g",
//         "h",
//         "i",
//         "j",
//         "k",
//         "l",
//         "m",
//         "n",
//         "o",
//         "p",
//         "q",
//         "r",
//         "s",
//         "t",
//         "u",
//         "v",
//         "w",
//         "x",
//         "y",
//         "z"
//     ],
//     "<num>": [
//         " 0 ",
//         " 1 ",
//         " 2 ",
//         " 3 ",
//         " 4 ",
//         " 5 ",
//         " 6 ",
//         " 7 ",
//         " 8 ",
//         " 9 ",
//         "<art>",
//         "<num>.<num>"
//     ],
//     "<art>": [
//         "<art><num>",
//         "<art>",
//         "0",
//         "1",
//         "2",
//         "3",
//         "4",
//         "5",
//         "6",
//         "7",
//         "8",
//         "9"
//     ],
//     "<noa>": [
//         "<expresion>"
//     ]
// }
// ))