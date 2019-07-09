import * as assert from "assert";
import {examples} from "../main/examples";
import * as lexer from "../main/lexer";
import * as parser from "../main/parser";

// Filter out source locations and object prototypes when serializing tokens and AST nodes
// This way I don't have to write down locations for all the tokens and AST nodes
export function filterKeys(key: string, value: any) {
    if (key === "location" || key === "prototype") {
        return undefined;
    } else {
        return value;
    }
}

for (const example of examples) {
    describe(example.name, () => {
        const lexResult = lexer.lex(example.code, example.quoteType);
        const result = parser.parse(lexResult);
        it("should produce the correct sequence of tokens", () => {
            const expected = JSON.stringify(example.expectedTokens);
            const actual = JSON.stringify(lexResult.tokens, filterKeys);
            assert.equal(actual, expected);
        });
        it("should produce the correct AST", () => {
            // Parse and reserialize the expected AST to get rid of spacing and order differences
            const expected = JSON.stringify(JSON.parse(example.expectedAst));
            const actual = JSON.stringify(result.commands, filterKeys);
            assert.equal(actual, expected);
        });
        it("should produce the correct set of warnings", () => {
            assert.deepEqual(result.warnings, example.expectedWarnings || []);
        });
        it("should produce the correct set of errors", () => {
            assert.deepEqual(result.errors, example.expectedErrors || []);
        });
    });
}
