/**
 * --- HELPER FUNCTIONS (reutilizadas de respuestas anteriores) ---
 */

/**
 * Determina si una cadena representa un símbolo no terminal (ej: "<S>").
 * @param {string} s - La cadena a verificar.
 * @returns {boolean} - True si es un no terminal.
 */
function isNonTerminal(s) {
  return typeof s === 'string' && s.startsWith('<') && s.endsWith('>') && s.length > 2;
}

/**
 * Parsea una cadena de producción en una lista de tokens.
 * @param {string} str - La cadena de producción a parsear.
 * @returns {string[]} - Un array de tokens.
 */
function parseProduction(str) {
  if (typeof str !== 'string' || str.trim() === '') return [];
  const regex = /<[^>]+>|\[[^\]]+\]|\S/g;
  return str.match(regex) || [];
}


/**
 * Detecta los símbolos no-terminales "vivos" (generativos) y "muertos" (no generativos) en una gramática.
 * Un símbolo vivo es aquel que puede derivar en una cadena de solo terminales.
 * Un símbolo muerto es aquel que nunca puede derivar en una cadena de solo terminales.
 *
 * @param {Object.<string, string[]>} gramatica - La gramática en formato de objeto.
 * @returns {{live: string[], dead: string[]}} - Un objeto con una lista de símbolos vivos y otra de muertos.
 */
export function detectarSimbolosMuertos(gramatica) {
  // El conjunto de símbolos vivos (generativos) que hemos encontrado hasta ahora.
  const liveSymbols = new Set();
  const allNonTerminals = Object.keys(gramatica);

  // PASO 1: Encontrar no-terminales que derivan directamente en una cadena de terminales.
  for (const [lhs, rhsProductions] of Object.entries(gramatica)) {
    for (const prod of rhsProductions) {
      const parsedProd = parseProduction(prod);
      // `every` verifica si todos los tokens en la producción son terminales.
      if (parsedProd.every(token => !isNonTerminal(token))) {
        liveSymbols.add(lhs);
        break; // Una vez que sabemos que es vivo, pasamos al siguiente no-terminal.
      }
    }
  }

  // PASO 2 y 3: Iterar hasta que no se puedan añadir más símbolos vivos.
  let seAgregoNuevo = true;
  while (seAgregoNuevo) {
    seAgregoNuevo = false;
    
    // Recorrer todos los no-terminales...
    for (const [lhs, rhsProductions] of Object.entries(gramatica)) {
      // ...que aún no hemos marcado como vivos.
      if (liveSymbols.has(lhs)) {
        continue;
      }

      // Revisar sus producciones.
      for (const prod of rhsProductions) {
        const parsedProd = parseProduction(prod);
        
        // Comprobar si todos los símbolos en esta producción ya son "vivos".
        // Un símbolo es "vivo" si es un terminal, o si es un no-terminal que está en nuestro conjunto `liveSymbols`.
        const isProductiveRule = parsedProd.every(token => 
            !isNonTerminal(token) || liveSymbols.has(token)
        );

        if (isProductiveRule) {
          // Si encontramos una producción "viva", el LHS también es vivo.
          liveSymbols.add(lhs);
          seAgregoNuevo = true; // Marcamos que hubo un cambio para seguir iterando.
          break; // Pasamos al siguiente no-terminal.
        }
      }
    }
  }

  // FINAL: Calcular la lista de símbolos muertos.
  // Son todos los no-terminales que no están en la lista de vivos.
  const deadSymbols = allNonTerminals.filter(nt => !liveSymbols.has(nt));

  return {
    vivos: Array.from(liveSymbols), // Convertir el Set a un Array para la salida.
    muertos: deadSymbols
  };
}

/**
 * Elimina las reglas y producciones que involucran símbolos muertos (no generativos)
 * de una gramática.
 *
 * @param {string[]} deadSymbols - Un array con los nombres de los símbolos muertos (ej: ["<C>", "<D>"]).
 * @param {Object.<string, string[]>} gramaticaOriginal - La gramática que se va a limpiar.
 * @returns {Object.<string, string[]>} - Una nueva gramática sin reglas ni producciones con símbolos muertos.
 */
