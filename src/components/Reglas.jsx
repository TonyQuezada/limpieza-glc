export default function Reglas({ regla, producciones }) {
    return (
        <div className="font-mono">
            <div className="flex">
                <div>{regla}</div>
                <div className="px-1">::=</div>
                <div className="flex flex-wrap gap-x-1 gap-y-1">
                    {
                        producciones.map((produccion, index) => (
                            <div className="flex gap-1" key={index}>
                                <div>{produccion}</div>
                                {index !== producciones.length - 1 && <div>|</div>}
                            </div>
                        ))
                    }
                </div>
            </div>
        </div>
    );
}
