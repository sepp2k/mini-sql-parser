import {Token} from "./lexer";
import * as sourceLocation from "./source_location";

export interface TableName {
    database: string|undefined;
    name: string;
    location: sourceLocation.Range;
}

export class UseCommand {
    public readonly kind: "use" = "use";
    public readonly database: string;
    public readonly location: sourceLocation.Range;

    constructor(database: string, location: sourceLocation.Range) {
        this.database = database;
        this.location = location;
    }
}

export class SelectCommand {
    public readonly kind: "select" = "select";
    public readonly columns: string[]|"*";
    public readonly table: TableName;
    public readonly whereCondition: Expression|undefined;
    public readonly location: sourceLocation.Range;

    constructor(table: TableName, columns: string[]|"*", whereCondition: Expression|undefined,
                location: sourceLocation.Range) {
        this.table = table;
        this.columns = columns;
        this.whereCondition = whereCondition;
        this.location = location;
    }
}

export class InsertCommand {
    public readonly kind: "insert" = "insert";
    public readonly table: TableName;
    public readonly columns: string[];
    public readonly values: ConstantExpression[];
    public readonly location: sourceLocation.Range;

    constructor(table: TableName, columns: string[], values: ConstantExpression[],
                location: sourceLocation.Range) {
        this.table = table;
        this.columns = columns;
        this.values = values;
        this.location = location;
    }
}

export class DeleteCommand {
    public readonly kind: "delete" = "delete";
    public readonly table: TableName;
    public readonly whereCondition: Expression|undefined;
    public readonly location: sourceLocation.Range;

    constructor(table: TableName, whereCondition: Expression|undefined,
                location: sourceLocation.Range) {
        this.table = table;
        this.whereCondition = whereCondition;
        this.location = location;
    }
}

export type Command = UseCommand | SelectCommand | InsertCommand | DeleteCommand;

export class IntLiteral {
    public readonly kind: "intLiteral" = "intLiteral";
    // I store the value of int literals as strings because I never need to do arithmetic on
    // them and converting the to numbers would cause issues when the given int is outside of
    // the range supported by JavaScript's number type
    public readonly value: string;
    public readonly location: sourceLocation.Range;

    constructor(token: Token) {
        this.value = token.contents;
        this.location = token.location;
    }
}

export class StringLiteral {
    public readonly kind: "stringLiteral" = "stringLiteral";
    public readonly value: string;
    public readonly location: sourceLocation.Range;

    constructor(token: Token) {
        this.value = token.contents;
        this.location = token.location;
    }
}

export class Now {
    public readonly kind: "now" = "now";
    public readonly location: sourceLocation.Range;

    constructor(token: Token) {
        this.location = token.location;
    }
}

type ConstantExpression = IntLiteral | StringLiteral | Now;

export class Identifier {
    public readonly kind: "identifier" = "identifier";
    public readonly name: string;
    public readonly location: sourceLocation.Range;

    constructor(token: Token) {
        this.name = token.contents;
        this.location = token.location;
    }
}

export class UnaryOperation {
    public readonly kind: "unary" = "unary";
    public readonly operator: string;
    public readonly operand: Expression;
    public readonly location: sourceLocation.Range;

    constructor(operator: string, operand: Expression, location: sourceLocation.Range) {
        this.operator = operator;
        this.operand = operand;
        this.location = location;
    }
}

export class BinaryOperation {
    public readonly kind: "unary" = "unary";
    public readonly operator: string;
    public readonly leftOperand: Expression;
    public readonly rightOperand: Expression;
    public readonly location: sourceLocation.Range;

    constructor(operator: string, leftOperand: Expression, rightOperand: Expression, location: sourceLocation.Range) {
        this.operator = operator;
        this.leftOperand = leftOperand;
        this.rightOperand = rightOperand;
        this.location = location;
    }
}

export type Expression = ConstantExpression | Identifier | UnaryOperation | BinaryOperation;
