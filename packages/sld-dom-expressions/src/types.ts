
export type FunctionComponent = (...args: any[]) => any
/**
 * Component registry type
 * @example
 * ```tsx
 * const components: ComponentRegistry = {
 *   MyComponent: (props) => <div>Hello {props.name}</div>
 * }
 * ```
 */
export type ComponentRegistry = Record<string, FunctionComponent>;

/**
 * SLD Instance type
 * @template T Component registry
 */
export type SLDInstance<T extends ComponentRegistry> = {
  /**
   * SLD template function
   * @example
   * ```tsx
   * const myTemplate = sld`<div>Hello World</div>`
   * ```
   */
  (strings: TemplateStringsArray, ...values: any[]): Node[];

  /**
   * Self reference to SLD instance for tooling
   * @example
   * ```tsx
   * const MyComponent: FunctionComponent = (props) => {
   *   // Use sld to create a template inside a component
   *   return mySLD.sld`<div>Hello ${props.name}</div>`
   * ```
   */
  sld: SLDInstance<T>;

  /**
   * Create a new SLD instance with additional components added to the registry
   * @param components New components to add to the registry
   * @example
   * ```tsx
   * const MyComponent: FunctionComponent = (props) => <div>Hello {props.name}</div>
   * const mySLD = sld.define({MyComponent})
   * const myTemplate = mySLD`<MyComponent name="World" />`
   * ```
   */
  define<TNew extends ComponentRegistry>(components: TNew): SLDInstance<T & TNew>;

  /**
   * Component registry
   */
  components: T;

};

type MountableElement = Element | Document | ShadowRoot | DocumentFragment | Node;
type ClassList =
| Record<string, boolean>
| Array<string | number | boolean | null | undefined | Record<string, boolean>>;
export interface Runtime {
  insert(parent: MountableElement, accessor: any, marker?: Node | null, init?: any): any;
  spread<T>(node: Element, accessor: (() => T) | T, isSVG?: Boolean, skipChildren?: Boolean): void;
  createComponent(Comp: (props: any) => any, props: any): any;
  mergeProps(...sources: unknown[]): Record<string, any>;
  SVGElements: Set<string>;
}