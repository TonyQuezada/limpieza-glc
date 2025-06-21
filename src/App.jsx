import { createRef, useRef, useState } from 'react'
import "./App.css"

import { leerTXT } from './assets/leerTXT'
import formatoJSON from './assets/formatoJSON'

import Reglas from './components/Reglas'
import Cuadrupla from './components/Cuadrupla'
import Lista from './components/Lista'

import { crearCuadrupla, classifyGrammar } from './assets/clasificar'
import { eliminarProduccionesNulas, eliminarReglasDeDenominacion } from './assets/noGenerativas'
import { detectarSimbolosMuertos, limpiarSimbolosMuertos, detectarSimbolosInaccesibles, eliminarReglasInaccesibles } from './assets/limpieza'

function App() {
  const gramaticaUsuario = useRef("")
  const [mostrarContenido, setMostrarContenido] = useState(false)
  const [gramaticaObjeto, setGramaticaObjeto] = useState({})
  const [cuadrupla, setCuadrupla] = useState({})
  const [tipo, setTipo] = useState(0)
  const [noGenerativa, setNoGenerativa] = useState({})
  const [redenominacion, setRedenominacion] = useState({})
  const [vivosMuertos, setVivosMuertos] = useState({})
  const [sinMuertos, setSinMuertos] = useState({})
  const [accesiblesInaccesibles, setAccesiblesInaccesibles] = useState({})
  const [sinInaccesibles, setSinInaccesibles] = useState({})

  return (
    <div className='flex flex-col w-full justify-content items-center'>
      <h1 className='text-center text-3xl font-bold m-10'>Limpieza de gramáticas libres de contexto</h1>

      <button type="button"
      className='bg-blue-500 px-10 py-5 rounded-2xl hover:ring-4 hover:bg-blue-600 font-semibold text-white active:ring-4 active:ring-blue-300'
      onClick={async () => {
          try {
            const contenido = await leerTXT();
            gramaticaUsuario.current = contenido
            const objeto = formatoJSON(gramaticaUsuario.current)
            // console.log(objeto)
            setMostrarContenido(true)
            setGramaticaObjeto(objeto)
            setCuadrupla(crearCuadrupla(objeto))
            
            const tipoGramatica = classifyGrammar(objeto)
            setTipo(tipoGramatica)

            const objetoSinNoGenerativas = eliminarProduccionesNulas(objeto)
            setNoGenerativa(objetoSinNoGenerativas)
            
            const sinRedenominacion = eliminarReglasDeDenominacion(objetoSinNoGenerativas)
            setRedenominacion(sinRedenominacion)

            console.log(sinRedenominacion)

            const vivosMuertosObjeto = detectarSimbolosMuertos(sinRedenominacion)
            setVivosMuertos(vivosMuertosObjeto)

            console.log(vivosMuertosObjeto.vivos)

            const objetoSinMuertos = limpiarSimbolosMuertos(vivosMuertosObjeto.muertos, sinRedenominacion)
            setSinMuertos(objetoSinMuertos)

            const listaAccesInacces = detectarSimbolosInaccesibles(objetoSinMuertos)
            setAccesiblesInaccesibles(listaAccesInacces)

            const accesibles = eliminarReglasInaccesibles(listaAccesInacces.inaccesible, objetoSinMuertos)
            setSinInaccesibles(accesibles)

          } catch (error) {
            console.error("No se pudo leer el archivo:", error)
          }
        }}
      >Seleccionar gramática</button>

      { mostrarContenido &&
        <div className='flex flex-col gap-5 my-10 max-w-[80vw]'>

          <h2 className='font-semibold text-2xl'>Cuádrupla:</h2>
          <div className='ring-1 p-4'>
            <Cuadrupla terminales={cuadrupla.terminales} noTerminales={cuadrupla.noTerminales} inicial={cuadrupla.inicial}/>
          </div>

          <h2 className='font-semibold text-xl'>Reglas de producción (P) = </h2>
          <div className='ring-1 p-4'>
            {
              Object.entries(gramaticaObjeto).map(
                ([key, value]) => (
                  <Reglas regla={key} producciones={value} key={key}/>
                )
              )
            }
          </div>

          {
            tipo === 0 && 
          <div>
            <div className='font-semibold text-red-600'>Gramática Tipo 0: Sin restricciones</div>
            <div>No se puede limpiar</div>
          </div>
          }
          {
            tipo === 1 && 
          <div>
            <div className='font-semibold text-red-600'>Gramática Tipo 1: Sensitiva al contexto</div>
            <div>No se puede limpiar</div>
          </div>
          }
          {
            tipo > 1 &&
            <div>
              {
                tipo === 2 ? 
                  <div className='font-semibold text-red-600'>Gramática Tipo 2: Libre de contexto</div>
                  :
                  <div className='font-semibold text-red-600'>Gramática Tipo 3: Regular</div>
              }
              <div className='flex flex-col gap-5 my-10'>
                <h2 className='font-semibold text-2xl'>Paso 1. Eliminar reglas no generativas</h2>
                
                <div className='ring-1 p-4'>
                {
                  Object.entries(noGenerativa).map(
                    ([key, value]) => (
                      <Reglas regla={key} producciones={value} key={key}/>
                    )
                  )
                }
                </div>

                <h2 className='font-semibold text-2xl'>Paso 2. Eliminar reglas de redenominación</h2>
                
                <div className='ring-1 p-4'>
                {
                  Object.entries(redenominacion).map(
                    ([key, value]) => (
                      <Reglas regla={key} producciones={value} key={key}/>
                    )
                  )
                }
                </div>

                <h2 className='font-semibold text-2xl'>Paso 3. Limpieza de la gramática</h2>
                <h2 className='font-semibold text-xl'>3.1 Indentificar símbolos muertos</h2>
                
                <div className='ring-1 p-4'>
                  <Lista estado={"vivos"} lista={vivosMuertos.vivos}/>
                  <Lista estado={"muertos"} lista={vivosMuertos.muertos}/>
                </div>

                <h2 className='font-semibold text-xl'>3.2 Eliminar reglas con muertos y reglas superfluas</h2>
                <div className='ring-1 p-4'>
                {
                  Object.entries(sinMuertos).map(
                    ([key, value]) => (
                      <Reglas regla={key} producciones={value} key={key}/>
                    )
                  )
                }
                </div>
              
                <h2 className='font-semibold text-xl'>3.3 Identificar símbolos inaccesibles</h2>
                <div className='ring-1 p-4'>
                  <Lista estado={"Accesibles"} lista={accesiblesInaccesibles.accesible}/>
                  <Lista estado={"Inaccesibles"} lista={accesiblesInaccesibles.inaccesible}/>
                </div>

                <h2 className='font-semibold text-xl'>3.4 Eliminar reglas inaccesibles <br />Gramática Limpia y bien formada</h2>
                <div className='ring-1 p-4'>
                {
                  Object.entries(sinInaccesibles).map(
                    ([key, value]) => (
                      <Reglas regla={key} producciones={value} key={key}/>
                    )
                  )
                }
                </div>
                

              </div>
            </div>

          }

          
          
        </div>
      }
      
    </div>
  )
}

export default App
