import * as utils from "../utils";
import {ContextElement} from "../context_element";

// this vertex shader is used for the polylines
const vertexShaderSource = `// set the float precision of the shader to medium precision
precision mediump float;
// a vector containing the 2D position of the vertex
attribute vec2 v_position;

void main() {
  // set the vertex's resultant position
  gl_Position = vec4(v_position, 0, 1);
}`;

// this frag shader is used for the polylines
const fragmentShaderSource = `// set the float precision of the shader to medium precision
precision mediump float;
// vec4 containing the color of the line to be drawn
uniform vec4 line_color;

void main() {
  gl_FragColor = line_color;
}
`;

function getPolylinePrimitiveGLProgram(grapheme) {
  if (grapheme.gl_infos._polylineShader)
    return grapheme.gl_infos._polylineShader;

  let gl = grapheme.gl;

  // create the vertex shader
  let vertShad = utils.createShaderFromSource(gl /* rendering context */,
    gl.VERTEX_SHADER /* enum for vertex shader type */,
    vertexShaderSource /* source of the vertex shader*/ );

  // create the frag shader
  let fragShad = utils.createShaderFromSource(gl /* rendering context */,
    gl.FRAGMENT_SHADER /* enum for vertex shader type */,
    fragmentShaderSource /* source of the vertex shader*/ );

  // create the program. we set _polylineShader in the parent Context so that
  // any future gridlines in this Context will use the already-compiled shader
  let program = utils.createGLProgram(gl, vertShad, fragShad);

  grapheme.gl_infos._polylineShader = {program, colorLoc: gl.getUniformLocation(program, "line_color"),
vertexLoc: gl.getAttribLocation(program, "v_position")};

  return grapheme.gl_infos._polylineShader;
}

// polyline primitive in Cartesian coordinates
// has thickness, vertex information, and color stuff
class PolylinePrimitive extends ContextElement {
  constructor(grapheme_context, params = {}) {
    super(grapheme_context, params);

    this.vertices = []; // x,y values in pixel space
    this.gl_info = getPolylinePrimitiveGLProgram(this.context);
    this.gl_buffer = this.context.gl.createBuffer();

    this.color = 0x000000ff; //r,g,b,a
    this.thickness = 2; // thickness of the polyline in pixels
    this.endcap = "round"; // "none", "round", "square"
    this.endcap_res = 0.4; // angle in radians between consecutive roundings
    this.join_type = "round"; // "none", "round", "miter", "vnormal", "dynamic"
    this.join_res = 0.5; // angle in radians between consecutive roundings

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
            addVertex(x2 + th * nu_y, y2 - th * nu_x);
            addVertex(x2 - th * nu_y, y2 + th * nu_x);
            continue;
        }
      }

      if (isNaN(x3) || isNaN(y3)) { // ending endcap
        let pu_x = x2 - x1;
        let pu_y = y2 - y1;
        let dis = Math.hypot(pu_x, pu_y);

        if (dis === 0) {
          pu_x = 1;
          pu_y = 0;
        } else {
          pu_x /= dis;
          pu_y /= dis;
        }

        if (isNaN(pu_x) || isNaN(pu_y))
          continue; // undefined >:(

        addVertex(x2 + th * pu_y, y2 - th * pu_x);
        addVertex(x2 - th * pu_y, y2 + th * pu_x);

        switch (this.endcap) {
          case "square":
            addVertex(x2 - th * (pu_x + pu_y), y2 + th * (-pu_x - pu_y));
            addVertex(x2 + th * (pu_y - pu_x), y2 - th * (-pu_x + pu_y));
            continue;
          case "round":
            let theta = Math.atan2(pu_y, pu_x) + 3 * Math.PI / 2;
            let steps_needed = Math.ceil(Math.PI / this.endcap_res);

            let o_x = x2 - th * pu_y, o_y = y2 + th * pu_x;

            for (let i = 1; i <= steps_needed; ++i) {
              let theta_c = theta + i / steps_needed * Math.PI;

              addVertex(x2 + th * Math.cos(theta_c), y2 + th * Math.sin(theta_c));
              addVertex(o_x, o_y);
            }
            continue;
          case "none":
            break;
        }
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

            // if right turn, flip a2
            // if left turn, flip a1

            let start_a, end_a;

            if (utils.mod(a1 - a2, 2 * Math.PI) < Math.PI) {
              // left turn
              start_a = Math.PI + a1;
              end_a = a2;
            } else {
              start_a = Math.PI + a2;
              end_a = a1;
            }

            let angle_subtended = utils.mod(end_a - start_a, 2 * Math.PI);
            let steps_needed = Math.ceil(angle_subtended / this.join_res);

            for (let i = 0; i <= steps_needed; ++i) {
              let theta_c = start_a + angle_subtended * i / steps_needed;

              addVertex(x2 + th * Math.cos(theta_c), y2 + th * Math.sin(theta_c));
              addVertex(x2, y2);
            }

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

    this._gl_triangle_strip_vertices = this.context.pixelToGLFloatArray(new Float32Array(tri_strip_vertices));
  }

  draw() {
    let gl_info = this.gl_info;
    let gl = this.context.gl;

    this._calculateTriangles();
    if (this._gl_triangle_strip_vertices.length < 3) return;

    // tell webgl to start using the gridline program
    gl.useProgram(gl_info.program);

    // bind our webgl buffer to gl.ARRAY_BUFFER access point
    gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_buffer);

    let color = this.color;

    // set the vec4 at colorLocation to (r, g, b, a)
    gl.uniform4f(gl_info.colorLoc,
      ((color >> 24) & 0xff) / 255, // bit masks to retrieve r, g, b and a
      ((color >> 16) & 0xff) / 255, // divided by 255 because webgl likes [0.0, 1.0]
      ((color >> 8) & 0xff) / 255,
      (color & 0xff) / 255);

    // copy our vertex data to the GPU
    gl.bufferData(gl.ARRAY_BUFFER, this._gl_triangle_strip_vertices, gl.DYNAMIC_DRAW /* means we will rewrite the data often */);

    // enable the vertices location attribute to be used in the program
    gl.enableVertexAttribArray(gl_info.vertexLoc);

    // tell it that the width of vertices is 2 (since it's x,y), that it's floats,
    // that it shouldn't normalize floats, and something i don't understand
    gl.vertexAttribPointer(gl_info.vertexLoc, 2, gl.FLOAT, false, 0, 0);

    // draw the vertices as triple-wise triangles
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this._gl_triangle_strip_vertices.length / 2);

  }
}

export {PolylinePrimitive};
