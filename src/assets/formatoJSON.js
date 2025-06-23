export default function formatoJSON ( gramatica ) {
    // dividir la gramatica en renglones
    const renglones = gramatica.replace(/[\r]/g, "").split("\n")
    // crear un objeto para guardar nuestra gramatica con formato chido
    const gramaticaObjeto = {}

    // rellenar nuestro objeto
    for(let renglon of renglones){
        const arrowIndex = renglon.indexOf("::=")
        const regla = renglon.substring(0, arrowIndex)
        const produccion = renglon.substring(arrowIndex+3, renglon.length)

        const producciones = produccion.split('|')

        if(!(regla in gramaticaObjeto))
            gramaticaObjeto[regla] = []

        for(let prod of producciones){
            if(prod.includes("λ") || prod.includes("ε"))
                gramaticaObjeto[regla].push("")
            else
                gramaticaObjeto[regla].push(prod)
        }


    }

    return gramaticaObjeto
}


// formatoJSON(
// `<sent_asig>::= <var>=<expresion>
// <expresion>::= <expresion>+<termino>|<expresion>-<termino>|<termino>
// <termino>::=<termino>*<factor>|<termino>/<factor>|<factor>
// <factor>::=(<expresion>)|<var>|<num>
// <var>::= a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z
// <num>::= 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |<art>|<num>.<num>
// <art>::=<art><num>|<art>|0|1|2|3|4|5|6|7|8|9
// <noa>::=<expresion>`
// )

// formatoJSON(
// `<S>::=a<A>bc
// <A>b::=b<A>
// <A>c::=<B>bcc
// b<B>::=bba<A>|<A>aa 
// <B>::=bb|<N>
// <C>::=<A>bc|[a-z]
// <N>::=<NN>a|b<N>
// <NN>::=<N>c`
// )

// formatoJSON(
// `<S>::=a<S>
// <S>::=a<N>
// <N>::=b<N>
// <N>::=b<M>
// <N>::=b
// <M>a::=c`
// )

// formatoJSON(
// `<S>::=[0-9]<BA><AA>|<CA>|<HA>
// <AA>::=c<GA>d|<GA>
// <BA>::=<EA>|[a-z]<S>|<BA>a|[0-9]
// <CA>::=g<DA>|h<DA>t|g<DA>tr|g<DA>tr[0-9]
// <DA>::=x|y|z|<CA>
// <EA>::=<AA><HA>|c<BA>
// <FA>::=<AA><BA>| <GA>a
// <GA>::=<FA><GA>|<GA><HA>
// <HA>::=<HA>a|<BA><HA>|<EA>
// <JA>::=<HA>a|<BA><EA>|asa`
// )

// formatoJSON(
// `<S>::=a<S>a
// <S>::=b<S>b
// <S>::=c|[a-z0-9]<N>
// <N>::=<N>[a-z0-9]
// <I>::=b<S>b|a<S>a`
// )