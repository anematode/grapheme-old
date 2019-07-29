import * as utils from "./utils";
import {ContextElement} from "./context_element";

const vertexShaderSource = `
// set the float precision of the shader to medium precision
precision mediump float;
// a vector containing the 2D position of the vertex
attribute vec2 v_position;

void main() {
  // set the vertex's resultant position
  gl_Position = vec4(v_position, 0, 1);
}`;

const fragmentShaderSource = `
// set the float precision of the shader to medium precision
precision mediump float;
// vec4 containing the color of the line to be drawn
uniform vec4 line_color;

void main() {
  gl_FragColor = line_color;
}
`;

class Gridlines extends ContextElement {
  constructor(context, params={}) {
    super(context, params);

    this.orientation = utils.select(params.orientation);

    // gridlines is a dictionary of coordinates (in coordinate space), whether it's
    // x axis or y axis, and the line thickness,
    // label text (if desired), lpos ('l','r')
    // the key is the line color
    // example gridline:
    // {dir: 'x', pos: 0.8, pen: 0.5, label: "0.8", lpos: 'l'', font: "15px Helvetica"}
    // example overall structure: "{r: 255, g: 100, b: 30, a: 0.5} : [], {...} : []"
    this.gridlines = {};

    // maximum number of gridlines that can be RENDERED
    this.max_render_gridlines = params.max_gridlines || 1000;
    // float 32 array of gridline vertices (as triangles)
    this.gridline_vertices = new Float32Array(this.max_render_gridlines * 12);
    // GL buffer containing our vertices (later)
    this.vertex_position_buf = this.context.gl.createBuffer();
  }

  _getGridlinesShaderProgram() {
    if (this.context._gridlinesShader)
      return this.context._gridlinesShader;

    let gl = this.context.gl;

    // create the vertex shader.
    let vertShad = utils.createShaderFromSource(gl /* rendering context */,
      gl.VERTEX_SHADER /* enum for vertex shader type */,
      vertexShaderSource /* source of the vertex shader*/ );

    // create the frag shader.
    let fragShad = utils.createShaderFromSource(gl /* rendering context */,
      gl.FRAGMENT_SHADER /* enum for vertex shader type */,
      fragmentShaderSource /* source of the vertex shader*/ );

    // create the program
    let program = this.context._gridlinesShader = utils.createGLProgram(gl, vertShad, fragShad);

    // get the location of the vec4 in the program to set the color
    this.context._gridlinesShaderColorLoc = gl.getUniformLocation(program, "line_color");

    // get the location of the vertex array in the program
    this.context._gridlinesShaderVertexLocation = gl.getAttribLocation(program, "v_position");

    return program;
  }

  _gridlinesShaderColorLoc() {
    return this.context._gridlinesShaderColorLoc;
  }

  _gridlinesShaderVertexLocation() {
    return this.context._gridlinesShaderVertexLocation;
  }

  drawLines() {
    let gl = this.context.gl;

    let gridlines = this.gridlines;

    let colors = Object.keys(this.gridlines);
    let vertices = this.gridline_vertices;

    let glProgram = this._getGridlinesShaderProgram();
    let colorLocation = this._gridlinesShaderColorLoc();
    let verticesLocation = this._gridlinesShaderVertexLocation();

    // tell webgl to start using the gridline program
    gl.useProgram(glProgram);

    // bind our webgl buffer to gl.ARRAY_BUFFER access point
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_position_buf);

    let m,y1,y2,x1,x2,delta;
    let width = this.context.width, height = this.context.height;

