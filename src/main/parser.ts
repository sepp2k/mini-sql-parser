import * as ast from "./ast";
import * as lexer from "./lexer";
import * as sourceLocation from "./source_location";

export interface Result {
    commands: ast.Command[];
    warnings: Array<{message: string, location: sourceLocation.Range}>;
    errors: Array<{message: string, location: sourceLocation.Range}>;
}

export function parse(lexResult: lexer.Result): Result {
    const parser = new Parser(lexResult.tokens);
    const commands = parser.parse();
    return {
        commands,
        warnings: lexResult.warnings,
        errors: [...lexResult.errors, ...parser.errors]
    };
}

// Use a class for syntax errors, so that we can throw it in the parser and then recognize it
// using `instanceof`
class SyntaxError extends Error {
    public message: string;
    public location: sourceLocation.Range;

    constructor(actual: lexer.Token, expected: string) {
        super();
        this.message = `Unexpected '${actual.contents}', expected ${expected}`;
        this.location = actual.location;
    }
}

interface HasLocation {
    location: sourceLocation.Range;
}

class Parser {
    public errors: SyntaxError[] = [];

    private tokens: lexer.Token[];
    private tokenIndex: number = 0;

    constructor(tokens: lexer.Token[]) {
        this.tokens = tokens;
    }

    public parse(): ast.Command[] {
        const commands = [];
        while (this.tokenIndex < this.tokens.length) {
            // When there's a syntax error in a command, we ignore that command and skip to the next
            // command by skipping all input until the next ";"-token or the end of file.
            try {
                commands.push(this.parseCommand());
                if (!this.eof()) {
                    this.expect(";", "';' or the end of file");
                }
            } catch (error) {
                if (error instanceof SyntaxError) {
                    this.errors.push(error);
                    while (!this.eof() && this.peekToken().kind !== ";") {
                        this.tokenIndex++;
                    }
                    // Discard the semicolon as well. If we hit EOF, incrementing the index
                    // won't hurt anything as it will be out of bounds either way
                    this.tokenIndex++;
                } else {
                    throw error;
                }
            }
        }
        return commands;
    }

    private peekToken() {
        if (this.eof()) {
            const lastLoc = this.tokens[this.tokens.length - 1].location;
            return {kind: "eof", contents: "", location: {from: lastLoc.to, to: lastLoc.to}};
        }
        return this.tokens[this.tokenIndex];
    }

    private readToken() {
        const token = this.peekToken();
        this.tokenIndex++;
        return token;
    }

    private eof(): boolean {
        return this.tokenIndex >= this.tokens.length;
    }

    private parseCommand(): ast.Command {
        switch (this.peekToken().kind) {
            case "use":
                return this.parseUse();
            case "select":
                return this.parseSelect();
            case "insert":
                return this.parseInsert();
            case "delete":
                return this.parseDelete();
            default:
                throw new SyntaxError(this.peekToken(), "command (USE, SELECT, INSERT or DELETE)");
        }
    }

    private expect(kind: string, expected: string = kind) {
        const token = this.readToken();
        if (token.kind !== kind) {
            throw new SyntaxError(token, expected);
        }
        return token;
    }

    private loc(start: HasLocation, end: HasLocation): sourceLocation.Range {
        return {from: start.location.from, to: end.location.to};
    }

    private parseUse(): ast.UseCommand {
        const useKeyword = this.readToken();
        const id = this.expect("identifier");
        return new ast.UseCommand(id.contents, this.loc(useKeyword, id));
    }

    private parseSelect(): ast.SelectCommand {
        const selectKeyword = this.readToken();
        const columnNames = this.parseColumnNames();
        this.expect("from", "'FROM'");
        const table = this.parseTableName();
        const location = this.loc(selectKeyword, table);
        return new ast.SelectCommand(table, columnNames, undefined, location);
    }

    private parseInsert(): ast.InsertCommand {
        throw new SyntaxError(this.readToken(), "unimplemented");
    }

    private parseDelete(): ast.DeleteCommand {
        throw new SyntaxError(this.readToken(), "unimplemented");
    }

    private parseColumnNames(): string[]|"*" {
        if (this.peekToken().kind === "*") {
            this.readToken();
            return "*";
        } else {
            const firstId = this.expect("identifier", "identifier or '*'");
            const ids = [firstId.contents];
            while (this.peekToken().kind === ",") {
                this.readToken();
                const id = this.expect("identifier", "identifier or '*'");
                ids.push(id.contents);
            }
            return ids;
        }
    }

    private parseTableName(): ast.TableName {
        const id = this.expect("identifier");
        if (this.peekToken().kind === ".") {
            this.readToken();
            const name = this.expect("identifier");
            const location = this.loc(id, name);
            return {database: id.contents, name: name.contents, location};
        } else {
            return {database: undefined, name: id.contents, location: id.location};
        }
    }
}
