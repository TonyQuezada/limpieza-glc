/**
 * Determina si una cadena representa un símbolo no terminal (ej: "<S>").
 */
function isNonTerminal(s) {
  return typeof s === 'string' && s.startsWith('<') && s.endsWith('>') && s.length > 2;
}

/**
 * Parsea una cadena de producción en una lista de tokens.
 */
function parseProduction(str) {
  if (typeof str !== 'string' || str.trim() === '') return [];
  const regex = /<[^>]+>|\[[^\]]+\]|\S/g;
  return str.match(regex) || [];
}

/**
 * Verifica si una producción es un símbolo de épsilon (λ o ε).
 */
const EPSILON_SYMBOLS = new Set(["λ", "ε"]);
function isEpsilonProduction(prod) {
  return EPSILON_SYMBOLS.has(prod.trim());
}

/**
 * Verifica si una producción es una regla de redenominación (unitaria).
 */
function isRedenominationRule(prod) {
  const parsed = parseProduction(prod);
  return parsed.length === 1 && isNonTerminal(parsed[0]);
}

/**
 * Elimina las Reglas No Generativas (producciones nulas: U -> λ) de una gramática.
 * 1. Encuentra todos los símbolos que pueden derivar en λ (llamados "nulables").
 * 2. Para cada producción que contiene símbolos nulables, crea nuevas versiones
 *    omitiendo todas las combinaciones posibles de esos símbolos.
 * 3. Elimina las producciones directas a λ.
 *
 * @param {Object.<string, string[]>} gramaticaOriginal - La gramática a limpiar.
 * @returns {Object.<string, string[]>} - La gramática sin reglas no generativas.
 */
export function eliminarReglasNoGenerativas(gramaticaOriginal) {
  const gramatica = JSON.parse(JSON.stringify(gramaticaOriginal));

  // FASE I: Encontrar todos los símbolos nulables.
  const nullables = new Set();
  let seAgregoNuevo = true;
  while (seAgregoNuevo) {
    seAgregoNuevo = false;
    for (const [lhs, rhsProductions] of Object.entries(gramatica)) {
      if (nullables.has(lhs)) continue;

      for (const prod of rhsProductions) {
        if (isEpsilonProduction(prod)) {
          nullables.add(lhs);
          seAgregoNuevo = true;
          break;
        }
        const parsedProd = parseProduction(prod);
        if (parsedProd.length > 0 && parsedProd.every(token => nullables.has(token))) {
          nullables.add(lhs);
          seAgregoNuevo = true;
          break;
        }
      }
    }
  }

  // FASE II: Construir la nueva gramática.
  const nuevaGramatica = {};
  for (const [lhs, rhsProductions] of Object.entries(gramatica)) {
    const nuevasProducciones = new Set();
    for (const prod of rhsProductions) {
      // Ignorar la regla original U -> λ.
      if (isEpsilonProduction(prod)) continue;

      const parsedProd = parseProduction(prod);
      const indicesNulables = parsedProd
        .map((token, index) => (nullables.has(token) ? index : -1))
        .filter(index => index !== -1);
      
      // Añadir siempre la producción original.
      nuevasProducciones.add(prod);

      // Si hay símbolos nulables, generar todas las combinaciones de su ausencia.
      if (indicesNulables.length > 0) {
        const numCombinations = 1 << indicesNulables.length;
        // Empezar en 1 para omitir la combinación 0 (no quitar nada), que ya está incluida.
        for (let i = 1; i < numCombinations; i++) {
          const tempTokens = [...parsedProd];
          for (let j = 0; j < indicesNulables.length; j++) {
            if ((i >> j) & 1) {
              tempTokens[indicesNulables[j]] = null;
            }
          }
          const nuevaProdStr = tempTokens.filter(t => t !== null).join('');
          
          // Solo añadir la nueva producción si no quedó vacía.
          if (nuevaProdStr !== "") {
            nuevasProducciones.add(nuevaProdStr);
          }
        }
      }
    }
    
    if (nuevasProducciones.size > 0) {
      nuevaGramatica[lhs] = Array.from(nuevasProducciones).sort();
    }
  }
  return nuevaGramatica;
}

/**
 * Elimina las Reglas de Redenominación (producciones unitarias: A -> B) de una gramática.
 * 1. Para cada no terminal, encuentra todos los no terminales a los que puede derivar
 *    a través de una o más reglas de redenominación (ej. A -> B -> C).
 * 2. Construye una nueva gramática donde cada no terminal A hereda todas las producciones
 *    NO unitarias de los no terminales a los que puede derivar.
 *
 * @param {Object.<string, string[]>} gramaticaOriginal - La gramática a limpiar.
 * @returns {Object.<string, string[]>} - La gramática sin reglas de redenominación.
 */
export function eliminarReglasDeRedenominacion(gramaticaOriginal) {
  const gramatica = JSON.parse(JSON.stringify(gramaticaOriginal));
  const nonTerminals = Object.keys(gramatica);

  // FASE 1: Encontrar todas las dependencias unitarias (clausura transitiva).
  const dependencies = {};
  for (const lhs of nonTerminals) {
    dependencies[lhs] = new Set([lhs]);
  }

  let seHizoUnCambio = true;
  while (seHizoUnCambio) {
    seHizoUnCambio = false;
    for (const lhs of nonTerminals) {
      const initialSize = dependencies[lhs].size;
      const depsParaRevisar = Array.from(dependencies[lhs]);
      
      for (const dep of depsParaRevisar) {
        const productions = gramatica[dep] || [];
        for (const prod of productions) {
          if (isRedenominationRule(prod)) {
            const newDep = parseProduction(prod)[0];
            if (!dependencies[lhs].has(newDep)) {
              dependencies[lhs].add(newDep);
              seHizoUnCambio = true;
            }
          }
        }
      }
    }
  }

  // FASE 2: Construir la nueva gramática.
  const nuevaGramatica = {};
  for (const lhs of nonTerminals) {
    const nuevasProducciones = new Set();
    const deps = dependencies[lhs] || new Set();

    for (const derivedLhs of deps) {
      const productionsToCopy = gramatica[derivedLhs] || [];
      for (const prod of productionsToCopy) {
        if (!isRedenominationRule(prod)) {
          nuevasProducciones.add(prod);
        }
      }
    }

    if (nuevasProducciones.size > 0) {
      nuevaGramatica[lhs] = Array.from(nuevasProducciones).sort();
    }
  }
  return nuevaGramatica;
}