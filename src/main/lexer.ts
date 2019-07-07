import * as sourceLocation from "./source_location";

export interface Token {
    // kind = "identifier", "int", "string", the lowercased name of a keyword or the text of an
    // operator or a punctuation character
    kind: string;
    // For strings and quoted table/column names this will contain the contents of the string/name
    // without the quotes and with escaped quotes replaced. For other tokens, this will contain the
    // exact lexeme of the token.
    // For example "foo""bar" becomes {kind: 'string', contents: 'foo"bar', location: ...}
    contents: string;
    location: sourceLocation.Range;
}

export interface Result {
    tokens: Token[];
    warnings: Array<{message: string, location: sourceLocation.Range}>;
    errors: Array<{message: string, location: sourceLocation.Range}>;
}

// Functions to test which category a character falls into.
// I'm using regular expressions because JavaScript doesn't offer any methods to check the Unicode
// properties such as `char.isLetter()` or `char.isSpace()`, so using Unicode regexen is the most
// convenient way.

function isIdentifierStart(char: string) {
    // Allowing emojis in unquoted identifiers is non-standard, but I'm going to do it anyway
    // because one shouldn't need to use quotes to access a table named 💩
    // It's important to use Emoji_Presentation rather than just Emoji because the latter will
    // also match regular characters, such as ASCII digits, that can be combined into emojis with
    // the right modifier.
    return /[_\p{Alpha}\p{General_Category=Other_Letter}\p{Emoji_Presentation}]/u.test(char);
}

function isIdentifierCont(char: string) {
   return isIdentifierStart(char) || /\p{Number}/u.test(char);
}

function isDigit(char: string) {
    // No Unicode digits, just regular ASCII digits
    return /[0-9]/u.test(char);
}

function isSpace(char: string) {
    // Note that \s also matches Unicode whitespace, so if some editor inserts non-breaking space
    // into your code, it will be ignored just like regular a ASCII space
    return /\s/u.test(char);
}

const keywords = [
    "use", "select", "from", "where", "is", "not", "null", "and", "or", "like", "order", "by",
    "insert", "into", "values"
];

export enum QuoteType {
    ANSI_QUOTES, DOUBLE_QUOTED_STRINGS
}

/**
 * Turn the source code into a list of tokens. Whitespace (including Unicode spaces) is ignored.
 * Comments are not supported.
 *
 * @param source The source code
 * @param quoteType ANSI_QUOTES if double quotes are used for delimited identifiers or
 *                  DOUBLE_QUOTED_STRINGS if double quotes are used for strings
 * @returns A Result object containing the generated tokens, warnings and errors
 */
export function lex(source: string, quoteType: QuoteType): Result {
    const quotes = {
        '"': quoteType === QuoteType.ANSI_QUOTES ? "identifier" : "string",
        "'": "string",
        "`": "identifier"
    };

    // Turn the source into an array of code points, so that we can index by code points rather than
    // UTF-16 code units.
    const codePoints = [...source];
    const result: Result = {tokens: [], warnings: [], errors: []};
    let index = 0;
    let line = 1;
    let column = 0;
    let lastPoint: sourceLocation.Point = {line: 1, column: 0};

    function peekChar(offset: number = 0) {
        // Return the empty string at the end of input because all the predicates return false for
        // the empty string, so I can just write `while (isWhatever(peekChar())` in the
        // code below without having to check that the index is valid each time.
        if (index + offset >= codePoints.length) {
             return "";
        } else {
            return codePoints[index + offset];
        }
    }

    function readChar() {
        const char = peekChar();
        if (char === "\n") {
            column = 0;
            line++;
        } else {
            column++;
        }
        index++;
        return char;
    }

    function makeLocation(): sourceLocation.Range {
        const location = {from: lastPoint, to: {line, column}};
        lastPoint = {line, column};
        return location;
    }

    function readIdentifierOrKeyword(): Token {
        let id = "";
        while (isIdentifierCont(peekChar())) {
            id += readChar();
        }
        const location = makeLocation();
        if (keywords.indexOf(id.toLowerCase()) >= 0) {
            if (id !== id.toUpperCase()) {
                result.warnings.push({message: "Style: Keywords should be written in ALLCAPS", location});
            }
            return {kind: id.toLowerCase(), contents: id, location};
        } else {
            return {kind: "identifier", contents: id, location};
        }
    }

    function readInt(): Token {
        let int = "";
        while (isDigit(peekChar())) {
            int += readChar();
        }
        return {kind: "int", contents: int, location: makeLocation()};
    }

    function readQuoted(quote: string, kind: string): Token {
        // Discard opening quote
        readChar();
        let contents = "";
        // The quoting character can be escaped by writing it twice (e.g. "foo "" bar")
        while (peekChar() !== "" && (peekChar() !== quote || peekChar(1) === quote)) {
            // In case of an escaped quote, read both quotes and only add one to the string contents
            if (peekChar() === quote) {
                readChar();
            }
            contents += readChar();
        }
        let location;
        // If we exited the loop because of a closing quote, discard it, otherwise we've
        // hit EOF and produce an error
        if (peekChar() === quote) {
            readChar();
            location = makeLocation();
        } else {
            location = makeLocation();
            result.errors.push({message: "Unclosed quote", location});
        }
        return {kind, contents, location};
    }

    function skipWhiteSpace(): void {
        while (isSpace(peekChar())) {
            readChar();
        }
        lastPoint = {line, column};
    }

    while (index < codePoints.length) {
        const current = peekChar();
        const next = peekChar(1);
        if (isSpace(current)) {
            skipWhiteSpace();
        } else if (isIdentifierStart(current)) {
            result.tokens.push(readIdentifierOrKeyword());
        } else if (isDigit(current)) {
            result.tokens.push(readInt());
        } else if (current === '"' || current === "'" || current === "`") {
            result.tokens.push(readQuoted(current, quotes[current]));
        // Supported multi-char operators: <=, <> and >=
        } else if (current === "<" && (next === "=" || next === ">") ||
                   current === ">" && next === "=") {
            const operator = readChar() + readChar();
            result.tokens.push({kind: operator, contents: operator, location: makeLocation()});
        } else {
            // This case covers single-char operators, punctuation and any unknown characters
            // Unknown characters do not cause an error in the lexer, but are simply passed on to
            // the parser, which will produce an "unexpected token" error.
            const other = readChar();
            result.tokens.push({kind: other, contents: other, location: makeLocation()});
        }
    }
    return result;
}
