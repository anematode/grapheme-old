import * as utils from "./utils";
import {ContextElement} from "./context_element";

// this vertex shader is used for the gridlines
const vertexShaderSource = `// set the float precision of the shader to medium precision
precision mediump float;
// a vector containing the 2D position of the vertex
attribute vec2 v_position;

void main() {
  // set the vertex's resultant position
  gl_Position = vec4(v_position, 0, 1);
}`;

// this frag shader is used for the gridlines
const fragmentShaderSource = `// set the float precision of the shader to medium precision
precision mediump float;
// vec4 containing the color of the line to be drawn
uniform vec4 line_color;

void main() {
  gl_FragColor = line_color;
}
`;

/*
This is a general gridlines class that can be used to draw a series of gridlines
in the x and y directions, which take up the whole screen. These gridlines can
be labeled on the sides of the screen, on the axis only, or in dynamic mode,
where the labeling position is chosen based on whether the axis is visible and
the relative position of the axis on the screen.

This class is designed to have derived classes which implement the actual
positioning of the gridlines; this class does not do that and can only *draw*
the gridlines it's told to draw. If you want a pre-built gridlines creator, use
Grapheme.AutoGridlines, which has its own separate set of parameters.

PROPERTIES
----------
gridlines: This is an object of key-value pairs (as a Pythonista I'd call it a
dictionary) which contains the list of gridlines to render. It is not modified
by this class. The keys are the colors of the lines, stored in the format
#rrggbbaa; in other words, a 32-bit hexadecimal number containing red, green,
blue, and opacity values from 0 to 255 (sorry Pro Display XDR users). The values
are arrays of "gridlines", which have the following properties:

  color: color of the label; pen: thickness of the label in pixels; dir:
  direction of the gridline, in the sense of which axis it demarcates; pos:
  the position of the gridline along that Cartesian axis; label: the text of the
  label on that gridlines; bl: the baseline of the text to be drawn; ta: the
  text alignment of the text to be drawn; lpos: the position of the label
  relative to the axis, either "left", "right" (for y) or "top", "bottom" (for
  x) and always "axis" and "dynamic"; font: the font of the label; lcol: the
  color of the label, as a string; pad: padding in pixels in the direction of
  alignment.

max_render_gridlines: if you try to render more than this many gridlines, it
will just return early. The default is 1000, which should be plenty, unless your
display is the size of a wall. DO NOT CHANGE THIS AFTER INITIALIZATION.

gridline_vertices: You should never have to touch this; this is a Float32Array
which contains the actual vertices of the triangles (that's right, triangles)
comprising the actual gridlines drawn by WebGL.

vertex_position_buf: You should never have to touch this; this is a WebGL buffer
object which contains the gridlines drawn by WebGL.

label_eclipse_width: parameter allowing you to change the width of the stroke
around the label text which stops it from intersecting with the gridlines.

label_eclipse_style: width of the aforementioned stroke

METHODS
----------
constructor(context, params={}): as any ContextElement, takes in a
Grapheme.Context and a list of parameters. The only parameters used by this class
is max_render_gridlines, label_eclipse_width, and label_eclipse_style.

_getGridlinesShaderProgram(void): an internal function used to compile the
program on a per-Grapheme.Context basis, since it would be wasteful to compile
one WebGL program for each set of gridlines... but why would you do have two
set of gridlines on a single Context anyway??

_gridlinesShaderColorLoc(void): used internally to get the color attribute

_gridlinesShaderVertexLoc(void): used internally to get the vertex location

drawLines(void): draw the gridlines in the WebGL canvas

draw(void): draw everything: text boxes and the gridlines
*/
class Gridlines extends ContextElement {
  constructor(context, params={}) {
    super(context, params);

    this.gridlines = {};

    this.max_render_gridlines = params.max_gridlines || 1000;

    this.gridline_vertices = new Float32Array(this.max_render_gridlines * 12);

    this.vertex_position_buf = this.context.gl.createBuffer();

    // the width of the thin border around the text
    this.label_eclipse_width = utils.select(params.label_eclipse_width, 4);
    // the style of the thin border around the text
    this.label_eclipse_style = utils.select(params.label_eclipse_style, "white");
  }

