import * as S from '@ryansolid/s-js';

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

describe('Testing a context suspend control flow', () => {
  let div, disposer, resolver;
  const handlePromise = p => {
      const [processing, register] = S.lookupContext('suspense');
      const s = S.makeDataNode();
      register(processing() + 1);
      p.then(v => s.next(v)).finally(() => register(processing() - 1));
      return s.current.bind(s);
    },
    LazyComponent = (props) => {
      const getComp = handlePromise(new Promise(resolve => resolver = resolve))
      let Comp;
      return () => (Comp = getComp()) && S.sample(() => Comp(props));
    },
    ChildComponent = (props) => props.greeting,
    Component = () =>
      <div ref={div}><$ suspend><LazyComponent greeting={'Hi'}/></$></div>;

  test('Create suspend control flow', () => {
    S.root(dispose => {
      disposer = dispose;
      <Component />
    });

    expect(div.innerHTML).toBe('');
  });

  test('Toggle suspend control flow', async (done) => {
    resolver(ChildComponent);
    await Promise.resolve();
    expect(div.innerHTML).toBe('Hi');
    done();
  });

  test('dispose', () => disposer());
});