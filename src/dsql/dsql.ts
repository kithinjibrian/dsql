import { ArrayNode, ASTNode, BinaryOpNode, IdentifierNode, NumberNode, SourceElementsNode, StringNode } from "@kithinji/nac";
import { ASTVisitorDSQL, InsertNode, ListNode, SelectNode } from "../parser/ast";
import { Extension } from "@kithinji/nac/dist/plugin/plugin";

export interface Opts {
    select: (
        name: string,
        columns: string[],
        condition: Record<string, any>,
        group_by: string[]
    ) => Record<string, any>;
    insert: (
        name: string,
        columns: string[],
        values: any[]
    ) => void;
}

export class DSQL implements ASTVisitorDSQL {
    private ast: ASTNode;
    private opts = {
        stack: []
    };
    private plugins: Extension<any>[] = [];

    constructor(ast: ASTNode, opts: Opts) {
        this.ast = ast;
        this.opts = Object.assign({}, this.opts, opts);
    }

    async run() {
        await this.ast.accept(this, this.opts)

        return this.opts.stack;
    }

    public plugin(p: Extension<any>) {
        this.plugins.push(p);
        return this;
    }

    public async before_accept(
        node: ASTNode,
        args?: Record<string, any>
    ) {
        console.log(node.type);
        for (const plugin of this.plugins) {
            if (plugin.beforeAccept) {
                await plugin.beforeAccept(node, this, args);
            }
        }
    }

    public async visit(node?: ASTNode, args?: Record<string, any>): Promise<void> {
        if (!node) return;

        const handledByPlugin = await Promise.any(
            this.plugins.map(async (plugin) => {
                if (plugin.handleNode) {
                    return plugin.handleNode(node, this, args);
                }
            })
        ).catch(() => false); // Handles if no plugin actually processes the node.

        if (!handledByPlugin) {
            return await node.accept(this, args);
        }
    }

    public async after_accept(
        node: ASTNode,
        args?: Record<string, any>
    ) {
        for (const plugin of this.plugins) {
            if (plugin.afterAccept) {
                await plugin.afterAccept(node, this, args);
            }
        }
    }

    public async visitSourceElements(
        node: SourceElementsNode,
        args?: Record<string, any>
    ) {
        for (let i = 0; i < node.sources.length; i++) {
            await this.visit(node.sources[i], args);
        }
    }

    public async visitSelect(
        node: SelectNode,
        { select, stack, ...rest }: { select: Function, stack: any[], rest: any[] }
    ) {
        const condition = await this.visit(node.condition, { stack, ...rest })
        stack.push(
            await select(
                node.table,
                node.columns.list,
                condition,
                node.group_by?.list
            )
        );
    }

    public async visitInsert(
        node: InsertNode,
        { insert, stack, ...rest }: { insert: Function, stack: any[], rest: any[] }
    ) {
        const array = await this.visit(node.values);
        await insert(
            node.table,
            ["name", "age", "password"],
            array
        );
        stack.push(null);
    }

    public async visitList(
        node: ListNode,
        args?: Record<string, any>
    ) {
        return node.list;
    }

    public async visitBinaryOp(
        node: BinaryOpNode,
        args?: Record<string, any>
    ) {
        let expr: Record<string, any> = {};
        expr["left"] = await this.visit(node.left, args);
        expr["op"] = node.operator;
        expr["right"] = await this.visit(node.right, args);

        return expr;
    }

    public async visitIdentifier(node: IdentifierNode, args?: Record<string, any>) {
        return node.name;
    }

    public async visitArray(node: ArrayNode, args?: Record<string, any>) {
        const elems: any[] = [];
        for (let i = 0; i < node.elements.length; i++) {
            const val = await this.visit(node.elements[i], args)
            elems.push(val)
        }

        return elems;
    }

    public async visitNumber(node: NumberNode, args?: Record<string, any>) {
        return node.value;
    }

    public async visitString(node: StringNode, args?: Record<string, any>) {
        return node.value
    }
}