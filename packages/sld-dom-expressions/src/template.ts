import {
  COMMENT_NODE,
  COMPONENT_NODE,
  ELEMENT_NODE,
  INSERT_NODE,
  TEXT_NODE,
  ChildNode,
  RootNode,
  ComponentNode,
  ROOT_NODE,
  STRING_PROPERTY,
  BOOLEAN_PROPERTY,
  marker
} from "./parse";

//build template element with same exact shape as tree so they can be walked through in sync
export function buildTemplate(node: RootNode | ChildNode): void {
  if (node.type === ROOT_NODE || node.type === COMPONENT_NODE) {
    //Criteria for using template is component or root has at least 1 element. May be be a more optimal condition.
    if (node.children.some(v => v.type === ELEMENT_NODE)) {
      const template = document.createElement("template");
      // buildNodes(node.children, template.content);
      template.innerHTML = node.children.map(buildHTML).join("");
      node.template = template;

      //Replace insert and component markers with empty text nodes and remove empty text nodes
      const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const text = walker.currentNode as Text;
        if (!text.nodeValue) {
          text.parentNode?.removeChild(text);
        } else if (text.nodeValue === marker) {
          text.nodeValue = "";
        } else {
          let index = text.nodeValue.indexOf(marker);
          if (index !== -1) {
            let after = text.splitText(index);
            after.splitText(marker.length);
          }
        }
      }
    }

    node.children.forEach(buildTemplate);
  }
  if (node.type === ELEMENT_NODE) {
    node.children.forEach(buildTemplate);
  }
}

//Lets browser handle svg,mathml, and html encoding
function buildHTML(node: ChildNode): string {
  switch (node.type) {
    case TEXT_NODE:
      return node.value;
    case COMMENT_NODE:
      return `<!--${node.value}-->`;
    case INSERT_NODE:
      return marker;
    case COMPONENT_NODE:
      return marker;
    case ELEMENT_NODE:
      let attributeHTML = "";
      node.props = node.props.filter(prop => {
        if (prop.type === STRING_PROPERTY) {
          attributeHTML += ` ${prop.name}=${prop.quote ?? ""}${prop.value}${prop.quote ?? ""}`;
          return;
        } else if (prop.type === BOOLEAN_PROPERTY) {
          attributeHTML += ` ${prop.name}`;
          return;
        }
        return true;
      });

      return `<${node.name}${attributeHTML}>${node.children.map(buildHTML).join("")}</${
        node.name
      }>`;
  }
}


//Building manually requires checking for MathML, SVG tags as well as html encoded chars
/*
function buildNodes(nodes: ChildNode[], parent: Node) {
    for (const node of nodes) {
        switch (node.type) {
            case TEXT_NODE:
                parent.appendChild(document.createTextNode(node.value));
                break;
            case COMMENT_NODE:
                parent.appendChild(createComment(node.value));
                break;
            case INSERT_NODE:
                parent.appendChild(createComment("+"));
                break;
            case COMPONENT_NODE:
                parent.appendChild(createComment(node.name));
                break;
            case ELEMENT_NODE:
                const elem = createElement(node.name);
                parent.appendChild(elem);

                //set static attributes only and remove from props
                node.props = node.props.filter((prop) => {
                    if (prop.type === STRING_PROPERTY) {
                        elem.setAttribute(prop.name, prop.value);
                        return;
                    } else if (prop.type===BOOLEAN_PROPERTY) {
                        elem.setAttribute(prop.name, ""); //boolean attribute
                        return;
                    }
                    return true;
                });
                buildNodes(node.children, elem);
                break;
        }
    }
}
*/
