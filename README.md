# Mini SQL

This is a hand-written parser for a minimal SQL dialect, written in TypeScript.

You can play with it [here](https://sepp2k.github.io/mini-sql-parser/).

## The Lexer

The lexer is located in [lexer.ts](src/lib/lexer.ts) and splits the input into an array of
tokens according to the usual lexical rules. It supports Unicode in identifiers (including Emojis,
which is a very important feature to have). White space (including Unicode spaces) is discarded.
It supports line comments with `--` and block comments with `/* */`, both of which are also discarded.
It supports string literals with single quotes and delimited identifiers with backticks. If the ANSI_QUOTES
option is set, delimited identifiers can also be written with double quotes (as mandated in ANSI SQL).
If the option is not set, string literals can also be written with double quotes (as common in certain
SQL implementations, such as MySQL). Either way the quoting character can be escaped by writing it twice.

The resulting, non-discard tokens will be of the form `{kind: string, contents: string, location}`
where `kind` tells us, which kind of token we have, `contents` contains the processed contents of the
token ("processed" meaning that a string like `'It''s me'` will have the contents `It's me`, so quotes
are stripped and escaped quotes only appear once). The `location` field contains information about
where in the source code the token appeared (i.e. line and column number of the token's start and end).

## The AST

The AST is defined in [ast.ts](src/lib/ast.ts) using
[TypeScript's encoding of discriminated unions](https://www.typescriptlang.org/docs/handbook/advanced-types.html#discriminated-unions),
so it can be traversed in a type-safe way without visitors.

## The Parser

The parser is located in [parser.ts](src/lib/parser.ts). It's a predictive recursive descent parser,
which makes its parsing decisions only based on the kind of the current token (so it implements an
LL(1) grammar).

The parser does not make a syntactic distinction between conditions and numeric expressions, so it
does not reject expressions like `x > y AND x + 1` or even `WHERE x + 1`. Such a check should be
performed in a separate phase, which is left as an exercise to the reader.

The parser does perform error recovery. Specifically:

* A non-constant expression inside a `VALUES` list will be reported as an error and ignored. The parser
  will then continue parsing the following expressions (the AST will not contain the non-constant expressions -
  generated ASTs will only ever contain constructs that are syntactically valid).
* A function call to a function other than `NOW` (the only function I support) will be reported as an
  error and ignored.
* Any other syntax error will skip to the next semicolon (or the end of input if there are no more
  semicolons) and then resume parsing the next command. The command with the syntax error will not
  be included in the AST.

## The Supported Language

The parser supports the following commands:

* `USE`
* `SELECT` with a `FROM` clause, an optional `WHERE` clause and an optional `ORDER BY` clause
* `INSERT INTO table (columns) VALUES (values)`
* `DELETE` with `FROM` clause and an optional `WHERE` clause

Table names can either have the form `name` or `database.name`. Column names can have the forms
`column`, `table.column` or `database.table.column`.

The following constant expressions are allowed in a `VALUES` list:

* integer literals in base 10
* string literals (using single quotes or, if the ANSI_QUOTES option is not set, double quotes)
* `NOW()`
* `NULL`

The following expressions are allowed in a `WHERE` clause:

* The Boolean combinators `AND`, `OR` and `NOT`
* The comparisons `LIKE`, `NOT LIKE`, `=`, `<>`, `>=`, `>`, `<`, `<=`, `IS NULL` and `IS NOT NULL`
* The arithmetic operators `+`, `-` (including unary `-`), `*`, `/` and `%`
* The name of a column
* Any constant expression listed in the list above

## The Web Editor

The web editor is implemented using [CodeMirror](https://codemirror.net/) and parses the code in the
background using my lexer and parser. Errors and warnings produced by the lexer and/or parser will be
displayed in the editor using squiggly lines in the code and error/warning symbols on the left. Either
one can be hovered with the mouse to view the error/warning messages.

## The Visualizer

Clicking the "Graphical AST" button in the web editor will draw a graphical representation of the
AST using the [vis.js library](https://visjs.org/). The code for this can be found in
[draw-ast.ts](src/web/draw-ast.ts) and can serve as an example of how to traverse the AST.