    // for each color...
    for (let color_i = 0; color_i < colors.length; ++color_i) {
      let color = colors[color_i];
      let gridl_subset = this.gridlines[colors[color_i]];
      let vertex_i = -1;

      // ... fill up the vertices float32array with triangles corresponding to those lines
      for (let i = 0; i < gridl_subset.length; ++i) {
        let gridline = gridl_subset[i];
        let thickness_d = gridline.pen * utils.dpr / 2;


        switch (gridline.dir) {
          case 'x':
            m = this.context.cartesianToGLX(gridline.pos);
            delta = this.context.pixelToGLVX(thickness_d);
            x1 = m - delta;
            x2 = m + delta;
            y1 = -1, y2 = 1; // set y1 and y2 to the bounds of clip space

            break;
          case 'y':
            m = this.context.cartesianToGLY(gridline.pos);
            delta = -this.context.pixelToGLVY(thickness_d);
            y1 = m - delta;
            y2 = m + delta;
            x1 = -1, x2 = 1;

            break;
        }

        // Make a rectangle for each line
        // Triangle 1
        vertices[++vertex_i] = x1;
        vertices[++vertex_i] = y1;
        vertices[++vertex_i] = x1;
        vertices[++vertex_i] = y2;
        vertices[++vertex_i] = x2;
        vertices[++vertex_i] = y2;

        // console.log(x1,y1,x1,y2,x2,y2)

        // Triangle 2
        vertices[++vertex_i] = x1;
        vertices[++vertex_i] = y1;
        vertices[++vertex_i] = x2;
        vertices[++vertex_i] = y1;
        vertices[++vertex_i] = x2;
        vertices[++vertex_i] = y2;
      }

      // set the vec4 at colorLocation to (r, g, b, a)
      gl.uniform4f(colorLocation,
        ((color >> 24) & 0xff) / 255, // bit masks to retrieve r, g, b and a
        ((color >> 16) & 0xff) / 255, // divided by 255 because webgl likes [0.0, 1.0]
        ((color >> 8) & 0xff) / 255,
        (color & 0xff) / 255);

      // copy our vertex data to the GPU
      gl.bufferData(gl.ARRAY_BUFFER, this.gridline_vertices, gl.DYNAMIC_DRAW /* means we will rewrite the data often */);

      // enable the vertices location attribute to be used in the program
      gl.enableVertexAttribArray(verticesLocation);

      // tell it that the width of vertices is 2 (since it's x,y), that it's floats,
      // that it shouldn't normalize floats, and something i don't understand
      gl.vertexAttribPointer(verticesLocation, 2, gl.FLOAT, false, 0, 0);

      // draw the vertices as triple-wise triangles
      gl.drawArrays(gl.TRIANGLES, 0, (vertex_i + 1) / 2);
    }
  }

  draw(info) {
    super.draw(info);
    this.drawLines();

    let ctx = this.context.text_canvas_ctx;

    let currentFont = "";
    let currentTextBaseline = "";
    let currentTextAlignment = "";
    let currentFontColor = "";

    ctx.font = "15px Helvetica";
    ctx.fillStyle = "#000000";

    let maxY = this.context.maxY();
    let maxX = this.context.maxX();
    let minY = this.context.minY();
    let minX = this.context.minX();

    let labelX, labelY;
    let colors = Object.keys(this.gridlines);

    for (let color_i = 0; color_i < colors.length; ++color_i) {
      let arr = this.gridlines[colors[color_i]];

      for (let i = 0; i < arr.length; ++i) {
        let gridline = arr[i];

        if (gridline.font && gridline.font != currentFont) {
          currentFont = ctx.font = gridline.font;
        }

        if (gridline.lcol && gridline.lcol != currentFontColor) {
          currentFontColor = ctx.fillStyle = gridline.lcol;
        }

        let textBaseline = gridline.bl || "bottom", textAlign = gridline.ta || "left";

        switch (gridline.dir) {
          case 'x':
            let canv_x_coord = this.context.cartesianToPixelX(gridline.pos);

            if (gridline.label) { // label the gridline
              let y_draw_pos; // y position of the label

              switch (gridline.lpos) { // label position
                case "top":
                  y_draw_pos = 0;
                  textBaseline = "top";
                  break;
                case "bottom":
                  y_draw_pos = this.context.css_height;
                  textBaseline = "bottom";
                  break;
                case "axis":
                  y_draw_pos = this.context.cartesianToPixelY(0);
                  break;
                case "dynamic":
                  if (0 > maxY) { // put label at the top of the canvas
                    y_draw_pos = 0;
                    textBaseline = "top";
                  } else if (0 < minY) { // put label at bottom of canvas
                    y_draw_pos = this.context.css_height;
                    textBaseline = "bottom";
                  } else {
                    y_draw_pos = this.context.cartesianToPixelY(0);
                  }
              }

              labelX = canv_x_coord, labelY = y_draw_pos;
            }
            break;
          case 'y':
            let canv_y_coord = this.context.cartesianToPixelY(gridline.pos);

            if (gridline.label !== undefined) {
              let x_draw_pos;

              switch (gridline.lpos) { // label position
                case "left":
                  x_draw_pos = 0;
                  textAlign = "left";
                  break;
                case "right":
                  x_draw_pos = this.context.css_width;
                  textAlign = "right";
                  break;
                case "axis":
                  x_draw_pos = this.context.cartesianToPixelX(0);
                  break;
                case "dynamic":
                  if (0 > maxX) { // put label at the right of the canvas
                    x_draw_pos = this.context.css_width;
                    textAlign = "right";
                  } else if (0 < minX) { // put label at left of canvas
                    x_draw_pos = 0;
                    textAlign = "left";
                  } else {
                    x_draw_pos = this.context.cartesianToPixelX(0);
                  }
              }

              labelX = x_draw_pos, labelY = canv_y_coord;

            break;
          }
        }

        if (gridline.label) {
          if (textBaseline != currentTextBaseline) {
            currentTextBaseline = ctx.textBaseline = textBaseline;
          }

          if (textAlign != currentTextAlignment) {
            currentTextAlignment = ctx.textAlign = textAlign;
          }

          ctx.fillText(gridline.label, labelX, labelY);
        }
      }
    }
  }
}

