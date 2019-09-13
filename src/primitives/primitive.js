import * as utils from "../utils";

// Class representing basic things to draw in Grapheme like circles, sets of circles, text, polygons, etc.
class PrimitiveElement {
  constructor(grapheme_context, params={}) {
    this.context = grapheme_context;
  }

  draw() {
    throw new Error("No Context drawing implemented");
  }

  drawSVG() {
    throw new Error("No SVG drawing implemented");
  }
}

export {PrimitiveElement};
