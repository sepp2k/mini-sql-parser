import * as lexer from "./lexer";
import * as sourceLocation from "./source_location";

export interface Example {
    name: string;
    code: string;
    expectedTokens: Array<{kind: string, contents: string}>;
    expectedWarnings?: Array<{message: string, location: sourceLocation.Range}>;
    expectedErrors?: Array<{message: string, location: sourceLocation.Range}>;
    quoteType: lexer.QuoteType;
}

export const examples: Example[] = [
    {
        name: "operations",
        code: `USE database1;
SELECT id, name, address FROM users WHERE is_customer IS NOT NULL ORDER BY created;
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
            {kind: "identifier", contents: "DELETE"}, {kind: "from", contents: "FROM"},
            {kind: "identifier", contents: "database2"}, {kind: ".", contents: "."},
            {kind: "identifier", contents: "logs"}, {kind: "where", contents: "WHERE"},
            {kind: "identifier", contents: "id"}, {kind: "<", contents: "<"},
            {kind: "int", contents: "1000"}, {kind: ";", contents: ";"}
        ]
    },
    {
        name: "ANSI quotes",
        code: 'SELECT * FROM "my table"',
        quoteType: lexer.QuoteType.ANSI_QUOTES,
        expectedTokens: [
            {kind: "select", contents: "SELECT"}, {kind: "*", contents: "*"},
            {kind: "from", contents: "FROM"}, {kind: "identifier", contents: "my table"}
        ]
    },
    {
        name: "lower case keywords",
        code: "select * from table",
        quoteType: lexer.QuoteType.DOUBLE_QUOTED_STRINGS,
        expectedTokens: [
            {kind: "select", contents: "select"}, {kind: "*", contents: "*"},
            {kind: "from", contents: "from"}, {kind: "identifier", contents: "table"}
        ],
        expectedWarnings: [
            {
                message: "Style: Keywords should be written in ALLCAPS",
                location: {from: {line: 1, column: 0}, to: {line: 1, column: 6}}},
            {
                message: "Style: Keywords should be written in ALLCAPS",
                location: {from: {line: 1, column: 9}, to: {line: 1, column: 13}}}
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
        ]
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
        ]
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
        ]
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
        // expectedErrors: [
        //     {
        //         message: "Unexpected 'WHERE', expected FROM clause",
        //         location: {from: {line: 1, column: 9}, to: {line: 1, column: 14}}
        //     }
        // ]
    }
];
