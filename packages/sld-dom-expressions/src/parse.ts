// WE use html5parser because it preservers case of tags and attributes
import {
    SyntaxKind,
    parse as html5parse,
    type INode,
    type IText
} from "html5parser";

import { isNumber, isString } from "./util";


//AST Node types

//Non reactive text
export const TEXT_NODE = 1;
export type TextNode = {
    type: typeof TEXT_NODE;
    value: string;
};

//Non reactive Comment Node <!--value-->
export const COMMENT_NODE = 2;
export type CommentNode = {
    type: typeof COMMENT_NODE;
    value: string;
};

//Reactive Hole
export const INSERT_NODE = 3;
export type InsertNode = {
    type: typeof INSERT_NODE;
    value: number; //index of hole
};

//tag with lowercase first letter <div />
export const ELEMENT_NODE = 4;
export type ElementNode = {
    type: typeof ELEMENT_NODE;
    name: string;
    props: Property[];
    children: ChildNode[];
};

//Tag with capital first letter <Div />
export const COMPONENT_NODE = 5;
export type ComponentNode = {
    type: typeof COMPONENT_NODE;
    name: string;
    props: Property[];
    children: ChildNode[];
    template?: HTMLTemplateElement
};

export const ROOT_NODE = 6;
export type RootNode = {
    type: typeof ROOT_NODE;
    children: ChildNode[];
    template?: HTMLTemplateElement
};

export type ChildNode =
    | TextNode
    | ComponentNode
    | ElementNode
    | InsertNode
    | CommentNode;

export type Property = BooleanProperty | StringProperty | DynamicProperty | MixedProperty | SpreadProperty | AnonymousProperty

// <input disabled>
export const BOOLEAN_PROPERTY = 1
export type BooleanProperty = {
    type: typeof BOOLEAN_PROPERTY
    name: string,
}

// <input value="myString"> <input value='myString'> <input value=""> <input value=''>
export const STRING_PROPERTY = 2
export type StringProperty = {
    type: typeof STRING_PROPERTY
    name: string,
    value: string
}

// <input value=${}> <input value="${}""> <input value='${}'>
export const DYNAMIC_PROPERTY = 3
export type DynamicProperty = {
    type: typeof DYNAMIC_PROPERTY
    name: string,
    value: number
}

// <input value=" ${}"> <input value="input-${}"> <input value='${"value1"} ${"value2"}'>
export const MIXED_PROPERTY = 4
export type MixedProperty = {
    type: typeof MIXED_PROPERTY
    name: string,
    value: Array<string | number>
}

// <input ...${} />
export const SPREAD_PROPERTY = 5
export type SpreadProperty = {
    type: typeof SPREAD_PROPERTY
    value: number
}

// <input ${} />
export const ANONYMOUS_PROPERTY = 6
export type AnonymousProperty = {
    type: typeof ANONYMOUS_PROPERTY
    value: number
}

//string or boolean means static, number means hole and is index, array means mix of string and holes
export type ValueParts = string | boolean | number | Array<string | number>;

//Needs to be unique character that would never be in the template literal
const marker = "⧙⧘";

//Captures index of hole
const match = new RegExp(`${marker}(\\d+)${marker}`, "g");

/**
 * 
 * @param input jsx like string to parse
 * @returns RootNode of an AST
 */
export function parse(input: TemplateStringsArray): RootNode {
    const ast = html5parse(
        input
            .slice(1)
            .reduce(
                (prev, current, index) => prev + marker + index + marker + current,
                input[0],
            ),
    );
    return {
        type: ROOT_NODE,
        children: parseNodes(ast)
    }
}

function parseNodes(nodes: INode[]) {
    return nodes.flatMap(parseNode)
}

//Parse html5parser result for what we care about
function parseNode(
    node: INode,
): ChildNode | ChildNode[] {
    //Text nodes are either static text or holes to insert in
    if (node.type === SyntaxKind.Text) {
        return node.value
            .split(match).flatMap((value, index, array) => {
                if (index % 2 === 1) {
                    return {
                        type: INSERT_NODE,
                        value: Number(value)
                    }
                }
                //We want to trim when only content in textnode is the hole or if textnode is empty
                if (!value || (array.length === 3 && !value.trim())) {
                    return []
                }

                return {
                    type: TEXT_NODE,
                    value,
                }
            });
    }

    //html5parser represents comments as type tag with name "!" or ""
    if (node.name[0] === "!" || node.name === "") {
        return {
            type: COMMENT_NODE,
            value: (node.body as IText[]).join(""),
        } as CommentNode;
    }

    const props = node.attributes.flatMap((v) => {
        const nameParts = getParts(v.name.value);

        if (nameParts.length === 1) {
            const name = nameParts[0];
            if (v.value === undefined) {
                return {
                    name,
                    type: BOOLEAN_PROPERTY
                }
            }

            if (isNumber(name)) {
                return {
                    type: ANONYMOUS_PROPERTY,
                    value: nameParts[1]
                }
            }

            const valueParts = getParts(v.value?.value);

            if (valueParts.length === 0) {
                return {
                    name,
                    type: BOOLEAN_PROPERTY
                }
            } else if (valueParts.length === 1) {
                const value = valueParts[0]
                if (isNumber(value)) {
                    return {
                        type: DYNAMIC_PROPERTY,
                        name,
                        value
                    }
                } else {
                    return {
                        type: STRING_PROPERTY,
                        name,
                        value
                    }
                }
            } else {
                return {
                    type: MIXED_PROPERTY,
                    name,
                    value: valueParts
                }
            }
        }

        //name is mixed static and dynamic. We only look for ...${}
        if (nameParts[0] === "...") {
            return {
                type: SPREAD_PROPERTY,
                value: nameParts[1]
            }
        }

        return []
    }) as Property[];

    const children = node.body?.flatMap(parseNode) ?? [];
    const name = node.rawName as string;

    return {
        type: /^[A-Z]/.test(name) ? COMPONENT_NODE : ELEMENT_NODE,
        name,
        props,
        children,
    };
}

// Splits a string into static parts and hole indexes
function getParts(value: string = ""): Array<string | number> {
    return value
        .split(match)
        .map((v, i) => (i % 2 === 1 ? parseInt(v) : v))
        .filter((v) => isNumber(v) || v !== "");
}