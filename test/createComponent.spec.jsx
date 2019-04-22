const S = require('s-js');
const { createRuntime } = require('../lib/dom-expressions');

const r = createRuntime({wrap: S.makeComputationNode, root: S.root, cleanup: S.cleanup, sample: S.sample});

describe('create component with dynamic expressions', () => {
  it('should properly create dynamic properties', () => {
    let span, disposer;
    const favoriteCar = S.data('Porsche 911 Turbo');

    const DynamicChild = props =>
      <span forwardRef={props.ref}>{props.name} loves {( props.favoriteCar )}</span>

    const Component = () =>
      <DynamicChild ref={span} name='John' favoriteCar={( favoriteCar() )} />

    S.root(dispose => {
      disposer = dispose;
      <Component />
    });

    expect(span.textContent).toBe('John loves Porsche 911 Turbo');
    favoriteCar('Nissan R35 GTR');
    expect(span.textContent).toBe('John loves Nissan R35 GTR');
    disposer();
  });
});