/* tslint:disable:no-console */
import * as sourceMapSupport from "source-map-support";

import {examples} from "../lib/examples";
import * as lexer from "../lib/lexer";
import * as parser from "../lib/parser";
import * as util from "../lib/util";

sourceMapSupport.install();

for (const example of examples) {
    const quoteType = example.quoteType;
    const lexResult = lexer.lex(example.code, quoteType);
    const result = parser.parse(lexResult);
    console.log(`${example.name}:`);
    console.log(`Source:\n${example.code.trimEnd()}\n`);
    console.log("Tokens:");
    for (const token of lexResult.tokens) {
        console.log(util.prettyPrint(token));
    }
    console.log();
    console.log("AST:");
    for (const command of result.commands) {
        console.log(util.prettyPrint(command));
    }
    console.log(`Warnings: ${JSON.stringify(result.warnings)}`);
    console.log(`Errors: ${JSON.stringify(result.errors)}`);
    console.log("==============");
}
