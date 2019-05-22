import * as S from '@ryansolid/s-js';

describe('Testing providing simple value', () => {
  const Context = {
    id: Symbol('context')
  }, divs = [];
  let disposer, i = 0;
  const ChildComponent = () => {
      const v = S.lookupContext(Context.id);
      return <div ref={divs[i++]}>{v}</div>
    },
    Component = () =>
      <$ provide={Context} value={'hello'}>
        <$ provide={Context} value={'hi'}>
          <ChildComponent />
        </$>
        <ChildComponent />
      </$>

  test('Create provide control flow', () => {
    S.root(dispose => {
      disposer = dispose;
      <Component />
    });

    expect(divs[0].innerHTML).toBe('hi');
    expect(divs[1].innerHTML).toBe('hello');
  });

  test('dispose', () => disposer());
});