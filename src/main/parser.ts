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
        const prettyActual = actual.kind === "eof" ? "end of input" : `input '${actual.contents}'`;
        this.message = `Unexpected ${prettyActual}, expected ${expected}`;
        this.location = actual.location;
    }
}

interface HasLocation {
    location: sourceLocation.Range;
}

class Parser {
    public errors: Array<{message: string, location: sourceLocation.Range}> = [];

    private tokens: lexer.Token[];
    private tokenIndex: number = 0;

    constructor(tokens: lexer.Token[]) {
        this.tokens = tokens;
    }

    public parse(): ast.Command[] {
        const commands = [];
        while (this.tokenIndex < this.tokens.length) {
            // When there's a syntax error in a command, we ignore that command and skip to the next
            // command by skipping all input until the next ";"-token or the end of input.
            try {
                commands.push(this.parseCommand());
                if (!this.eof()) {
                    this.expect(";", "';' or the end of input");
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
        const columnNames = this.parseColumnNamesOrStar();
        this.expect("from", "FROM clause");
        const table = this.parseTableName();
        const whereCondition = this.parseWhereOpt();
        const orderBy = this.parseOrderByOpt();
        const location = this.loc(selectKeyword, orderBy[orderBy.length - 1] || whereCondition || table);
        return new ast.SelectCommand(table, columnNames, whereCondition, orderBy, location);
    }

    private parseInsert(): ast.InsertCommand {
        const insertCommand = this.readToken();
        this.expect("into", "'INTO'");
        const table = this.parseTableName();
        this.expect("(", "'('");
        const columNames = this.parseColumnNames();
        this.expect(")", "')'");
        this.expect("values", "'VALUES'");
        this.expect("(", "'('");
        const values = this.parseValueList();
        const closingParen = this.expect(")", "')'");
        return new ast.InsertCommand(table, columNames, values, this.loc(insertCommand, closingParen));
    }

    private parseDelete(): ast.DeleteCommand {
        const deleteCommand = this.readToken();
        this.expect("from", "FROM clause");
        const table = this.parseTableName();
        const whereCondition = this.parseWhereOpt();
        const location = this.loc(deleteCommand, whereCondition || table);
        return new ast.DeleteCommand(table, whereCondition, location);
    }

    private parseColumnNamesOrStar(): lexer.Token[]|"*" {
        if (this.peekToken().kind === "*") {
            this.readToken();
            return "*";
        } else {
            return this.parseColumnNames();
        }
    }

    private parseColumnNames(): lexer.Token[] {
        const firstId = this.expect("identifier", "identifier or '*'");
        const ids = [firstId];
        while (this.peekToken().kind === ",") {
            this.readToken();
            const id = this.expect("identifier", "identifier or '*'");
            ids.push(id);
        }
        return ids;
    }

    private parseValueList(): ast.ConstantExpression[] {
        const firstValue = this.parseConstantExpression();
        const values = [];
        if (firstValue !== undefined) {
            values.push(firstValue);
        }
        while (this.peekToken().kind === ",") {
            this.readToken();
            const value = this.parseConstantExpression();
            if (value !== undefined) {
                values.push(value);
            }
        }
        return values;
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

    private parseWhereOpt(): ast.Expression|undefined {
        const kind = this.peekToken().kind;
        if (kind === "eof" || kind === ";" || kind === "order") {
            return undefined;
        }
        this.expect("where", "WHERE clause or ORDER BY clause or end of command");
        return this.parseExpression();
    }

    private parseOrderByOpt(): lexer.Token[] {
        const kind = this.peekToken().kind;
        if (kind === "eof" || kind === ";") {
            return [];
        }
        this.expect("order", "ORDER BY clause or end of command");
        this.expect("by", "'BY'");
        return this.parseColumnNames();
    }

    private parseExpression(): ast.Expression {
        let lhs = this.parseAndExpression();
        while (this.peekToken().kind === "or") {
            this.readToken();
            const rhs = this.parseAndExpression();
            lhs = new ast.BinaryOperation("or", lhs, rhs, this.loc(lhs, rhs));
        }
        return lhs;
    }

    private parseConstantExpression(): ast.ConstantExpression|undefined {
        const exp = this.parseExpression();
        if (exp.kind === "intLiteral" || exp.kind === "stringLiteral" || exp.kind === "now" || exp.kind === "null") {
            return exp;
        } else {
            this.errors.push({
                message: "Only constant expressions are allowed in value list",
                location: exp.location
            });
            return undefined;
        }
    }

    private parseAndExpression(): ast.Expression {
        let lhs = this.parseNot();
        while (this.peekToken().kind === "and") {
            this.readToken();
            const rhs = this.parseNot();
            lhs = new ast.BinaryOperation("and", lhs, rhs, this.loc(lhs, rhs));
        }
        return lhs;
    }

    private parseNot(): ast.Expression {
        if (this.peekToken().kind === "not") {
            const not = this.readToken();
            const arg = this.parseNot();
            return new ast.UnaryOperation("not", arg, this.loc(not, arg));
        } else {
            return this.parseComparison();
        }
    }

    private parseComparison(): ast.Expression {
        const lhs = this.parseAdditiveExpression();
        const operator = this.peekToken().kind;
        switch (operator) {
            case "=": case "<>": case ">=": case ">": case "<": case "<=": case "like": {
                this.readToken();
                const rhs = this.parseAdditiveExpression();
                return new ast.BinaryOperation(operator, lhs, rhs, this.loc(lhs, rhs));
            }
            case "is": {
                this.readToken();
                if (this.peekToken().kind === "not") {
                    this.readToken();
                    const nul = this.expect("null", "'NULL'");
                    return new ast.UnaryOperation("is not null", lhs, this.loc(lhs, nul));
                } else {
                    const nul = this.expect("null", "'NULL' or 'NOT'");
                    return new ast.UnaryOperation("is null", lhs, this.loc(lhs, nul));
                }
            }
            case "not": {
                this.readToken();
                this.expect("like", "'LIKE'");
                const rhs = this.parseAdditiveExpression();
                return new ast.BinaryOperation("not like", lhs, rhs, this.loc(lhs, rhs));
            }
            default:
                return lhs;
        }
    }

    private parseAdditiveExpression(): ast.Expression {
        let lhs = this.parseMultiplicativeExpression();
        let kind = this.peekToken().kind;
        while (kind === "+" || kind === "-") {
            this.readToken();
            const rhs = this.parseMultiplicativeExpression();
            lhs = new ast.BinaryOperation(kind, lhs, rhs, this.loc(lhs, rhs));
            kind = this.peekToken().kind;
        }
        return lhs;
    }

    private parseMultiplicativeExpression(): ast.Expression {
        let lhs = this.parseUnaryMinus();
        let kind = this.peekToken().kind;
        while (kind === "*" || kind === "/" || kind === "%") {
            this.readToken();
            const rhs = this.parseUnaryMinus();
            lhs = new ast.BinaryOperation(kind, lhs, rhs, this.loc(lhs, rhs));
            kind = this.peekToken().kind;
        }
        return lhs;
    }

    private parseUnaryMinus(): ast.Expression {
        if (this.peekToken().kind === "-") {
            const not = this.readToken();
            const arg = this.parseNot();
            return new ast.UnaryOperation("-", arg, this.loc(not, arg));
        } else {
            return this.parsePrimaryExpression();
        }
    }

    private parsePrimaryExpression(): ast.Expression {
        const token = this.readToken();
        switch (token.kind) {
            case "int":
                return new ast.IntLiteral(token);

            case "string":
                return new ast.StringLiteral(token);

            case "null":
                return new ast.Null(token.location);

            case "identifier":
                if (this.peekToken().kind === "(") {
                    this.readToken();
                    const cp = this.expect(")", "')' (functions with arguments are not supported)");
                    if (token.contents.toLowerCase() !== "now") {
                        this.errors.push({
                            message: "The only supported function is NOW()",
                            location: token.location
                        });
                        return new ast.Identifier(token);
                    } else {
                        return new ast.Now(this.loc(token, cp));
                    }
                } else {
                    return new ast.Identifier(token);
                }

            case "(":
                const exp = this.parseExpression();
                this.expect(")", "infix operator or ')'");
                return exp;

            default:
                throw new SyntaxError(token, "expression");
        }
    }
}
