import { ArrayNode, ASTNode, BinaryOpNode, BooleanNode, IdentifierNode, NumberNode, SourceElementsNode, StringNode, Token, TokenType } from "@kithinji/nac";
import { InsertNode, ListNode, SelectNode } from "./ast";

export class Parser {
    private tokens: Token[] = [];
    private current: number = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens.filter(token => token.type !== TokenType.Newline);
    }

    private peek(): Token {
        return this.tokens[this.current];
    }

    private previous(): Token {
        return this.tokens[this.current - 1];
    }

    private is_at_end(): boolean {
        return this.peek() == undefined ||
            this.peek().type === TokenType.EOF;
    }

    private advance(): Token {
        if (!this.is_at_end()) this.current++;
        return this.previous();
    }

    private check(type: TokenType): boolean {
        if (this.is_at_end()) return false;
        return this.peek().type === type;
    }

    private check_value(value: string): boolean {
        if (this.is_at_end()) return false;
        return this.peek().value === value;
    }

    private match(...types: TokenType[]): boolean {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    private matchv(...values: string[]): boolean {
        for (const value of values) {
            if (this.check_value(value)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    private matchs(...values: string[]): boolean {
        for (const value of values) {
            if (!this.check_value(value)) {
                return false;
            }
            this.advance();
        }
        return true;
    }

    private error(message: string): never {
        const token = this.peek();
        throw new Error(`${message} at line ${token.line}, column ${token.column}`);
    }

    public parse(): ASTNode {
        return this.source_elements();
    }

    private source_elements(): SourceElementsNode {
        const sources: ASTNode[] = [];

        while (!this.is_at_end()) {
            sources.push(this.source_element());
        }

        return new SourceElementsNode(sources);
    }

    private source_element(): ASTNode {
        let ast = this.statement();
        if (!this.match(TokenType.SemiColon))
            this.error("Expected token ';'");

        return ast;
    }

    private statement(): ASTNode {
        const iden = this.peek().value;
        const type = this.peek().type;

        if (type !== TokenType.Identifier)
            this.error("Expected an identifier");

        switch (iden) {
            case "SELECT":
                return this.select();
            case "INSERT":
                return this.insert();
        }

        this.error("")
    }

    private select() {
        if (!this.matchv("SELECT"))
            this.error("Expected 'SELECT' token");

        let columns = new ListNode();

        if (this.match(TokenType.Multiply)) {

        } else {
            columns = this.list()
        }

        if (!this.matchv("FROM"))
            this.error("Expected 'FROM' token");

        if (!this.match(TokenType.Identifier))
            this.error("Expected table name");

        let name = this.previous().value

        let condition: ASTNode | undefined = undefined;
        if (this.matchv("WHERE")) {
            condition = this.expression();
        }

        let group_by = new ListNode();
        if (this.matchs("GROUP", "BY")) {
            group_by = this.list();
        }

        return new SelectNode(name, columns, condition, group_by);
    }

    private insert() {
        if (!this.matchs("INSERT", "INTO")) {
            this.error("Expected 'INSERT INTO'");
        }

        if (!this.match(TokenType.Identifier))
            this.error("Expected table name");

        let name = this.previous().value

        if (!this.matchv("VALUES"))
            this.error("Expected 'VALUES' token");

        let values = this.primary_expression();

        return new InsertNode(name, undefined, values)
    }

    private list() {
        const columns: string[] = [];
        do {
            if (!this.match(TokenType.Identifier)) {
                this.error("Expected an identifier name");
            }

            columns.push(this.previous().value)
        } while (this.match(TokenType.Comma));

        return new ListNode(columns);
    }

    private expression() {
        return this.logical_or_expression()
    }

    private logical_or_expression(): ASTNode {
        let expr = this.logical_and_expression();

        while (this.matchv("OR")) {
            const operator = this.previous().value;
            const right = this.logical_and_expression();
            expr = new BinaryOpNode(operator, expr, right);
        }

        return expr;
    }

    private logical_and_expression(): ASTNode {
        let expr = this.equality_expression();

        while (this.matchv("AND")) {
            const operator = this.previous().value;
            const right = this.equality_expression();
            expr = new BinaryOpNode(operator, expr, right);
        }

        return expr;
    }

    private equality_expression(): ASTNode {
        let expr = this.relational_expression();

        if (this.is_equality_operator(this.peek().type)) {
            const operator = this.advance().value;
            const right = this.relational_expression();

            expr = new BinaryOpNode(operator, expr, right);
        }

        return expr;
    }

    private is_equality_operator(type: TokenType): boolean {
        return type === TokenType.Equals ||
            type === TokenType.IsNotEqual
    }

    private relational_expression(): ASTNode {
        let expr = this.primary_expression();

        if (this.is_relational_operator(this.peek().type)) {
            const operator = this.advance().value;
            const right = this.primary_expression();

            expr = new BinaryOpNode(operator, expr, right);
        }

        return expr;
    }

    private is_relational_operator(type: TokenType): boolean {
        return type === TokenType.LT ||
            type === TokenType.LTE ||
            type === TokenType.GT ||
            type === TokenType.GTE
    }

    private primary_expression(): ASTNode {
        switch (this.peek().type) {
            case TokenType.True:
            case TokenType.False:
            case TokenType.Number:
            case TokenType.String:
                return this.constants();
            case TokenType.Identifier:
                return this.identifier();
            case TokenType.LeftParen:
                return this.array()
        }

        return this.error('Unknown');
    }

    private identifier() {
        if (!this.match(TokenType.Identifier)) {
            this.error("Expected an identifier");
        }

        return new IdentifierNode(this.previous().value);
    }

    private array() {
        const elements: ASTNode[] = [];

        if (!this.match(TokenType.LeftParen)) {
            this.error("Expected '('");
        }

        if (!this.check(TokenType.RightParen)) {
            do {
                elements.push(this.primary_expression());
            } while (this.match(TokenType.Comma));
        }

        if (!this.match(TokenType.RightParen)) {
            this.error("Expected ')'");
        }

        return new ArrayNode(elements);
    }

    private constants() {
        switch (this.peek().type) {
            case TokenType.True:
            case TokenType.False:
                return this.boolean();
            case TokenType.Number:
                return this.number();
            case TokenType.String:
                return this.string();
        }

        this.error('Unknown');
    }

    private number(): NumberNode {
        if (!this.match(TokenType.Number)) {
            this.error("Expected a number");
        }

        return new NumberNode(+this.previous().value);
    }

    private boolean(): BooleanNode {
        if (!this.match(TokenType.True) && !this.match(TokenType.False)) {
            this.error(`Expected a boolean`);
        }

        return new BooleanNode(this.previous().type == TokenType.True);
    }

    private string(): StringNode {
        if (!this.match(TokenType.String)) {
            this.error("Expected a string");
        }

        return new StringNode(this.previous().value);
    }
}