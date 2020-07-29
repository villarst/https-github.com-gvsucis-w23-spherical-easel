//
enum TokenType {
  PLUS,
  MINUS,
  UNARY_MINUS,
  MULT,
  DIV,
  POW,
  NUMBER,
  IDENTIFIER,
  LEFT_PAREN,
  RIGHT_PAREN,
  MATH_BUILTIN,
  COMMA,
  UNKNOWN,
  EOF
}
type Lexicon = {
  kind: TokenType;
  name?: string;
  numericValue?: number;
};

type SyntaxTree = {
  node: Lexicon;
  leftChild?: SyntaxTree;
  rightChild?: SyntaxTree;
  args?: SyntaxTree[];
};

class Lexer {
  private input: string;
  private iterator: IterableIterator<string>;
  private nextChar: IteratorResult<string>;
  constructor(input: string) {
    this.input = input;
    this.iterator = input[Symbol.iterator]();
    this.nextChar = this.iterator.next();
  }

  skipWhiteSpaces(): void {
    while (!this.nextChar.done && this.nextChar.value.match(/ /)) {
      this.nextChar = this.iterator.next();
    }
  }

  /** The tokenize() function is a co-routine, it automatically pauses
   * on yield and resumes when the caller invokes its next()
   */
  *tokenize(): IterableIterator<Lexicon> {
    const builtinMathFunctions = [
      "abs",
      "acos",
      "asin",
      "atan",
      "atan2",
      "ceil",
      "cos",
      "exp",
      "floor",
      "ln",
      "max",
      "min",
      "sgn",
      "sin",
      "sqrt",
      "tan"
    ];
    while (!this.nextChar.done) {
      this.skipWhiteSpaces();
      if (this.nextChar.done) break;
      if (this.nextChar.value.match(/[0-9.]/)) {
        // Numeric value
        let tok = "";
        do {
          tok += this.nextChar.value;
          this.nextChar = this.iterator.next();
        } while (!this.nextChar.done && this.nextChar.value.match(/[0-9.]/));
        let value = Number(tok);
        if (!isNaN(value))
          yield { kind: TokenType.NUMBER, numericValue: Number(tok) };
        else throw `Invalid numeric value ${tok}`;
      } else if (this.nextChar.value.match(/[a-zA-Z]/)) {
        let tok = "";
        do {
          tok += this.nextChar.value;
          this.nextChar = this.iterator.next();
        } while (!this.nextChar.done && this.nextChar.value.match(/[a-zA-Z]/));
        if (tok.toUpperCase() === "PI")
          yield { kind: TokenType.NUMBER, numericValue: Math.PI };
        else if (tok.toUpperCase() === "E")
          yield { kind: TokenType.NUMBER, numericValue: Math.E };
        else if (
          builtinMathFunctions.findIndex(fn => fn === tok.toLowerCase())
        ) {
          console.debug("Builtin math", tok);
          yield { kind: TokenType.MATH_BUILTIN, name: tok };
        } else yield { kind: TokenType.IDENTIFIER, name: tok };
      } else if (this.nextChar.value === "+") {
        this.nextChar = this.iterator.next();
        yield { kind: TokenType.PLUS };
      } else if (this.nextChar.value === "-") {
        this.nextChar = this.iterator.next();
        if (this.nextChar.value.match(/[0-9a-zA-Z.]/))
          yield { kind: TokenType.UNARY_MINUS };
        else yield { kind: TokenType.MINUS };
      } else if (this.nextChar.value === "*") {
        this.nextChar = this.iterator.next();
        yield { kind: TokenType.MULT };
      } else if (this.nextChar.value === "/") {
        this.nextChar = this.iterator.next();
        yield { kind: TokenType.DIV };
      } else if (this.nextChar.value === "^") {
        this.nextChar = this.iterator.next();
        yield { kind: TokenType.POW };
      } else if (this.nextChar.value === "(") {
        this.nextChar = this.iterator.next();
        yield { kind: TokenType.LEFT_PAREN };
      } else if (this.nextChar.value === ")") {
        this.nextChar = this.iterator.next();
        yield { kind: TokenType.RIGHT_PAREN };
      } else if (this.nextChar.value === ",") {
        this.nextChar = this.iterator.next();
        yield { kind: TokenType.COMMA };
      } else {
        const unknownChar = this.nextChar.value;
        console.debug("Unknown char", unknownChar);
        this.nextChar = this.iterator.next();
        yield { kind: TokenType.UNKNOWN, name: unknownChar };
      }
    }
    yield { kind: TokenType.EOF };
  }
}

