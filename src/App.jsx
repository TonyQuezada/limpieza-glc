import { useEffect, useRef, useState } from 'react';
import "./App.css";

// All your original imports
import { leerTXT } from './assets/leerTXT';
import formatoJSON from './assets/formatoJSON';
import Reglas from './components/Reglas';
import Cuadrupla from './components/Cuadrupla';
import Lista from './components/Lista';
import { crearCuadrupla, classifyGrammar } from './assets/clasificar';
import { eliminarReglasNoGenerativas, eliminarReglasDeRedenominacion } from './assets/noGenerativas';
import { detectarSimbolosMuertos, limpiarSimbolosMuertos, detectarSimbolosInaccesibles, eliminarReglasInaccesibles } from './assets/limpieza';
import { eliminarRecursividadIzquierda } from './assets/noRecursividad';
import { factorizarIzquierda } from './assets/factorizar';

function App() {
  // All state variables, initialized
  const [gramaticaObjeto, setGramaticaObjeto] = useState({});
  const [cuadrupla, setCuadrupla] = useState({});
  const [tipo, setTipo] = useState(0);
  const [noGenerativa, setNoGenerativa] = useState({});
  const [redenominacion, setRedenominacion] = useState({});
  const [vivosMuertos, setVivosMuertos] = useState({});
  const [sinMuertos, setSinMuertos] = useState({});
  const [accesiblesInaccesibles, setAccesiblesInaccesibles] = useState({});
  const [sinInaccesibles, setSinInaccesibles] = useState({});
  const [sinRecursividad, setSinRecursividad] = useState({});
  const [noGenerativa2, setNoGenerativa2] = useState({});
  const [factorizada, setFactorizada] = useState({});
  const [redenominacion2, setRedenominacion2] = useState({});
  const [cuadrupla2, setCuadrupla2] = useState({});

  const [visibleStep, setVisibleStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const workerRef = useRef(null);

  // Setup the worker when the component mounts
  useEffect(() => {
    // This assumes your worker file is at /src/workers/grammar.worker.js
    workerRef.current = new Worker(new URL('./workers/grammar.worker.js', import.meta.url), {
      type: 'module'
    });

    // This is the app's "ear". It listens for results from the worker.
    workerRef.current.onmessage = (event) => {
      const { task, result, step, status, error } = event.data;

      if (status === 'error') {
        console.error(`Task ${task} for step ${step} failed in worker:`, error);
        setIsLoading(false);
        return;
      }
      
      // Update state based on which heavy task just finished.
      // The corresponding "light" task is run here on the main thread.
      switch (step) {
        case 1: setNoGenerativa(result); break;
        case 2: setRedenominacion(result); break;
        case 3: // This is for "muertos" detection
          setVivosMuertos(result);
          setSinMuertos(limpiarSimbolosMuertos(result.muertos, redenominacion));
          break;
        case 4: // This is for "inaccesibles" detection
          setAccesiblesInaccesibles(result);
          setSinInaccesibles(eliminarReglasInaccesibles(result.inaccesible, sinMuertos));
          break;
        case 5: setSinRecursividad(result); break;
        case 6: setNoGenerativa2(result); break;
        case 7: setFactorizada(result); break;
        case 8: setRedenominacion2(result); break;
        case 9: setCuadrupla2(result); break;
      }
      
      setVisibleStep(prev => prev + 1);
      setIsLoading(false);
    };

    return () => {
      workerRef.current.terminate();
    };
  }, [redenominacion, sinMuertos]); // Dependencies needed to pass the correct, up-to-date data to the worker

  const handleLoadGrammar = async () => {
    try {
      setVisibleStep(0);
      setGramaticaObjeto({}); setCuadrupla({}); setTipo(0);
      setNoGenerativa({}); setRedenominacion({}); setVivosMuertos({});
      setSinMuertos({}); setAccesiblesInaccesibles({}); setSinInaccesibles({});
      setSinRecursividad({}); setNoGenerativa2({}); setFactorizada({});
      setRedenominacion2({}); setCuadrupla2({});
      
      const contenido = await leerTXT();
      const objeto = formatoJSON(contenido);
      
      setGramaticaObjeto(objeto);
      setCuadrupla(crearCuadrupla(objeto));
      setTipo(classifyGrammar(objeto));
      setVisibleStep(1);

    } catch (error) {
      console.error("No se pudo leer el archivo:", error);
    }
  };
  
  const showNextStep = () => {
    setIsLoading(true);
    setTimeout(() => {
      let task = '';
      let payload = {};
      const step = visibleStep;

      // Determine which HEAVY task to run next.
      // The light "cleanup" part is handled in the onmessage handler.
      switch (step) {
        case 1: task = 'eliminarReglasNoGenerativas'; payload = gramaticaObjeto; break;
        case 2: task = 'eliminarReglasDeRedenominacion'; payload = noGenerativa; break;
        case 3: task = 'detectarSimbolosMuertos'; payload = redenominacion; break;
        case 4: task = 'detectarSimbolosInaccesibles'; payload = sinMuertos; break;
        case 5: task = 'eliminarRecursividadIzquierda'; payload = sinInaccesibles; break;
        case 6: task = 'eliminarReglasNoGenerativas'; payload = sinRecursividad; break;
        case 7: task = 'factorizarIzquierda'; payload = noGenerativa2; break;
        case 8: task = 'eliminarReglasDeRedenominacion'; payload = factorizada; break;
        case 9: task = 'crearCuadrupla'; payload = redenominacion2; break;
        default: setIsLoading(false); return;
      }

      workerRef.current.postMessage({ task, payload, step });
    }, 10); 
  };
  
  const MAX_STEPS = 10;

  return (
    <div className='flex flex-col w-full justify-content items-center'>
      <h1 className='text-center text-3xl font-bold m-10'>Limpieza de gramáticas libres de contexto</h1>
      <button
        type="button"
        className='bg-blue-500 px-10 py-5 rounded-2xl hover:ring-4 hover:bg-blue-600 font-semibold text-white active:ring-4 active:ring-blue-300'
        onClick={handleLoadGrammar}
      >
        Seleccionar gramática
      </button>

      {visibleStep > 0 && (
        <div className='flex flex-col gap-5 my-10 max-w-[80vw]'>
          
          <div className='flex flex-col gap-5'>
            <h2 className='font-semibold text-2xl text-blue-600'>Cuádrupla:</h2>
            <div className='ring-1 p-4'>
              <Cuadrupla terminales={cuadrupla.terminales} noTerminales={cuadrupla.noTerminales} inicial={cuadrupla.inicial}/>
            </div>
            <h2 className='font-semibold text-xl '>Reglas de producción (P) = </h2>
            <div className='ring-1 p-4'>
              {Object.entries(gramaticaObjeto).map(([key, value]) => ( <Reglas regla={key} producciones={value} key={key}/> ))}
            </div>
            {tipo === 0 && <div><div className='font-semibold text-red-600'>Gramática Tipo 0: Sin restricciones</div><div>No se puede limpiar</div></div>}
            {tipo === 1 && <div><div className='font-semibold text-red-600'>Gramática Tipo 1: Sensitiva al contexto</div><div>No se puede limpiar</div></div>}
            {tipo === 2 && <div className='font-semibold text-red-600'>Gramática Tipo 2: Libre de contexto</div>}
            {tipo === 3 && <div className='font-semibold text-red-600'>Gramática Tipo 3: Regular</div>}
          </div>

          {tipo > 1 && (
            <div className='flex flex-col gap-5 my-10'>
              {visibleStep >= 2 && (
                <div className='flex flex-col gap-5'>
                  <h2 className='font-semibold text-2xl text-blue-600'>Paso 1. Eliminar reglas no generativas</h2>
                  <div className='ring-1 p-4'>{Object.entries(noGenerativa).map(([key, value]) => <Reglas regla={key} producciones={value} key={key}/>)}</div>
                </div>
              )}
              {visibleStep >= 3 && (
                <div className='flex flex-col gap-5'>
                  <h2 className='font-semibold text-2xl text-blue-600'>Paso 2. Eliminar reglas de redenominación</h2>
                  <div className='ring-1 p-4'>{Object.entries(redenominacion).map(([key, value]) => <Reglas regla={key} producciones={value} key={key}/>)}</div>
                </div>
              )}
              {visibleStep >= 4 && (
                <div className='flex flex-col gap-5'>
                  <h2 className='font-semibold text-2xl text-blue-600'>Paso 3. Limpieza de la gramática</h2>
                  <h2 className='font-semibold text-xl'>3.1 Indentificar símbolos muertos</h2>
                  <div className='ring-1 p-4'>
                    <Lista estado={"vivos"} lista={vivosMuertos.vivos}/>
                    <Lista estado={"muertos"} lista={vivosMuertos.muertos}/>
                  </div>
                  <h2 className='font-semibold text-xl'>3.2 Eliminar reglas con muertos y reglas superfluas</h2>
                  <div className='ring-1 p-4'>{Object.entries(sinMuertos).map(([key, value]) => <Reglas regla={key} producciones={value} key={key}/>)}</div>
                </div>
              )}
              {visibleStep >= 5 && (
                 <div className='flex flex-col gap-5'>
                  <h2 className='font-semibold text-xl'>3.3 Identificar símbolos inaccesibles</h2>
                  <div className='ring-1 p-4'>
                    <Lista estado={"Accesibles"} lista={accesiblesInaccesibles.accesible}/>
                    <Lista estado={"Inaccesibles"} lista={accesiblesInaccesibles.inaccesible}/>
                  </div>
                  <h2 className='font-semibold text-xl'>3.4 Eliminar reglas inaccesibles <br />Gramática Limpia y bien formada</h2>
                  <div className='ring-1 p-4'>{Object.entries(sinInaccesibles).map(([key, value]) => <Reglas regla={key} producciones={value} key={key}/>)}</div>
                </div>
              )}
              {visibleStep >= 6 && (
                <div className='flex flex-col gap-5'>
                  <h2 className='font-semibold text-2xl text-blue-600'>Paso 4. Eliminar Recursividad por la izquierda</h2>
                  <div className='ring-1 p-4'>{Object.entries(sinRecursividad).map(([key, value]) => <Reglas regla={key} producciones={value} key={key}/>)}</div>
                </div>
              )}
              {visibleStep >= 7 && (
                <div className='flex flex-col gap-5'>
                  <h2 className='font-semibold text-xl'>4.1 Eliminar reglas no generativas</h2>
                  <div className='ring-1 p-4'>{Object.entries(noGenerativa2).map(([key, value]) => <Reglas regla={key} producciones={value} key={key}/>)}</div>
                </div>
              )}
              {visibleStep >= 8 && (
                <div className='flex flex-col gap-5'>
                  <h2 className='font-semibold text-2xl text-blue-600'>Paso 5. Factorizar por la izquierda</h2>
                  <div className='ring-1 p-4'>{Object.entries(factorizada).map(([key, value]) => <Reglas regla={key} producciones={value} key={key}/>)}</div>
                </div>
              )}
              {visibleStep >= 9 && (
                <div className='flex flex-col gap-5'>
                  <h2 className='font-semibold text-xl'>5.1 Eliminar reglas de redenominación</h2>
                  <div className='ring-1 p-4'>{Object.entries(redenominacion2).map(([key, value]) => <Reglas regla={key} producciones={value} key={key}/>)}</div>
                </div>
              )}
              {visibleStep >= 10 && (
                <div className='flex flex-col gap-5'>
                  <h2 className='font-semibold text-2xl text-blue-600 text-wrap'>Gramática Limpia, sin prefijos comunes y sin recursividad por la izquierda</h2>
                  <div className='ring-1 p-4'>
                    <Cuadrupla terminales={cuadrupla2.terminales} noTerminales={cuadrupla2.noTerminales} inicial={cuadrupla.inicial}/>
                    <br />
                    {Object.entries(redenominacion2).map(([key, value]) => <Reglas regla={key} producciones={value} key={key}/>)}
                  </div>
                </div>
              )}

              {visibleStep < MAX_STEPS && tipo > 1 && (
                <button
                  type="button"
                  className='bg-green-500 mt-10 px-10 py-5 rounded-2xl hover:ring-4 hover:bg-green-600 font-semibold text-white active:ring-4 active:ring-green-300 disabled:bg-gray-400'
                  onClick={showNextStep}
                  disabled={isLoading}
                >
                  {isLoading ? 'Calculando...' : 'Mostrar Siguiente Paso'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;