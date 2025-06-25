// --- Use standard imports to get the functions ---
// Adjust the paths ('../assets/...') as needed based on your exact folder structure.
import { crearCuadrupla } from '../assets/clasificar';
import { eliminarReglasNoGenerativas, eliminarReglasDeRedenominacion } from '../assets/noGenerativas';
import { detectarSimbolosMuertos, limpiarSimbolosMuertos, detectarSimbolosInaccesibles, eliminarReglasInaccesibles } from '../assets/limpieza';
import { eliminarRecursividadIzquierda } from '../assets/noRecursividad';
import { factorizarIzquierda } from '../assets/factorizar';

// This is the worker's "ear". It listens for messages from the main app.
self.onmessage = (event) => {
  const { task, payload, step } = event.data; // Added 'step' for easier debugging

  console.log(`Worker received task: ${task} for step ${step}`);

  let result;

  try {
    // The worker runs the specific function it was told to run.
    switch (task) {
      case 'eliminarReglasNoGenerativas':
        result = eliminarReglasNoGenerativas(payload);
        break;
      case 'eliminarReglasDeRedenominacion':
        result = eliminarReglasDeRedenominacion(payload);
        break;
      case 'detectarSimbolosMuertos':
        result = detectarSimbolosMuertos(payload);
        break;
      case 'limpiarSimbolosMuertos':
        result = limpiarSimbolosMuertos(payload.deadSymbols, payload.grammar);
        break;
      case 'detectarSimbolosInaccesibles':
        result = detectarSimbolosInaccesibles(payload);
        break;
      case 'eliminarReglasInaccesibles':
        result = eliminarReglasInaccesibles(payload.inaccessibleSymbols, payload.grammar);
        break;
      case 'eliminarRecursividadIzquierda':
        result = eliminarRecursividadIzquierda(payload);
        break;
      case 'factorizarIzquierda':
        result = factorizarIzquierda(payload);
        break;
      case 'crearCuadrupla':
        result = crearCuadrupla(payload);
        break;
    }
    
    // When done, it sends a message back with the result.
    self.postMessage({ task, result, step, status: 'success' });

  } catch (error) {
    console.error(`Worker failed on task: ${task}`, error);
    self.postMessage({ task, error: error.message, step, status: 'error' });
  }
};