import * as vis from "vis";

import * as ast from "../lib/ast";

export function drawAst(commands: ast.Command[], container: HTMLElement): vis.Network {
    const visualizer = new AstVisualizer();
    const data = visualizer.drawCommands(commands);
    const opts: vis.Options = {};
    return new vis.Network(container, data, {layout: {hierarchical: true}});
}

class AstVisualizer {
    private nodes: vis.DataSet<{id: number, label: string}> = new vis.DataSet([]);
    private edges: vis.DataSet<{from: number, to: number, label?: string}> = new vis.DataSet([]);
    private id = 0;

    public drawCommands(commands: ast.Command[]) {
        for (const command of commands) {
            this.drawCommand(command);
        }
        return {nodes: this.nodes, edges: this.edges};
    }

    private makeNode(label: string) {
        this.id++;
        this.nodes.add({id: this.id, label});
        return this.id;
    }

    private tableToString(table: ast.TableName) {
        if (table.database) {
            return `${table.database}.${table.name}`;
        } else {
            return table.name;
        }
    }

    private columnToString(column: ast.Column) {
        if (column.table) {
            return `${this.tableToString(column.table)}.${column.name}`;
        } else {
            return column.name;
        }
    }

    private drawCommand(command: ast.Command) {
        switch (command.kind) {
            case "use":
                this.makeNode(`USE ${command.database}`);
                break;

            case "select": {
                const columnString =
                    command.columns === "*" ?
                    "*" :
                    command.columns.map(this.columnToString).join(", ")
                ;
                const selectNode = this.makeNode(`SELECT ${columnString}`);
                const fromNode = this.makeNode(this.tableToString(command.table));
                this.edges.add({from: selectNode, to: fromNode, label: "FROM"});
                if (command.whereCondition) {
                    const whereNode = this.drawExpression(command.whereCondition);
                    this.edges.add({from: selectNode, to: whereNode, label: "WHERE"});
                }
                if (command.orderBy.length > 0) {
                    const orderByString = command.orderBy.map(this.columnToString).join(", ");
                    const orderByNode = this.makeNode(orderByString);
                    this.edges.add({from: selectNode, to: orderByNode, label: "ORDER BY"});
                }
                break;
            }
            case "insert": {
                const insertNode = this.makeNode("INSERT");
                const columnString = command.columns.map(this.columnToString);
                const intoNode = this.makeNode(`${this.tableToString(command.table)}\n${columnString}`);
                this.edges.add({from: insertNode, to: intoNode, label: "INTO"});
                const valuesNode = this.makeNode("VALUES");
                this.edges.add({from: insertNode, to: valuesNode});
                for (const value of command.values) {
                    const valueNode = this.makeNode(this.constantToString(value));
                    this.edges.add({from: valuesNode, to: valueNode});
                }
                break;
            }

            case "delete": {
                const deleteNode = this.makeNode("DELETE");
                const fromNode = this.makeNode(this.tableToString(command.table));
                this.edges.add({from: deleteNode, to: fromNode, label: "FROM"});
                if (command.whereCondition) {
                    const whereNode = this.drawExpression(command.whereCondition);
                    this.edges.add({from: deleteNode, to: whereNode, label: "WHERE"});
                }
            }
        }
    }

    private constantToString(constant: ast.ConstantExpression): string {
        switch (constant.kind) {
            case "intLiteral": return `int\n${constant.value}`;
            case "stringLiteral": return `string\n${constant.value}`;
            case "null": return "NULL";
            case "now": return "NOW()";
        }
    }

    private drawExpression(expression: ast.Expression): number {
        switch (expression.kind) {
            case "intLiteral": case "stringLiteral": case "null": case "now":
                return this.makeNode(this.constantToString(expression));

            case "column":
                return this.makeNode(this.columnToString(expression));

            case "unary": {
                const operatorNode = this.makeNode(`unary\n${expression.operator.toUpperCase()}`);
                const operandNode = this.drawExpression(expression.operand);
                this.edges.add({from: operatorNode, to: operandNode});
                return operatorNode;
            }
            case "binary": {
                const operatorNode = this.makeNode(`binary\n${expression.operator.toUpperCase()}`);
                const leftOperandNode = this.drawExpression(expression.leftOperand);
                const rightOperandNode = this.drawExpression(expression.rightOperand);
                this.edges.add({from: operatorNode, to: leftOperandNode});
                this.edges.add({from: operatorNode, to: rightOperandNode});
                return operatorNode;
            }
        }
    }
}
