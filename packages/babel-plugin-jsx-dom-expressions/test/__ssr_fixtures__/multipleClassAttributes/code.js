// Multiple `class=` attributes on a single element should be combined
// by the SSR compiler into a single class attribute with a joined value.
const dynamicClass = () => "dyn";
const flag = true;

const t1 = <div class="a" class="b">static static</div>;

const t2 = <div class="a" class={dynamicClass()}>static + dynamic</div>;

const t3 = <div class={dynamicClass()} class={flag ? "on" : "off"}>two dynamic</div>;

const t4 = (
  <div class="base" class={{ active: flag, dim: !flag }}>
    string + object
  </div>
);

const t5 = <div class="a" class="b" class="c">three statics</div>;
