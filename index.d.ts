declare type AttributeInfo = {
  [key: string]: {
      type: string;
      alias?: string;
  };
};
export const Attributes: AttributeInfo;

export const NonComposedEvents: Set<string>;