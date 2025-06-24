import { isNonTerminal, parseProduction } from "./auxiliares"

export function crearCuadrupla(gramaticaObjeto) {
  const terminales = new Set()
  const noTerminales = new Set()

  Object.entries(gramaticaObjeto).forEach(([key, producciones]) => {
    // Agregar el lado izquierdo de la producción como no terminal
    const ntMatch = key.match(/<[^>]+>/g)
    if (ntMatch) ntMatch.forEach(nt => noTerminales.add(nt))

    producciones.forEach(produccion => {
      // Agregar los no terminales dentro de la producción
      const nts = produccion.match(/<[^>]+>/g)
      if (nts) nts.forEach(nt => noTerminales.add(nt))

      // Detectar terminales: primero los que están entre [ ]
      const entreCorchetes = produccion.match(/\[[^\]]+\]/g)
      if (entreCorchetes) entreCorchetes.forEach(t => terminales.add(t))

      // Eliminar los <no terminales> y [rangos] para encontrar letras sueltas
      const resto = produccion
        .replace(/<[^>]+>/g, '')  // elimina <...>
        .replace(/\[[^\]]+\]/g, '') // elimina [...]

      // Agregar letras sueltas como terminales
      for (const char of resto) {
        if (char.trim()) terminales.add(char)
      }
    })
  })

  return {
    terminales: [...terminales],
    noTerminales: [...noTerminales],
    inicial: Object.keys(gramaticaObjeto)[0]
  }
}

/**
 * Clasifica una gramática según la jerarquía de Chomsky.
 * @param {Object.<string, string[]>} grammar - El objeto que representa la gramática.
 * @returns {string} - La clasificación de la gramática ("Tipo 0", "Tipo 1", "Tipo 2", o "Tipo 3").
 */
export function classifyGrammar(grammar) {
  // Banderas para rastrear si la gramática cumple con las condiciones de cada tipo.
  // Empezamos asumiendo que cumple con todo y vamos descartando.
  let isType1 = true;
  let isType2 = true;
  let isType3 = true;

  // Para ser Tipo 3 (Regular), todas las reglas deben ser o bien lineales por la derecha o bien lineales por la izquierda.
  // No se pueden mezclar.
  let isConsistentlyRightLinear = true;
  let isConsistentlyLeftLinear = true;

  // Iteramos sobre cada regla de la gramática
  for (const lhsStr in grammar) {
    const rhsProductions = grammar[lhsStr];
    const parsedLhs = parseProduction(lhsStr);

    // --- Verificación para Tipo 2 y Tipo 3 ---
    // El lado izquierdo (LHS) debe ser un único símbolo no terminal.
    if (parsedLhs.length !== 1 || !isNonTerminal(parsedLhs[0])) {
      isType2 = false;
      isType3 = false;
    }

    // Iteramos sobre cada producción posible para la regla actual
    for (const rhsStr of rhsProductions) {
      const parsedRhs = parseProduction(rhsStr);

      // --- Verificación para Tipo 1 (Sensible al Contexto) ---
      // La longitud del lado izquierdo debe ser menor o igual a la del lado derecho.
      // Se ignora la regla especial S -> ε. Si hay una producción vacía, no es Tipo 1.
      if (parsedLhs.length > parsedRhs.length) {
        isType1 = false;
      }
      
      // Si ya sabemos que no puede ser Tipo 3, nos saltamos esta parte
      if (!isType3) continue;

      // --- Verificación para Tipo 3 (Regular) ---
      // Una regla es regular si tiene la forma:
      // A -> a   (un solo terminal)
      // A -> aB  (terminal seguido de no terminal) -> Lineal por la derecha
      // A -> Ba  (no terminal seguido de terminal) -> Lineal por la izquierda
      // A -> ε   (cadena vacía)

      let isRightLinearRule = false;
      let isLeftLinearRule = false;

      if (parsedRhs.length === 0) { // Regla A -> ε
        isRightLinearRule = true;
        isLeftLinearRule = true;
      } else if (parsedRhs.length === 1 && !isNonTerminal(parsedRhs[0])) { // Regla A -> a
        isRightLinearRule = true;
        isLeftLinearRule = true;
      } else if (parsedRhs.length === 2) {
        // Regla A -> aB (Lineal por la derecha)
        if (!isNonTerminal(parsedRhs[0]) && isNonTerminal(parsedRhs[1])) {
          isRightLinearRule = true;
        }
        // Regla A -> Ba (Lineal por la izquierda)
        if (isNonTerminal(parsedRhs[0]) && !isNonTerminal(parsedRhs[1])) {
          isLeftLinearRule = true;
        }
      }
      
      // Si la regla actual no es ni lineal por la derecha ni por la izquierda, la gramática no es Tipo 3.
      if (!isRightLinearRule && !isLeftLinearRule) {
        isType3 = false;
      }
      
      // Actualizamos las banderas de consistencia
      if (!isRightLinearRule) isConsistentlyRightLinear = false;
      if (!isLeftLinearRule) isConsistentlyLeftLinear = false;
    }
  }

  // Una gramática es Tipo 3 solo si es completamente lineal por la derecha O completamente lineal por la izquierda.
  if (isType3 && !isConsistentlyLeftLinear && !isConsistentlyRightLinear) {
      isType3 = false;
  }
  
  // Devolvemos el tipo más restrictivo que cumplió todas las condiciones.
  if (isType3) {
    return 3;
  }
  if (isType2) {
    return 2;
  }
  if (isType1) {
    return 1;
  }
  
  return 0;
}
