import * as utils from "../utils";

// polyline primitive in Cartesian coordinates
// has thickness, vertex information,
class PolylinePrimitive {
  constructor() {
    this.vertices = []; // x,y values in Cartesian
    this.color = 0x000000ff; //r,g,b,a
    this.thickness = 2; // thickness of the polyline in 

    this.gl_triangle_strip = null;
  }

  _calculateTriangles(grapheme_context) {
    // This is nontriviial
  }

  draw(recalculate=true) {

  }
}

export {PolylinePrimitive};
