import * as S from '@ryansolid/s-js';
import { clearDelegatedEvents } from './runtime';

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
    clicked = false;
    clearDelegatedEvents();
    expect(clicked).toBe(false);
    testElem.click();
    expect(clicked).toBe(false);
  })

  test('dispose', () => disposer());
});