export class SEExpression {
  static parse(input: string): SyntaxTree {
    const lexer = new Lexer(input);
    const tokenizer = lexer.tokenize();
    let token = tokenizer.next();

    function factor(): SyntaxTree {
      if (token.value.kind === TokenType.LEFT_PAREN) {
        // Parenthesized expressions
        token = tokenizer.next();
        const eTree = expr();
        if (token.value.kind === TokenType.RIGHT_PAREN) {
          token = tokenizer.next();
          return eTree;
        } else {
          throw "Syntax error: expected ')'";
        }
      } else if (token.value.kind === TokenType.IDENTIFIER) {
        // TODO: look up the actual value of measurement
        console.debug("Var/Measurement", token.value.text);
        const out = token.value;
        token = tokenizer.next();
        return { node: out };
      } else if (token.value.kind === TokenType.NUMBER) {
        const out = token.value;
        console.debug("Number", out.numericValue);
        token = tokenizer.next();
        return { node: out };
      } else if (token.value.kind === TokenType.UNARY_MINUS) {
        token = tokenizer.next();
        if (token.value.kind === TokenType.NUMBER) {
          const out = token.value;
          out.numericValue *= -1;
          token = tokenizer.next();
          return { node: out };
        } else throw "Syntax error: expected NUMBER after a '-'";
      } else if (token.value.kind === TokenType.MATH_BUILTIN) {
        const out = token.value;
        token = tokenizer.next();
        if (token.value.kind === TokenType.LEFT_PAREN) {
          token = tokenizer.next();
          const exprTree = expr();
          const args = [exprTree];
          while (token.value.kind === TokenType.COMMA) {
            token = tokenizer.next();
            args.push(expr());
          }
          if (token.value.kind === TokenType.RIGHT_PAREN) {
            token = tokenizer.next();
            return { node: out, args };
          } else
            throw "Syntax error: expected ')' after arguments of builtin function";
        } else throw "Syntax error: expected '(' after a builtin function";
      } else throw "Syntax error: expected IDENT, NUMBER, '+', '-', or '('";
    }

    function power(): SyntaxTree {
      let factorTree = factor();
      while (token.value.kind == TokenType.POW) {
        const oper = token.value;
        token = tokenizer.next();
        const f = factor();
        const parent = { node: oper, leftChild: factorTree, rightChild: f };
        factorTree = parent;
      }
      return factorTree;
    }

    function term(): SyntaxTree {
      let powTree = power();
      while (
        token.value.kind == TokenType.MULT ||
        token.value.kind === TokenType.DIV
      ) {
        const oper = token.value;
        token = tokenizer.next();
        const p = power();
        const parent = { node: oper, leftChild: powTree, rightChild: p };
        powTree = parent;
      }
      return powTree;
    }

    function expr(): SyntaxTree {
      let termTree = term();
      while (
        token.value.kind == TokenType.PLUS ||
        token.value.kind === TokenType.MINUS
      ) {
        const oper = token.value;
        token = tokenizer.next();
        const t = term();
        const parent = { node: oper, leftChild: termTree, rightChild: t };
        termTree = parent;
      }
      return termTree;
    }

    return expr();
    // console.debug("Final output is", syntaxTree);
  }
}

export function evaluate(t: SyntaxTree): number {
  switch (t.node.kind) {
    case TokenType.NUMBER:
      return t.node.numericValue!;
    case TokenType.PLUS:
      return evaluate(t.leftChild!) + evaluate(t.rightChild!);
    case TokenType.MINUS:
      return evaluate(t.leftChild!) - evaluate(t.rightChild!);
    case TokenType.MULT:
      return evaluate(t.leftChild!) * evaluate(t.rightChild!);
    case TokenType.DIV:
      const denom = evaluate(t.rightChild!);
      if (Math.abs(denom) > 1e-4)
        return evaluate(t.leftChild!) / evaluate(t.rightChild!);
      else throw "Attempt to divide by zero";
    case TokenType.POW:
      return Math.pow(evaluate(t.leftChild!), evaluate(t.rightChild!));
    case TokenType.MATH_BUILTIN:
      let val: number;
      switch (t.node.name) {
        // Multi-arg functions
        case "max":
          // Apply "evaluate()" to each element
          return Math.max(...t.args!.map(evaluate));
        case "min":
          // Apply "evaluate()" to each element
          return Math.min(...t.args!.map(evaluate));

        // Binary functions
        case "atan2":
          return Math.atan2(evaluate(t.args![0]), evaluate(t.args![1]));

        // Unary functions
        case "abs":
          return Math.abs(evaluate(t.args![0]));
        case "acos":
          return Math.acosh(evaluate(t.args![0]));
        case "asin":
          return Math.asin(evaluate(t.args![0]));
        case "atan":
          return Math.atan(evaluate(t.args![0]));

        case "ceil":
          return Math.ceil(evaluate(t.args![0]));
        case "cos":
          return Math.cos(evaluate(t.args![0]));
        case "exp":
          return Math.exp(evaluate(t.args![0]));
        case "floor":
          return Math.floor(evaluate(t.args![0]));
        case "ln":
          return Math.log(evaluate(t.args![0]));
        case "sgn":
          return Math.sign(evaluate(t.args![0]));
        case "sin":
          return Math.sin(evaluate(t.args![0]));
        case "sqrt":
          return Math.sqrt(evaluate(t.args![0]));
        case "tan":
          return Math.tan(evaluate(t.args![0]));
        default:
          throw `Unknown math builtin ${t.node.name}`;
      }

    default:
      return 0;
  }
}
