import * as utils from "../utils";

// polyline primitive in Cartesian coordinates
// has thickness, vertex information, and color stuff
class PolylinePrimitive {
  constructor() {
    this.vertices = []; // x,y values in pixel space

    this.color = 0x000000ff; //r,g,b,a
    this.thickness = 2; // thickness of the polyline in pixels
    this.endcap = "round"; // "none", "round", "square"
    this.endcap_res = 0.4; // angle in radians between consecutive roundings
    this.join_type = "round"; // "none", "round", "miter", "vnormal", "dynamic"
    this.join_res = 0.4; // angle in radians between consecutive roundings

    this._gl_triangle_strip_vertices = null;
    this._gl_triangle_strip_vertices_total = 0;
  }

  _calculateTriangles(grapheme_context) {
    // This is nontrivial

    let tri_strip_vertices = [];
    let vertices = this.vertices;
    let original_vertex_count = vertices.length / 2;
    let th = this.thickness;

    function addVertex(x,y) {
      tri_strip_vertices.push(x);
      tri_strip_vertices.push(y);
    }

    function duplicateVertex() {
      tri_strip_vertices.push(tri_strip_vertices[tri_strip_vertices.length - 2]);
      tri_strip_vertices.push(tri_strip_vertices[tri_strip_vertices.length - 2]);
    }

    for (let i = 0; i < original_vertex_count; ++i) {
      let x1 = (i !== 0) ? vertices[2 * i - 2] : NaN; // Previous vertex
      let x2 = vertices[2 * i]; // Current vertex
      let x3 = (i !== original_vertex_count - 1) ? vertices[2 * i + 2] : NaN; // Next vertex

      let y1 = (i !== 0) ? vertices[2 * i - 1] : NaN; // Previous vertex
      let y2 = vertices[2 * i + 1]; // Current vertex
      let y3 = (i !== original_vertex_count - 1) ? vertices[2 * i + 3] : NaN; // Next vertex

      if (isNaN(x1) || isNaN(y1)) { // starting endcap
        let nu_x = x3 - x2;
        let nu_y = y3 - y2;
        let dis = Math.hypot(nu_x, nu_y);

        if (dis === 0) {
          nu_x = 1;
          nu_y = 0;
        } else {
          nu_x /= dis;
          nu_y /= dis;
        }

        if (isNaN(nu_x) || isNaN(nu_y))
          continue; // undefined >:(

        switch (this.endcap) {
          case "square":
            addVertex(x2 - th * (nu_x + nu_y), y2 + th * (-nu_x - nu_y));
            addVertex(x2 + th * (nu_y - nu_x), y2 - th * (-nu_x + nu_y));
            continue;
          case "round":
            let theta = Math.atan2(nu_y, nu_x) + Math.PI / 2;
            let steps_needed = Math.ceil(Math.PI / this.endcap_res);

            let o_x = x2 - th * nu_y, o_y = y2 + th * nu_x;

            for (let i = 1; i <= steps_needed; ++i) {
              let theta_c = theta + i / steps_needed * Math.PI;

              addVertex(x2 + th * Math.cos(theta_c), y2 + th * Math.sin(theta_c));
              addVertex(o_x, o_y);
            }
            continue;
          case "none":
            addVertex(x2 - th * nu_y, y2 - th * nu_x);
            addVertex(x2 + th * nu_y, y2 + th * nu_x);
            continue;
        }
      }

      if (isNaN(x3) || isNaN(y3)) { // ending endcap
        continue;
      }

      if (isNaN(x2) || isNaN(x2)) {
        duplicateVertex();
        continue;
      } else { // all vertices are defined, time to draw a joiner
        if (this.join_type === "vnormal") {
          // find the two angle bisectors of the angle formed by v1 = p1 -> p2 and v2 = p2 -> p3

          let v1x = x1 - x2;
          let v1y = y1 - y2;
          let v2x = x3 - x2;
          let v2y = y3 - y2;

          let v1l = Math.hypot(v1x, v1y), v2l = Math.hypot(v2x, v2y);

          let b1_x = v2l * v1x + v1l * v2x, b1_y = v2l * v1y + v1l * v2y;
          let scale = th / Math.hypot(b1_x, b1_y);

          b1_x *= scale;
          b1_y *= scale;

          addVertex(x2 - b1_x, y2 - b1_y);
          addVertex(x2 + b1_x, y2 + b1_y);

          continue;
        }

        let nu_x = x3 - x2;
        let nu_y = y3 - y2;
        let dis = Math.hypot(nu_x, nu_y);

        if (dis === 0) {
          nu_x = 1;
          nu_y = 0;
        } else {
          nu_x /= dis;
          nu_y /= dis;
        }

        let pu_x = x2 - x1;
        let pu_y = y2 - y1;
        dis = Math.hypot(pu_x, pu_y);

        if (dis === 0) {
          pu_x = 1;
          pu_y = 0;
        } else {
          pu_x /= dis;
          pu_y /= dis;
        }

        addVertex(x2 + th * pu_y, y2 - th * pu_x);
        addVertex(x2 - th * pu_y, y2 + th * pu_x);

        switch (this.join_type) {
          case "none":
            break;
          case "round":
            let a1 = Math.atan2(-pu_y, -pu_x) - Math.PI/2;
            let a2 = Math.atan2(nu_y, nu_x) - Math.PI/2;

            console.log(a1, a2);

            break;
          case "miter":
            addVertex(x2 + th * nu_x, y2 - th * nu_y);
            addVertex(x2 - th * pu_x, y2 + th * pu_y);
            break;
          case "dynamic":
            break;
        }

        addVertex(x2 + th * nu_y, y2 - th * nu_x);
        addVertex(x2 - th * nu_y, y2 + th * nu_x);
      }

    }

    return tri_strip_vertices;
  }

  draw(recalculate=true) {
    console.log("what");
  }
}

export {PolylinePrimitive};
