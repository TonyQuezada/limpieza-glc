export default function Cuadrupla ( { estado, lista } ) {

    const [left, right] = ["{", "}"]

    return (
            <div className="flex">
                <pre>Símbolos {estado} = {left}</pre>
                <div className="flex flex-wrap">
                    {
                        lista.map((elemento, index) => (
                            index === lista.length-1 ?
                            <pre key={elemento}>{elemento}</pre>
                            :
                            <pre key={elemento}>{elemento}, </pre>
                            
                        ))
                    }
                    <pre>{right}</pre>
                </div>
            </div>
    )

}