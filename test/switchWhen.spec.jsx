import * as S from '@ryansolid/s-js';

describe('Testing an only child when control flow', () => {
  let div, disposer;
  const count = S.data(0);
  const Component = () =>
    <div ref={div}>
      <$ switch fallback={'fallback'}>
        <$ when={count() && count() < 2}>1</$>
        <$ when={count() && count() < 5}>2</$>
        <$ when={count() && count() < 8}>3</$>
      </$>
    </div>

  test('Create when control flow', () => {
    S.root(dispose => {
      disposer = dispose;
      <Component />
    });

    expect(div.innerHTML).toBe('fallback');
  });

  test('Toggle when control flow', () => {
    count(1);
    expect(div.innerHTML).toBe('1');
    count(4);
    expect(div.innerHTML).toBe('2');
    count(7);
    expect(div.innerHTML).toBe('3');
    count(9);
    expect(div.innerHTML).toBe('fallback');
  });

  test('dispose', () => disposer());
});