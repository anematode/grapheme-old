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

    ctx.font = "15px Helvetica";

    let maxY = this.context.maxY();
    let maxX = this.context.maxX();
    let minY = this.context.minY();
    let minX = this.context.minX();

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

      switch (gridline.dir) {
        case 'x':
          canvas_ctx.beginPath();
          let canv_x_coord = utils.roundToCanvasCoord(this.context.cartesianToCanvas(gridline.pos,0)[0]);
          canvas_ctx.moveTo(canv_x_coord, 0);
          canvas_ctx.lineTo(canv_x_coord, this.context.height);
          canvas_ctx.stroke();

          if (gridline.label) {
            let y_draw_pos;
            let textBaseline;

            if (0 > maxY) {
              y_draw_pos = 0;
              textBaseline = "top";
            } else if (0 < minY) {
              y_draw_pos = canvas.height;
              textBaseline="bottom";
            } else {
              y_draw_pos = this.context.cartesianToCanvas(0,0)[1];
              textBaseline=gridline.lpos ? (gridline.lpos == 'l' ? "bottom" : "top") : "bottom";
            }

            let textAlignment = "center";

            if (textBaseline != currentTextBaseline) {
              currentTextBaseline = ctx.textBaseline = textBaseline;
            }

            if (textAlignment != currentTextAlignment) {
              currentTextAlignment = ctx.textAlign = textAlignment;
            }

            ctx.fillText(gridline.label, canv_x_coord, y_draw_pos);
          }
          break;
        case 'y':
          canvas_ctx.beginPath();
          let canv_y_coord = utils.roundToCanvasCoord(this.context.cartesianToCanvas(0,gridline.pos)[1]);
          canvas_ctx.moveTo(0, canv_y_coord);
          canvas_ctx.lineTo(this.context.width, canv_y_coord);
          canvas_ctx.stroke();

          if (gridline.label) {
            let x_draw_pos;
            let textAlignment;

            if (0 > maxX) {
              x_draw_pos = canvas.width;
              textAlignment = "right";
            } else if (0 < minX) {
              x_draw_pos = 0;
              textAlignment="left";
            } else {
              x_draw_pos = this.context.cartesianToCanvas(0,0)[0];
              textAlignment=gridline.lpos ? (gridline.lpos == 'l' ? "right" : "left") : "left";
            }

            let textBaseline = "middle";

            if (textBaseline != currentTextBaseline) {
              currentTextBaseline = ctx.textBaseline = textBaseline;
            }

            if (textAlignment != currentTextAlignment) {
              currentTextAlignment = ctx.textAlign = textAlignment;
            }

            ctx.fillText(gridline.label, x_draw_pos, canv_y_coord);

          break;
        }
      }
    }
  }
}

class AutoGridlines extends Gridlines {
  constructor(context, params={}) {
    super(context, params);

    this.bold_thickness = 1.3;
    this.bold_color = "#000000";
    this.normal_thickness = 0.5;
    this.normal_color = "#222222";
    this.thin_thickness = 0.2;
    this.thin_color = "#444444";

    this.demarcation_mode = utils.select(params.demarcation_mode, 'power10');
    this.gridline_limit = utils.select(params.gridline_limit, 500);
    this.ideal_inter_thin_dist = 50; // pixels
    this.ideal_inter_normal_dist = 100; // pixels
    this.label_normal_gridlines = true;
  }

  static get DemarcationModes() {
    return {Power10: 'power10', Power10Subdivide5: "p10s5", Power10Subdivide2: "p10s2", Power10Adapt: "p10a"};
  }

  updateAutoGridlines() {
    if (!utils.deepEquals(this.old_vp, this.context.viewport)) {
      this.old_vp = {...this.context.viewport};
      this.gridlines = [];

      let demarc_mode = this.demarcation_mode;
      if (demarc_mode === "p10a") {
        // determine which demarcation mode is ideal

      }

      switch (demarc_mode) {
        case "power10":
          let [ideal_x_normal_spacing, ideal_y_normal_spacing] =
            this.context.canvasToCartesianV(this.ideal_inter_normal_dist,
              this.ideal_inter_normal_dist);

          ideal_x_normal_spacing = Math.abs(ideal_x_normal_spacing);
          ideal_y_normal_spacing = Math.abs(ideal_y_normal_spacing);

          let true_xn_spacing = 10**Math.round(Math.log10(ideal_x_normal_spacing));
          let true_yn_spacing = 10**Math.round(Math.log10(ideal_y_normal_spacing));
          let true_xt_spacing = true_xn_spacing / 10;
          let true_yt_spacing = true_yn_spacing / 10;

          let minx = this.context.minX();
          let miny = this.context.minY();
          let maxx = this.context.maxX();
          let maxy = this.context.maxY();

          // Thin lines
          let thinx_start = Math.ceil(minx / true_xt_spacing);
          let thinx_end = Math.floor(maxx / true_xt_spacing);
          let thiny_start = Math.floor(miny / true_yt_spacing);
          let thiny_end = Math.ceil(maxy / true_yt_spacing);

          // x
          utils.assert(thinx_start < thinx_end, "wtf happened");

          for (let i = thinx_start; i <= thinx_end; ++i) {
            if (i % 10 === 0) continue;
            this.gridlines.push({
              color: this.thin_color,
              pen: this.thin_thickness,
              dir: 'x',
              pos: i * true_xt_spacing});
          }

          // y
          utils.assert(thiny_start < thiny_end, "wtf happened");

          for (let i = thiny_start; i <= thiny_end; ++i) {
            if (i % 10 === 0) continue;
            this.gridlines.push({
              color: this.thin_color,
              pen: this.thin_thickness,
              dir: 'y',
              pos: i * true_yt_spacing});
          }

          // Normal lines
          let normalx_start = Math.ceil(minx / true_xn_spacing);
          let normalx_end = Math.floor(maxx / true_xn_spacing);
          let normaly_start = Math.floor(miny / true_yn_spacing);
          let normaly_end = Math.ceil(maxy / true_yn_spacing);

          // x
          for (let i = normalx_start; i <= normalx_end; ++i) {
            if (i == 0) continue;
            this.gridlines.push({
              color: this.normal_color,
              pen: this.normal_thickness,
              dir: 'x',
              pos: i * true_xn_spacing,
              label: (i * true_xn_spacing).toFixed(1),
              lpos: 'l'
            });
          }

          // y
          for (let i = normaly_start; i <= normaly_end; ++i) {
            if (i == 0) continue;
            this.gridlines.push({
              color: this.normal_color,
              pen: this.normal_thickness,
              dir: 'y',
              pos: i * true_yn_spacing,
              label: (i * true_yn_spacing).toFixed(1) + ' ',
              lpos: 'l'
            });
          }

          // Axis lines (if applicable)
          // x

          if (this.context.cartesianXInView(0)) {
            this.gridlines.push({
              color: this.bold_color,
              pen: this.bold_thickness,
              dir: 'x',
              pos: 0});
          }

          // y

          if (this.context.cartesianYInView(0)) {
            this.gridlines.push({
              color: this.bold_color,
              pen: this.bold_thickness,
              dir: 'y',
              pos: 0});
          }
      }
    }
  }

  draw(canvas, canvas_ctx, info) {
    this.updateAutoGridlines();
    super.draw(canvas, canvas_ctx, info);
  }
}


export {Gridlines, AutoGridlines};
