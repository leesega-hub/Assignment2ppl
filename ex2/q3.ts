import { Exp, CExp, isPrimOp, Program } from './L3/L3-ast';
import { Result, makeFailure, makeOk, mapResult, bind} from './shared/result';

/*
Purpose: Transform L2 AST to Python program string
Signature: l2ToPython(l2AST)
Type: [Parsed | Error] => Result<string>
*/
export const l2ToPython = (exp: Exp | Program): Result<string>  => {
    switch (exp.tag) {

        case "Program": {
             return bind(mapResult(l2ToPython, exp.exps), (exps: string[]) =>
                makeOk(exps.join("\n"))
            );
        }

        case "DefineExp": 
            return bind(l2ToPython(exp.val), (val: string) =>
                makeOk(`${exp.var.var} = ${val}`)
            );

        case "NumExp":
            return makeOk(exp.val.toString());

        case "BoolExp":
            return makeOk(exp.val ? "True" : "False");

        case "StrExp":
            return makeOk(`"${exp.val}"`);

        case "PrimOp":  
            return makeOk(convertPrimOp(exp.op));
            
        case "VarRef":
            return makeOk(exp.var);

        case "AppExp":
            return bind(l2ToPython(exp.rator), (op: string) =>
                bind(mapResult(l2ToPython, exp.rands), (args: string[]) =>
                    makeOk(formatAppExp(exp.rator, op, args))
                )
            );

        case "IfExp":
            return bind(l2ToPython(exp.test), (test: string) =>
                bind(l2ToPython(exp.then), (then: string) =>
                    bind(l2ToPython(exp.alt), (alt: string) =>
                        makeOk(`(${then} if ${test} else ${alt})`)
                    )
                )
            );

        case "ProcExp":
            const args = exp.args.map(arg => arg.var).join(", ");
            //We went throug the bodyExps array using mapResult even though we know it has only one element, because the body of a ProcExp is an array of CExps, and we want to be able to handle multiple expressions in the body in the future if needed.
            return bind(mapResult(l2ToPython, exp.body), (bodyExps: string[]) =>
                makeOk(`(lambda ${args}: ${bodyExps.join(" ")})`)
            );

        case "LetExp":
            const vars = exp.bindings.map(b => b.var.var).join(", ");
            const valsExps = exp.bindings.map(b => b.val);  
            return bind(mapResult(l2ToPython, valsExps), (vals: string[]) =>
                bind(mapResult(l2ToPython, exp.body), (bodyExps: string[]) =>
                    makeOk(`(lambda ${vars}: ${bodyExps.join(" ")})(${vals.join(", ")})`)
                )
            );
    
        default :    
            return makeFailure("Unknown expression type: " + exp.tag);
    }
}

// Helper function to format application expressions
const convertPrimOp = (op: string): string => {
    switch (op) {
        case "=": return "==";
        case "eq?": return "==";
        case "number?": return "(lambda x: (type(x) in [int, float]))";
        case "boolean?": return "(lambda x: (type(x) == bool))";
        case "and": return "and";
        case "or": return "or";
        case "not": return "not";
        default: return op;
    }
};

const formatAppExp = (rator: CExp, op: string, args: string[]): string => {
    if (isPrimOp(rator)) {
        const opStr = rator.op;
        const pyOp = convertPrimOp(opStr);
        
        if (opStr === "not") {
            return `(not ${args[0]})`;
        }
        
        if (opStr.endsWith("?")) {
            return `${pyOp}(${args.join(", ")})`;
        }
        
        if (args.length === 2) {
            return `(${args[0]} ${pyOp} ${args[1]})`;
        }
        
        return `(${args.join(` ${pyOp} `)})`;
    }
    
    return `${op}(${args.join(", ")})`;
};



