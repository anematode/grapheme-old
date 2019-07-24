var Grapheme = (function (exports) {
  'use strict';

  function select(opt1, ...opts) {
    // this function takes in a variadic list of arguments and returns the first
    // one that's not undefined lol

    if (opts.length === 0)
      return opt1;
    if (opt1 === undefined) {
      return select(...opts);
    }
    return opt1;
  }

  let id = 0;

  function getID() {
    return id++;
  }

  function assert(statement, error = "Unknown error") {
    if (!statement) {
      throw new Error(error);
    }
  }

  function checkType(obj, type, funcName="") {
    assert(obj instanceof type,
      (funcName ? "Function " + funcName : ": ")
      + "Object must be instanceof " + type);
  }

  // https://stackoverflow.com/questions/201183/how-to-determine-equality-for-two-javascript-objects
  function deepEquals(x, y) {
    const ok = Object.keys, tx = typeof x, ty = typeof y;
    return x && y && tx === 'object' && tx === ty ? (
      ok(x).length === ok(y).length &&
        ok(x).every(key => deepEquals(x[key], y[key]))
    ) : (x === y);
  }

  function roundToCanvasCoord(c) {
    return Math.round(c-0.5)+0.5;
  }

  class ContextElement {
    constructor(context, params={}) {
      this.context = context;

      this.precedence = select(params.precedence, 1);
      this.id = getID();
    }

    draw(canvas, canvas_ctx, info) {
      this.lastDrawn = Date.now();
    }
  }

  class Context {
    constructor(canvas, params={}) {
      this.canvas = canvas;
      this.canvas_ctx = canvas.getContext('2d');

      this.elements = [];

      // x is of the center, y is of the center, width is the total width, height is the total height
      this.viewport = {x: 0, y: 0, width: 1, height: 1};
    }

    get width() {
      return this.canvas.width;
    }

    set width(val) {
      this.canvas.width = val;
    }

    get height() {
      return this.canvas.height;
    }

    set height(val) {
      this.canvas.height = val;
    }

    clearCanvas() {
      this.canvas_ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    sortElementPrecedence() {
      this.elements.sort((a,b) => a.precedence - b.precedence);
    }

    drawFrame() {
      this.clearCanvas();
      let info = {viewport: this.viewport};

      for (let i = 0; i < this.elements.length; ++i) {
        this.elements[i].draw(this.canvas, this.canvas_ctx, info);
      }
    }

    deleteElementById(id) {
      for (let i = 0; i < this.elements.length; ++i) {
        if (this.elements[i].id === id) {
          this.elements.split(i, 1);
          return true;
        }
      }

      return false;
    }

    containsElementById(id) {
      for (let i = 0; i < this.elements.length; ++i) {
        if (this.elements[i].id === id) {
          return true;
        }
      }

      return false;
    }

    containsElement(elem) {
      checkType(elem, ContextElement, "deleteElement");
      return this.containsElementById(elem.id);
    }

    deleteElement(elem) {
      checkType(elem, ContextElement, "deleteElement");
      return this.deleteElementById(elem.id);
    }

    getElementById(id) {
      for (let i = 0; i < this.elements.length; ++i) {
        if (this.elements[i].id === id) {
          return this.elements[i];
        }
      }

      return null;
    }

    addElement(element) {
      assert(!this.containsElement(element), "element already added to this context");
      assert(element.context === this, "element cannot be a child of two contexts");

      this.elements.push(element);
    }

    canvasToCartesian(x,y) {
      return [(x / this.width - 0.5) * this.viewport.width + this.viewport.x,
        -(y / this.height - 0.5) * this.viewport.height + this.viewport.y];
    }

    cartesianToCanvas(x,y) {
      return [this.width * ((x - this.viewport.x) / this.viewport.width + 0.5),
        this.height * (-(y - this.viewport.y) / this.viewport.height + 0.5)];
    }

    cartesianToCanvasV(x,y) {
      return [this.width * x / this.viewport.width, -this.height * y / this.viewport.height];
    }

    canvasToCartesianV(x,y) {
      return [this.viewport.width * x / this.width, -this.viewport.height * y / this.height];
    }

    minX() {
      return this.viewport.x - this.viewport.width / 2;
    }

    minY() {
      return this.viewport.y - this.viewport.height / 2;
    }

    maxX() {
      return this.viewport.x + this.viewport.width / 2;
    }

    maxY() {
      return this.viewport.y + this.viewport.height / 2;
    }

    cartesianXInView(x) {
      return Math.abs(x - this.viewport.x) <= this.viewport.width / 2;
    }

    cartesianYInView(y) {
      return Math.abs(y - this.viewport.y) <= this.viewport.height / 2;
    }

    transformCartesianCoordinatesFloatArray(xy) {
      // Takes in Float32Arrays and Float64Arrays

      let cw = this.width;
      let ch = this.height;

      let vx = this.viewport.x;
      let vy = this.viewport.y;
      let vw = this.viewport.width;
      let vh = this.viewport.height;


    }
  }

  function getMouseOnCanvas(canvas, evt) {
    let rect = canvas.getBoundingClientRect();
    return {x: evt.clientX - rect.left, y: evt.clientY - rect.top};
  }

  class InteractiveContext extends Context {
    constructor(context, params={}) {
      super(context, params);

      this._addMouseEvtListeners();
      this.interactivityEnabled = false;

      this.scrollSpeed = 1.4;
    }

    setFullscreen() {
      this.width = document.body.clientWidth;
      this.height = document.body.clientHeight;
    }

    _addMouseEvtListeners() {
      this.canvas.addEventListener("mousedown", evt => this._mouseDown(evt));
      this.canvas.addEventListener("mouseup", evt => this._mouseUp(evt));
      this.canvas.addEventListener("mousemove", evt => this._mouseMove(evt));
      this.canvas.addEventListener("wheel", evt => this._onScroll(evt));
    }

    _mouseDown(evt) {
      if (!this.interactivityEnabled) return;

      let coords = getMouseOnCanvas(this.canvas, evt);

      this._mouse_down_coordinates = this.canvasToCartesian(coords.x, coords.y);
      this._is_mouse_down = true;
    }

    _mouseUp(evt) {
      if (!this.interactivityEnabled) return;

      let coords = getMouseOnCanvas(this.canvas, evt);

      this._is_mouse_down = false;
    }

    _mouseMove(evt) {
      if (!this.interactivityEnabled) return;

      if (!this._is_mouse_down) return;


      let coords = getMouseOnCanvas(this.canvas, evt);
      let cartesian_coords = this.canvasToCartesian(coords.x, coords.y);

      this.viewport.x -= cartesian_coords[0] - this._mouse_down_coordinates[0];
      this.viewport.y -= cartesian_coords[1] - this._mouse_down_coordinates[1];
    }

    _onScroll(evt) {
      if (!this.interactivityEnabled) return;

      let coords = getMouseOnCanvas(this.canvas, evt);
      let cartesian_coords = this.canvasToCartesian(coords.x, coords.y);

      let scale_factor = Math.abs(Math.pow(this.scrollSpeed, evt.deltaY / 100));
      console.log(evt, scale_factor);

      // We want coords to be fixed
      this.viewport.height *= scale_factor;
      this.viewport.width *= scale_factor;

      console.log(this.viewport);
      let new_cartesian_coords = this.canvasToCartesian(coords.x, coords.y);
      console.log(new_cartesian_coords);

      this.viewport.x += cartesian_coords[0] - new_cartesian_coords[0];
      this.viewport.y += cartesian_coords[1] - new_cartesian_coords[1];
    }
  }

  class Gridlines extends ContextElement {
    constructor(context, params={}) {
      super(context, params);

      this.orientation = select(params.orientation);

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
            let canv_x_coord = roundToCanvasCoord(this.context.cartesianToCanvas(gridline.pos,0)[0]);
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
            let canv_y_coord = roundToCanvasCoord(this.context.cartesianToCanvas(0,gridline.pos)[1]);
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

      this.demarcation_mode = select(params.demarcation_mode, 'power10');
      this.gridline_limit = select(params.gridline_limit, 500);
      this.ideal_inter_thin_dist = 50; // pixels
      this.ideal_inter_normal_dist = 100; // pixels
      this.label_normal_gridlines = true;
    }

    static get DemarcationModes() {
      return {Power10: 'power10', Power10Subdivide5: "p10s5", Power10Subdivide2: "p10s2", Power10Adapt: "p10a"};
    }

    updateAutoGridlines() {
      if (!deepEquals(this.old_vp, this.context.viewport)) {
        this.old_vp = {...this.context.viewport};
        this.gridlines = [];

        let demarc_mode = this.demarcation_mode;

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
            assert(thinx_start < thinx_end, "wtf happened");

            for (let i = thinx_start; i <= thinx_end; ++i) {
              if (i % 10 === 0) continue;
              this.gridlines.push({
                color: this.thin_color,
                pen: this.thin_thickness,
                dir: 'x',
                pos: i * true_xt_spacing});
            }

            // y
            assert(thiny_start < thiny_end, "wtf happened");

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

  // Graph of the form y = x


  class FunctionalGraph extends ContextElement {
    constructor(context, params={}) {
      super(context, params);

      this.line_thickness = 2;
      this.line_color = "#662255";

      this.func = (x) => Math.sin(2*x) - x/5 + Math.cos(15*x)/4;
    }

    draw(context, ctx, info) { // note that I have numerous algorithms for this, this is just a placeholder
      super.draw(context, ctx, info);

      ctx.lineWidth = this.line_thickness;
      ctx.strokeStyle = this.line_color;

      const samples = 2000;

      ctx.beginPath();

      for (let i = 0; i <= samples; ++i) {
        let x = this.context.viewport.x + (this.context.viewport.width) * (i - samples / 2) / samples;
        let y = this.func(x);

        if (i !== 0) {
          ctx.lineTo(...this.context.cartesianToCanvas(x, y));
        } else {
          ctx.moveTo(...this.context.cartesianToCanvas(x, y));
        }
      }

      ctx.stroke();
    }
  }

  exports.AutoGridlines = AutoGridlines;
  exports.Context = Context;
  exports.ContextElement = ContextElement;
  exports.FunctionalGraph = FunctionalGraph;
  exports.Gridlines = Gridlines;
  exports.InteractiveContext = InteractiveContext;
  exports.assert = assert;
  exports.checkType = checkType;
  exports.deepEquals = deepEquals;
  exports.getID = getID;
  exports.roundToCanvasCoord = roundToCanvasCoord;
  exports.select = select;

  return exports;

}({}));
