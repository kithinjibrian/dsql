import { ASTNode, ASTNodeBase, ASTVisitor } from "@kithinji/nac";

export interface ASTVisitorDSQL extends ASTVisitor {
    visitSelect?(node: SelectNode, args?: Record<string, any>): any;
    visitInsert?(node: InsertNode, args?: Record<string, any>): any;
    visitList?(node: ListNode, args?: Record<string, any>): any;
}

export class SelectNode extends ASTNodeBase {
    type = 'Select';

    constructor(
        public table: string,
        public columns: ListNode,
        public condition?: ASTNode,
        public group_by?: ListNode,
    ) {
        super();
    }

    _accept(visitor: ASTVisitorDSQL, args?: Record<string, any>): void {
        return visitor.visitSelect?.(this, args);
    }
}

export class InsertNode extends ASTNodeBase {
    type = 'Insert';

    constructor(
        public table: string,
        public columns?: ListNode,
        public values?: ASTNode
    ) {
        super();
    }

    _accept(visitor: ASTVisitorDSQL, args?: Record<string, any>): void {
        return visitor.visitInsert?.(this, args);
    }
}

export class ListNode extends ASTNodeBase {
    type = 'List';

    constructor(
        public list: string[] = [],
    ) {
        super();
    }

    _accept(visitor: ASTVisitorDSQL, args?: Record<string, any>): void {
        return visitor.visitList?.(this, args);
    }
}