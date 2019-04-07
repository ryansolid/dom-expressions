const S = require('s-js');
const { createRuntime, createHyperScript } = require('../lib/dom-expressions');

const r = createRuntime({wrap: S.makeComputationNode, root: S.root, cleanup: S.cleanup, sample: S.sample});
const h = createHyperScript(r);

const FIXTURES = [
  '<div id="main"><h1>Welcome</h1><label class="name" for="entry">Edit:</label><input id="entry" type="text"></div>',
  '<div id="main" class="selected"><h1 title="hello"><a href="/">Welcome</a></h1></div>',
  '<div id="main"><button>Click Bound</button><button>Click Delegated</button><button>Click Listener</button></div>',
  '<div>First</div>middle<div>Last</div>',
  '<div>Shop for Groceries</div><div><div>Hurray!</div></div><span>Editing:</span><input type="text"><div>Go to Work</div><div></div>'
]

describe('Test HyperScript', () => {
  test('Simple Elements', () => {
    const template = h('#main', [
      h('h1', 'Welcome'),
      h('label.name', {attrs: {for: 'entry'}}, 'Edit:'),
      h('input#entry', {type: 'text'})
    ]);
    expect(template.outerHTML).toBe(FIXTURES[0]);
  });

  test('Attribute Expressions', () => {
    const selected = S.data(true),
      welcoming = S.data('hello');
    let link;
    h.registerBinding('custom', (e, v) => {})

    S.root(() => {
      const template = h('#main', {
        classList: () => ({ selected: selected() }),
        $custom: selected
      },
        h('h1', {
          title: welcoming,
          style: () => ({ backgroundColor: 'red'})
        },
          h('a', { href:'/', ref: r => link = r }, 'Welcome')
        )
      );
      expect(template.outerHTML).toBe(FIXTURES[1]);
    });
  });

  test('Event Expressions', () => {
    const exec = {};

    const template = h('#main', [
      h('button', { onclick: () => exec.bound = true }, 'Click Bound'),
      h('button', { onClick: () => exec.delegated = true }, 'Click Delegated'),
      h('button', { events: { click: () => exec.listener = true }}, 'Click Listener')
    ]);
    expect(template.outerHTML).toBe(FIXTURES[2]);
    document.body.appendChild(template);
    var event = new MouseEvent('click');
    template.firstChild.dispatchEvent(event);
    event = new MouseEvent('click', { bubbles: true });
    template.firstChild.nextSibling.dispatchEvent(event);
    event = new MouseEvent('click', { bubbles: true });
    template.firstChild.nextSibling.nextSibling.dispatchEvent(event);

    expect(exec.bound).toBe(true);
    expect(exec.delegated).toBe(true);
    expect(exec.listener).toBe(true);
    document.body.textContent = '';
    r.clearDelegatedEvents();
  });

  test('Fragments', () => {
    const inserted = S.data('middle');

    S.root(() => {
      const template = h([
        h('div', 'First'),
        inserted,
        h('div', 'Last')
      ]);
      const div = document.createElement('div');
      div.appendChild(template);
      expect(div.innerHTML).toBe(FIXTURES[3]);
    });
  });

  test('Flow', () => {
    const list = [
      {id: 1, text: 'Shop for Groceries', completed: true},
      {id: 2, text: 'Go to Work', completed: false}
    ];
    let editingId = 1;

    S.root(() => {
      const template = h.each(() => list, item =>
        h([
          h('div', () => item.text),
          h('div', h.when(() => item.completed, () => h('div', 'Hurray!'))),
          h.when(() => editingId === item.id, () => [
            h('span', 'Editing:'),
            h('input', {type: 'text'})
          ])
        ])
      );

      const div = document.createElement('div');
      template(div);
      expect(div.innerHTML).toBe(FIXTURES[4]);
    });
  })
});