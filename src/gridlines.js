import * as utils from "./utils";
import {ContextElement} from "./context_element";

class Gridlines extends ContextElement {
  constructor(context, params={}) {
    super(context, params);

    this.orientation = utils.select(params.orientation);

    // gridlines is an array of coordinates (in coordinate space), whether it's
    // x axis or y axis, and the line thickness and color (default is #000000),
    // label text (if desired), lpos ('l','r')
    this.gridlines = [];

    // example gridline: {dir: 'x', pos: 0.8, pen: 0.5, color: "#000000", label: "0.8", lpos: 'l'', font: "15px Helvetica"}
  }

  draw(canvas, ctx, info) {
    super.draw(canvas, ctx, info);
    let canvas_ctx = ctx;

    let currentThickness = 0;
    let currentColor = "";
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

    for (let i = 0; i < this.gridlines.length; ++i) {
      let gridline = this.gridlines[i];

      if (gridline.pen != currentThickness) {
        currentThickness = ctx.lineWidth = gridline.pen;
      }

      if (gridline.color != currentColor) {
        currentColor = ctx.strokeStyle = gridline.color;
      }

      if (gridline.font && gridline.font != currentFont) {
        currentFont = ctx.font = gridline.font;
      }

      if (gridline.lcol && gridline.lcol != currentFontColor) {
        currentFontColor = ctx.fillStyle = gridline.lcol;
      }

      let textBaseline = gridline.bl || "bottom", textAlign = gridline.ta || "left";

      canvas_ctx.beginPath();

      switch (gridline.dir) {
        case 'x':
          let canv_x_coord = utils.roundToCanvasCoord(
            this.context.cartesianToCanvasX(gridline.pos)
          );

          // draw the actual grid line
          canvas_ctx.moveTo(canv_x_coord, 0);
          canvas_ctx.lineTo(canv_x_coord, this.context.height);
          canvas_ctx.stroke();

          if (gridline.label) { // label the gridline
            let y_draw_pos; // y position of the label

            switch (gridline.lpos) { // label position
              case "top":
                y_draw_pos = 0;
                textBaseline = "top";
                break;
              case "bottom":
                y_draw_pos = canvas.height;
                textBaseline = "bottom";
                break;
              case "axis":
                y_draw_pos = this.context.cartesianToCanvasY(0);
                break;
              case "dynamic":
                if (0 > maxY) { // put label at the top of the canvas
                  y_draw_pos = 0;
                  textBaseline = "top";
                } else if (0 < minY) { // put label at bottom of canvas
                  y_draw_pos = canvas.height;
                  textBaseline = "bottom";
                } else {
                  y_draw_pos = this.context.cartesianToCanvasY(0);
                }
            }

            labelX = canv_x_coord, labelY = y_draw_pos;
          }
          break;
        case 'y':
          let canv_y_coord = utils.roundToCanvasCoord(
            this.context.cartesianToCanvasY(gridline.pos)
          );

          canvas_ctx.moveTo(0, canv_y_coord);
          canvas_ctx.lineTo(this.context.width, canv_y_coord);
          canvas_ctx.stroke();

          if (gridline.label !== undefined) {
            let x_draw_pos;

            switch (gridline.lpos) { // label position
              case "left":
                x_draw_pos = 0;
                textAlign = "left";
                break;
              case "right":
                x_draw_pos = canvas.height;
                textAlign = "right";
                break;
              case "axis":
                x_draw_pos = this.context.cartesianToCanvasX(0);
                break;
              case "dynamic":
                if (0 > maxX) { // put label at the right of the canvas
                  x_draw_pos = canvas.width;
                  textAlign = "right";
                } else if (0 < minX) { // put label at left of canvas
                  x_draw_pos = 0;
                  textAlign = "left";
                } else {
                  x_draw_pos = this.context.cartesianToCanvasX(0);
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
function beautifyFloat(f, prec=15) {
  let strf = f.toFixed(prec);
  if (strf.includes('.')) {
    return strf.replace(/\.?0+$/g,'');
  } else {
    return strf;
  }
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

const gridline_keys = ["color", "pen", "pos", "label", "bl", "ta", "tpos", "font", "lcol"];

class AutoGridlines extends Gridlines {
  constructor(context, params={}) {
    super(context, params);

    this.bold = utils.mergeDeep({
      thickness: 1.3, // Thickness of the axes lines
      color: "#000000", // Color of the axes lines
      display: true, // Whether to display the axis lines
      label_function: "default",
      labels: {
        x: {
          display: true,
          font: "bold 15px Helvetica",
          color: "#000000",
          align: "SW", // corner/side on which to align the x label,
                       // note that anything besides N,S,W,E,NW,NE,SW,SE is centered
          location: "dynamic" // can be axis, top, bottom, or dynamic (switches between)
        },
        y: {
          display: true,
          font: "bold 15px Helvetica",
          color: "#000000",
          align: "SW", // corner/side on which to align the y label
          location: "dynamic" // can be axis, left, right, or dynamic (switches between)
        }
      }
    }, params.bold);
    this.normal = utils.mergeDeep({
      thickness: 0.5, // Thickness of the normal lines
      color: "#222222", // Color of the normal lines
      ideal_dist: 140, // ideal distance between lines in pixels
      display: true, // whether to display the lines
      label_function: "default",
      labels: {
        x: {
          display: true,
          font: "14px Helvetica",
          color: "#000000",
          align: "SE", // corner/side on which to align the x label,
                       // note that anything besides N,S,W,E,NW,NE,SW,SE is centered
          location: "dynamic" // can be axis, top, bottom, or dynamic (switches between)
        },
        y: {
          display: true,
          font: "14px Helvetica",
          color: "#000000",
          align: "W", // corner/side on which to align the y label
          location: "dynamic"
        }
      }
    }, params.normal);
    this.thin = utils.mergeDeep({
      thickness: 0.2, // Thickness of the finer demarcations
      color: "#444444", // Color of the finer demarcations
      ideal_dist: 50, // ideal distance between lines in pixels
      display: true, // whether to display them
      label_function: "default",
      labels: {
        x: {
          display: false,
          font: "10px Helvetica",
          color: "#333333",
          align: "S", // corner/side on which to align the x label,
                       // note that anything besides N,S,W,E,NW,NE,SW,SE is centered
          location: "dynamic" // can be axis, top, bottom, or dynamic (switches between)
        },
        y: {
          display: true,
          font: "8px Helvetica",
          color: "#333333",
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
    if (!utils.deepEquals(this.old_vp, this.context.viewport)) {
      this.old_vp = {...this.context.viewport};
      this.gridlines = [];

      let ideal_xy = this.context.canvasToCartesianV(this.normal.ideal_dist, this.normal.ideal_dist);

      // unpack the values
      let ideal_x_normal_spacing = Math.abs(ideal_xy.x);
      // Math.abs shouldn't ever do anything, but it would be catastrophic
      // if this was somehow negative due to some dumb error of mine
      // (This might happen if the ideal inter-thin distance is negative)
      let ideal_y_normal_spacing = Math.abs(ideal_xy.y);

      let true_xn_spacing = 10 ** Math.round(Math.log10(ideal_x_normal_spacing));
      let true_yn_spacing = 10 ** Math.round(Math.log10(ideal_y_normal_spacing));

      let ideal_x_thin_spacing_denom = this.context.cartesianToCanvasVX(true_xn_spacing) / this.thin.ideal_dist;
      let ideal_y_thin_spacing_denom = -this.context.cartesianToCanvasVY(true_yn_spacing) / this.thin.ideal_dist;

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
                font: label.font,
                lcol: label.color
              });
            }
            this.gridlines.push(gridline);
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
                font: label.font,
                lcol: label.color
              });
            }
            this.gridlines.push(gridline);
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
            font: labelx.font,
            lcol: labelx.color
          });
        }
        this.gridlines.push(gridline);
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
            lcol: labely.color
          });
        }
        this.gridlines.push(gridline);
      }

      this.gridlines.splice(this.gridline_limit);
    }
  }

  draw(canvas, canvas_ctx, info) {
    this.updateAutoGridlines();
    super.draw(canvas, canvas_ctx, info);
  }
}


export {Gridlines, AutoGridlines, getTextBaseline, getTextAlign, exponentify, convert_char, exponent_reference};
