export function dsql_eval(
    condition: Record<string, any>,
    row: Record<string, any>
): boolean {
    if (!condition) return true;

    if (condition.op === 'and') {
        return dsql_eval(condition.left, row) && dsql_eval(condition.right, row);
    }

    if (condition.op === 'or') {
        return dsql_eval(condition.left, row) || dsql_eval(condition.right, row);
    }

    if (condition.op === '=') {
        return row[condition.left] === condition.right;
    }

    if (condition.op === '!=') {
        return row[condition.left] !== condition.right;
    }

    if (condition.op === '>=') {
        return row[condition.left] >= condition.right;
    }

    if (condition.op === '<=') {
        return row[condition.left] <= condition.right;
    }

    if (condition.op === '<') {
        return row[condition.left] < condition.right;
    }

    if (condition.op === '>') {
        return row[condition.left] > condition.right;
    }

    return false
}