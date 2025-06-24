/**
 * Determina si una cadena representa un símbolo no terminal (ej: "<S>").
 * @param {string} s - La cadena a verificar.
 * @returns {boolean} - True si es un no terminal.
 */
export function isNonTerminal(s) {
  // Un no terminal válido debe empezar con <, terminar con > y tener contenido.
  return typeof s === 'string' && s.startsWith('<') && s.endsWith('>') && s.length > 2;
}

/**
 * Parsea una cadena de producción en una lista de tokens.
 */
export function parseProduction(str) {
  if (typeof str !== 'string' || str.trim() === '') return [];
  // Expresión regular para capturar no-terminales <...>, clases [...] o cualquier no-espacio.
  const regex = /<[^>]+>|\[[^\]]+\]|\S/g;
  return str.match(regex) || [];
}