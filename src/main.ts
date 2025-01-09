import { Lexer } from "@kithinji/nac";
import { Parser } from "./parser/parser";
import { DSQL } from "./dsql/dsql";
import { dsql_eval } from "./dsql/eval";

let database: Record<string, any> = {
    "user": [
        { name: "brian", age: 24, password: "secret1" },
        { name: "kithinji", age: 25, password: "secret2" },
        { name: "mutwiri", age: 26, password: "secret3" },
    ],
    "post": [
        { text: "hello me", userId: 1 }
    ]
};

let sql = `
SELECT * FROM user;
INSERT INTO user VALUES ('yvonne', 13, 'fire');
SELECT * FROM user;
`

let opts = {
    select: (
        name: string,
        columns: string[],
        condition: Record<string, any>,
        group_by: string[]
    ): Record<string, any> => {
        const table = database[name];

        const ftable = table.filter((row: any) => dsql_eval(condition, row));
        if (columns.length == 0) {
            return ftable;
        }

        return ftable.map((row: Record<string, any>) => {
            const selectedRow: Record<string, any> = {};
            columns.forEach(column => {
                if (column in row) {
                    selectedRow[column] = row[column];
                }
            });
            return selectedRow;
        });
    },
    insert: (
        name: string,
        columns: string[],
        values: any[]
    ) => {
        const table = database[name];
        if (!table) {
            throw new Error(`Table ${name} does not exist`);
        }

        let newRow: Record<string, any> = {};
        if (columns.length > 0) {
            if (columns.length !== values.length) {
                throw new Error("Column count does not match value count");
            }

            columns.forEach((column, index) => {
                newRow[column] = values[index];
            });
        } else {
            const keys = Object.keys(table[0] || {});
            if (keys.length !== values.length) {
                throw new Error("Value count does not match table's structure");
            }

            keys.forEach((key, index) => {
                newRow[key] = values[index];
            });
        }

        table.push(newRow);
    }
};

async function main() {
    const lexer = new Lexer(sql);
    const tokens = lexer.tokenize();

    const parser = new Parser(tokens);
    const ast = parser.parse();

    console.log(JSON.stringify(ast, null, 2))

    const dsql = new DSQL(ast, opts)
    const res = await dsql.run();

    console.log(res)
}

main();