export function limpiarSimbolosMuertos(deadSymbols, gramaticaOriginal) {
  // Crear un Set para una búsqueda más rápida de símbolos muertos.
  const deadSymbolsSet = new Set(deadSymbols);
  
  // Usamos una copia profunda para no modificar el objeto original.
  const gramaticaLimpia = JSON.parse(JSON.stringify(gramaticaOriginal));

  // 1. Eliminar reglas superfluas (símbolo muerto en el lado izquierdo)
  for (const nonTerminal of deadSymbols) {
    if (gramaticaLimpia.hasOwnProperty(nonTerminal)) {
      delete gramaticaLimpia[nonTerminal];
    }
  }

  // 2. Eliminar producciones que contienen símbolos muertos en el lado derecho.
  // Iteramos sobre las claves del objeto ya modificado.
  for (const lhs in gramaticaLimpia) {
    const rhsProductions = gramaticaLimpia[lhs];

    // Filtramos el array de producciones, manteniendo solo las que son "limpias".
    const produccionesLimpias = rhsProductions.filter(prod => {
      const parsedProd = parseProduction(prod);
      
      // La producción se mantiene si NINGUNO de sus tokens es un símbolo muerto.
      // `some` devuelve true si al menos un elemento cumple la condición.
      const contieneSimboloMuerto = parsedProd.some(token => deadSymbolsSet.has(token));
      
      return !contieneSimboloMuerto; // Devolvemos lo contrario.
    });

    // Si después de filtrar no queda ninguna producción, eliminamos la regla entera.
    // Esto es importante, ya que una regla sin producciones también es inútil.
    if (produccionesLimpias.length === 0) {
      delete gramaticaLimpia[lhs];
    } else {
      // Si quedan producciones, actualizamos la regla.
      gramaticaLimpia[lhs] = produccionesLimpias;
    }
  }

  return gramaticaLimpia;
}

/**
 * Detecta los símbolos no-terminales accesibles e inaccesibles en una gramática.
 * Un símbolo es accesible si se puede llegar a él desde el símbolo inicial.
 *
 * @param {Object.<string, string[]>} gramatica - La gramática en formato de objeto.
 * @returns {{accessible: string[], inaccessible: string[]}} - Un objeto con listas de símbolos accesibles e inaccesibles.
 */
export function detectarSimbolosInaccesibles(gramatica) {
  const allNonTerminals = Object.keys(gramatica);
  if (allNonTerminals.length === 0) {
    return { accessible: [], inaccessible: [] };
  }

  // PASO 1: Iniciar la lista de accesibles con el símbolo inicial (axioma).
  // Asumimos que es la primera clave del objeto.
  const startSymbol = allNonTerminals[0];
  const accessibleSymbols = new Set([startSymbol]);

  // PASO 2 y 3: Bucle inductivo para encontrar todos los símbolos accesibles.
  let seAgregoNuevo = true;
  while (seAgregoNuevo) {
    seAgregoNuevo = false;
    
    // Crear una copia de los símbolos accesibles actuales para iterar sobre ellos,
    // mientras modificamos el Set original.
    const currentAccessible = Array.from(accessibleSymbols);

    for (const lhs of currentAccessible) {
      // Si el LHS (un símbolo accesible) tiene producciones...
      const rhsProductions = gramatica[lhs] || [];
      
      for (const prod of rhsProductions) {
        const parsedProd = parseProduction(prod);
        
        // Para cada token en la producción...
        for (const token of parsedProd) {
          // ...si es un no-terminal y todavía no está en nuestra lista de accesibles...
          if (isNonTerminal(token) && !accessibleSymbols.has(token)) {
            // ...lo añadimos y marcamos que hubo un cambio.
            accessibleSymbols.add(token);
            seAgregoNuevo = true;
          }
        }
      }
    }
  }

  // FINAL: Calcular la lista de inaccesibles.
  // Son todos los no-terminales que no están en la lista de accesibles.
  const inaccessibleSymbols = allNonTerminals.filter(nt => !accessibleSymbols.has(nt));

  return {
    accesible: Array.from(accessibleSymbols),
    inaccesible: inaccessibleSymbols
  };
}

/**
 * Elimina las reglas innecesarias (aquellas cuyo lado izquierdo es un símbolo inaccesible)
 * de una gramática.
 *
 * @param {string[]} inaccessibleSymbols - Un array con los nombres de los símbolos inaccesibles.
 * @param {Object.<string, string[]>} gramaticaOriginal - La gramática que se va a limpiar.
 * @returns {Object.<string, string[]>} - Una nueva gramática sin las reglas innecesarias.
 */
export function eliminarReglasInaccesibles(inaccessibleSymbols, gramaticaOriginal) {
  // Creamos una copia de la gramática para no modificar el objeto original.
  // Una copia superficial es suficiente aquí.
  const gramaticaLimpia = { ...gramaticaOriginal };

  // Iteramos sobre cada símbolo marcado como inaccesible.
  for (const symbol of inaccessibleSymbols) {
    // Si la gramática tiene una regla que comienza con este símbolo, la eliminamos.
    if (gramaticaLimpia.hasOwnProperty(symbol)) {
      delete gramaticaLimpia[symbol];
    }
  }

  return gramaticaLimpia;
}