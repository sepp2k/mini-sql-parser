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
    public readonly columns: Column[]|"*";
    public readonly table: TableName;
    public readonly whereCondition: Expression|undefined;
    public readonly orderBy: Column[];
    public readonly location: sourceLocation.Range;

    constructor(table: TableName, columns: Column[]|"*", whereCondition: Expression|undefined,
                orderBy: Column[], location: sourceLocation.Range) {
        this.table = table;
        this.columns = columns;
        this.whereCondition = whereCondition;
        this.orderBy = orderBy;
        this.location = location;
    }
}

export class InsertCommand {
    public readonly kind: "insert" = "insert";
    public readonly table: TableName;
    public readonly columns: Column[];
    public readonly values: ConstantExpression[];
    public readonly location: sourceLocation.Range;

    constructor(table: TableName, columns: Column[], values: ConstantExpression[],
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

    constructor(location: sourceLocation.Range) {
        this.location = location;
    }
}

export class Null {
    public readonly kind: "null" = "null";
    public readonly location: sourceLocation.Range;

    constructor(location: sourceLocation.Range) {
        this.location = location;
    }
}

export type ConstantExpression = IntLiteral | StringLiteral | Now | Null;

export class Column {
    public readonly kind: "column" = "column";
    public readonly table: TableName|undefined;
    public readonly name: string;
    public readonly location: sourceLocation.Range;

    constructor(table: TableName|undefined, name: string, location: sourceLocation.Range) {
        this.table = table;
        this.name = name;
        this.location = location;
    }
}

export type UnaryOperator = "not" | "-" | "is null" | "is not null";

export class UnaryOperation {
    public readonly kind: "unary" = "unary";
    public readonly operator: UnaryOperator;
    public readonly operand: Expression;
    public readonly location: sourceLocation.Range;

    constructor(operator: UnaryOperator, operand: Expression, location: sourceLocation.Range) {
        this.operator = operator;
        this.operand = operand;
        this.location = location;
    }
}

type BinaryOperator =
    "or" | "and" | "like" | "not like" | "=" | "<>" | ">=" | ">" | "<" | "<=" |
    "+" | "-" | "*" | "/" | "%"
;

export class BinaryOperation {
    public readonly kind: "binary" = "binary";
    public readonly operator: BinaryOperator;
    public readonly leftOperand: Expression;
    public readonly rightOperand: Expression;
    public readonly location: sourceLocation.Range;

    constructor(operator: BinaryOperator, leftOperand: Expression, rightOperand: Expression,
                location: sourceLocation.Range) {
        this.operator = operator;
        this.leftOperand = leftOperand;
        this.rightOperand = rightOperand;
        this.location = location;
    }
}

export type Expression = ConstantExpression | Column | UnaryOperation | BinaryOperation;