function getTextBaseline(anchor) {
  try {
    switch (anchor[0]) {
      case "S":
        return "top";
      case "N":
        return "bottom";
      default:
        return "middle";
    }
  } catch (e) {
    return "middle";
  }
}

function getTextAlign(anchor) {
  try {
    switch (anchor.substr(-1)) {
      case "E":
        return "left";
      case "W":
        return "right";
      default:
        return "center";
    }
  } catch (e) {
    return "center";
  }
}

const exponent_reference = {
  '-': String.fromCharCode(8315),
  '0': String.fromCharCode(8304),
  '1': String.fromCharCode(185),
  '2': String.fromCharCode(178),
  '3': String.fromCharCode(179),
  '4': String.fromCharCode(8308),
  '5': String.fromCharCode(8309),
  '6': String.fromCharCode(8310),
  '7': String.fromCharCode(8311),
  '8': String.fromCharCode(8312),
  '9': String.fromCharCode(8313)
};

function convert_char(c) {
  let potent = exponent_reference[c];
  return potent;
}

function exponentify(integer) {
  utils.assert(utils.isInteger(integer), "needs to be an integer");
  let stringi = integer + '';
  let out = '';


  for (let i = 0; i < stringi.length; ++i) {
    out += convert_char(stringi[i]);
  }

  return out;
}

// https://stackoverflow.com/a/20439411
function beautifyFloat(f, prec=12) {
  let strf = f.toFixed(prec);
  if (strf.includes('.')) {
    return strf.replace(/\.?0+$/g,'');
  } else {
    return strf;
  }
}

function compareViewports(vp1, vp2) {
  return (vp1.x === vp2.x) && (vp1.y === vp2.y) && (vp1.width === vp2.width) && (vp1.height === vp2.height);
}

let CDOT = String.fromCharCode(183);

const LABEL_FUNCTIONS = {
  default: x => {
    if (x === 0) return "0";
    else if (Math.abs(x) < 1e5 && Math.abs(x) > 1e-5) return beautifyFloat(x);
    else {
      // scientific notation

      let sigfigs = 5;
      let exponent = Math.floor(Math.log10(Math.abs(x)));
      let mantissa = x / (10 ** exponent);

      let prefix = (utils.isApproxEqual(mantissa,1) ? '' : (beautifyFloat(mantissa, 8) + CDOT));
      let exponent_suffix = "10" + exponentify(exponent);

      return prefix + exponent_suffix;
    }
  }
};

const DEFAULT_COLOR = {r: 0, g: 0, b: 0, a: 1};
const gridline_keys = ["color", "pen", "pos", "label", "bl", "ta", "tpos", "font", "lcol"];

