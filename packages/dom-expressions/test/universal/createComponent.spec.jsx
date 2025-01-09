/**
 * @jest-environment jsdom
 */
import { createRoot, createSignal, flushSync } from "@solidjs/signals";

describe("create component with dynamic expressions", () => {
  it("should properly create dynamic properties", () => {
    let span, disposer;
    const [favoriteCar, setFavoriteCar] = createSignal("Porsche 911 Turbo");

    const DynamicChild = props => (
      <span ref={props.ref}>
        {props.name} loves {props.favoriteCar}
      </span>
    );

    const Component = () => (
      <DynamicChild ref={span} name="John" favoriteCar={favoriteCar()} />
    );

    createRoot(dispose => {
      disposer = dispose;
      <Component />;
    });
    expect(span.textContent).toBe("John loves Porsche 911 Turbo");

    setFavoriteCar("Nissan R35 GTR");
    flushSync();
    expect(span.textContent).toBe("John loves Nissan R35 GTR");
    disposer();
  });
});

describe("create component with class syntax", () => {
  class Component {
    constructor(props) {
      this.props = props;
    }
  }
  Component.prototype.isClassComponent = true;

  it("should properly create component", () => {
    let ref, disposer;

    class MyComponent extends Component {
      constructor(props) {
        super(props);
        const [favoriteCar, setFavoriteCar] = createSignal(`${props.make} 911 Turbo`);
        Object.defineProperty(this, "favoriteCar", {
          get() {
            return favoriteCar();
          },
          set(value) {
            setFavoriteCar(value);
          }
        });
      }
      render() {
        return <div ref={ref}>John loves {this.favoriteCar}</div>;
      }
    }

    createRoot(dispose => {
      disposer = dispose;
      <MyComponent make={"Porsche"} />;
    });
    expect(ref.textContent).toBe("John loves Porsche 911 Turbo");
    disposer();
  });
});
