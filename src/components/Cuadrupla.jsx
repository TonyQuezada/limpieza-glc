export default function Cuadrupla ( { terminales, noTerminales, inicial } ) {

    const [left, right] = ["{", "}"]

    return (
        <div className="flex flex-col font-mono">

            <pre>G = ( VT, VN, S, P )</pre>
            <pre> </pre>

            <div className="flex">
                <pre>   VT = {left}</pre>
                <div className="flex flex-wrap">
                    {
                        terminales.map((terminal, index) => (
                            index === terminales.length-1 ?
                            <pre key={terminal}>{terminal}</pre>
                            :
                            <pre key={terminal}>{terminal}, </pre>
                            
                        ))
                    }
                    <pre>{right}</pre>
                </div>
            </div>

            <div className="flex">
                <pre>   VN = {left}</pre>
                <div className="flex flex-wrap">
                    {
                        noTerminales.map((noTerminal, index) => (
                            index === noTerminales.length-1 ?
                            <pre key={noTerminal}>{noTerminal}</pre>
                            :
                            <pre key={noTerminal}>{noTerminal}, </pre>
                            
                        ))
                    }
                    <pre>{right}</pre>
                </div>
            </div>
                      
        </div>
    )

}