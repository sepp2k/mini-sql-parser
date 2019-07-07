import * as assert from "assert";
import {examples} from "../main/examples";
import * as lexer from "../main/lexer";

for (const example of examples) {
    describe(example.name, () => {
        const result = lexer.lex(example.code, example.quoteType);
        it("should produce the correct sequence of tokens", () => {
            const expected = JSON.stringify(example.expectedTokens);
            // Filter locations out of the actual output because I didn't want to bother with
            // writing down the locations of all the tokens
            const actual = JSON.stringify(result.tokens, ["kind", "contents"]);
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