class AutoGridlines extends Gridlines {
  constructor(context, params={}) {
    super(context, params);

    this.bold = utils.mergeDeep({
      thickness: 1.4, // Thickness of the axes lines
      color: 0x000000ff, // Color of the axes lines
      display: true, // Whether to display the axis lines
      label_function: "default",
      labels: {
        x: {
          display: true,
          font: "bold Helvetica",
          font_size: 14,
          color: "#000",
          align: "SW", // corner/side on which to align the x label,
                       // note that anything besides N,S,W,E,NW,NE,SW,SE is centered
          location: "dynamic" // can be axis, top, bottom, or dynamic (switches between)
        },
        y: {
          display: true,
          font: "bold Helvetica",
          font_size: 14,
          color: "#000",
          align: "SW", // corner/side on which to align the y label
          location: "dynamic" // can be axis, left, right, or dynamic (switches between)
        }
      }
    }, params.bold);
    this.normal = utils.mergeDeep({
      thickness: 0.8, // Thickness of the normal lines
      color: 0x000000ff, // Color of the normal lines
      ideal_dist: 140, // ideal distance between lines in pixels
      display: true, // whether to display the lines
      label_function: "default",
      labels: {
        x: {
          display: true,
          font: "Helvetica",
          font_size: 12,
          color: "#000",
          align: "SE", // corner/side on which to align the x label,
                       // note that anything besides N,S,W,E,NW,NE,SW,SE is centered
          location: "dynamic" // can be axis, top, bottom, or dynamic (switches between)
        },
        y: {
          display: true,
          font: "Helvetica",
          font_size: 12,
          color: "#000",
          align: "W", // corner/side on which to align the y label
          location: "dynamic"
        }
      }
    }, params.normal);
    this.thin = utils.mergeDeep({
      thickness: 0.5, // Thickness of the finer demarcations
      color: 0x777777ff, // Color of the finer demarcations
      ideal_dist: 50, // ideal distance between lines in pixels
      display: true, // whether to display them
      label_function: "default",
      labels: {
        x: {
          display: false,
          font: "Helvetica",
          font_size: 8,
          color: "#000",
          align: "S", // corner/side on which to align the x label,
                       // note that anything besides N,S,W,E,NW,NE,SW,SE is centered
          location: "dynamic" // can be axis, top, bottom, or dynamic (switches between)
        },
        y: {
          display: true,
          font: "Helvetica",
          font_size: 8,
          color: "#000",
          align: "W", // corner/side on which to align the y label
          location: "dynamic"
        }
      }
    }, params.thin);

    // Types of finer demarcation subdivisions: default is subdivide into 2, into 5, and into 10
    this.thin_spacing_types = utils.select(params.thin_spacing_types, [4, 5, 10]);
    // Maximum number of displayed grid lines
    this.gridline_limit = utils.select(params.gridline_limit, 500);
    // force equal thin subdivisions in x and y directions
    this.force_equal_thin_div = true;
  }

  get thin_spacing_types() {
    return this._thin_spacing_types;
  }

  set thin_spacing_types(val) {
    utils.assert(val.every(utils.isPositiveInteger), "thin_spacing_types need to be positive integers");
    utils.assert(val[0], "thin_spacing_types needs at least one subdivision");

    this._thin_spacing_types = [...val];
  }

