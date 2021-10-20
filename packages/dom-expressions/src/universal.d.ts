export interface RendererOptions<NodeType> {
  createElement(tag: string): NodeType;
  createTextNode(value: string): NodeType;
  replaceText(textNode: NodeType, value: string): void;
  isTextNode(node: NodeType): boolean;
  setProperty<T>(node: NodeType, name: string, value: T, prev?: T): void;
  insertNode(parent: NodeType, node: NodeType, anchor?: NodeType): void;
  removeNode(parent: NodeType, node: NodeType);
  getParentNode(node: NodeType): NodeType;
  getFirstChild(node: NodeType): NodeType;
  getNextSibling(node: NodeType): NodeType;
}

export interface Renderer<NodeType> {
  render(code: () => JSX.Element, node: NodeType): () => void;
  effect<T>(fn: (prev?: T) => T, init?: T): void;
  memo<T>(fn: () => T, equal: boolean): () => T;
  createComponent<T>(Comp: (props: T) => JSX.Element, props: T): JSX.Element;
  createElement(tag: string): NodeType;
  createTextNode(value: string): NodeType;
  insertNode(parent: NodeType, node: NodeType, anchor?: NodeType);
  insert<T>(parent: any, accessor: (() => T) | T, marker?: any | null): JSX.Element;
  spread<T>(node: any, accessor: (() => T) | T, skipChildren?: Boolean): void;
  setProp<T>(node: NodeType, name: string, value: T, prev?: T): T;
  mergeProps(target: unknown, ...sources: unknown[]): unknown;
}

export function createRenderer<NodeType>(options: RendererOptions<NodeType>): Renderer<NodeType>;

