export interface Runtime {
  wrap: <T>(fn: (prev?: T) => T) => any;
  insert(parent: Node, accessor: any, init?: any, marker?: Node): any;
  classList(node: HTMLElement, value: {
    [k: string]: boolean;
  }): void;
  createComponent(Comp: (props: any) => any, props: any, dynamicKeys?: string[]): any;
  delegateEvents(eventNames: string[]): void;
  clearDelegatedEvents(): void;
  spread(node: HTMLElement, accessor: any): void;
  flow(parent: Node, type: string, accessor: () => any, expr: (...args: any[]) => any, options: any, marker?: Node | undefined): void;
}

export declare type Attributes = {
  [key: string]: {
      type: string;
      alias?: string;
  };
};

export declare type NonComposedEvents = Set<string>;