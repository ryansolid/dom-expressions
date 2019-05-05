import S from 's-js';

describe('Testing an only child suspend control flow', () => {
  let div, disposer;
  const count = S.data(0);
  const Component = () =>
    <div ref={div}><$ suspend={count() < 5}>{() => 'Hi'}</$></div>

  test('Create suspend control flow', () => {
    S.root(dispose => {
      disposer = dispose;
      <Component />
    });

    expect(div.innerHTML).toBe('');
  });

  test('Toggle suspend control flow', () => {
    count(7);
    expect(div.innerHTML).toBe('Hi');
    count(5);
    expect(div.innerHTML).toBe('Hi');
    count(2);
    expect(div.innerHTML).toBe('');
  });

  test('dispose', () => disposer());
});

describe('Testing an only child suspend control flow with DOM children', () => {
  let div, disposer;
  const count = S.data(0);
  const Component = () =>
    <div ref={div}><$ suspend={count() < 5}>
      <span>{count}</span>
      <span>counted</span>
    </$></div>

  test('Create suspend control flow', () => {
    S.root(dispose => {
      disposer = dispose;
      <Component />
    });

    expect(div.innerHTML).toBe('');
  });

  test('Toggle suspend control flow', () => {
    count(7);
    expect(div.firstChild.innerHTML).toBe('7');
    count(5);
    expect(div.firstChild.innerHTML).toBe('5');
    count(2);
    expect(div.innerHTML).toBe('');
  });

  test('dispose', () => disposer());
});

describe('Testing an only child suspend control flow with DOM children and fallback', () => {
  let div, disposer;
  const count = S.data(0);
  const Component = () =>
    <div ref={div}><$ suspend={count() < 5}
      fallback={<span>Too Low</span>}
    >
      <span>{count}</span>
      <span>counted</span>
    </$></div>

  test('Create suspend control flow', () => {
    S.root(dispose => {
      disposer = dispose;
      <Component />
    });

    expect(div.innerHTML).toBe('<span>Too Low</span>');
  });

  test('Toggle suspend control flow', () => {
    count(7);
    expect(div.firstChild.innerHTML).toBe('7');
    count(5);
    expect(div.firstChild.innerHTML).toBe('5');
    count(2);
    expect(div.firstChild.innerHTML).toBe('Too Low');
  });

  test('dispose', () => disposer());
});