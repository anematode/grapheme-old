import * as utils from "../utils";

// Class representing basic things to draw in Grapheme like circles, sets of circles, text, polygons, etc.
class GraphemePrimitive {
  constructor() {
    
  }

  draw() {
    throw new Error("No Context drawing implemented");
  }

  drawSVG() {
    throw new Error("No SVG drawing implemented");
  }
}

export {GraphemePrimitive};