  updateAutoGridlines() {
    if (!this.old_vp || !compareViewports(this.old_vp, this.context.viewport)) {
      // only execute if the viewport has changed

      this.old_vp = {...this.context.viewport};
      this.gridlines = {};

      let that = this; // bruh
      let gridline_count = 0;

      function addGridline(gridline) {
        if (++gridline_count > that.gridline_limit)
          return ("Too many gridlines");
        let color = gridline.color || DEFAULT_COLOR;
        if (that.gridlines[color]) {
          that.gridlines[color].push(gridline);
        } else {
          that.gridlines[color] = [gridline];
        }
      }

      let ideal_xy = this.context.pixelToCartesianV(this.normal.ideal_dist, this.normal.ideal_dist);

      // unpack the values
      let ideal_x_normal_spacing = Math.abs(ideal_xy.x);
      // Math.abs shouldn't ever do anything, but it would be catastrophic
      // if this was somehow negative due to some dumb error of mine
      // (This might happen if the ideal inter-thin distance is negative)
      let ideal_y_normal_spacing = Math.abs(ideal_xy.y);

      let true_xn_spacing = 10 ** Math.round(Math.log10(ideal_x_normal_spacing));
      let true_yn_spacing = 10 ** Math.round(Math.log10(ideal_y_normal_spacing));

      let ideal_x_thin_spacing_denom = this.context.cartesianToPixelVX(true_xn_spacing) / this.thin.ideal_dist;
      let ideal_y_thin_spacing_denom = -this.context.cartesianToPixelVY(true_yn_spacing) / this.thin.ideal_dist;

      // alias for brevity
      let tspt = this.thin_spacing_types;

      // temp values
      let x_denom = tspt[0];
      let y_denom = tspt[0];

      // go through all potential thin spacing types
      for (let i = 0; i < tspt.length; ++i) {
        let possible_denom = tspt[i];

        // if this is more ideal of an x subdivision, use that!
        if (Math.abs(possible_denom - ideal_x_thin_spacing_denom) <
          Math.abs(x_denom - ideal_x_thin_spacing_denom)) {
          x_denom = possible_denom;
        }

        if (Math.abs(possible_denom - ideal_y_thin_spacing_denom) <
          Math.abs(y_denom - ideal_y_thin_spacing_denom)) {
          y_denom = possible_denom;
        }
      }

      if (this.force_equal_thin_div) {
        // if we force the subdivisions to be equal, we defer to the one that fits better
        if (Math.abs(y_denom - ideal_y_thin_spacing_denom) < Math.abs(x_denom - ideal_x_thin_spacing_denom)) {
          // y is better
          x_denom = y_denom;
        } else {
          // x is better (or they are the same since the inequality is strict)
          y_denom = x_denom;
        }
      }

      let true_xt_spacing = true_xn_spacing / x_denom;
      let true_yt_spacing = true_yn_spacing / y_denom;

      // precomputed for brevity
      let minx = this.context.minX();
      let miny = this.context.minY();
      let maxx = this.context.maxX();
      let maxy = this.context.maxY();

      if (this.thin.display) {
        // Thin lines
        let thinx_start = Math.ceil(minx / true_xt_spacing);
        let thinx_end = Math.floor(maxx / true_xt_spacing);
        let thiny_start = Math.floor(miny / true_yt_spacing);
        let thiny_end = Math.ceil(maxy / true_yt_spacing);

        // x
        for (let i = 0, start = thinx_start, end = thinx_end, dir = 'x', denom = x_denom, spacing = true_xt_spacing; ++i < 3; start = thiny_start, end = thiny_end, dir = 'y', denom = y_denom, spacing = true_yt_spacing) {
          utils.assert(start <= end, "wtf happened");

          for (let i = start; i <= end; ++i) {
            // we only skip x values corresponding to normal lines if normal lines are being displayed
            if ((i % denom === 0) && this.normal.display) continue;
            let gridline = {color: this.thin.color, pen: this.thin.thickness, dir, pos: i * spacing};
            let label = this.thin.labels[dir];
            if (label.display) {
              Object.assign(gridline, {
                label: LABEL_FUNCTIONS[this.thin.label_function](i * spacing),
                bl: getTextBaseline(label.align), // baseline
                ta: getTextAlign(label.align), // textalign
                lpos: label.location,
                font: `${label.font_size}px ${label.font}`,
                lcol: label.color
              });
            }
            addGridline(gridline);
          }
        }
      }

      if (this.normal.display) {
        // Normal lines
        let normalx_start = Math.ceil(minx / true_xn_spacing);
        let normalx_end = Math.floor(maxx / true_xn_spacing);
        let normaly_start = Math.floor(miny / true_yn_spacing);
        let normaly_end = Math.ceil(maxy / true_yn_spacing);

        for (let j = 0, start = normalx_start, end = normalx_end, dir = 'x', spacing = true_xn_spacing;
          ++j < 3;
          start = normaly_start, end = normaly_end, dir = 'y', spacing = true_yn_spacing) {
          for (let i = start; i <= end; ++i) {
            if (!i && this.bold.display) continue;
            let gridline = {color: this.normal.color, pen: this.normal.thickness, dir, pos: i * spacing};
            let label = this.normal.labels[dir];
            if (label.display) {
              Object.assign(gridline, {
                label: LABEL_FUNCTIONS[this.normal.label_function](i * spacing),
                bl: getTextBaseline(label.align), // baseline
                ta: getTextAlign(label.align), // textalign
                lpos: label.location,
                font: `${label.font_size}px ${label.font}`,
                lcol: label.color
              });
            }
            addGridline(gridline);
          }
        }
      }

      // Axis lines (if applicable)
      // x

      if (this.context.cartesianXInView(0)) {

        let gridline = {color: this.bold.color,
          pen: this.bold.thickness,
          dir: 'x',
          pos: 0};
        if (this.bold.labels.x.display) {
          let labelx = this.bold.labels.x;
          Object.assign(gridline, {
            label: LABEL_FUNCTIONS[this.bold.label_function](0),
            bl: getTextBaseline(labelx.align), // baseline
            ta: getTextAlign(labelx.align), // textalign
            lpos: labelx.location,
            font: `${labelx.font_size}px ${labelx.font}`,
            lcol: labelx.color
          });
        }
        addGridline(gridline);
      }

      // y
      if (this.context.cartesianYInView(0)) {
        let gridline = {color: this.bold.color,
          pen: this.bold.thickness,
          dir: 'y',
          pos: 0};
        if (this.bold.labels.y.display) {
          let labely = this.bold.labels.y;
          Object.assign(gridline, {
            label: LABEL_FUNCTIONS[this.bold.label_function](0),
            bl: getTextBaseline(labely.align), // baseline
            ta: getTextAlign(labely.align), // textalign
            lpos: labely.location,
            font: `${labely.font_size}px ${labely.font}`,
            lcol: labely.color
          });
        }
        addGridline(gridline);
      }
    }
  }

  draw(info) {
    this.updateAutoGridlines();
    super.draw(info);
  }
}


export {Gridlines, AutoGridlines, getTextBaseline, getTextAlign, exponentify, convert_char, exponent_reference};
