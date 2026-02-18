import {
  AttributeToken,
  CLOSE_TAG_TOKEN,
  EQUALS_TOKEN,
  EXPRESSION_TOKEN,
  ExpressionToken,
  IDENTIFIER_TOKEN,
  OPEN_TAG_TOKEN,
  QUOTE_CHAR_TOKEN,
  SLASH_TOKEN,
  SPREAD_TOKEN,
  TEXT_TOKEN,
  Token,
} from "./tokenize";

const isComponentNode = (name: string): boolean => {
  const char = name.charCodeAt(0);
  return (
    char >= 65 && char <= 90 // Uppercase A-Z
  );
};

// Node type constants
export const ROOT_NODE = 0;
export const ELEMENT_NODE = 1;
export const COMPONENT_NODE = 2;
export const TEXT_NODE = 3;
export const EXPRESSION_NODE = 4;

// Prop type constants
export const BOOLEAN_PROP = 0;
export const STATIC_PROP = 1;
export const EXPRESSION_PROP = 2;
export const SPREAD_PROP = 3;
export const MIXED_PROP = 4;

export type NodeType =
  | typeof ROOT_NODE
  | typeof ELEMENT_NODE
  | typeof COMPONENT_NODE
  | typeof TEXT_NODE
  | typeof EXPRESSION_NODE;
export type PropType =
  | typeof BOOLEAN_PROP
  | typeof STATIC_PROP
  | typeof EXPRESSION_PROP
  | typeof SPREAD_PROP
  | typeof MIXED_PROP;

export type ChildNode = ElementNode | TextNode | ExpressionNode | ComponentNode;

export interface RootNode {
  type: typeof ROOT_NODE;
  children: ChildNode[];
  template?: HTMLTemplateElement;
}

export interface ElementNode {
  type: typeof ELEMENT_NODE;
  name: string;
  props: PropNode[];
  children: ChildNode[];
}

export interface ComponentNode {
  type: typeof COMPONENT_NODE;
  name: string;
  props: PropNode[];
  children: ChildNode[];
  template?: HTMLTemplateElement;
}

export interface TextNode {
  type: typeof TEXT_NODE;
  value: string;
}

export interface ExpressionNode {
  type: typeof EXPRESSION_NODE;
  value: number;
}

export interface BooleanProp {
  name: string;
  type: typeof BOOLEAN_PROP;
  value: boolean;
}

export interface StaticProp {
  name: string;
  type: typeof STATIC_PROP;
  value: string;
  quote?: "'" | '"';
}

export interface ExpressionProp {
  name: string;
  type: typeof EXPRESSION_PROP;
  value: number;
  quote?: "'" | '"';
}

export interface SpreadProp {
  type: typeof SPREAD_PROP;
  value: number;
}

export interface MixedProp {
  name: string;
  type: typeof MIXED_PROP;
  value: Array<string | number>;
  quote?: "'" | '"';
}

export type PropNode = BooleanProp | StaticProp | ExpressionProp | SpreadProp | MixedProp;

