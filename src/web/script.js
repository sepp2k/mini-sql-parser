import CM from "codemirror";
import $ from "jquery";

import "codemirror/addon/lint/lint";
import "codemirror/addon/lint/lint.css";
import "codemirror/lib/codemirror.css";
import "codemirror/mode/sql/sql";

import "./index.html";
import "./style.css";

import {examples} from "../../gen/babel/lib/examples";
import * as lexer from "../../gen/babel/lib/lexer";
import * as parser from "../../gen/babel/lib/parser";
import * as util from "../../gen/babel/lib/util";

$(document).ready(() => {
    const editor = CM.fromTextArea($("#source")[0], {
        lineNumbers: true,
        autofocus: true,
        mode: "text/x-sql",
        gutters: ["CodeMirror-lint-markers"],
        lint: true
    });

    for (const example of examples) {
        const button = $(`<button>${example.name}</button>`);
        button.on("click", () => {
            editor.setValue(example.code);
            $("#ansiQuotes").prop("checked", example.quoteType === lexer.QuoteType.ANSI_QUOTES);
        });
        $("#examples").append(button);
    }

    function parse(src) {
        const ansiEscapes =
            $("#ansiQuotes").is(":checked") ?
            lexer.QuoteType.ANSI_QUOTES :
            lexer.QuoteType.DOUBLE_QUOTED_STRINGS
            ;
        return parser.parse(lexer.lex(src, ansiEscapes));
    }

    function diagnosticToLintMarker(diagnostic, severity) {
        const loc = diagnostic.location;
        const from = CM.Pos(loc.from.line - 1, loc.from.column);
        const to = CM.Pos(loc.to.line - 1, loc.to.column);
        return {from, to, severity, message: diagnostic.message};
    }

    function lint(src, opts, cm) {
        const result = parse(src);
        const warnings = result.warnings.map(warning => diagnosticToLintMarker(warning, "warning"));
        const errors =  result.errors.map(error => diagnosticToLintMarker(error, "error"));
        return warnings.concat(errors);
    }

    CM.registerHelper("lint", "sql", lint);

    $("#ansiQuotes").on('click', () => {
        // Disable and re-enable the lint plug-in to immediately trigger linting even if the code did
        // not change. This is necessary because the ANSI_QUOTES option may affect errors and I want
        // the error squiggles to appear or disappear immediately when the option is changed.
        editor.setOption("lint", undefined);
        editor.setOption("lint", lint);
    });

    $("#parseButton").click(() => {
        const result = parse(editor.getValue());
        $("#parseResult").text(util.prettyPrint(result.commands));
    });
});