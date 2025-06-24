import { parseProduction } from "./auxiliares";

/**
 * Elimina la recursividad izquierda inmediata de una gramática libre de contexto.
 * Sigue el algoritmo estándar:
 * Para cada no-terminal A con reglas A -> Aα | β,
 * se reemplaza por:
 * A -> βA'
 * A' -> αA' | λ
 *
 * @param {Object.<string, string[]>} gramaticaOriginal - La gramática en formato de objeto.
 * @returns {Object.<string, string[]>} - Una nueva gramática sin recursividad izquierda inmediata.
 */
export function eliminarRecursividadIzquierda(gramaticaOriginal) {
  // Se crea una copia para ir construyendo la nueva gramática.
  const nuevaGramatica = {};
  const nonTerminals = Object.keys(gramaticaOriginal);

  for (const nonTerminalA of nonTerminals) {
    const producciones = gramaticaOriginal[nonTerminalA];
    
    const alphas = []; // Producciones recursivas (sin la A inicial)
    const betas = [];  // Producciones no recursivas
    let tieneRecursividad = false;

    // 1. Agrupar las producciones en alphas (α) y betas (β)
    for (const prod of producciones) {
      const parsedProd = parseProduction(prod);
      if (parsedProd.length > 0 && parsedProd[0] === nonTerminalA) {
        // Es una producción recursiva de la forma A -> Aα
        alphas.push(parsedProd.slice(1).join('')); // Guardamos la parte α
        tieneRecursividad = true;
      } else {
        // Es una producción no recursiva de la forma A -> β
        betas.push(prod);
      }
    }

    // 2. Si se encontró recursividad, aplicar la transformación.
    if (tieneRecursividad) {
      // Si no hay producciones 'beta', la recursividad no se puede resolver
      // con este algoritmo simple (ej: A -> Aα). Esto podría indicar un
      // símbolo no generativo, pero lo manejamos para evitar errores.
      if (betas.length === 0) {
        // En este caso, la regla A solo lleva a bucles infinitos.
        // Se podría eliminar, pero por ahora la mantenemos con un nuevo símbolo
        // que no se podrá resolver.
        const nuevoNoTerminalA_prime = nonTerminalA.slice(0, -1) + "'>";
        nuevaGramatica[nonTerminalA] = [nuevoNoTerminalA_prime]; // A -> A'
        nuevaGramatica[nuevoNoTerminalA_prime] = alphas.map(alpha => alpha + nuevoNoTerminalA_prime).concat(["λ"]);
        continue;
      }

      // Crear el nuevo símbolo no terminal A'
      // Le quitamos el '>' final, añadimos ' y volvemos a poner '>'
      const nuevoNoTerminalA_prime = nonTerminalA.slice(0, -1) + "'>";

      // Crear las nuevas producciones para A -> βA'
      nuevaGramatica[nonTerminalA] = betas.map(beta => beta + nuevoNoTerminalA_prime);

      // Crear las nuevas producciones para A' -> αA' | λ
      const produccionesParaA_prime = alphas.map(alpha => alpha + nuevoNoTerminalA_prime);
      produccionesParaA_prime.push("λ"); // Añadir la producción épsilon
      
      nuevaGramatica[nuevoNoTerminalA_prime] = produccionesParaA_prime;

    } else {
      // Si no hay recursividad, la regla se queda como está.
      nuevaGramatica[nonTerminalA] = producciones;
    }
  }

  return nuevaGramatica;
}