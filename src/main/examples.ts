import * as lexer from "./lexer";
import * as sourceLocation from "./source_location";

export interface Example {
    name: string;
    code: string;
    expectedTokens: Array<{kind: string, contents: string}>;
    // Represent the AST as a JSON string rather than an actual object, so I don't have to define
    // a variation of the AST type without locations and prototypes
    expectedAst: string;
    expectedWarnings?: Array<{message: string, location: sourceLocation.Range}>;
    expectedErrors?: Array<{message: string, location: sourceLocation.Range}>;
    quoteType: lexer.QuoteType;
}

export const examples: Example[] = [
    {
        name: "operations",
        code: `USE database1; --comment
SELECT id, name, address FROM users WHERE is_customer IS NOT NULL ORDER BY created/*another comment*/;
INSERT INTO user_notes (id, \`user id\`, note, created) VALUES (1, 1, "Note 1", NOW());
DELETE FROM database2.logs WHERE id < 1000;`,
        quoteType: lexer.QuoteType.DOUBLE_QUOTED_STRINGS,
        expectedTokens: [
            {kind: "use", contents: "USE"}, {kind: "identifier", contents: "database1"},
            {kind: ";", contents: ";"}, {kind: "select", contents: "SELECT"},
            {kind: "identifier", contents: "id"}, {kind: ",", contents: ","},
            {kind: "identifier", contents: "name"}, {kind: ",", contents: ","},
            {kind: "identifier", contents: "address"}, {kind: "from", contents: "FROM"},
            {kind: "identifier", contents: "users"}, {kind: "where", contents: "WHERE"},
            {kind: "identifier", contents: "is_customer"}, {kind: "is", contents: "IS"},
            {kind: "not", contents: "NOT"}, {kind: "null", contents: "NULL"},
            {kind: "order", contents: "ORDER"}, {kind: "by", contents: "BY"},
            {kind: "identifier", contents: "created"}, {kind: ";", contents: ";"},
            {kind: "insert", contents: "INSERT"}, {kind: "into", contents: "INTO"},
            {kind: "identifier", contents: "user_notes"}, {kind: "(", contents: "("},
            {kind: "identifier", contents: "id"}, {kind: ",", contents: ","},
            {kind: "identifier", contents: "user id"}, {kind: ",", contents: ","},
            {kind: "identifier", contents: "note"}, {kind: ",", contents: ","},
            {kind: "identifier", contents: "created"}, {kind: ")", contents: ")"},
            {kind: "values", contents: "VALUES"}, {kind: "(", contents: "("},
            {kind: "int", contents: "1"}, {kind: ",", contents: ","},
            {kind: "int", contents: "1"}, {kind: ",", contents: ","},
            {kind: "string", contents: "Note 1"}, {kind: ",", contents: ","},
            {kind: "identifier", contents: "NOW"}, {kind: "(", contents: "("},
            {kind: ")", contents: ")"}, {kind: ")", contents: ")"}, {kind: ";", contents: ";"},
            {kind: "delete", contents: "DELETE"}, {kind: "from", contents: "FROM"},
            {kind: "identifier", contents: "database2"}, {kind: ".", contents: "."},
            {kind: "identifier", contents: "logs"}, {kind: "where", contents: "WHERE"},
            {kind: "identifier", contents: "id"}, {kind: "<", contents: "<"},
            {kind: "int", contents: "1000"}, {kind: ";", contents: ";"}
        ],
        expectedAst: `[
          { "kind": "use", "database": "database1"},
          { "kind": "select", "table": {"name": "users"},
            "columns": [
              {"kind": "column", "name": "id"},
              {"kind": "column", "name": "name"},
              {"kind": "column", "name": "address"}
            ],
            "whereCondition": {"kind": "unary", "operator": "is not null",
              "operand": {"kind": "column", "name": "is_customer"}
            },
            "orderBy": [{"kind": "column", "name": "created"}]
          },
          { "kind": "insert", "table": { "name": "user_notes" },
            "columns": [
              { "kind": "column", "name": "id" },
              { "kind": "column", "name": "user id" },
              { "kind": "column", "name": "note" },
              { "kind": "column", "name": "created" }
            ],
            "values": [
              {"kind": "intLiteral", "value": "1"},
              {"kind": "intLiteral", "value": "1"},
              {"kind": "stringLiteral", "value": "Note 1"},
              {"kind": "now"}
            ]
          },
          { "kind": "delete", "table": {"database": "database2", "name": "logs"},
            "whereCondition": {
              "kind": "binary",
              "operator": "<",
              "leftOperand": {"kind": "column", "name": "id"},
              "rightOperand": { "kind": "intLiteral", "value": "1000"}
            }
          }]`
    },
    {
        name: "ANSI quotes",
        code: 'SELECT * FROM "my table"',
        quoteType: lexer.QuoteType.ANSI_QUOTES,
        expectedTokens: [
            {kind: "select", contents: "SELECT"}, {kind: "*", contents: "*"},
            {kind: "from", contents: "FROM"}, {kind: "identifier", contents: "my table"}
        ],
        expectedAst: `[{ "kind": "select", "table": {"name": "my table"}, "columns": "*", "orderBy": []}]`
    },
    {
        name: "lower case keywords",
        code: "select * from table",
        quoteType: lexer.QuoteType.DOUBLE_QUOTED_STRINGS,
        expectedTokens: [
            {kind: "select", contents: "select"}, {kind: "*", contents: "*"},
            {kind: "from", contents: "from"}, {kind: "identifier", contents: "table"}
        ],
        expectedAst: `[{ "kind": "select", "table": {"name": "table"}, "columns": "*", "orderBy": []}]`,
        expectedWarnings: [
            {
                message: "Style: Keywords should be written in ALLCAPS",
                location: {from: {line: 1, column: 0}, to: {line: 1, column: 6}}
            },
            {
                message: "Style: Keywords should be written in ALLCAPS",
                location: {from: {line: 1, column: 9}, to: {line: 1, column: 13}}
            }
        ]
    },
    {
        name: "expressions",
        code: "SELECT * FROM foo WHERE x*y+z-a/b <> c%d*e+42 AND x >= y OR NOT z<y AND x <= y",
        quoteType: lexer.QuoteType.DOUBLE_QUOTED_STRINGS,
        expectedTokens: [
            {kind: "select", contents: "SELECT"}, {kind: "*", contents: "*"},
            {kind: "from", contents: "FROM"}, {kind: "identifier", contents: "foo"},
            {kind: "where", contents: "WHERE"}, {kind: "identifier", contents: "x"},
            {kind: "*", contents: "*"}, {kind: "identifier", contents: "y"},
            {kind: "+", contents: "+"}, {kind: "identifier", contents: "z"},
            {kind: "-", contents: "-"}, {kind: "identifier", contents: "a"},
            {kind: "/", contents: "/"}, {kind: "identifier", contents: "b"},
            {kind: "<>", contents: "<>"}, {kind: "identifier", contents: "c"},
            {kind: "%", contents: "%"}, {kind: "identifier", contents: "d"},
            {kind: "*", contents: "*"}, {kind: "identifier", contents: "e"},
            {kind: "+", contents: "+"}, {kind: "int", contents: "42"},
            {kind: "and", contents: "AND"}, {kind: "identifier", contents: "x"},
            {kind: ">=", contents: ">="}, {kind: "identifier", contents: "y"},
            {kind: "or", contents: "OR"}, {kind: "not", contents: "NOT"},
            {kind: "identifier", contents: "z"}, {kind: "<", contents: "<"},
            {kind: "identifier", contents: "y"}, {kind: "and", contents: "AND"},
            {kind: "identifier", contents: "x"}, {kind: "<=", contents: "<="},
            {kind: "identifier", contents: "y"}
        ],
        expectedAst: `[{
            "kind": "select", "table": {"name": "foo"}, "columns": "*",
            "whereCondition": { "kind": "binary", "operator": "or",
              "leftOperand": { "kind": "binary", "operator": "and",
                "leftOperand": { "kind": "binary", "operator": "<>",
                  "leftOperand": { "kind": "binary", "operator": "-",
                    "leftOperand": { "kind": "binary", "operator": "+",
                      "leftOperand": { "kind": "binary", "operator": "*",
                        "leftOperand": { "kind": "column", "name": "x" },
                        "rightOperand": { "kind": "column", "name": "y" }
                      },
                      "rightOperand": { "kind": "column", "name": "z" }
                    },
                    "rightOperand": { "kind": "binary", "operator": "/",
                      "leftOperand": { "kind": "column", "name": "a" },
                      "rightOperand": { "kind": "column", "name": "b" }
                    }
                  },
                  "rightOperand": { "kind": "binary", "operator": "+",
                    "leftOperand": { "kind": "binary", "operator": "*",
                      "leftOperand": { "kind": "binary", "operator": "%",
                        "leftOperand": { "kind": "column", "name": "c" },
                        "rightOperand": { "kind": "column", "name": "d" }
                      },
                      "rightOperand": { "kind": "column", "name": "e" }
                    },
                    "rightOperand": { "kind": "intLiteral", "value": "42" }
                  }
                },
                "rightOperand": { "kind": "binary", "operator": ">=",
                  "leftOperand": { "kind": "column", "name": "x" },
                  "rightOperand": { "kind": "column", "name": "y" }
                }
              },
              "rightOperand": { "kind": "binary", "operator": "and",
                "leftOperand": { "kind": "unary", "operator": "not",
                  "operand": { "kind": "binary", "operator": "<",
                    "leftOperand": { "kind": "column", "name": "z" },
                    "rightOperand": { "kind": "column", "name": "y" }
                  }
                },
                "rightOperand": { "kind": "binary", "operator": "<=",
                  "leftOperand": { "kind": "column", "name": "x" },
                  "rightOperand": { "kind": "column", "name": "y" }
                }
              }
            },
            "orderBy": []
          }]`
    },
    {
        name: "like",
        code: "SELECT * FROM foo WHERE name LIKE 'Hans'",
        quoteType: lexer.QuoteType.DOUBLE_QUOTED_STRINGS,
        expectedTokens: [
            {kind: "select", contents: "SELECT"}, {kind: "*", contents: "*"},
            {kind: "from", contents: "FROM"}, {kind: "identifier", contents: "foo"},
            {kind: "where", contents: "WHERE"}, {kind: "identifier", contents: "name"},
            {kind: "like", contents: "LIKE"}, {kind: "string", contents: "Hans"}
        ],
        expectedAst: `[{ "kind": "select", "table": {"name": "foo"}, "columns": "*",
            "whereCondition": { "kind": "binary", "operator": "like",
              "leftOperand": { "kind": "column", "name": "name" },
              "rightOperand": { "kind": "stringLiteral", "value": "Hans" }
            },
            "orderBy": []
          }]`
    },
    {
        name: "not like",
        code: "SELECT * FROM foo WHERE name NOT LIKE 'Hans'",
        quoteType: lexer.QuoteType.DOUBLE_QUOTED_STRINGS,
        expectedTokens: [
            {kind: "select", contents: "SELECT"}, {kind: "*", contents: "*"},
            {kind: "from", contents: "FROM"}, {kind: "identifier", contents: "foo"},
            {kind: "where", contents: "WHERE"}, {kind: "identifier", contents: "name"},
            {kind: "not", contents: "NOT"}, {kind: "like", contents: "LIKE"},
            {kind: "string", contents: "Hans"}
        ],
        expectedAst: `[{ "kind": "select", "table": {"name": "foo"}, "columns": "*",
            "whereCondition": { "kind": "binary", "operator": "not like",
              "leftOperand": { "kind": "column", "name": "name" },
              "rightOperand": { "kind": "stringLiteral", "value": "Hans" }
            },
            "orderBy": []
          }]`
    },
    {
        name: "complex column names",
        code: "SELECT db.table.column FROM db.table WHERE db.table.column = table.column2",
        quoteType: lexer.QuoteType.DOUBLE_QUOTED_STRINGS,
        expectedTokens: [
            {kind: "select", contents: "SELECT"}, {kind: "identifier", contents: "db"}, {kind: ".", contents: "."},
            {kind: "identifier", contents: "table"}, {kind: ".", contents: "."},
            {kind: "identifier", contents: "column"}, {kind: "from", contents: "FROM"},
            {kind: "identifier", contents: "db"}, {kind: ".", contents: "."}, {kind: "identifier", contents: "table"},
            {kind: "where", contents: "WHERE"}, {kind: "identifier", contents: "db"}, {kind: ".", contents: "."},
            {kind: "identifier", contents: "table"}, {kind: ".", contents: "."},
            {kind: "identifier", contents: "column"}, {kind: "=", contents: "="},
            {kind: "identifier", contents: "table"}, {kind: ".", contents: "."},
            {kind: "identifier", contents: "column2"}
        ],
        expectedAst: `[
          {"kind": "select", "table": {"database": "db", "name": "table"},
            "columns": [{"kind": "column", "table": {"database": "db", "name": "table"}, "name": "column"}],
            "whereCondition": {"kind": "binary", "operator": "=",
              "leftOperand": {"kind": "column", "table": {"database": "db", "name": "table"}, "name": "column"},
              "rightOperand": {"kind": "column", "table": {"name": "table"}, "name": "column2"}
            },
            "orderBy": []
          }
        ]`
    },
    {
        name: "unclosed string",
        code: "SELECT * FROM foo WHERE name = 'Hans",
        quoteType: lexer.QuoteType.DOUBLE_QUOTED_STRINGS,
        expectedTokens: [
            {kind: "select", contents: "SELECT"}, {kind: "*", contents: "*"},
            {kind: "from", contents: "FROM"}, {kind: "identifier", contents: "foo"},
            {kind: "where", contents: "WHERE"}, {kind: "identifier", contents: "name"},
            {kind: "=", contents: "="}, {kind: "string", contents: "Hans"}
        ],
        expectedAst: `[{ "kind": "select", "table": {"name": "foo"}, "columns": "*",
            "whereCondition": { "kind": "binary", "operator": "=",
              "leftOperand": { "kind": "column", "name": "name" },
              "rightOperand": { "kind": "stringLiteral", "value": "Hans" }
            },
            "orderBy": []
          }]`,
        expectedErrors: [
            {
                message: "Unclosed quote",
                location: {from: {line: 1, column: 31}, to: {line: 1, column: 36}}
            }
        ]
    },
    {
        name: "missing FROM",
        code: "SELECT * WHERE id > 42",
        quoteType: lexer.QuoteType.DOUBLE_QUOTED_STRINGS,
        expectedTokens: [
            {kind: "select", contents: "SELECT"}, {kind: "*", contents: "*"},
            {kind: "where", contents: "WHERE"}, {kind: "identifier", contents: "id"},
            {kind: ">", contents: ">"}, {kind: "int", contents: "42"}
        ],
        expectedAst: `[]`,
        expectedErrors: [
            {
                message: "Unexpected input 'WHERE', expected FROM clause",
                location: {from: {line: 1, column: 9}, to: {line: 1, column: 14}}
            }
        ]
    }
];
