import * as utils from "../utils";
import {ContextElement} from "../context_element";
import {PrimitiveElement} from "./primitive";

// this vertex shader is used for the polylines
const vertexShaderSource = `// set the float precision of the shader to medium precision
precision mediump float;
// a vector containing the 2D position of the vertex
attribute vec2 v_position;
uniform vec2 xy_scale;

vec2 displace = vec2(-1, 1);

void main() {
  // set the vertex's resultant position
  gl_Position = vec4(v_position * xy_scale + displace, 0, 1);
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
vertexLoc: gl.getAttribLocation(program, "v_position"), xyScale: gl.getUniformLocation(program, "xy_scale")};

  return grapheme.gl_infos._polylineShader;
}

const ENDCAP_TYPES = {
  "NONE": 0,
  "ROUND": 1
};

const JOIN_TYPES = {
  "NONE": 0,
  "ROUND": 1,
  "MITER": 2,
  "DYNAMIC": 3
};

function integerInRange(x, min, max) {
  return utils.isInteger(x) && min <= x && x <= max;
}

const MIN_RES_ANGLE = 0.05; // minimum angle in radians between roundings in a polyline

// Parameters for the expanding/contracting float array for polyline
const MIN_SIZE = 16;
const MAX_SIZE = 2 ** 24;

function nextPowerOfTwo(x) {
  return 2 ** Math.ceil(Math.log2(x));
}

// polyline primitive in Cartesian coordinates
// has thickness, vertex information, and color stuff
class PolylinePrimitive extends PrimitiveElement {
  constructor(grapheme_context, params = {}) {
    super(grapheme_context, params);

    this.vertices = []; // x,y values in pixel space
    this.gl_info = getPolylinePrimitiveGLProgram(this.context);
    this.gl_buffer = this.context.gl.createBuffer();

    this.color = 0x000000ff; //r,g,b,a
    this.thickness = 2; // thickness of the polyline in pixels

    this.endcap_type = 1; // refer to ENDCAP enum
    this.endcap_res = 0.4; // angle in radians between consecutive roundings
    this.join_type = 1; // refer to ENDCAP enum
    this.join_res = 0.5; // angle in radians between consecutive roundings

    this.use_native = false;
    this.use_cpp = true;

    this._gl_triangle_strip_vertices = null;
    this._gl_triangle_strip_vertices_total = 0;
    this._buffer_too_fat = false;
  }

  static ENDCAP_TYPES() {
    return ENDCAP_TYPES;
  }

  static JOIN_TYPES() {
    return JOIN_TYPES;
  }

  static MIN_RES_ANGLE() {
    return MIN_RES_ANGLE;
  }

  _calculateTriangles(use_cpp=false) {
    // This is nontrivial

    // check validity of inputs
    if (this.thickness <= 0 ||
      !integerInRange(this.endcap_type, 0, 1) ||
      !integerInRange(this.join_type, 0, 3) ||
      this.endcap_res < MIN_RES_ANGLE ||
      this.join_res < MIN_RES_ANGLE ||
      this.vertices.length <= 3) {

      this._gl_triangle_strip_vertices_total = 0; // pretend there are no vertices ^_^
      return;
    }

    if (use_cpp) {
      // Information needed: buffer of vertices, length of buffer, type of endcap, type of join, resolution of endcap, resolution of join

      // Steps:
      // 1. Allocate a buffer on HEAPF32 for the vertices
      // 2. Copy vertices to the buffer
      // 3. Call a corresponding polylineCalculateTriangles function
      // 4. Change tri_strip_vertices length if necessary (to next power of two)
      // 5. Copy new vertices from buffer to tri_strip_vertices
      // 6. Free (2)

      let error, big_buffer, small_buffer;
      let vertices = this.vertices;

      try {
        big_buffer = Module._malloc(vertices.length * Float32Array.BYTES_PER_ELEMENT);

        let buffer_view = Module.HEAPF32.subarray(big_buffer >> 2, (big_buffer >> 2) + vertices.length);

        if (vertices instanceof Float32Array) {
          buffer_view.set(vertices);
        } else {
          for (let i = 0; i < vertices.length; ++i) {
            buffer_view[i] = vertices[i];
          }
        }

        small_buffer = Module._malloc(2 * Int32Array.BYTES_PER_ELEMENT);

        let small_buffer_view = Module.HEAP32.subarray(small_buffer >> 2, (small_buffer >> 2) + 2);

        Module.ccall("polylineCalculateTriangles", null,
        ["number", "number", "number", "number", "number", "number", "number", "number"],
        [big_buffer, vertices.length, small_buffer, this.thickness, this.endcap_type, this.endcap_res, this.join_type, this.join_res]);

        let vector_start = small_buffer_view[0];
        let vector_len = small_buffer_view[1];

        let vector_buffer = Module.HEAPF32.subarray((vector_start >> 2), (vector_start >> 2) + vector_len);

        if (!this._gl_triangle_strip_vertices || this._gl_triangle_strip_vertices.length < vector_len || this._gl_triangle_strip_vertices.length > vector_len * 2) {
          this._gl_triangle_strip_vertices = new Float32Array(Math.min(Math.max(MIN_SIZE, nextPowerOfTwo(vector_len)), MAX_SIZE));
        }

        this._gl_triangle_strip_vertices.set(vector_buffer);
        this._gl_triangle_strip_vertices_total = vector_len >> 1;
      } catch (e) {
        error = e;
      } finally {
        Module._free(big_buffer);
        Module._free(small_buffer);
      }

      if (error instanceof RangeError) {
        // probably means the buffer was too fat
        this._gl_triangle_strip_vertices_total = 0;
        this._buffer_too_fat = true;
      } else if (error) {
        throw error;
      }

      this._buffer_too_fat = false;

      return;
    }

    let tri_strip_vertices = this._gl_triangle_strip_vertices;

    if (!tri_strip_vertices) {
      tri_strip_vertices = this._gl_triangle_strip_vertices = new Float32Array(MIN_SIZE);
    }

    let gl_tri_strip_i = 0;
    let that = this; // ew
    let tri_strip_vertices_threshold = tri_strip_vertices.length - 2;

    function addVertex(x, y) {
      if (gl_tri_strip_i > tri_strip_vertices_threshold) {
        // not enough space!!!!

        let new_float_array = new Float32Array(2 * tri_strip_vertices.length);
        new_float_array.set(tri_strip_vertices);

        tri_strip_vertices = that._gl_triangle_strip_vertices = new_float_array;
        tri_strip_vertices_threshold = tri_strip_vertices.length - 2;
      }

      tri_strip_vertices[gl_tri_strip_i++] = x;
      tri_strip_vertices[gl_tri_strip_i++] = y;

      if (need_to_dupe_vertex) {
        need_to_dupe_vertex = false;
        addVertex(x, y);
      }
    }

    function duplicateVertex() {
      addVertex(tri_strip_vertices[gl_tri_strip_i - 2], tri_strip_vertices[gl_tri_strip_i - 1]);
    }

    let vertices = this.vertices;
    let original_vertex_count = vertices.length / 2;

    let th = this.thickness;
    let need_to_dupe_vertex = false;

    let max_miter_length = th / Math.cos(this.join_res / 2);

    let x1,x2,x3,y1,y2,y3;
    let v1x, v1y, v2x, v2y, v1l, v2l, b1_x, b1_y, scale, nu_x, nu_y, pu_x, pu_y, dis;

    for (let i = 0; i < original_vertex_count; ++i) {
      x1 = (i !== 0) ? vertices[2 * i - 2] : NaN; // Previous vertex
      x2 = vertices[2 * i]; // Current vertex
      x3 = (i !== original_vertex_count - 1) ? vertices[2 * i + 2] : NaN; // Next vertex

      y1 = (i !== 0) ? vertices[2 * i - 1] : NaN; // Previous vertex
      y2 = vertices[2 * i + 1]; // Current vertex
      y3 = (i !== original_vertex_count - 1) ? vertices[2 * i + 3] : NaN; // Next vertex

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

        if (this.endcap_type === 1) {
          // rounded endcap
          let theta = Math.atan2(nu_y, nu_x) + Math.PI / 2;
          let steps_needed = Math.ceil(Math.PI / this.endcap_res);

          let o_x = x2 - th * nu_y, o_y = y2 + th * nu_x;

          for (let i = 1; i <= steps_needed; ++i) {
            let theta_c = theta + i / steps_needed * Math.PI;

            addVertex(x2 + th * Math.cos(theta_c), y2 + th * Math.sin(theta_c));
            addVertex(o_x, o_y);
          }
          continue;
        } else {
          // no endcap
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

        if (this.endcap_type === 1) {
          let theta = Math.atan2(pu_y, pu_x) + 3 * Math.PI / 2;
          let steps_needed = Math.ceil(Math.PI / this.endcap_res);

          let o_x = x2 - th * pu_y, o_y = y2 + th * pu_x;

          for (let i = 1; i <= steps_needed; ++i) {
            let theta_c = theta + i / steps_needed * Math.PI;

            addVertex(x2 + th * Math.cos(theta_c), y2 + th * Math.sin(theta_c));
            addVertex(o_x, o_y);
          }
          continue;
        } else {
          break;
        }
      }

      if (isNaN(x2) || isNaN(x2)) {
        duplicateVertex();
        need_to_dupe_vertex = true;

        continue;
      } else { // all vertices are defined, time to draw a joinerrrrr
        if (this.join_type === 2 || this.join_type === 3) {
          // find the two angle bisectors of the angle formed by v1 = p1 -> p2 and v2 = p2 -> p3

          v1x = x1 - x2;
          v1y = y1 - y2;
          v2x = x3 - x2;
          v2y = y3 - y2;

          v1l = Math.hypot(v1x, v1y);
          v2l = Math.hypot(v2x, v2y);

          b1_x = v2l * v1x + v1l * v2x, b1_y = v2l * v1y + v1l * v2y;
          scale = 1 / Math.hypot(b1_x, b1_y);

          if (scale === Infinity || scale === -Infinity) {
            b1_x = -v1y;
            b1_y = v1x;
            scale = 1 / Math.hypot(b1_x, b1_y);
          }

          b1_x *= scale;
          b1_y *= scale;

          scale = th * v1l / (b1_x * v1y - b1_y * v1x);

          if (this.join_type === 2 || (Math.abs(scale) < max_miter_length)) {
            // if the length of the miter is massive and we're in dynamic mode, we exit this if statement and do a rounded join
            if (scale === Infinity || scale === -Infinity)
              scale = 1;

            b1_x *= scale;
            b1_y *= scale;

            addVertex(x2 - b1_x, y2 - b1_y);
            addVertex(x2 + b1_x, y2 + b1_y);

            continue;
          }
        }

        nu_x = x3 - x2;
        nu_y = y3 - y2;
        dis = Math.hypot(nu_x, nu_y);

        if (dis === 0) {
          nu_x = 1;
          nu_y = 0;
        } else {
          nu_x /= dis;
          nu_y /= dis;
        }

        pu_x = x2 - x1;
        pu_y = y2 - y1;
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

        if (this.join_type === 1 || this.join_type === 3) {
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
        }

        addVertex(x2 + th * nu_y, y2 - th * nu_x);
        addVertex(x2 - th * nu_y, y2 + th * nu_x);
      }
    }

    if (gl_tri_strip_i * 2 < tri_strip_vertices.length) {
      let new_float_array = new Float32Array(Math.min(Math.max(MIN_SIZE, nextPowerOfTwo(gl_tri_strip_i)), MAX_SIZE));
      new_float_array.set(tri_strip_vertices.subarray(0, gl_tri_strip_i));

      tri_strip_vertices = this._gl_triangle_strip_vertices = new_float_array;
    }

    this._gl_triangle_strip_vertices_total = Math.ceil(gl_tri_strip_i / 2);
  }

  _calculateNativeLines() {
    let vertices = this.vertices;

    if (vertices.length <= 3) {
      this._gl_triangle_strip_vertices_total = 0;
      return;
    }

    let tri_strip_vertices = this._gl_triangle_strip_vertices;
    if (!tri_strip_vertices) {
      tri_strip_vertices = this._gl_triangle_strip_vertices = new Float32Array(MIN_SIZE);
    }

    if (tri_strip_vertices.length < vertices.length || tri_strip_vertices.length > vertices.length * 2) {
      tri_strip_vertices = this._gl_triangle_strip_vertices = new Float32Array(Math.min(Math.max(MIN_SIZE, nextPowerOfTwo(vertices.length)), MAX_SIZE))
    }

    if (Array.isArray(vertices)) {
      for (let i = 0; i < vertices.length; ++i) {
        tri_strip_vertices[i] = vertices[i];
      }
    } else {
      tri_strip_vertices.set(vertices);
    }

    this._gl_triangle_strip_vertices_total = Math.ceil(vertices.length / 2);
  }

  draw(recalculate = true) {
    if (this._last_native !== this.use_native)
      recalculate = true;

    if (!this.use_native && recalculate) {
      this._calculateTriangles(this.use_cpp);
    } else {
      // use native LINE_STRIP for xtreme speed

      this._calculateNativeLines();
    }

    this._last_native = this.use_native;

    let gl_info = this.gl_info;
    let gl = this.context.gl;

    let vertexCount = this._gl_triangle_strip_vertices_total;
    if ((this.use_native && vertexCount < 2) || (!this.use_native && vertexCount < 3)) return;

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

    gl.uniform2f(gl_info.xyScale,
      2 / this.context.width,
      -2 / this.context.height);

    // copy our vertex data to the GPU
    gl.bufferData(gl.ARRAY_BUFFER, this._gl_triangle_strip_vertices, gl.DYNAMIC_DRAW /* means we will rewrite the data often */);

    // enable the vertices location attribute to be used in the program
    gl.enableVertexAttribArray(gl_info.vertexLoc);

    // tell it that the width of vertices is 2 (since it's x,y), that it's floats,
    // that it shouldn't normalize floats, and something i don't understand
    gl.vertexAttribPointer(gl_info.vertexLoc, 2, gl.FLOAT, false, 0, 0);

    // draw the vertices as triangle strip
    gl.drawArrays(this.use_native ? gl.LINE_STRIP : gl.TRIANGLE_STRIP, 0, vertexCount);
  }
}

export {PolylinePrimitive};