export const parse = (tokens: Token[], voidElements: Set<string>): RootNode => {
  const root: RootNode = { type: ROOT_NODE, children: [] };
  const stack: (RootNode | ElementNode | ComponentNode)[] = [root];
  let pos = 0;
  const len = tokens.length;

  while (pos < len) {
    const token = tokens[pos];
    const parent = stack[stack.length - 1];

    switch (token.type) {
      case TEXT_TOKEN: {
        // --- TEXT ---
        const value = token.value;
        if (value.trim() === "") {
          const prevType = tokens[pos - 1]?.type;
          const nextType = tokens[pos + 1]?.type;
          // Filter out empty text nodes between tags
          if (prevType === CLOSE_TAG_TOKEN || nextType === OPEN_TAG_TOKEN) {
            pos++;
            continue;
          }
        }
        parent.children.push({ type: TEXT_NODE, value });
        pos++;
        continue;
      }

      case EXPRESSION_TOKEN: {
        // --- EXPRESSION ---
        parent.children.push({ type: EXPRESSION_NODE, value: token.value });
        pos++;
        continue;
      }

      case OPEN_TAG_TOKEN: {
        // --- TAG ---
        pos++; // Consume '<'
        const nextToken = tokens[pos];

        // Handle Closing Tag: </name>
        if (nextToken.type === SLASH_TOKEN) {
          pos++; // Consume '/'
          const nameToken = tokens[pos];
          if (
            stack.length > 1 &&
            nameToken?.type === IDENTIFIER_TOKEN &&
            (stack[stack.length - 1] as ElementNode).name === nameToken.value
          ) {
            const node = stack.pop();
            if (node?.type === ELEMENT_NODE && voidElements.has(node.name)) {
              node.children = [];
            }
            pos += 2; // Consume 'name' and '>'
            continue;
          }
          throw new Error("Mismatched closing tag.");
        }

        // Handle Opening Tag: <name ...>
        if (nextToken.type === IDENTIFIER_TOKEN) {
          const tagName = nextToken.value;
          const node: ElementNode | ComponentNode = {
            type: isComponentNode(tagName) ? COMPONENT_NODE : ELEMENT_NODE,
            name: tagName,
            props: [],
            children: [],
          };
          parent.children.push(node);
          pos++; // Consume tag name

          // --- Attribute Parsing Loop ---
          while (pos < len) {
            const attrToken = tokens[pos];
            if (attrToken.type === CLOSE_TAG_TOKEN || attrToken.type === SLASH_TOKEN) {
              break; // End of attributes
            }

            if (attrToken.type === SPREAD_TOKEN) {
              const expr = tokens[pos + 1];
              if (expr?.type === EXPRESSION_TOKEN) {
                node.props.push({ type: SPREAD_PROP, value: expr.value });
                pos += 2; // Consume '...' and expression
              } else {
                throw new Error("Spread operator must be followed by an expression.");
              }
            } else if (attrToken.type === IDENTIFIER_TOKEN) {
              const name = attrToken.value;
              const next = tokens[pos + 1];

              if (next?.type === EQUALS_TOKEN) {
                pos += 2; // Consume name and '='
                const valToken = tokens[pos];
                if (valToken.type === EXPRESSION_TOKEN) {
                  node.props.push({ name, type: EXPRESSION_PROP, value: valToken.value });
                  pos++;
                } else if (valToken.type === QUOTE_CHAR_TOKEN) {
                  const quote = valToken.value;
                  pos++; // Consume opening quote
                  const parts: (string | number)[] = [];
                  while (pos < len && tokens[pos].type !== QUOTE_CHAR_TOKEN) {
                    const part = tokens[pos++] as ExpressionToken | AttributeToken;
                    if (part.value !== "") parts.push(part.value);
                  }
                  pos++; // Consume closing quote

                  if (parts.length === 0) {
                    node.props.push({ name, type: STATIC_PROP, value: "", quote });
                  } else if (parts.length === 1) {
                    const v = parts[0];
                    node.props.push({
                      name,
                      type: typeof v === "string" ? STATIC_PROP : EXPRESSION_PROP,
                      value: v as any,
                      quote,
                    });
                  } else {
                    node.props.push({ name, type: MIXED_PROP, value: parts, quote });
                  }
                }
              } else {
                // Boolean prop
                node.props.push({ type: BOOLEAN_PROP, name, value: true });
                pos++;
              }
            } else {
              throw new Error("Invalid attribute.");
            }
          }

          // --- Tag Closing Logic ---
          const endToken = tokens[pos];
          if (endToken.type === SLASH_TOKEN) {
            // Self-closing: <div/>
            pos += 2; // Consume '/' and '>'
          } else if (endToken.type === CLOSE_TAG_TOKEN) {
            // Opening: <div>
            pos++; // Consume '>'
            stack.push(node);
          }
          continue;
        }
      }

      default:
        throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
    }
  }

  if (stack.length > 1) {
    throw new Error("Unclosed tag found.");
  }

  return root;
};
