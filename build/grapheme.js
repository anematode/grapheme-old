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

  function _ctxDrawPath(ctx, arr) {
    ctx.beginPath();

    for (let i = 2; i < arr.length; i += 2) {
      ctx.lineTo(arr[i], arr[i+1]);
    }

    ctx.stroke();
  }

  function isInteger(z) {
    return Number.isInteger(z); // didn't know about this lol
  }

  function isNonnegativeInteger(z) {
    return Number.isInteger(z) && z >= 0;
  }

  function isPositiveInteger(z) {
    return Number.isInteger(z) && z > 0;
  }

  function isNonpositiveInteger(z) {
    return Number.isInteger(z) && z <= 0;
  }

  function isNegativeInteger(z) {
    return Number.isInteger(z) && z < 0;
  }

  // https://stackoverflow.com/a/34749873
  function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }

  // https://stackoverflow.com/a/34749873
  function mergeDeep(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
      for (const key in source) {
        if (isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          mergeDeep(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return mergeDeep(target, ...sources);
  }

  function isApproxEqual(v, w, eps=1e-5) {
    return Math.abs(v - w) < eps;
  }

  class ContextElement {
    constructor(context, params={}) {
      this.context = context;

      this.precedence = select(params.precedence, 1);
      this.id = getID();
      this.display = select(params.display, true);
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
      return {x: (x / this.width - 0.5) * this.viewport.width + this.viewport.x,
        y: -(y / this.height - 0.5) * this.viewport.height + this.viewport.y};
    }

    canvasToCartesianFloatArray(arr) {
      let w = this.width, vw = this.viewport.width, vx = this.viewport.x;
      let h = this.height, vh = this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = (arr[i] / w - 0.5) * vw + vx;
        arr[i+1] = -(arr[i+1] / h - 0.5) * vh + vy;
      }

      return arr;
    }

    cartesianToCanvas(x,y) {
      return {x: this.width * ((x - this.viewport.x) / this.viewport.width + 0.5),
        y: this.height * (-(y - this.viewport.y) / this.viewport.height + 0.5)};
    }

    cartesianToCanvasFloatArray(arr) {
      let w = this.width, vw = this.viewport.width, vx = this.viewport.x;
      let h = this.height, vh = this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = w * ((arr[i] - vx) / vw + 0.5);
        arr[i+1] = h * (-(arr[i+1] - vy) / vh + 0.5);
      }

      return arr;
    }

    canvasToCartesianX(x) {
      return (x / this.width - 0.5) * this.viewport.width + this.viewport.x;
    }

    canvasToCartesianXFloatArray(arr) {
      let w = this.width, vw = this.viewport.width, vx = this.viewport.x;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = (arr[i] / w - 0.5) * vw + vx;
      }

      return arr;
    }

    cartesianToCanvasX(x) {
      return this.width * ((x - this.viewport.x) / this.viewport.width + 0.5);
    }

    cartesianToCanvasXFloatArray(arr) {
      let w = this.width, vw = this.viewport.width, vx = this.viewport.x;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = w * ((arr[i] - vx) / vw + 0.5);
      }

      return arr;
    }

    canvasToCartesianY(y) {
      return -(y / this.height - 0.5) * this.viewport.height + this.viewport.y;
    }

    canvasToCartesianYFloatArray(arr) {
      let h = this.height, vh = this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = -(arr[i] / h - 0.5) * vh + vy;
      }

      return arr;
    }

    cartesianToCanvasY(y) {
      return this.height * (-(y - this.viewport.y) / this.viewport.height + 0.5);
    }

    cartesianToCartesianYFloatArray(arr) {
      let h = this.height, vh = this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = h * (-(arr[i] - vy) / vh + 0.5);
      }

      return arr;
    }

    cartesianToCanvasV(x,y) {
      return {x: this.width * x / this.viewport.width, y: -this.height * y / this.viewport.height};
    }

    cartesianToCanvasVFloatArray(arr) {
      let wr = this.width / this.viewport.width;
      let hr = -this.height / this.viewport.height;

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = wr * arr[i];
        arr[i+1] = hr * arr[i+1];
      }

      return arr;
    }

    canvasToCartesianV(x,y) {
      return {x: this.viewport.width * x / this.width, y: -this.viewport.height * y / this.height};
    }

    canvasToCartesianVFloatArray(arr) {
      let wrp = this.viewport.width / this.width;
      let hrp = -this.viewport.height / this.height;

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = wrp * arr[i];
        arr[i+1] = hrp * arr[i+1];
      }

      return arr;
    }

    cartesianToCanvasVX(x) {
      return this.width * x / this.viewport.width;
    }

    cartesianToCanvasVXFloatArray(arr) {
      let wr = this.width / this.viewport.width;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = wr * arr[i];
      }

      return arr;
    }

    cartesianToCanvasVY(y) {
      return -this.height * y / this.viewport.height;
    }

    cartesianToCanvasVYFloatArray(y) {
      let hr = -this.height / this.viewport.height;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = hr * arr[i];
      }

      return arr;
    }

    canvasToCartesianVX(x) {
      return this.viewport.width * x / this.width;
    }

    canvasToCartesianVXFloatArray(arr) {
      let wrp = this.viewport.width / this.width;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = wrp * arr[i];
      }

      return arr;
    }

    canvasToCartesianVY(y) {
      return -this.viewport.height * y / this.height;
    }

    canvasToCartesianVYFloatArray(arr) {
      let hrp = -this.viewport.height / this.height;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = hrp * arr[i];
      }

      return arr;
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
      assert(!this._listenersAdded, "listeners already added!");
      this._listenersAdded = true;

      this.listeners = {
        "mousedown": evt => this._mouseDown(evt),
        "mouseup": evt => this._mouseUp(evt),
        "mousemove": evt => this._mouseMove(evt),
        "wheel": evt => this._onScroll(evt)
      };

      for (let key in this.listeners) {
        this.canvas.addEventListener(key, this.listeners[key]);
      }
    }

    _removeMouseEvtListeners() {
      this._listenersAdded = false;

      for (let key in this.listeners) {
        this.canvas.removeEventListener(key, this.listeners[key]);
        delete this.listeners[key];
      }

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

      this.viewport.x -= cartesian_coords.x - this._mouse_down_coordinates.x;
      this.viewport.y -= cartesian_coords.y - this._mouse_down_coordinates.y;
    }

    _onScroll(evt) {
      if (!this.interactivityEnabled) return;

      let coords = getMouseOnCanvas(this.canvas, evt);
      let cartesian_coords = this.canvasToCartesian(coords.x, coords.y);

      let scale_factor = Math.abs(Math.pow(this.scrollSpeed, evt.deltaY / 100));

      // We want coords to be fixed
      this.viewport.height *= scale_factor;
      this.viewport.width *= scale_factor;

      let new_cartesian_coords = this.canvasToCartesian(coords.x, coords.y);

      this.viewport.x += cartesian_coords.x - new_cartesian_coords.x;
      this.viewport.y += cartesian_coords.y - new_cartesian_coords.y;
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
            let canv_x_coord = roundToCanvasCoord(
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
            let canv_y_coord = roundToCanvasCoord(
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
    assert(isInteger(integer), "needs to be an integer");
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
        let exponent = Math.floor(Math.log10(Math.abs(x)));
        let mantissa = x / (10 ** exponent);

        let prefix = (isApproxEqual(mantissa,1) ? '' : (beautifyFloat(mantissa, 8) + CDOT));
        let exponent_suffix = "10" + exponentify(exponent);

        return prefix + exponent_suffix;
      }
    }
  };

  class AutoGridlines extends Gridlines {
    constructor(context, params={}) {
      super(context, params);

      this.bold = mergeDeep({
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
      this.normal = mergeDeep({
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
      this.thin = mergeDeep({
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
      this.thin_spacing_types = select(params.thin_spacing_types, [4, 5, 10]);
      // Maximum number of displayed grid lines
      this.gridline_limit = select(params.gridline_limit, 500);
      // force equal thin subdivisions in x and y directions
      this.force_equal_thin_div = true;
    }

    get thin_spacing_types() {
      return this._thin_spacing_types;
    }

    set thin_spacing_types(val) {
      assert(val.every(isPositiveInteger), "thin_spacing_types need to be positive integers");
      assert(val[0], "thin_spacing_types needs at least one subdivision");

      this._thin_spacing_types = [...val];
    }

    updateAutoGridlines() {
      if (!deepEquals(this.old_vp, this.context.viewport)) {
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
            assert(start <= end, "wtf happened");

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

  // Graph of the form y = x


  class FunctionalGraph extends ContextElement {
    constructor(context, params={}) {
      super(context, params);

      this.line_thickness = 2;
      this.line_color = "#662255";
      this.samples = select(params.samples, 500);

      this.func = (x) => Math.sin(2*x) - x/5 + Math.cos(15*x)/4;
    }

    get samples() {
      return this.points.length / 2;
    }

    set samples(val) {
      this.points = new Float64Array(2 * val);
    }

    draw(context, ctx, info) { // note that I have numerous algorithms for this, this is just a placeholder
      super.draw(context, ctx, info);

      const samples = this.samples;
      let points = this.points;

      for (let i = 0; i <= samples; ++i) {
        let x = this.context.viewport.x + (this.context.viewport.width) * (i - samples / 2) / samples;

        points[2 * i] = x;
        points[2 * i + 1] = this.func(x);
      }

      this.context.cartesianToCanvasFloatArray(points);

      ctx.lineWidth = this.line_thickness;
      ctx.strokeStyle = this.line_color;

      _ctxDrawPath(ctx, points);
    }
  }

  exports.AutoGridlines = AutoGridlines;
  exports.Context = Context;
  exports.ContextElement = ContextElement;
  exports.FunctionalGraph = FunctionalGraph;
  exports.Gridlines = Gridlines;
  exports.InteractiveContext = InteractiveContext;
  exports._ctxDrawPath = _ctxDrawPath;
  exports.assert = assert;
  exports.checkType = checkType;
  exports.convert_char = convert_char;
  exports.deepEquals = deepEquals;
  exports.exponent_reference = exponent_reference;
  exports.exponentify = exponentify;
  exports.getID = getID;
  exports.getTextAlign = getTextAlign;
  exports.getTextBaseline = getTextBaseline;
  exports.isApproxEqual = isApproxEqual;
  exports.isInteger = isInteger;
  exports.isNegativeInteger = isNegativeInteger;
  exports.isNonnegativeInteger = isNonnegativeInteger;
  exports.isNonpositiveInteger = isNonpositiveInteger;
  exports.isPositiveInteger = isPositiveInteger;
  exports.mergeDeep = mergeDeep;
  exports.roundToCanvasCoord = roundToCanvasCoord;
  exports.select = select;

  return exports;

}({}));