  _getGridlinesShaderProgram() {
    // if we already have a gridlines shader for this context, use it!
    if (this.context._gridlinesShader)
      return this.context._gridlinesShader;

    let gl = this.context.gl;

    // create the vertex shader
    let vertShad = utils.createShaderFromSource(gl /* rendering context */,
      gl.VERTEX_SHADER /* enum for vertex shader type */,
      vertexShaderSource /* source of the vertex shader*/ );

    // create the frag shader
    let fragShad = utils.createShaderFromSource(gl /* rendering context */,
      gl.FRAGMENT_SHADER /* enum for vertex shader type */,
      fragmentShaderSource /* source of the vertex shader*/ );

    // create the program. we set _gridlinesShader in the parent Context so that
    // any future gridlines in this Context will use the already-compiled shader
    let program = this.context._gridlinesShader = utils.createGLProgram(gl, vertShad, fragShad);

    // get the location of the vec4 in the program to set the color
    this.context._gridlinesShaderColorLoc = gl.getUniformLocation(program, "line_color");

    // get the location of the vertex array in the program
    this.context._gridlinesShaderVertexLoc = gl.getAttribLocation(program, "v_position");

    return program;
  }

  _gridlinesShaderColorLoc() {
    return this.context._gridlinesShaderColorLoc;
  }

  _gridlinesShaderVertexLoc() {
    return this.context._gridlinesShaderVertexLoc;
  }

  drawLines() {
    let gl = this.context.gl; // alias for our WebGL context

    let gridlines = this.gridlines;

    let colors = Object.keys(gridlines); // list of colors
    let vertices = this.gridline_vertices;

    let glProgram = this._getGridlinesShaderProgram();
    let colorLocation = this._gridlinesShaderColorLoc();
    let verticesLocation = this._gridlinesShaderVertexLoc();

    // tell webgl to start using the gridline program
    gl.useProgram(glProgram);

    // bind our webgl buffer to gl.ARRAY_BUFFER access point
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_position_buf);

    let m,y1,y2,x1,x2,delta; // calculation variables
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

    // draw the WebGL lines (note that this takes the shortest time out of everything)
    this.drawLines();

    // alias for the text canvas context
    let ctx = this.context.text_canvas_ctx;

    // used to prevent repeated value sets to ctx.whatever, which can be laggy
    let currentFont = "";
    let currentTextBaseline = "";
    let currentTextAlignment = "";
    let currentFontColor = "";

    ctx.strokeStyle = this.label_eclipse_style;
    ctx.lineWidth = this.label_eclipse_width;

    // for brevity
    let maxY = this.context.maxY();
    let maxX = this.context.maxX();
    let minY = this.context.minY();
    let minX = this.context.minX();

    let labelX, labelY;
    let colors = Object.keys(this.gridlines); // list of colors

