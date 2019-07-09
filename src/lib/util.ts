// Filter out source locations and object prototypes when pretty-printing tokens and AST nodes
export function filterKeys(key: string, value: any) {
    if (key === "location" || key === "prototype") {
        return undefined;
    } else {
        return value;
    }
}

export function prettyPrint(obj: any) {
    return JSON.stringify(obj, filterKeys, 2);
}
