/* tslint:disable:no-console */
import * as sourceMapSupport from "source-map-support";

import {examples} from "./examples";
import * as lexer from "./lexer";
import * as parser from "./parser";

sourceMapSupport.install();

// Filter out source locations and object prototypes when printing tokens and AST nodes
function filterKeys(key: string, value: any) {
    if (key === "location" || key === "prototype") {
        return undefined;
    } else {
        return value;
    }
}

for (const example of examples) {
    const quoteType = example.quoteType;
    const lexResult = lexer.lex(example.code, quoteType);
    const result = parser.parse(lexResult);
    console.log(`${example.name}:`);
    console.log(`Source:\n${example.code.trimEnd()}\n`);
    console.log("Tokens:");
    for (const token of lexResult.tokens) {
        console.log(JSON.stringify(token, filterKeys));
    }
    console.log();
    console.log("AST:");
    for (const command of result.commands) {
        console.log(JSON.stringify(command, filterKeys, 2));
    }
    console.log(`Warnings: ${JSON.stringify(result.warnings)}`);
    console.log(`Errors: ${JSON.stringify(result.errors)}`);
    console.log("==============");
}
