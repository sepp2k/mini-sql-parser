/* tslint:disable:no-console */

import {examples} from "./examples";
import * as lexer from "./lexer";

for (const example of examples) {
    const quoteType = example.quoteType;
    const result = lexer.lex(example.code, quoteType);
    console.log(`${example.name}:`);
    console.log(`Source:\n${example.code.trimEnd()}\n`);
    console.log("Tokens:");
    for (const token of result.tokens) {
        console.log(JSON.stringify(token, ["kind", "contents"]));
    }
    console.log();
    console.log(`Warnings: ${JSON.stringify(result.warnings)}`);
    console.log(`Errors: ${JSON.stringify(result.errors)}`);
    console.log("==============");
}