    // for all colors...
    for (let color_i = 0; color_i < colors.length; ++color_i) {
      let arr = this.gridlines[colors[color_i]];

      // for all gridlines...
      for (let i = 0; i < arr.length; ++i) {
        let gridline = arr[i];

        if (gridline.font && gridline.font != currentFont) { // update font
          currentFont = ctx.font = gridline.font;
        }

        // update font color
        if (gridline.lcol && gridline.lcol != currentFontColor) {
          currentFontColor = ctx.fillStyle = gridline.lcol;
        }

        // set values for textBaseline and textAlign
        let textBaseline = gridline.bl || "bottom", textAlign = gridline.ta || "left";

        switch (gridline.dir) {
          case 'x':
            let canv_x_coord = this.context.cartesianToPixelX(gridline.pos);

            if (gridline.label) { // label the gridline
              let y_draw_pos; // y position of the label

              switch (gridline.lpos) { // label position
                case "top":
                  y_draw_pos = 0, textBaseline = "top";
                  break;
                case "bottom":
                  y_draw_pos = this.context.css_height, textBaseline = "bottom";
                  break;
                case "axis":
                  y_draw_pos = this.context.cartesianToPixelY(0);
                  break;
                case "dynamic":
                  if (0 > maxY) { // put label at the top of the canvas
                    y_draw_pos = 0, textBaseline = "top";
                  } else if (0 < minY) { // put label at bottom of canvas
                    y_draw_pos = this.context.css_height, textBaseline = "bottom";
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
                  x_draw_pos = 0, textAlign = "left";
                  break;
                case "right":
                  x_draw_pos = this.context.css_width, textAlign = "right";
                  break;
                case "axis":
                  x_draw_pos = this.context.cartesianToPixelX(0);
                  break;
                case "dynamic":
                  if (0 > maxX) { // put label at the right of the canvas
                    x_draw_pos = this.context.css_width, textAlign = "right";
                  } else if (0 < minX) { // put label at left of canvas
                    x_draw_pos = 0, textAlign = "left";
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

          // pixel padding
          let padX = 0, padY = 0;
          switch (textBaseline) {
            case "bottom":
              padY = -gridline.pad;
              break;
            case "top":
              padY = gridline.pad;
          }

          switch (textAlign) {
            case "left":
              padX = gridline.pad;
              break;
            case "right":
              padX = -gridline.pad;
          }

          if (this.label_eclipse_width) {
            ctx.strokeText(gridline.label, labelX + padX, labelY + padY);
          }

          ctx.fillText(gridline.label, labelX + padX, labelY + padY);
        }
      }
    }
  }
}

/* Function to get the baseline of an anchor string, e.g. "NW".
I was inspired by Asymptote on this one, sorry Brandon. */
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

/* Same as above, but for getting the text alignment. */
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

/* Unicode characters for exponent signs, LOL */
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

/* Convert a digit into its exponent form */
function convert_char(c) {
  return exponent_reference[c];
}

/* Convert an integer into its exponent form (of Unicode characters) */
function exponentify(integer) {
  utils.assert(utils.isInteger(integer), "needs to be an integer");

  let stringi = integer + '';
  let out = '';

  for (let i = 0; i < stringi.length; ++i) {
    out += convert_char(stringi[i]);
  }

  return out;
}

// Credit: https://stackoverflow.com/a/20439411
/* Turns a float into a pretty float by removing dumb floating point things */
function beautifyFloat(f, prec=12) {
  let strf = f.toFixed(prec);
  if (strf.includes('.')) {
    return strf.replace(/\.?0+$/g,'');
  } else {
    return strf;
  }
}

// Helper function: used internally to quickly check if the viewport has changed
function compareViewports(vp1, vp2) {
  return (vp1.x === vp2.x) && (vp1.y === vp2.y) && (vp1.width === vp2.width) && (vp1.height === vp2.height);
}

// Helper function: Find the nearest value to val in the array arr
function findNearestValueIndex(arr, val) {
  let closest = arr[0];

  for (let i = 1; i < arr.length; ++i) {
    if (Math.abs(arr[i] - val) < Math.abs(closest - val)) {
      return i;
    }
  }

  return 0;
}

// Multiplication character
const CDOT = String.fromCharCode(183);

// List of functions to determine how the gridlines are labeled with
// AutoGridlines. TODO: add more of 'em!
const LABEL_FUNCTIONS = {
  default: x => {
    if (x === 0) return "0"; // special case
    else if (Math.abs(x) < 1e5 && Math.abs(x) > 1e-5)
      // non-extreme floats displayed normally
      return beautifyFloat(x);
    else {
      // scientific notation for the very fat and very small!

      let exponent = Math.floor(Math.log10(Math.abs(x)));
      let mantissa = x / (10 ** exponent);

      let prefix = (utils.isApproxEqual(mantissa,1) ? '' :
        (beautifyFloat(mantissa, 8) + CDOT));
      let exponent_suffix = "10" + exponentify(exponent);

      return prefix + exponent_suffix;
    }
  }
};

/* The flagship product of Grapheme as of July 29, 2019. This derived class of
Gridlines provides an easy way to calculate the gridlines of a view.

There are three types of gridlines: bold (used for the axes), normal (used for
the major divisions of the coordinate space), and thin (used for finer demarca-
tions). Each of them can be customized with the following parameters:

thickness: the thickness in pixels of the drawn lines
color: color of the drawn lines in 0xrrggbbaa format (see Gridlines if confused)
display: boolean of whether to display these gridlines. Note that the next
subdivision of gridlines will fill in the gap (except there is no next subdiv.
for thin gridlines).
label_function: LABEL_FUNCTIONS[label_function] is given the coordinate of the
gridline and returns a string representation of what it should be labeled.
labels: Object containing "x" and "y", for customization of each label.
  "x" and "y" each have:
  display: whether to display this label
  font: the font used by the label
  color: the color of the label
  align: the direction (N, NE, NW, E, W, SW, SE, S, C) in which the label is
  aligned to (so that its opposite corner is at its nominal locatio)
  padding: the number of pixels it is additionally displaced from its nominal
  location: "axis", "dynamic", etc. (see Gridlines for an explanation)

Subdivision is done automatically and is customizable with the remaining parameters.

PROPERTIES
----------
bold: styling of the bold gridlines, as explained above.
normal: styling of the normal gridlines, as explained above.
  normal.ideal_dist: the ideal distance in pixels between normal lines; used
  when trying to subdivide it in the best way possible
thin: styling of the thin gridlines, as explained above.
  thin.ideal_dist: the ideal distance in pixels between thin lines; used when
  trying to subdivide it in the best way possible
subdivisions: the possible subdivisions types, expressed as an array of objects
{normal: x, thin: [a,b,c]}. This means that x * 10^n is a potential normal line
subdivision, and that the subdivision x/a * 10^n is a potential thin line
subdivision. THe actual subdivision chosen depends on the viewport, the screen
size, and normal.ideal_dist/thin.ideal_dist.
gridline_limit: The maximum number of gridlines it will calculate before it just
stops.
force_equal_thin_div: force the division count of thin lines to be equal along
the x and y directions.

METHODS
----------
updateAutoGridlines(void): update the list of internal gridlines to draw stuff

draw(info): draw the gridlines by checking whether the gridlines need to be
updated, then updating if necessary and then calling the Gridlines draw routine.
*/
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
          font: "12px Helvetica",
          color: "#000",
          align: "SW", // corner/side on which to align the x label,
                       // note that anything besides N,S,W,E,NW,NE,SW,SE is centered
          padding: 4, // how much padding in that alignment direction
          location: "dynamic" // can be axis, top, bottom, or dynamic (switches between)
        },
        y: {
          display: true,
          font: "12px Helvetica",
          color: "#000",
          align: "SW", // corner/side on which to align the y label
          padding: 4, // how much padding in that alignment direction
          location: "dynamic" // can be axis, left, right, or dynamic (switches between)
        }
      }
    }, params.bold);
    this.normal = utils.mergeDeep({
      thickness: 0.8, // Thickness of the normal lines
      color: 0x000000aa, // Color of the normal lines
      ideal_dist: 140, // ideal distance between lines in pixels
      display: true, // whether to display the lines
      label_function: "default",
      labels: {
        x: {
          display: true,
          font: "12px Helvetica",
          color: "#000",
          align: "S", // corner/side on which to align the x label,
                       // note that anything besides N,S,W,E,NW,NE,SW,SE is centered
          padding: 4,
          location: "dynamic" // can be axis, top, bottom, or dynamic (switches between)
        },
        y: {
          display: true,
          font: "12px Helvetica",
          color: "#000",
          align: "W", // corner/side on which to align the y label
          padding: 4,
          location: "dynamic"
        }
      }
    }, params.normal);
    this.thin = utils.mergeDeep({
      thickness: 0.5, // Thickness of the finer demarcations
      color: 0x00000088, // Color of the finer demarcations
      ideal_dist: 50, // ideal distance between lines in pixels
      display: true, // whether to display them
      label_function: "default",
      labels: {
        x: {
          display: false,
          font: "8px Helvetica",
          color: "#000",
          align: "S", // corner/side on which to align the x label,
                       // note that anything besides N,S,W,E,NW,NE,SW,SE is centered
          padding: 4,
          location: "dynamic" // can be axis, top, bottom, or dynamic (switches between)
        },
        y: {
          display: false,
          font: "8px Helvetica",
          color: "#000",
          align: "W", // corner/side on which to align the y label
          padding: 4,
          location: "dynamic"
        }
      }
    }, params.thin);

    // Types of finer demarcation subdivisions: default is subdivide into 2, into 5, and into 10
    this.subdivisions = utils.select(params.subdivisions, [
      {normal: 2, thin: [4]},
      {normal: 5, thin: [5, 10]},
      {normal: 1, thin: [5]}
    ]);

    // Maximum number of displayed grid lines
    this.gridline_limit = utils.select(params.gridline_limit, 500);
    // force equal thin subdivisions in x and y directions
    this.force_equal_thin_div = true;
  }

  updateAutoGridlines() {
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

      let ixns_log10 = Math.log10(ideal_x_normal_spacing);
      let iyns_log10 = Math.log10(ideal_y_normal_spacing);

      let possible_coeffs = this.subdivisions.map(x => x.normal);

      let ixns_base = 10 ** Math.floor(ixns_log10);
      let ixns_coeff_i = findNearestValueIndex(possible_coeffs, ideal_x_normal_spacing / ixns_base);

      let iyns_base = 10 ** Math.floor(iyns_log10);
      let iyns_coeff_i = findNearestValueIndex(possible_coeffs, ideal_y_normal_spacing / ixns_base);

      let true_xn_spacing = possible_coeffs[ixns_coeff_i] * ixns_base;
      let true_yn_spacing = possible_coeffs[iyns_coeff_i] * iyns_base;

      let ideal_x_thin_spacing_denom = this.context.cartesianToPixelVX(true_xn_spacing) / this.thin.ideal_dist;
      let ideal_y_thin_spacing_denom = -this.context.cartesianToPixelVY(true_yn_spacing) / this.thin.ideal_dist;

      // alias for brevity
      let tspt_x = this.subdivisions[ixns_coeff_i].thin;
      let tspt_y = this.subdivisions[iyns_coeff_i].thin;

      // temp values
      let x_denom = tspt_x[0];
      let y_denom = tspt_y[0];

      // go through all potential thin spacing types for x
      for (let i = 0; i < tspt_x.length; ++i) {
        let possible_denom = tspt_x[i];

        // if this is more ideal of an x subdivision, use that!
        if (Math.abs(possible_denom - ideal_x_thin_spacing_denom) <
          Math.abs(x_denom - ideal_x_thin_spacing_denom)) {
          x_denom = possible_denom;
        }
      }

      for (let i = 0; i < tspt_y.length; ++i) {
        let possible_denom = tspt_y[i];

        // if this is more ideal of an y subdivision, use that!
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

        // both x and y
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
                font: label.font,
                lcol: label.color,
                pad: label.padding
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

        // both x and y
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
                font: label.font,
                lcol: label.color,
                pad: label.padding
              });
            }
            addGridline(gridline);
          }
        }
      }

      // Axis lines (a.k.a. bold lines) (if applicable)

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
            font: labelx.font,
            lcol: labelx.color,
            pad: labelx.padding
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
            font: labely.font,
            lcol: labely.color,
            pad: labely.padding
          });
        }

        addGridline(gridline);
      }
  }

  draw(info) {
    if (!this.old_vp || !compareViewports(this.old_vp, this.context.viewport)) {
      // only execute if the viewport has changed

      this.old_vp = {...this.context.viewport};
      this.updateAutoGridlines();
    }

    super.draw(info);
  }
}


export {Gridlines, AutoGridlines, getTextBaseline, getTextAlign, exponentify, convert_char, exponent_reference};
