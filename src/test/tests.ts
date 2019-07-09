import * as assert from "assert";
import {examples} from "../lib/examples";
import * as lexer from "../lib/lexer";
import * as parser from "../lib/parser";
import * as util from "../lib/util";

for (const example of examples) {
    describe(example.name, () => {
        const lexResult = lexer.lex(example.code, example.quoteType);
        const result = parser.parse(lexResult);
        it("should produce the correct sequence of tokens", () => {
            const expected = util.prettyPrint(example.expectedTokens);
            const actual = util.prettyPrint(lexResult.tokens);
            assert.equal(actual, expected);
        });
        it("should produce the correct AST", () => {
            // Parse and reserialize the expected AST to get rid of spacing and order differences
            const expected = util.prettyPrint(JSON.parse(example.expectedAst));
            // By pretty printing the AST, we also get rid of the location and prototype field,
            // which is good because we didn't specify those for the expected AST
            const actual = util.prettyPrint(result.commands);
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
