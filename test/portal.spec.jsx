const S = require('s-js');
const { createRuntime } = require('../lib/dom-expressions');

const r = createRuntime({wrap: S.makeComputationNode, root: S.root, cleanup: S.cleanup, sample: S.sample});

describe('Testing a simple Portal', () => {
  let div, disposer;
  const testAnchor = document.createElement('div');
  const Component = () =>
    <div ref={div}><$ portal={testAnchor}>Hi</$></div>

  test('Create portal control flow', () => {
    S.root(dispose => {
      disposer = dispose;
      <Component />
    });

    expect(div.innerHTML).toBe('');
    expect(testAnchor.firstChild.innerHTML).toBe('Hi');
    expect(testAnchor.firstChild.host).toBe(div);
  });

  test('dispose', () => disposer());
});

describe('Testing a Portal with Synthetic Events', () => {
  let div, disposer, testElem, clicked = false;
  const Component = () =>
    <div ref={div}><$ portal>
      <div ref={testElem} onClick={e => clicked = true } />
    </$></div>

  test('Create portal control flow', () => {
    S.root(dispose => {
      disposer = dispose;
      <Component />
    });

    expect(div.innerHTML).toBe('');
  });

  test('Test portal element clicked', () => {
    expect(clicked).toBe(false);
    testElem.click();
    expect(clicked).toBe(true);
  })

  test('dispose', () => disposer());
});