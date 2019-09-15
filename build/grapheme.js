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
  // This function takes in a GL rendering context, a type of shader (fragment/vertex),
  // and the GLSL source code for that shader, then returns the compiled shader
  function createShaderFromSource(gl, shaderType, shaderSourceText) {
    // create an (empty) shader of the provided type
    let shader = gl.createShader(shaderType);

    // set the source of the shader to the provided source
    gl.shaderSource(shader, shaderSourceText);

    // compile the shader!! piquant
    gl.compileShader(shader);

    // get whether the shader compiled properly
    let succeeded = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

    if (succeeded)
      return shader; // return it if it compiled properly
    else {
      // throw an error with the details of why the compilation failed
      throw new Error(gl.getShaderInfoLog(shader));

      // delete the shader to free it from memory
      gl.deleteShader(shader);
    }
  }

  // This function takes in a GL rendering context, the fragment shader, and the vertex shader,
  // and returns a compiled program.
  function createGLProgram(gl, vertShader, fragShader) {
    // create an (empty) GL program
    let program = gl.createProgram();

    // link the vertex shader
    gl.attachShader(program, vertShader);

    // link the fragment shader
    gl.attachShader(program, fragShader);

    // compile the program
    gl.linkProgram(program);

    // get whether the program compiled properly
    let succeeded = gl.getProgramParameter(program, gl.LINK_STATUS);

    if (succeeded)
      return program;
    else {
      // throw an error with the details of why the compilation failed
      throw new Error(gl.getProgramInfoLog(program));

      // delete the program to free it from memory
      gl.deleteProgram(program);
    }
  }

  let dpr = window.devicePixelRatio;

  function updateDPR() {
    dpr = window.devicePixelRatio;
  }

  let mod = function mod(n, m) {
    return ((n % m) + m) % m;
  };

  let _updateDPRinterval = setInterval(updateDPR);

  function expandVerticesIntoTriangles(thickness = 1, vertices, triangles) {

  }

  function importGraphemeCSS() {
    try {
      let link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = '../build/grapheme.css'; // oof, must change l8r

      document.getElementsByTagName('HEAD')[0].appendChild(link);
    } catch (e) {
      console.error("Could not import Grapheme CSS");
      throw e;
    }
  }

  importGraphemeCSS();

  var utils = /*#__PURE__*/Object.freeze({
    mod: mod,
    _updateDPRinterval: _updateDPRinterval,
    get dpr () { return dpr; },
    select: select,
    getID: getID,
    assert: assert,
    checkType: checkType,
    deepEquals: deepEquals,
    roundToCanvasCoord: roundToCanvasCoord,
    _ctxDrawPath: _ctxDrawPath,
    isInteger: isInteger,
    isNonnegativeInteger: isNonnegativeInteger,
    isNonpositiveInteger: isNonpositiveInteger,
    isNegativeInteger: isNegativeInteger,
    isPositiveInteger: isPositiveInteger,
    mergeDeep: mergeDeep,
    isApproxEqual: isApproxEqual,
    createShaderFromSource: createShaderFromSource,
    expandVerticesIntoTriangles: expandVerticesIntoTriangles,
    createGLProgram: createGLProgram
  });

  class ContextElement {
    constructor(grapheme_context, params={}) {
      // The grapheme context containing this element
      this.context = grapheme_context;

      // A unique numeric ID (nonnegative integer) associated with this element
      this.id = getID();

      // Effectively the z-index of the element; in what order will this element be drawn?
      this.precedence = select(params.precedence, 1);

      // Whether or not to call draw() on this element, though this can be overriden
      // by this.override_display (TODO)
      this.display = select(params.display, true);

      // The Date at which this was last drawn
      this.lastDrawn = -1;

      // Formally adds this element to the grapheme context it is a part of,
      // allowing it to be manipulated from the context itself
      this.context.addElement(this);
    }

    draw() {
      if (!this.override_display && !this.display) return;

      // Set the time at which it was last drawn
      this.lastDrawn = Date.now();
    }

    destroy() {
      // Remove this element from the parent context
      this.remove();
    }

    remove() {
      // Remove this element from the parent context
      this.context.removeElement(this);
    }
  }

  class GraphemeContext {
    constructor(params = {}) {
      this.container_div = select(params.container, params.container_div);

      assert(this.container_div.tagName === "DIV",
        "Grapheme Context needs to be given a container div. Please give Grapheme a house to live in! :(");

      this.canvas = document.createElement("canvas");
      this.container_div.appendChild(this.canvas);
      this.text_canvas = document.createElement("canvas");
      this.container_div.appendChild(this.text_canvas);

      this.canvas.classList.add("grapheme-canvas");
      this.text_canvas.classList.add("grapheme-text-canvas");

      this.text_canvas_ctx = this.text_canvas.getContext("2d");
      this.gl = this.canvas.getContext("webgl") || this.canvas.getContext("experimental-webgl");

      assert(this.gl, "This browser does not support WebGL, which is required by Grapheme");

      this.elements = [];

      // x is of the center, y is of the center, width is the total width, height is the total height
      this.viewport = {x: 0, y: 0, width: 1, height: 1};

      // 0 <= r,g,b <= 255, 0 <= a <= 1 please!
      this.clear_color = {r: 255, g: 255, b: 255, a: 0.95};
      this.gl_infos = {};

      this._addResizeEventListeners();
    }

    drawFrame() {
      this.clearCanvas();

      let info = {
        viewport: this.viewport,
        viewport_changed: deepEquals(this.viewport, this._last_viewport)
      };

      this._last_viewport = {...this.viewport};

      for (let i = 0; i < this.elements.length; ++i) {
        this.elements[i].draw(this.canvas, this.canvas_ctx, info);
      }
    }

    // Element manipulation stuffs

    addElement(element) {
      assert(!this.containsElement(element), "element already added to this context");
      assert(element.context === this, "element cannot be a child of two contexts");

      this.elements.push(element);
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

    sortElementPrecedence() {
      this.elements.sort((a,b) => a.precedence - b.precedence);
    }

    // Canvas management stuff

    onResize() {
      this.resizeCanvas();
    }

    resizeCanvas() {
      let boundingRect = this.container_div.getBoundingClientRect();

      this.css_width = boundingRect.width;
      this.css_height = boundingRect.height;
      this.width = this.canvas.width = this.text_canvas.width =
        Math.floor(devicePixelRatio * boundingRect.width);
      this.height = this.canvas.height = this.text_canvas.height =
        Math.floor(devicePixelRatio * boundingRect.height);
      this.text_canvas_ctx.scale(devicePixelRatio, devicePixelRatio);

      // set the GL viewport to the whole canvas
      this.gl.viewport(0, 0, this.width, this.height);
    }

    _addResizeEventListeners() {
      this.resize_observer = new ResizeObserver(() => this.onResize());
      this.resize_observer.observe(this.container_div);
      window.addEventListener("load", () => this.onResize(), {once: true});
    }

    clearCanvas(color=this.clear_color) {
      let gl = this.gl; // alias for the GL context

      // set the COLOR_CLEAR_VALUE to the desired color
      gl.clearColor(color.r / 255, color.g / 255, color.b / 255, color.a);

      // set all colors to the COLOR_CLEAR_VALUE
      gl.clear(gl.COLOR_BUFFER_BIT);

      this.text_canvas_ctx.clearRect(0, 0, this.css_width, this.css_height);
    }

    pixelToCartesian(x,y) {
      return {x: (x / this.css_width - 0.5) * this.viewport.width + this.viewport.x,
        y: -(y / this.css_height - 0.5) * this.viewport.height + this.viewport.y};
    }

    pixelToCartesianFloatArray(arr) {
      let w = this.css_width, vw = this.viewport.width, vx = this.viewport.x;
      let h = this.css_height, vh = this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = (arr[i] / w - 0.5) * vw + vx;
        arr[i+1] = -(arr[i+1] / h - 0.5) * vh + vy;
      }

      return arr;
    }

    cartesianToPixel(x,y) {
      return {x: this.css_width * ((x - this.viewport.x) / this.viewport.width + 0.5),
        y: this.css_height * (-(y - this.viewport.y) / this.viewport.height + 0.5)};
    }

    cartesianToPixelFloatArray(arr) {
      let w = this.css_width, vw = this.viewport.width, vx = this.viewport.x;
      let h = this.css_height, vh = this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = w * ((arr[i] - vx) / vw + 0.5);
        arr[i+1] = h * (-(arr[i+1] - vy) / vh + 0.5);
      }

      return arr;
    }

    pixelToCartesianX(x) {
      return (x / this.css_width - 0.5) * this.viewport.width + this.viewport.x;
    }

    pixelToCartesianXFloatArray(arr) {
      let w = this.css_width, vw = this.viewport.width, vx = this.viewport.x;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = (arr[i] / w - 0.5) * vw + vx;
      }

      return arr;
    }

    cartesianToPixelX(x) {
      return this.css_width * ((x - this.viewport.x) / this.viewport.width + 0.5);
    }

    cartesianToPixelXFloatArray(arr) {
      let w = this.css_width, vw = this.viewport.width, vx = this.viewport.x;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = w * ((arr[i] - vx) / vw + 0.5);
      }

      return arr;
    }

    pixelToCartesianY(y) {
      return -(y / this.css_height - 0.5) * this.viewport.height + this.viewport.y;
    }

    pixelToCartesianYFloatArray(arr) {
      let h = this.css_height, vh = this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = -(arr[i] / h - 0.5) * vh + vy;
      }

      return arr;
    }

    cartesianToPixelY(y) {
      return this.css_height * (-(y - this.viewport.y) / this.viewport.height + 0.5);
    }

    cartesianToCartesianYFloatArray(arr) {
      let h = this.height, vh = this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = h * (-(arr[i] - vy) / vh + 0.5);
      }

      return arr;
    }

    cartesianToPixelV(x,y) {
      return {x: this.css_width * x / this.viewport.width, y: -this.height * y / this.viewport.height};
    }

    cartesianToPixelVFloatArray(arr) {
      let wr = this.css_width / this.viewport.width;
      let hr = -this.css_height / this.viewport.height;

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = wr * arr[i];
        arr[i+1] = hr * arr[i+1];
      }

      return arr;
    }

    pixelToCartesianV(x,y) {
      return {x: this.viewport.width * x / this.css_width, y: -this.viewport.height * y / this.css_height};
    }

    pixelToCartesianVFloatArray(arr) {
      let wrp = this.viewport.width / this.css_width;
      let hrp = -this.viewport.height / this.css_height;

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = wrp * arr[i];
        arr[i+1] = hrp * arr[i+1];
      }

      return arr;
    }

    cartesianToPixelVX(x) {
      return this.css_width * x / this.viewport.width;
    }

    cartesianToPixelVXFloatArray(arr) {
      let wr = this.css_width / this.viewport.width;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = wr * arr[i];
      }

      return arr;
    }

    cartesianToPixelVY(y) {
      return -this.css_height * y / this.viewport.height;
    }

    cartesianToPixelVYFloatArray(y) {
      let hr = -this.css_height / this.viewport.height;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = hr * arr[i];
      }

      return arr;
    }

    pixelToCartesianVX(x) {
      return this.viewport.width * x / this.css_width;
    }

    pixelToCartesianVXFloatArray(arr) {
      let wrp = this.viewport.width / this.css_width;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = wrp * arr[i];
      }

      return arr;
    }

    pixelToCartesianVY(y) {
      return -this.viewport.height * y / this.css_height;
    }

    pixelToCartesianVYFloatArray(arr) {
      let hrp = -this.viewport.height / this.css_height;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = hrp * arr[i];
      }

      return arr;
    }

    // For the GL canvas

    cartesianToGL(x,y) {
      return {x: this.width * ((x - this.viewport.x) / this.viewport.width + 0.5),
        y: this.height * (-(y - this.viewport.y) / this.viewport.height + 0.5)};
    }

    cartesianToGLFloatArray(arr) {
      let w = this.width, vw = this.viewport.width, vx = this.viewport.x;
      let h = this.height, vh = this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = w * ((arr[i] - vx) / vw + 0.5);
        arr[i+1] = h * (-(arr[i+1] - vy) / vh + 0.5);
      }

      return arr;
    }

    cartesianToGLX(x) {
      return 2 * (x - this.viewport.x) / this.viewport.width;
    }

    cartesianToGLXFloatArray(arr) {
      let div_vw = 2 / this.viewport.width, vx = this.viewport.x;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = (arr[i] - vx) * div_vw;
      }

      return arr;
    }

    cartesianToGLY(y) {
      return 2 * (y - this.viewport.y) / this.viewport.height;
    }

    cartesianToGLYFloatArray(arr) {
      let div_vh = 2 / this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = (vy - arr[i]) * div_vh;
      }

      return arr;
    }

    cartesianToGLVX(x) {
      return 2 * x / this.viewport.width;
    }

    cartesianToGLVXFloatArray(arr) {
      let wr = 2 / this.viewport.width;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = wr * arr[i];
      }

      return arr;
    }

    cartesianToGLVY(y) {
      return 2 * y / this.viewport.height;
    }

    cartesianToGLVYFloatArray(y) {
      let hr = 2 / this.viewport.height;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = hr * arr[i];
      }

      return arr;
    }

    GLVXToCartesian(x) {
      return this.viewport.width * x / 2;
    }

    GLVYToCartesian(y) {
      return -this.viewport.height * y / 2;
    }

    pixelToGLVX(x) {
      return 2 * x / this.width;
    }

    pixelToGLVY(y) {
      return 2 * y / this.height;
    }

    pixelToGLFloatArray(arr, compute_first=arr.length) {
      let x_scale = 2 / this.width, y_scale = -2 / this.height;

      assert(compute_first <= arr.length);

      if (compute_first < 100 || !(arr instanceof Float32Array)) {
        for (let i = 0; i < compute_first; i += 2) {
          arr[i] = arr[i] * x_scale - 1;
          arr[i+1] = arr[i+1] * y_scale + 1;
        }
      } else {
        let error, buffer;

        try {
          buffer = Module._malloc(compute_first * Float32Array.BYTES_PER_ELEMENT);

          Module.HEAPF32.set(arr.subarray(0, compute_first), buffer >> 2);

          Module.ccall("pixelToGLFloatArray", null, ["number", "number", "number", "number"], [buffer, compute_first, x_scale, y_scale]);

          arr.set(Module.HEAPF32.subarray(buffer >> 2, (buffer >> 2) + compute_first));
        } catch(e) {
          error = e;
        } finally {
          Module._free(buffer);
        }

        if (error) throw error;
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

    return {x: (evt.clientX - rect.left), y: (evt.clientY - rect.top)};
  }

  class InteractiveContext extends GraphemeContext {
    constructor(context, params={}) {
      super(context, params);

      this.interactivityEnabled = true;
      this.scrollSpeed = 1.4;

      this._addMouseEvtListeners();
    }

    _addMouseEvtListeners() {
      assert(!this._listenersAdded, "listeners already added!");
      this._listenersAdded = true;

      this.listeners = {
        "mousedown": evt => this._mouseDown(evt),
        "wheel": evt => this._onScroll(evt)
      };

      for (let key in this.listeners) {
        this.container_div.addEventListener(key, this.listeners[key]);
      }

      this.window_listeners = {
        "mouseup": evt => this._mouseUp(evt),
        "mousemove": evt => this._mouseMove(evt)
      };

      for (let key in this.window_listeners) {
        window.addEventListener(key, this.window_listeners[key]);
      }
    }

    _removeMouseEvtListeners() {
      this._listenersAdded = false;

      for (let key in this.listeners) {
        this.container_div.removeEventListener(key, this.listeners[key]);
        delete this.listeners[key];
      }

      for (let key in this.window_listeners) {
        this.window.removeEventListener(key, this.window_listeners[key]);
      }
    }

    _mouseDown(evt) {
      if (!this.interactivityEnabled) return;

      let coords = getMouseOnCanvas(this.canvas, evt);

      this._mouse_down_coordinates = this.pixelToCartesian(coords.x, coords.y);
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
      let cartesian_coords = this.pixelToCartesian(coords.x, coords.y);

      this.viewport.x -= cartesian_coords.x - this._mouse_down_coordinates.x;
      this.viewport.y -= cartesian_coords.y - this._mouse_down_coordinates.y;
    }

    _onScroll(evt) {
      if (!this.interactivityEnabled) return;

      let coords = getMouseOnCanvas(this.canvas, evt);
      let cartesian_coords = this.pixelToCartesian(coords.x, coords.y);

      let scale_factor = Math.abs(Math.pow(this.scrollSpeed, evt.deltaY / 1000));

      // We want coords to be fixed
      this.viewport.height *= scale_factor;
      this.viewport.width *= scale_factor;

      let new_cartesian_coords = this.pixelToCartesian(coords.x, coords.y);

      this.viewport.x += cartesian_coords.x - new_cartesian_coords.x;
      this.viewport.y += cartesian_coords.y - new_cartesian_coords.y;
    }
  }

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
      this.polylines = {};

      this.vertex_position_buf = this.context.gl.createBuffer();

      // the width of the thin border around the text
      this.label_eclipse_width = select(params.label_eclipse_width, 4);
      // the style of the thin border around the text
      this.label_eclipse_style = select(params.label_eclipse_style, "white");
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

      let m,delta; // calculation variables
      let width = this.context.width, height = this.context.height;

      // for each color...
      for (let color_i = 0; color_i < colors.length; ++color_i) {
        let color = colors[color_i];
        let gridl_subset = this.gridlines[colors[color_i]];

        for (let i = 0; i < gridl_subset.length; ++i) {
          let gridline = gridl_subset[i];
          let thickness_d = gridline.pen * dpr / 2;

          switch (gridline.dir) {
            case 'x':
              m = this.context.cartesianToPixelX(gridline.pos);
              
            case 'y':
              m = this.context.cartesianToPixelY(gridline.pos);
              delta = -this.context.pixelToGLVY(thickness_d);
          }
        }
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
    assert(isInteger(integer), "needs to be an integer");

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

        let prefix = (isApproxEqual(mantissa,1) ? '' :
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

      this.bold = mergeDeep({
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
      this.normal = mergeDeep({
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
      this.thin = mergeDeep({
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
      this.subdivisions = select(params.subdivisions, [
        {normal: 2, thin: [4]},
        {normal: 5, thin: [5, 10]},
        {normal: 1, thin: [5]}
      ]);

      // Maximum number of displayed grid lines
      this.gridline_limit = select(params.gridline_limit, 500);
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

  const ADD = function (interval_a, interval_b) {
    return [interval_a[0] + interval_b[0], interval_a[1] + interval_b[1]];
  };

  const SUB = function (interval_a, interval_b) {
    return [interval_a[0] - interval_b[1], interval_a[1] - interval_b[0]];
  };

  const MUL = function (interval_a, interval_b) {
    let m1 = interval_a[0] * interval_b[0];
    let m2 = interval_a[1] * interval_b[0];
    let m3 = interval_a[0] * interval_b[1];
    let m4 = interval_a[1] * interval_b[1];

    return [Math.min(m1,m2,m3,m4), Math.max(m1,m2,m3,m4)];
  };

  const DIV = function (interval_a, interval_b) {
    if (interval_b[0] <= 0 && 0 <= interval_b[1]) { // if b contains 0
      if (!interval_a[0] && !interval_a[1]) { // if a = [0,0]
        if (interval_b[0] === 0 && interval_b[1] === 0)
          return [NaN, NaN];
        return [0, 0]; // though NaN is possible
      }
      return [-Infinity, Infinity];
    }

    if (0 < interval_b[0]) // b is positive
      return [interval_a[0] / interval_b[1], interval_a[1] / interval_b[0]];

    return [interval_a[1] / interval_b[0], interval_a[0] / interval_b[1]];
  };

  const SIN = function (interval) {
    // TODO: optimize!
    if (interval[1] - interval[0] >= 2 * Math.PI)
      return [-1,1];

    let a_rem_2p = mod(interval[0], 2 * Math.PI);
    let b_rem_2p = mod(interval[1], 2 * Math.PI);

    let min_rem = Math.min(a_rem_2p, b_rem_2p);
    let max_rem = Math.max(a_rem_2p, b_rem_2p);

    let contains_1 = (min_rem < Math.PI / 2) && (max_rem > Math.PI / 2);
    let contains_n1 = (min_rem < 3 * Math.PI / 2 && max_rem > 3 * Math.PI / 2);

    if (b_rem_2p < a_rem_2p) {
      contains_1 = !contains_1;
      contains_n1 = !contains_n1;
    }

    if (contains_1 && contains_n1)
      return [-1,1]; // for rapidity

    let sa = Math.sin(a_rem_2p), sb = Math.sin(b_rem_2p);
    return [contains_n1 ? -1 : Math.min(sa, sb), contains_1 ? 1 : Math.max(sa, sb)];
  };

  const COS = function (interval) {
    // TODO: optimize!
    return SIN([interval[0] + Math.PI / 2, interval[1] + Math.PI / 2]); // and I oop
  };

  const TAN = function (interval) {
    // TODO: optimize!
    return DIV(SIN(interval), COS(interval));
  };

  const SEC = function (interval) {
    // TODO: optimize!
    return DIV([1,1], COS(interval));
  };

  const CSC = function (interval) {
    // TODO: optimize!
    return DIV([1,1], SIN(interval));
  };

  const COT = function (interval) {
    // TODO: optimize!
    return DIV(COS(interval), SIN(interval));
  };

  const EXP_B = function (b, interval_n) {
    return [Math.pow(b, interval_n[0]), Math.pow(b, interval_n[1])];
  };

  const EXP_N = function (interval_b, n) {
    if (n === 0)
      return [1,1];
    if (isPositiveInteger(n)) {
      if (n % 2 === 0) {
        let p1 = Math.pow(interval_b[0], n), p2 = Math.pow(interval_b[1], n);
        return (interval_b[0] >= 0 ? [p1, p2] : (interval_b[1] < 0 ? [p2, p1] : [0, Math.max(p1, p2)]));
      } else {
        return [Math.pow(interval_b[0], n), Math.pow(interval_b[1], n)];
      }
    } else if (isInteger(n)) {
      return DIV([1,1], EXP_N(interval_b, -n));
    } else {
      // annoyst, TODO: theorize!!!!
      if (interval_b[1] < 0)
        return [NaN, NaN];
      if (interval_b[0] < 0) interval_b[0] = 0;

      if (n >= 0) {
        return [Math.pow(interval_b[0], n), Math.pow(interval_b[1], n)];
      } else {
        return [Math.pow(interval_b[1], n), Math.pow(interval_b[0], n)];
      }
    }
  };

  const LOG_A = function (a, interval_n) {
    if (a === 1) {
      if (interval_n[0] <= 1 && 1 <= interval_n[1])
        return [-Infinity, Infinity];
      else
        return [NaN, NaN];
    }

    if (interval_n[0] === interval_n[1])
      return Math.log(interval_n[0]) / Math.log(a);

    if (interval_n[1] <= 0) return [NaN, NaN];
    if (interval_n[0] < 0) interval_n[0] = 0;

    if (a > 1) {
      let log_a = Math.log(a);

      return [Math.log(interval_n[0]) / log_a, Math.log(interval_n[1]) / log_a];
    } else {
      let log_a = Math.log(a);

      return [Math.log(interval_n[1]) / log_a, Math.log(interval_n[0]) / log_a];
    }
  };

  const LOG_N = function (interval_a, n) {
    if (interval_a[1] < 0)
      interval_a[0] = 0;
    if (interval_a[0] <= 1 && 1 <= interval_a[1])
      return [-Infinity, Infinity];
  };

  const POW = function (interval_a, interval_b) {
    if (interval_a[0] === interval_a[1]) {
      return EXP_B(interval_a[0], interval_b);
    } else if (interval_b[0] === interval_b[1]) {
      return EXP_N(interval_a, interval_b[0]);
    } else {
      // ANNOYST ANNOYST
      // For now: discard negative a

      if (interval_a[1] < 0)
        return [NaN, NaN]; // ANNNOYSTTT

      if (interval_a[0] < 0)
        interval_a[0] = 0;

      // TODO: THEORIZE
      throw new Error("not supported yet");
    }
  };

  const CONST = function(a) {
    return [a,a];
  };

  const IntervalFunctions = {ADD,SUB,MUL,DIV,SIN,COS,TAN,SEC,CSC,COT,EXP_B,EXP_N,LOG_A,LOG_N,POW,CONST};

  const VERTEX_CALCULATION_MODES = {
    EVEN_SAMPLING: "es",
    EVEN_SAMPLING_LIMIT_FINDING: "eslf"
  };

  class FunctionalGraph extends ContextElement {
    constructor(context, params={}) {
      super(context, params);

      this.color = select(params.color, 0x117711ff);
      this.axis = 'x'; // x means of the form y = f(x); y means of the form x = f(y);
      this.thickness = select(params.thickness, 3);

      this.quick_func = x => x * (x + 1);
      this.vertex_calculation_mode = {type: VERTEX_CALCULATION_MODES.EVEN_SAMPLING, samples: 1500};

      this.max_vertices = 2000;
      this.vertices = new Float64Array(2 * this.max_vertices);
      this.actual_vertices = 0;

      this.gl_vertices = new Float32Array(6 * this.max_vertices);
      this.actual_gl_vertices = 0;
    }

    _calculateVerticesViaSampling(num_samples) {
      let minX, maxX;

      switch (this.axis) {
        case 'x':
          minX = this.context.minX();
          maxX = this.context.maxX();
          break;
        default:
          minX = this.context.minY();
          maxX = this.context.maxY();
      }

      let rat = (maxX - minX) / this.intended_samples;

      for (let i = 0; i < this.intended_samples; ++i) {
        let x1 = rat * i + minX;

        this.vertices[2 * i] = x1;
        this.vertices[2 * i + 1] = this.quick_func(x1);
      }

      this.actual_vertices = this.intended_samples;
    }

    _calculateVerticesViaSamplingLimitFinding(samples) {

    }

    calculateVertices() {
      switch (this.vertex_calculation_mode.type) {
        case VERTEX_CALCULATION_MODES.EVEN_SAMPLING:
          this._calculateVerticesViaSampling();
          break;
      }
    }

    calculateGLVertices() {
      this.actual_gl_vertices = expandVerticesIntoTriangles(this.thickness, this.actual_vertices, this.actual_gl_vertices);
    }

    draw() {
      let ctx = this.context.text_canvas_ctx;
      this.calculateVertices();

      ctx.strokeStyle = "purple";
      ctx.lineWidth = 3;
      ctx.beginPath();

      let pt = this.context.cartesianToPixel(this.vertices[0], this.vertices[1]);

      ctx.moveTo(pt.x, pt.y);

      for (let i = 2; i < this.vertices.length; i += 2) {
        pt = this.context.cartesianToPixel(this.vertices[i], this.vertices[i+1]);
        ctx.lineTo(pt.x, pt.y);
      }

      ctx.stroke();
    }

  }

  // Class representing basic things to draw in Grapheme like circles, sets of circles, text, polygons, etc.
  class PrimitiveElement {
    constructor(grapheme_context, params={}) {
      this.context = grapheme_context;
    }

    draw() {
      throw new Error("No Context drawing implemented");
    }

    drawSVG() {
      throw new Error("No SVG drawing implemented");
    }
  }

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
    let vertShad = createShaderFromSource(gl /* rendering context */,
      gl.VERTEX_SHADER /* enum for vertex shader type */,
      vertexShaderSource /* source of the vertex shader*/ );

    // create the frag shader
    let fragShad = createShaderFromSource(gl /* rendering context */,
      gl.FRAGMENT_SHADER /* enum for vertex shader type */,
      fragmentShaderSource /* source of the vertex shader*/ );

    // create the program. we set _polylineShader in the parent Context so that
    // any future gridlines in this Context will use the already-compiled shader
    let program = createGLProgram(gl, vertShad, fragShad);

    grapheme.gl_infos._polylineShader = {program, colorLoc: gl.getUniformLocation(program, "line_color"),
  vertexLoc: gl.getAttribLocation(program, "v_position")};

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
    return isInteger(x) && min <= x && x <= max;
  }

  const MIN_RES_ANGLE = 0.05; // minimum angle in radians between roundings in a polyline

  // Parameters for the expanding/contracting float array for polyline
  const MIN_SIZE = 16;
  const MAX_SIZE = 2 ** 16;

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

      this._gl_triangle_strip_vertices = null;
      this._gl_triangle_strip_vertices_total = 0;
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

    _calculateTriangles(grapheme_context) {
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

            if (mod(a1 - a2, 2 * Math.PI) < Math.PI) {
              // left turn
              start_a = Math.PI + a1;
              end_a = a2;
            } else {
              start_a = Math.PI + a2;
              end_a = a1;
            }

            let angle_subtended = mod(end_a - start_a, 2 * Math.PI);
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
      this.context.pixelToGLFloatArray(tri_strip_vertices, gl_tri_strip_i);
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
        tri_strip_vertices = this._gl_triangle_strip_vertices = new Float32Array(Math.min(Math.max(MIN_SIZE, nextPowerOfTwo(vertices.length)), MAX_SIZE));
      }

      if (Array.isArray(vertices)) {
        for (let i = 0; i < vertices.length; ++i) {
          tri_strip_vertices[i] = vertices[i];
        }
      } else {
        tri_strip_vertices.set(vertices);
      }

      this.context.pixelToGLFloatArray(tri_strip_vertices);
      this._gl_triangle_strip_vertices_total = Math.ceil(vertices.length / 2);
    }

    draw(recalculate = true) {
      if (this._last_native !== this.use_native)
        recalculate = true;

      if (!this.use_native && recalculate) {
        this._calculateTriangles();
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

  exports.AutoGridlines = AutoGridlines;
  exports.FunctionalGraph = FunctionalGraph;
  exports.GraphemeContext = GraphemeContext;
  exports.Gridlines = Gridlines;
  exports.InteractiveContext = InteractiveContext;
  exports.IntervalFunctions = IntervalFunctions;
  exports.PolylinePrimitive = PolylinePrimitive;
  exports.convert_char = convert_char;
  exports.exponent_reference = exponent_reference;
  exports.exponentify = exponentify;
  exports.getTextAlign = getTextAlign;
  exports.getTextBaseline = getTextBaseline;
  exports.utils = utils;

  return exports;

}({}));
// Copyright 2010 The Emscripten Authors.  All rights reserved.
// Emscripten is available under two separate licenses, the MIT license and the
// University of Illinois/NCSA Open Source License.  Both these licenses can be
// found in the LICENSE file.

// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = typeof Module !== 'undefined' ? Module : {};

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)
// {{PRE_JSES}}

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
var key;
for (key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

var arguments_ = [];
var thisProgram = './this.program';
var quit_ = function(status, toThrow) {
  throw toThrow;
};

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).

var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_HAS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;
ENVIRONMENT_IS_WEB = typeof window === 'object';
ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
// A web environment like Electron.js can have Node enabled, so we must
// distinguish between Node-enabled environments and Node environments per se.
// This will allow the former to do things like mount NODEFS.
// Extended check using process.versions fixes issue #8816.
// (Also makes redundant the original check that 'require' is a function.)
ENVIRONMENT_HAS_NODE = typeof process === 'object' && typeof process.versions === 'object' && typeof process.versions.node === 'string';
ENVIRONMENT_IS_NODE = ENVIRONMENT_HAS_NODE && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (Module['ENVIRONMENT']) {
  throw new Error('Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -s ENVIRONMENT=web or -s ENVIRONMENT=node)');
}


// Three configurations we can be running in:
// 1) We could be the application main() thread running in the main JS UI thread. (ENVIRONMENT_IS_WORKER == false and ENVIRONMENT_IS_PTHREAD == false)
// 2) We could be the application main() thread proxied to worker. (with Emscripten -s PROXY_TO_WORKER=1) (ENVIRONMENT_IS_WORKER == true, ENVIRONMENT_IS_PTHREAD == false)
// 3) We could be an application pthread running in a worker. (ENVIRONMENT_IS_WORKER == true and ENVIRONMENT_IS_PTHREAD == true)




// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = '';
function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory);
  }
  return scriptDirectory + path;
}

// Hooks that are implemented differently in different runtime environments.
var read_,
    readAsync,
    readBinary,
    setWindowTitle;

if (ENVIRONMENT_IS_NODE) {
  scriptDirectory = __dirname + '/';

  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  var nodeFS;
  var nodePath;

  read_ = function shell_read(filename, binary) {
    var ret;
      if (!nodeFS) nodeFS = require('fs');
      if (!nodePath) nodePath = require('path');
      filename = nodePath['normalize'](filename);
      ret = nodeFS['readFileSync'](filename);
    return binary ? ret : ret.toString();
  };

  readBinary = function readBinary(filename) {
    var ret = read_(filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret);
    }
    assert(ret.buffer);
    return ret;
  };

  if (process['argv'].length > 1) {
    thisProgram = process['argv'][1].replace(/\\/g, '/');
  }

  arguments_ = process['argv'].slice(2);

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });

  process['on']('unhandledRejection', abort);

  quit_ = function(status) {
    process['exit'](status);
  };

  Module['inspect'] = function () { return '[Emscripten Module object]'; };
} else
if (ENVIRONMENT_IS_SHELL) {


  if (typeof read != 'undefined') {
    read_ = function shell_read(f) {
      return read(f);
    };
  }

  readBinary = function readBinary(f) {
    var data;
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    arguments_ = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    arguments_ = arguments;
  }

  if (typeof quit === 'function') {
    quit_ = function(status) {
      quit(status);
    };
  }

  if (typeof print !== 'undefined') {
    // Prefer to use print/printErr where they exist, as they usually work better.
    if (typeof console === 'undefined') console = {};
    console.log = print;
    console.warn = console.error = typeof printErr !== 'undefined' ? printErr : print;
  }
} else
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) { // Check worker, not web, since window could be polyfilled
    scriptDirectory = self.location.href;
  } else if (document.currentScript) { // web
    scriptDirectory = document.currentScript.src;
  }
  // blob urls look like blob:http://site.com/etc/etc and we cannot infer anything from them.
  // otherwise, slice off the final part of the url to find the script directory.
  // if scriptDirectory does not contain a slash, lastIndexOf will return -1,
  // and scriptDirectory will correctly be replaced with an empty string.
  if (scriptDirectory.indexOf('blob:') !== 0) {
    scriptDirectory = scriptDirectory.substr(0, scriptDirectory.lastIndexOf('/')+1);
  } else {
    scriptDirectory = '';
  }


  read_ = function shell_read(url) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.send(null);
      return xhr.responseText;
  };

  if (ENVIRONMENT_IS_WORKER) {
    readBinary = function readBinary(url) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.responseType = 'arraybuffer';
        xhr.send(null);
        return new Uint8Array(xhr.response);
    };
  }

  readAsync = function readAsync(url, onload, onerror) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function xhr_onload() {
      if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
        onload(xhr.response);
        return;
      }
      onerror();
    };
    xhr.onerror = onerror;
    xhr.send(null);
  };

  setWindowTitle = function(title) { document.title = title };
} else
{
  throw new Error('environment detection error');
}

// Set up the out() and err() hooks, which are how we can print to stdout or
// stderr, respectively.
var out = Module['print'] || console.log.bind(console);
var err = Module['printErr'] || console.warn.bind(console);

// Merge back in the overrides
for (key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}
// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used e.g. in memoryInitializerRequest, which is a large typed array.
moduleOverrides = null;

// Emit code to handle expected values on the Module object. This applies Module.x
// to the proper local x. This has two benefits: first, we only emit it if it is
// expected to arrive, and second, by using a local everywhere else that can be
// minified.
if (Module['arguments']) arguments_ = Module['arguments'];if (!Object.getOwnPropertyDescriptor(Module, 'arguments')) Object.defineProperty(Module, 'arguments', { get: function() { abort('Module.arguments has been replaced with plain arguments_') } });
if (Module['thisProgram']) thisProgram = Module['thisProgram'];if (!Object.getOwnPropertyDescriptor(Module, 'thisProgram')) Object.defineProperty(Module, 'thisProgram', { get: function() { abort('Module.thisProgram has been replaced with plain thisProgram') } });
if (Module['quit']) quit_ = Module['quit'];if (!Object.getOwnPropertyDescriptor(Module, 'quit')) Object.defineProperty(Module, 'quit', { get: function() { abort('Module.quit has been replaced with plain quit_') } });

// perform assertions in shell.js after we set up out() and err(), as otherwise if an assertion fails it cannot print the message
// Assertions on removed incoming Module JS APIs.
assert(typeof Module['memoryInitializerPrefixURL'] === 'undefined', 'Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['pthreadMainPrefixURL'] === 'undefined', 'Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['cdInitializerPrefixURL'] === 'undefined', 'Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['filePackagePrefixURL'] === 'undefined', 'Module.filePackagePrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['read'] === 'undefined', 'Module.read option was removed (modify read_ in JS)');
assert(typeof Module['readAsync'] === 'undefined', 'Module.readAsync option was removed (modify readAsync in JS)');
assert(typeof Module['readBinary'] === 'undefined', 'Module.readBinary option was removed (modify readBinary in JS)');
assert(typeof Module['setWindowTitle'] === 'undefined', 'Module.setWindowTitle option was removed (modify setWindowTitle in JS)');
if (!Object.getOwnPropertyDescriptor(Module, 'read')) Object.defineProperty(Module, 'read', { get: function() { abort('Module.read has been replaced with plain read_') } });
if (!Object.getOwnPropertyDescriptor(Module, 'readAsync')) Object.defineProperty(Module, 'readAsync', { get: function() { abort('Module.readAsync has been replaced with plain readAsync') } });
if (!Object.getOwnPropertyDescriptor(Module, 'readBinary')) Object.defineProperty(Module, 'readBinary', { get: function() { abort('Module.readBinary has been replaced with plain readBinary') } });
// TODO: add when SDL2 is fixed if (!Object.getOwnPropertyDescriptor(Module, 'setWindowTitle')) Object.defineProperty(Module, 'setWindowTitle', { get: function() { abort('Module.setWindowTitle has been replaced with plain setWindowTitle') } });


// TODO remove when SDL2 is fixed (also see above)



// Copyright 2017 The Emscripten Authors.  All rights reserved.
// Emscripten is available under two separate licenses, the MIT license and the
// University of Illinois/NCSA Open Source License.  Both these licenses can be
// found in the LICENSE file.

// {{PREAMBLE_ADDITIONS}}

var STACK_ALIGN = 16;

// stack management, and other functionality that is provided by the compiled code,
// should not be used before it is ready
stackSave = stackRestore = stackAlloc = function() {
  abort('cannot use the stack before compiled code is ready to run, and has provided stack access');
};

function staticAlloc(size) {
  abort('staticAlloc is no longer available at runtime; instead, perform static allocations at compile time (using makeStaticAlloc)');
}

function dynamicAlloc(size) {
  assert(DYNAMICTOP_PTR);
  var ret = HEAP32[DYNAMICTOP_PTR>>2];
  var end = (ret + size + 15) & -16;
  if (end > _emscripten_get_heap_size()) {
    abort('failure to dynamicAlloc - memory growth etc. is not supported there, call malloc/sbrk directly');
  }
  HEAP32[DYNAMICTOP_PTR>>2] = end;
  return ret;
}

function alignMemory(size, factor) {
  if (!factor) factor = STACK_ALIGN; // stack alignment (16-byte) by default
  return Math.ceil(size / factor) * factor;
}

function getNativeTypeSize(type) {
  switch (type) {
    case 'i1': case 'i8': return 1;
    case 'i16': return 2;
    case 'i32': return 4;
    case 'i64': return 8;
    case 'float': return 4;
    case 'double': return 8;
    default: {
      if (type[type.length-1] === '*') {
        return 4; // A pointer
      } else if (type[0] === 'i') {
        var bits = parseInt(type.substr(1));
        assert(bits % 8 === 0, 'getNativeTypeSize invalid bits ' + bits + ', type ' + type);
        return bits / 8;
      } else {
        return 0;
      }
    }
  }
}

function warnOnce(text) {
  if (!warnOnce.shown) warnOnce.shown = {};
  if (!warnOnce.shown[text]) {
    warnOnce.shown[text] = 1;
    err(text);
  }
}

var asm2wasmImports = { // special asm2wasm imports
    "f64-rem": function(x, y) {
        return x % y;
    },
    "debugger": function() {
        debugger;
    }
};



var jsCallStartIndex = 1;
var functionPointers = new Array(0);

// Wraps a JS function as a wasm function with a given signature.
// In the future, we may get a WebAssembly.Function constructor. Until then,
// we create a wasm module that takes the JS function as an import with a given
// signature, and re-exports that as a wasm function.
function convertJsFunctionToWasm(func, sig) {

  // The module is static, with the exception of the type section, which is
  // generated based on the signature passed in.
  var typeSection = [
    0x01, // id: section,
    0x00, // length: 0 (placeholder)
    0x01, // count: 1
    0x60, // form: func
  ];
  var sigRet = sig.slice(0, 1);
  var sigParam = sig.slice(1);
  var typeCodes = {
    'i': 0x7f, // i32
    'j': 0x7e, // i64
    'f': 0x7d, // f32
    'd': 0x7c, // f64
  };

  // Parameters, length + signatures
  typeSection.push(sigParam.length);
  for (var i = 0; i < sigParam.length; ++i) {
    typeSection.push(typeCodes[sigParam[i]]);
  }

  // Return values, length + signatures
  // With no multi-return in MVP, either 0 (void) or 1 (anything else)
  if (sigRet == 'v') {
    typeSection.push(0x00);
  } else {
    typeSection = typeSection.concat([0x01, typeCodes[sigRet]]);
  }

  // Write the overall length of the type section back into the section header
  // (excepting the 2 bytes for the section id and length)
  typeSection[1] = typeSection.length - 2;

  // Rest of the module is static
  var bytes = new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, // magic ("\0asm")
    0x01, 0x00, 0x00, 0x00, // version: 1
  ].concat(typeSection, [
    0x02, 0x07, // import section
      // (import "e" "f" (func 0 (type 0)))
      0x01, 0x01, 0x65, 0x01, 0x66, 0x00, 0x00,
    0x07, 0x05, // export section
      // (export "f" (func 0 (type 0)))
      0x01, 0x01, 0x66, 0x00, 0x00,
  ]));

   // We can compile this wasm module synchronously because it is very small.
  // This accepts an import (at "e.f"), that it reroutes to an export (at "f")
  var module = new WebAssembly.Module(bytes);
  var instance = new WebAssembly.Instance(module, {
    e: {
      f: func
    }
  });
  var wrappedFunc = instance.exports.f;
  return wrappedFunc;
}

// Add a wasm function to the table.
function addFunctionWasm(func, sig) {
  var table = wasmTable;
  var ret = table.length;

  // Grow the table
  try {
    table.grow(1);
  } catch (err) {
    if (!err instanceof RangeError) {
      throw err;
    }
    throw 'Unable to grow wasm table. Use a higher value for RESERVED_FUNCTION_POINTERS or set ALLOW_TABLE_GROWTH.';
  }

  // Insert new element
  try {
    // Attempting to call this with JS function will cause of table.set() to fail
    table.set(ret, func);
  } catch (err) {
    if (!err instanceof TypeError) {
      throw err;
    }
    assert(typeof sig !== 'undefined', 'Missing signature argument to addFunction');
    var wrapped = convertJsFunctionToWasm(func, sig);
    table.set(ret, wrapped);
  }

  return ret;
}

function removeFunctionWasm(index) {
  // TODO(sbc): Look into implementing this to allow re-using of table slots
}

// 'sig' parameter is required for the llvm backend but only when func is not
// already a WebAssembly function.
function addFunction(func, sig) {
  assert(typeof func !== 'undefined');


  var base = 0;
  for (var i = base; i < base + 0; i++) {
    if (!functionPointers[i]) {
      functionPointers[i] = func;
      return jsCallStartIndex + i;
    }
  }
  throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';

}

function removeFunction(index) {

  functionPointers[index-jsCallStartIndex] = null;
}

var funcWrappers = {};

function getFuncWrapper(func, sig) {
  if (!func) return; // on null pointer, return undefined
  assert(sig);
  if (!funcWrappers[sig]) {
    funcWrappers[sig] = {};
  }
  var sigCache = funcWrappers[sig];
  if (!sigCache[func]) {
    // optimize away arguments usage in common cases
    if (sig.length === 1) {
      sigCache[func] = function dynCall_wrapper() {
        return dynCall(sig, func);
      };
    } else if (sig.length === 2) {
      sigCache[func] = function dynCall_wrapper(arg) {
        return dynCall(sig, func, [arg]);
      };
    } else {
      // general case
      sigCache[func] = function dynCall_wrapper() {
        return dynCall(sig, func, Array.prototype.slice.call(arguments));
      };
    }
  }
  return sigCache[func];
}


function makeBigInt(low, high, unsigned) {
  return unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0));
}

function dynCall(sig, ptr, args) {
  if (args && args.length) {
    assert(args.length == sig.length-1);
    assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
    return Module['dynCall_' + sig].apply(null, [ptr].concat(args));
  } else {
    assert(sig.length == 1);
    assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
    return Module['dynCall_' + sig].call(null, ptr);
  }
}

var tempRet0 = 0;

var setTempRet0 = function(value) {
  tempRet0 = value;
};

var getTempRet0 = function() {
  return tempRet0;
};

function getCompilerSetting(name) {
  throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for getCompilerSetting or emscripten_get_compiler_setting to work';
}

var Runtime = {
  // helpful errors
  getTempRet0: function() { abort('getTempRet0() is now a top-level function, after removing the Runtime object. Remove "Runtime."') },
  staticAlloc: function() { abort('staticAlloc() is now a top-level function, after removing the Runtime object. Remove "Runtime."') },
  stackAlloc: function() { abort('stackAlloc() is now a top-level function, after removing the Runtime object. Remove "Runtime."') },
};

// The address globals begin at. Very low in memory, for code size and optimization opportunities.
// Above 0 is static memory, starting with globals.
// Then the stack.
// Then 'dynamic' memory for sbrk.
var GLOBAL_BASE = 1024;




// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html


var wasmBinary;if (Module['wasmBinary']) wasmBinary = Module['wasmBinary'];if (!Object.getOwnPropertyDescriptor(Module, 'wasmBinary')) Object.defineProperty(Module, 'wasmBinary', { get: function() { abort('Module.wasmBinary has been replaced with plain wasmBinary') } });
var noExitRuntime;if (Module['noExitRuntime']) noExitRuntime = Module['noExitRuntime'];if (!Object.getOwnPropertyDescriptor(Module, 'noExitRuntime')) Object.defineProperty(Module, 'noExitRuntime', { get: function() { abort('Module.noExitRuntime has been replaced with plain noExitRuntime') } });


if (typeof WebAssembly !== 'object') {
  abort('No WebAssembly support found. Build with -s WASM=0 to target JavaScript instead.');
}


// In MINIMAL_RUNTIME, setValue() and getValue() are only available when building with safe heap enabled, for heap safety checking.
// In traditional runtime, setValue() and getValue() are always available (although their use is highly discouraged due to perf penalties)

/** @type {function(number, number, string, boolean=)} */
function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}

/** @type {function(number, string, boolean=)} */
function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for getValue: ' + type);
    }
  return null;
}





// Wasm globals

var wasmMemory;

// Potentially used for direct table calls.
var wasmTable;


//========================================
// Runtime essentials
//========================================

// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS = 0;

/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  assert(func, 'Cannot call unknown function ' + ident + ', make sure it is exported');
  return func;
}

// C calling interface.
function ccall(ident, returnType, argTypes, args, opts) {
  // For fast lookup of conversion functions
  var toC = {
    'string': function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        var len = (str.length << 2) + 1;
        ret = stackAlloc(len);
        stringToUTF8(str, ret, len);
      }
      return ret;
    },
    'array': function(arr) {
      var ret = stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    }
  };

  function convertReturnValue(ret) {
    if (returnType === 'string') return UTF8ToString(ret);
    if (returnType === 'boolean') return Boolean(ret);
    return ret;
  }

  var func = getCFunc(ident);
  var cArgs = [];
  var stack = 0;
  assert(returnType !== 'array', 'Return type should not be "array".');
  if (args) {
    for (var i = 0; i < args.length; i++) {
      var converter = toC[argTypes[i]];
      if (converter) {
        if (stack === 0) stack = stackSave();
        cArgs[i] = converter(args[i]);
      } else {
        cArgs[i] = args[i];
      }
    }
  }
  var ret = func.apply(null, cArgs);

  ret = convertReturnValue(ret);
  if (stack !== 0) stackRestore(stack);
  return ret;
}

function cwrap(ident, returnType, argTypes, opts) {
  return function() {
    return ccall(ident, returnType, argTypes, arguments, opts);
  }
}

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_DYNAMIC = 2; // Cannot be freed except through sbrk
var ALLOC_NONE = 3; // Do not allocate

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
/** @type {function((TypedArray|Array<number>|number), string, number, number=)} */
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc,
    stackAlloc,
    dynamicAlloc][allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var stop;
    ptr = ret;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(/** @type {!Uint8Array} */ (slab), ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    assert(type, 'Must know what type to store in allocate!');

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}

// Allocate memory during any stage of startup - static memory early on, dynamic memory later, malloc when ready
function getMemory(size) {
  if (!runtimeInitialized) return dynamicAlloc(size);
  return _malloc(size);
}




/** @type {function(number, number=)} */
function Pointer_stringify(ptr, length) {
  abort("this function has been removed - you should use UTF8ToString(ptr, maxBytesToRead) instead!");
}

// Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function AsciiToString(ptr) {
  var str = '';
  while (1) {
    var ch = HEAPU8[((ptr++)>>0)];
    if (!ch) return str;
    str += String.fromCharCode(ch);
  }
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, false);
}


// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

var UTF8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined;

/**
 * @param {number} idx
 * @param {number=} maxBytesToRead
 * @return {string}
 */
function UTF8ArrayToString(u8Array, idx, maxBytesToRead) {
  var endIdx = idx + maxBytesToRead;
  var endPtr = idx;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  // (As a tiny code save trick, compare endPtr against endIdx using a negation, so that undefined means Infinity)
  while (u8Array[endPtr] && !(endPtr >= endIdx)) ++endPtr;

  if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
    return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
  } else {
    var str = '';
    // If building with TextDecoder, we have already computed the string length above, so test loop end condition against that
    while (idx < endPtr) {
      // For UTF8 byte structure, see:
      // http://en.wikipedia.org/wiki/UTF-8#Description
      // https://www.ietf.org/rfc/rfc2279.txt
      // https://tools.ietf.org/html/rfc3629
      var u0 = u8Array[idx++];
      if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
      var u1 = u8Array[idx++] & 63;
      if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
      var u2 = u8Array[idx++] & 63;
      if ((u0 & 0xF0) == 0xE0) {
        u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
      } else {
        if ((u0 & 0xF8) != 0xF0) warnOnce('Invalid UTF-8 leading byte 0x' + u0.toString(16) + ' encountered when deserializing a UTF-8 string on the asm.js/wasm heap to a JS string!');
        u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (u8Array[idx++] & 63);
      }

      if (u0 < 0x10000) {
        str += String.fromCharCode(u0);
      } else {
        var ch = u0 - 0x10000;
        str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
      }
    }
  }
  return str;
}

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns a
// copy of that string as a Javascript String object.
// maxBytesToRead: an optional length that specifies the maximum number of bytes to read. You can omit
//                 this parameter to scan the string until the first \0 byte. If maxBytesToRead is
//                 passed, and the string at [ptr, ptr+maxBytesToReadr[ contains a null byte in the
//                 middle, then the string will cut short at that byte index (i.e. maxBytesToRead will
//                 not produce a string of exact length [ptr, ptr+maxBytesToRead[)
//                 N.B. mixing frequent uses of UTF8ToString() with and without maxBytesToRead may
//                 throw JS JIT optimizations off, so it is worth to consider consistently using one
//                 style or the other.
/**
 * @param {number} ptr
 * @param {number=} maxBytesToRead
 * @return {string}
 */
function UTF8ToString(ptr, maxBytesToRead) {
  return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : '';
}

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array.
//                    This count should include the null terminator,
//                    i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) {
      var u1 = str.charCodeAt(++i);
      u = 0x10000 + ((u & 0x3FF) << 10) | (u1 & 0x3FF);
    }
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 0xC0 | (u >> 6);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 0xE0 | (u >> 12);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 3 >= endIdx) break;
      if (u >= 0x200000) warnOnce('Invalid Unicode code point 0x' + u.toString(16) + ' encountered when serializing a JS string to an UTF-8 string on the asm.js/wasm heap! (Valid unicode code points should be in range 0-0x1FFFFF).');
      outU8Array[outIdx++] = 0xF0 | (u >> 18);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  outU8Array[outIdx] = 0;
  return outIdx - startIdx;
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
}

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.
function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) ++len;
    else if (u <= 0x7FF) len += 2;
    else if (u <= 0xFFFF) len += 3;
    else len += 4;
  }
  return len;
}


// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

var UTF16Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-16le') : undefined;
function UTF16ToString(ptr) {
  assert(ptr % 2 == 0, 'Pointer passed to UTF16ToString must be aligned to two bytes!');
  var endPtr = ptr;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  var idx = endPtr >> 1;
  while (HEAP16[idx]) ++idx;
  endPtr = idx << 1;

  if (endPtr - ptr > 32 && UTF16Decoder) {
    return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
  } else {
    var i = 0;

    var str = '';
    while (1) {
      var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
      if (codeUnit == 0) return str;
      ++i;
      // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
      str += String.fromCharCode(codeUnit);
    }
  }
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
// Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF16(str, outPtr, maxBytesToWrite) {
  assert(outPtr % 2 == 0, 'Pointer passed to stringToUTF16 must be aligned to two bytes!');
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF16(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2; // Null terminator.
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[((outPtr)>>1)]=codeUnit;
    outPtr += 2;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[((outPtr)>>1)]=0;
  return outPtr - startPtr;
}

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}

function UTF32ToString(ptr) {
  assert(ptr % 4 == 0, 'Pointer passed to UTF32ToString must be aligned to four bytes!');
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
// Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF32(str, outPtr, maxBytesToWrite) {
  assert(outPtr % 4 == 0, 'Pointer passed to stringToUTF32 must be aligned to four bytes!');
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF32(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[((outPtr)>>2)]=codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[((outPtr)>>2)]=0;
  return outPtr - startPtr;
}

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF32(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
    len += 4;
  }

  return len;
}

// Allocate heap space for a JS string, and write it there.
// It is the responsibility of the caller to free() that memory.
function allocateUTF8(str) {
  var size = lengthBytesUTF8(str) + 1;
  var ret = _malloc(size);
  if (ret) stringToUTF8Array(str, HEAP8, ret, size);
  return ret;
}

// Allocate stack space for a JS string, and write it there.
function allocateUTF8OnStack(str) {
  var size = lengthBytesUTF8(str) + 1;
  var ret = stackAlloc(size);
  stringToUTF8Array(str, HEAP8, ret, size);
  return ret;
}

// Deprecated: This function should not be called because it is unsafe and does not provide
// a maximum length limit of how many bytes it is allowed to write. Prefer calling the
// function stringToUTF8Array() instead, which takes in a maximum length that can be used
// to be secure from out of bounds writes.
/** @deprecated */
function writeStringToMemory(string, buffer, dontAddNull) {
  warnOnce('writeStringToMemory is deprecated and should not be called! Use stringToUTF8() instead!');

  var /** @type {number} */ lastChar, /** @type {number} */ end;
  if (dontAddNull) {
    // stringToUTF8Array always appends null. If we don't want to do that, remember the
    // character that existed at the location where the null will be placed, and restore
    // that after the write (below).
    end = buffer + lengthBytesUTF8(string);
    lastChar = HEAP8[end];
  }
  stringToUTF8(string, buffer, Infinity);
  if (dontAddNull) HEAP8[end] = lastChar; // Restore the value under the null character.
}

function writeArrayToMemory(array, buffer) {
  assert(array.length >= 0, 'writeArrayToMemory array must have a length (should be an array or typed array)')
  HEAP8.set(array, buffer);
}

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    assert(str.charCodeAt(i) === str.charCodeAt(i)&0xff);
    HEAP8[((buffer++)>>0)]=str.charCodeAt(i);
  }
  // Null-terminate the pointer to the HEAP.
  if (!dontAddNull) HEAP8[((buffer)>>0)]=0;
}




// Memory management

var PAGE_SIZE = 16384;
var WASM_PAGE_SIZE = 65536;
var ASMJS_PAGE_SIZE = 16777216;

function alignUp(x, multiple) {
  if (x % multiple > 0) {
    x += multiple - (x % multiple);
  }
  return x;
}

var HEAP,
/** @type {ArrayBuffer} */
  buffer,
/** @type {Int8Array} */
  HEAP8,
/** @type {Uint8Array} */
  HEAPU8,
/** @type {Int16Array} */
  HEAP16,
/** @type {Uint16Array} */
  HEAPU16,
/** @type {Int32Array} */
  HEAP32,
/** @type {Uint32Array} */
  HEAPU32,
/** @type {Float32Array} */
  HEAPF32,
/** @type {Float64Array} */
  HEAPF64;

function updateGlobalBufferAndViews(buf) {
  buffer = buf;
  Module['HEAP8'] = HEAP8 = new Int8Array(buf);
  Module['HEAP16'] = HEAP16 = new Int16Array(buf);
  Module['HEAP32'] = HEAP32 = new Int32Array(buf);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(buf);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(buf);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(buf);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(buf);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(buf);
}


var STATIC_BASE = 1024,
    STACK_BASE = 3968,
    STACKTOP = STACK_BASE,
    STACK_MAX = 5246848,
    DYNAMIC_BASE = 5246848,
    DYNAMICTOP_PTR = 3936;

assert(STACK_BASE % 16 === 0, 'stack must start aligned');
assert(DYNAMIC_BASE % 16 === 0, 'heap must start aligned');



var TOTAL_STACK = 5242880;
if (Module['TOTAL_STACK']) assert(TOTAL_STACK === Module['TOTAL_STACK'], 'the stack size can no longer be determined at runtime')

var INITIAL_TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;if (!Object.getOwnPropertyDescriptor(Module, 'TOTAL_MEMORY')) Object.defineProperty(Module, 'TOTAL_MEMORY', { get: function() { abort('Module.TOTAL_MEMORY has been replaced with plain INITIAL_TOTAL_MEMORY') } });

assert(INITIAL_TOTAL_MEMORY >= TOTAL_STACK, 'TOTAL_MEMORY should be larger than TOTAL_STACK, was ' + INITIAL_TOTAL_MEMORY + '! (TOTAL_STACK=' + TOTAL_STACK + ')');

// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && Int32Array.prototype.subarray !== undefined && Int32Array.prototype.set !== undefined,
       'JS engine does not provide full typed array support');







  if (Module['wasmMemory']) {
    wasmMemory = Module['wasmMemory'];
  } else
  {
    wasmMemory = new WebAssembly.Memory({
      'initial': INITIAL_TOTAL_MEMORY / WASM_PAGE_SIZE
      ,
      'maximum': INITIAL_TOTAL_MEMORY / WASM_PAGE_SIZE
    });
  }


if (wasmMemory) {
  buffer = wasmMemory.buffer;
}

// If the user provides an incorrect length, just use that length instead rather than providing the user to
// specifically provide the memory length with Module['TOTAL_MEMORY'].
INITIAL_TOTAL_MEMORY = buffer.byteLength;
assert(INITIAL_TOTAL_MEMORY % WASM_PAGE_SIZE === 0);
updateGlobalBufferAndViews(buffer);

HEAP32[DYNAMICTOP_PTR>>2] = DYNAMIC_BASE;


// Initializes the stack cookie. Called at the startup of main and at the startup of each thread in pthreads mode.
function writeStackCookie() {
  assert((STACK_MAX & 3) == 0);
  HEAPU32[(STACK_MAX >> 2)-1] = 0x02135467;
  HEAPU32[(STACK_MAX >> 2)-2] = 0x89BACDFE;
}

function checkStackCookie() {
  var cookie1 = HEAPU32[(STACK_MAX >> 2)-1];
  var cookie2 = HEAPU32[(STACK_MAX >> 2)-2];
  if (cookie1 != 0x02135467 || cookie2 != 0x89BACDFE) {
    abort('Stack overflow! Stack cookie has been overwritten, expected hex dwords 0x89BACDFE and 0x02135467, but received 0x' + cookie2.toString(16) + ' ' + cookie1.toString(16));
  }
  // Also test the global address 0 for integrity.
  // We don't do this with ASan because ASan does its own checks for this.
  if (HEAP32[0] !== 0x63736d65 /* 'emsc' */) abort('Runtime error: The application has corrupted its heap memory area (address zero)!');
}

function abortStackOverflow(allocSize) {
  abort('Stack overflow! Attempted to allocate ' + allocSize + ' bytes on the stack, but stack has only ' + (STACK_MAX - stackSave() + allocSize) + ' bytes available!');
}


  HEAP32[0] = 0x63736d65; /* 'emsc' */



// Endianness check (note: assumes compiler arch was little-endian)
HEAP16[1] = 0x6373;
if (HEAPU8[2] !== 0x73 || HEAPU8[3] !== 0x63) throw 'Runtime error: expected the system to be little-endian!';

function abortFnPtrError(ptr, sig) {
	abort("Invalid function pointer " + ptr + " called with signature '" + sig + "'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this). Build with ASSERTIONS=2 for more info.");
}



function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Module['dynCall_v'](func);
      } else {
        Module['dynCall_vi'](func, callback.arg);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the main() is called

var runtimeInitialized = false;
var runtimeExited = false;


function preRun() {

  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }

  callRuntimeCallbacks(__ATPRERUN__);
}

function initRuntime() {
  checkStackCookie();
  assert(!runtimeInitialized);
  runtimeInitialized = true;
  
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  checkStackCookie();
  
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  checkStackCookie();
  runtimeExited = true;
}

function postRun() {
  checkStackCookie();

  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }

  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}

function addOnExit(cb) {
}

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}


assert(Math.imul, 'This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.fround, 'This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.clz32, 'This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.trunc, 'This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');

var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_round = Math.round;
var Math_min = Math.min;
var Math_max = Math.max;
var Math_clz32 = Math.clz32;
var Math_trunc = Math.trunc;



// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// Module.preRun (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
var runDependencyTracking = {};

function getUniqueRunDependency(id) {
  var orig = id;
  while (1) {
    if (!runDependencyTracking[id]) return id;
    id = orig + Math.random();
  }
  return id;
}

function addRunDependency(id) {
  runDependencies++;

  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }

  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval !== 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(function() {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            err('still waiting on run dependencies:');
          }
          err('dependency: ' + dep);
        }
        if (shown) {
          err('(end of list)');
        }
      }, 10000);
    }
  } else {
    err('warning: run dependency added without ID');
  }
}

function removeRunDependency(id) {
  runDependencies--;

  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }

  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    err('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data


var memoryInitializer = null;




// show errors on likely calls to FS when it was not included
var FS = {
  error: function() {
    abort('Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with  -s FORCE_FILESYSTEM=1');
  },
  init: function() { FS.error() },
  createDataFile: function() { FS.error() },
  createPreloadedFile: function() { FS.error() },
  createLazyFile: function() { FS.error() },
  open: function() { FS.error() },
  mkdev: function() { FS.error() },
  registerDevice: function() { FS.error() },
  analyzePath: function() { FS.error() },
  loadFilesFromDB: function() { FS.error() },

  ErrnoError: function ErrnoError() { FS.error() },
};
Module['FS_createDataFile'] = FS.createDataFile;
Module['FS_createPreloadedFile'] = FS.createPreloadedFile;



// Copyright 2017 The Emscripten Authors.  All rights reserved.
// Emscripten is available under two separate licenses, the MIT license and the
// University of Illinois/NCSA Open Source License.  Both these licenses can be
// found in the LICENSE file.

// Prefix of data URIs emitted by SINGLE_FILE and related options.
var dataURIPrefix = 'data:application/octet-stream;base64,';

// Indicates whether filename is a base64 data URI.
function isDataURI(filename) {
  return String.prototype.startsWith ?
      filename.startsWith(dataURIPrefix) :
      filename.indexOf(dataURIPrefix) === 0;
}




var wasmBinaryFile = 'grapheme_wasm.wasm';
if (!isDataURI(wasmBinaryFile)) {
  wasmBinaryFile = locateFile(wasmBinaryFile);
}

function getBinary() {
  try {
    if (wasmBinary) {
      return new Uint8Array(wasmBinary);
    }

    if (readBinary) {
      return readBinary(wasmBinaryFile);
    } else {
      throw "both async and sync fetching of the wasm failed";
    }
  }
  catch (err) {
    abort(err);
  }
}

function getBinaryPromise() {
  // if we don't have the binary yet, and have the Fetch api, use that
  // in some environments, like Electron's render process, Fetch api may be present, but have a different context than expected, let's only use it on the Web
  if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && typeof fetch === 'function') {
    return fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function(response) {
      if (!response['ok']) {
        throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
      }
      return response['arrayBuffer']();
    }).catch(function () {
      return getBinary();
    });
  }
  // Otherwise, getBinary should be able to get it synchronously
  return new Promise(function(resolve, reject) {
    resolve(getBinary());
  });
}



// Create the wasm instance.
// Receives the wasm imports, returns the exports.
function createWasm(env) {
  // prepare imports
  var info = {
    'env': env,
    'wasi_unstable': env
    ,
    'global': {
      'NaN': NaN,
      'Infinity': Infinity
    },
    'global.Math': Math,
    'asm2wasm': asm2wasmImports
  };
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  function receiveInstance(instance, module) {
    var exports = instance.exports;
    Module['asm'] = exports;
    removeRunDependency('wasm-instantiate');
  }
   // we can't run yet (except in a pthread, where we have a custom sync instantiator)
  addRunDependency('wasm-instantiate');


  // Async compilation can be confusing when an error on the page overwrites Module
  // (for example, if the order of elements is wrong, and the one defining Module is
  // later), so we save Module and check it later.
  var trueModule = Module;
  function receiveInstantiatedSource(output) {
    // 'output' is a WebAssemblyInstantiatedSource object which has both the module and instance.
    // receiveInstance() will swap in the exports (to Module.asm) so they can be called
    assert(Module === trueModule, 'the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?');
    trueModule = null;
      // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193, the above line no longer optimizes out down to the following line.
      // When the regression is fixed, can restore the above USE_PTHREADS-enabled path.
    receiveInstance(output['instance']);
  }


  function instantiateArrayBuffer(receiver) {
    return getBinaryPromise().then(function(binary) {
      return WebAssembly.instantiate(binary, info);
    }).then(receiver, function(reason) {
      err('failed to asynchronously prepare wasm: ' + reason);
      abort(reason);
    });
  }

  // Prefer streaming instantiation if available.
  function instantiateAsync() {
    if (!wasmBinary &&
        typeof WebAssembly.instantiateStreaming === 'function' &&
        !isDataURI(wasmBinaryFile) &&
        typeof fetch === 'function') {
      fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function (response) {
        var result = WebAssembly.instantiateStreaming(response, info);
        return result.then(receiveInstantiatedSource, function(reason) {
            // We expect the most common failure cause to be a bad MIME type for the binary,
            // in which case falling back to ArrayBuffer instantiation should work.
            err('wasm streaming compile failed: ' + reason);
            err('falling back to ArrayBuffer instantiation');
            instantiateArrayBuffer(receiveInstantiatedSource);
          });
      });
    } else {
      return instantiateArrayBuffer(receiveInstantiatedSource);
    }
  }
  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to run the instantiation parallel
  // to any other async startup actions they are performing.
  if (Module['instantiateWasm']) {
    try {
      var exports = Module['instantiateWasm'](info, receiveInstance);
      return exports;
    } catch(e) {
      err('Module.instantiateWasm callback failed with error: ' + e);
      return false;
    }
  }

  instantiateAsync();
  return {}; // no exports yet; we'll fill them in later
}

// Provide an "asm.js function" for the application, called to "link" the asm.js module. We instantiate
// the wasm module at that time, and it receives imports and provides exports and so forth, the app
// doesn't need to care that it is wasm or asm.js.

Module['asm'] = function(global, env, providedBuffer) {
  // memory was already allocated (so js could use the buffer)
  env['memory'] = wasmMemory
  ;
  // import table
  env['table'] = wasmTable = new WebAssembly.Table({
    'initial': 10,
    'maximum': 10,
    'element': 'anyfunc'
  });
  // With the wasm backend __memory_base and __table_base and only needed for
  // relocatable output.
  env['__memory_base'] = 1024; // tell the memory segments where to place themselves
  // table starts at 0 by default (even in dynamic linking, for the main module)
  env['__table_base'] = 0;

  var exports = createWasm(env);
  assert(exports, 'binaryen setup failed (no wasm support?)');
  return exports;
};

// Globals used by JS i64 conversions
var tempDouble;
var tempI64;

// === Body ===

var ASM_CONSTS = [];





// STATICTOP = STATIC_BASE + 2944;
/* global initializers */ /*__ATINIT__.push();*/








/* no memory initializer */
var tempDoublePtr = 3952
assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much
  HEAP8[tempDoublePtr] = HEAP8[ptr];
  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];
  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];
  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];
}

function copyTempDouble(ptr) {
  HEAP8[tempDoublePtr] = HEAP8[ptr];
  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];
  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];
  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];
  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];
  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];
  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];
  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];
}

// {{PRE_LIBRARY}}


  function demangle(func) {
      warnOnce('warning: build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
      return func;
    }

  function demangleAll(text) {
      var regex =
        /\b__Z[\w\d_]+/g;
      return text.replace(regex,
        function(x) {
          var y = demangle(x);
          return x === y ? x : (y + ' [' + x + ']');
        });
    }

  function jsStackTrace() {
      var err = new Error();
      if (!err.stack) {
        // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
        // so try that as a special-case.
        try {
          throw new Error(0);
        } catch(e) {
          err = e;
        }
        if (!err.stack) {
          return '(no stack trace available)';
        }
      }
      return err.stack.toString();
    }

  function stackTrace() {
      var js = jsStackTrace();
      if (Module['extraStackTrace']) js += '\n' + Module['extraStackTrace']();
      return demangleAll(js);
    }

  function ___lock() {}

  function ___unlock() {}

  
  
  function flush_NO_FILESYSTEM() {
      // flush anything remaining in the buffers during shutdown
      var fflush = Module["_fflush"];
      if (fflush) fflush(0);
      var buffers = SYSCALLS.buffers;
      if (buffers[1].length) SYSCALLS.printChar(1, 10);
      if (buffers[2].length) SYSCALLS.printChar(2, 10);
    }
  
  
  var PATH={splitPath:function(filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function(parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up; up--) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function(path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function(path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function(path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function(path) {
        return PATH.splitPath(path)[3];
      },join:function() {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function(l, r) {
        return PATH.normalize(l + '/' + r);
      }};var SYSCALLS={buffers:[null,[],[]],printChar:function(stream, curr) {
        var buffer = SYSCALLS.buffers[stream];
        assert(buffer);
        if (curr === 0 || curr === 10) {
          (stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
          buffer.length = 0;
        } else {
          buffer.push(curr);
        }
      },varargs:0,get:function(varargs) {
        SYSCALLS.varargs += 4;
        var ret = HEAP32[(((SYSCALLS.varargs)-(4))>>2)];
        return ret;
      },getStr:function() {
        var ret = UTF8ToString(SYSCALLS.get());
        return ret;
      },get64:function() {
        var low = SYSCALLS.get(), high = SYSCALLS.get();
        if (low >= 0) assert(high === 0);
        else assert(high === -1);
        return low;
      },getZero:function() {
        assert(SYSCALLS.get() === 0);
      }};function _fd_write(stream, iov, iovcnt, pnum) {try {
  
      // hack to support printf in SYSCALLS_REQUIRE_FILESYSTEM=0
      var num = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAP32[(((iov)+(i*8))>>2)];
        var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
        for (var j = 0; j < len; j++) {
          SYSCALLS.printChar(stream, HEAPU8[ptr+j]);
        }
        num += len;
      }
      HEAP32[((pnum)>>2)]=num
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }function ___wasi_fd_write(
  ) {
  return _fd_write.apply(null, arguments)
  }

  function _emscripten_get_heap_size() {
      return HEAP8.length;
    }

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
    }
  
   

   

  
  function ___setErrNo(value) {
      if (Module['___errno_location']) HEAP32[((Module['___errno_location']())>>2)]=value;
      else err('failed to set errno from JS');
      return value;
    }
  
  
  function abortOnCannotGrowMemory(requestedSize) {
      abort('Cannot enlarge memory arrays to size ' + requestedSize + ' bytes (OOM). Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value ' + HEAP8.length + ', (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ');
    }function _emscripten_resize_heap(requestedSize) {
      abortOnCannotGrowMemory(requestedSize);
    } 
var ASSERTIONS = true;

// Copyright 2017 The Emscripten Authors.  All rights reserved.
// Emscripten is available under two separate licenses, the MIT license and the
// University of Illinois/NCSA Open Source License.  Both these licenses can be
// found in the LICENSE file.

/** @type {function(string, boolean=, number=)} */
function intArrayFromString(stringy, dontAddNull, length) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      if (ASSERTIONS) {
        assert(false, 'Character code ' + chr + ' (' + String.fromCharCode(chr) + ')  at offset ' + i + ' not in 0x00-0xFF.');
      }
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}


// ASM_LIBRARY EXTERN PRIMITIVES: Int8Array,Int32Array

function nullFunc_ii(x) { abortFnPtrError(x, 'ii'); }
function nullFunc_iiii(x) { abortFnPtrError(x, 'iiii'); }
function nullFunc_jiji(x) { abortFnPtrError(x, 'jiji'); }

var asmGlobalArg = {};

var asmLibraryArg = {
  "abort": abort,
  "setTempRet0": setTempRet0,
  "getTempRet0": getTempRet0,
  "abortStackOverflow": abortStackOverflow,
  "nullFunc_ii": nullFunc_ii,
  "nullFunc_iiii": nullFunc_iiii,
  "nullFunc_jiji": nullFunc_jiji,
  "___lock": ___lock,
  "___setErrNo": ___setErrNo,
  "___unlock": ___unlock,
  "___wasi_fd_write": ___wasi_fd_write,
  "_emscripten_get_heap_size": _emscripten_get_heap_size,
  "_emscripten_memcpy_big": _emscripten_memcpy_big,
  "_emscripten_resize_heap": _emscripten_resize_heap,
  "_fd_write": _fd_write,
  "abortOnCannotGrowMemory": abortOnCannotGrowMemory,
  "demangle": demangle,
  "demangleAll": demangleAll,
  "flush_NO_FILESYSTEM": flush_NO_FILESYSTEM,
  "jsStackTrace": jsStackTrace,
  "stackTrace": stackTrace,
  "tempDoublePtr": tempDoublePtr,
  "DYNAMICTOP_PTR": DYNAMICTOP_PTR
};
// EMSCRIPTEN_START_ASM
var asm =Module["asm"]// EMSCRIPTEN_END_ASM
(asmGlobalArg, asmLibraryArg, buffer);

Module["asm"] = asm;
var ___errno_location = Module["___errno_location"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["___errno_location"].apply(null, arguments)
};

var _fflush = Module["_fflush"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_fflush"].apply(null, arguments)
};

var _free = Module["_free"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_free"].apply(null, arguments)
};

var _malloc = Module["_malloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_malloc"].apply(null, arguments)
};

var _memcpy = Module["_memcpy"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_memcpy"].apply(null, arguments)
};

var _memset = Module["_memset"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_memset"].apply(null, arguments)
};

var _pixelToGLFloatArray = Module["_pixelToGLFloatArray"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_pixelToGLFloatArray"].apply(null, arguments)
};

var _sbrk = Module["_sbrk"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_sbrk"].apply(null, arguments)
};

var establishStackSpace = Module["establishStackSpace"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["establishStackSpace"].apply(null, arguments)
};

var stackAlloc = Module["stackAlloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["stackAlloc"].apply(null, arguments)
};

var stackRestore = Module["stackRestore"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["stackRestore"].apply(null, arguments)
};

var stackSave = Module["stackSave"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["stackSave"].apply(null, arguments)
};

var dynCall_ii = Module["dynCall_ii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_ii"].apply(null, arguments)
};

var dynCall_iiii = Module["dynCall_iiii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_iiii"].apply(null, arguments)
};

var dynCall_jiji = Module["dynCall_jiji"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_jiji"].apply(null, arguments)
};
;



// === Auto-generated postamble setup entry stuff ===

Module['asm'] = asm;

if (!Object.getOwnPropertyDescriptor(Module, "intArrayFromString")) Module["intArrayFromString"] = function() { abort("'intArrayFromString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "intArrayToString")) Module["intArrayToString"] = function() { abort("'intArrayToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
Module["ccall"] = ccall;
if (!Object.getOwnPropertyDescriptor(Module, "cwrap")) Module["cwrap"] = function() { abort("'cwrap' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "setValue")) Module["setValue"] = function() { abort("'setValue' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "getValue")) Module["getValue"] = function() { abort("'getValue' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "allocate")) Module["allocate"] = function() { abort("'allocate' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "getMemory")) Module["getMemory"] = function() { abort("'getMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Object.getOwnPropertyDescriptor(Module, "AsciiToString")) Module["AsciiToString"] = function() { abort("'AsciiToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "stringToAscii")) Module["stringToAscii"] = function() { abort("'stringToAscii' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "UTF8ArrayToString")) Module["UTF8ArrayToString"] = function() { abort("'UTF8ArrayToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "UTF8ToString")) Module["UTF8ToString"] = function() { abort("'UTF8ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "stringToUTF8Array")) Module["stringToUTF8Array"] = function() { abort("'stringToUTF8Array' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "stringToUTF8")) Module["stringToUTF8"] = function() { abort("'stringToUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "lengthBytesUTF8")) Module["lengthBytesUTF8"] = function() { abort("'lengthBytesUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "UTF16ToString")) Module["UTF16ToString"] = function() { abort("'UTF16ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "stringToUTF16")) Module["stringToUTF16"] = function() { abort("'stringToUTF16' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "lengthBytesUTF16")) Module["lengthBytesUTF16"] = function() { abort("'lengthBytesUTF16' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "UTF32ToString")) Module["UTF32ToString"] = function() { abort("'UTF32ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "stringToUTF32")) Module["stringToUTF32"] = function() { abort("'stringToUTF32' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "lengthBytesUTF32")) Module["lengthBytesUTF32"] = function() { abort("'lengthBytesUTF32' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "allocateUTF8")) Module["allocateUTF8"] = function() { abort("'allocateUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "stackTrace")) Module["stackTrace"] = function() { abort("'stackTrace' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "addOnPreRun")) Module["addOnPreRun"] = function() { abort("'addOnPreRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "addOnInit")) Module["addOnInit"] = function() { abort("'addOnInit' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "addOnPreMain")) Module["addOnPreMain"] = function() { abort("'addOnPreMain' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "addOnExit")) Module["addOnExit"] = function() { abort("'addOnExit' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "addOnPostRun")) Module["addOnPostRun"] = function() { abort("'addOnPostRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "writeStringToMemory")) Module["writeStringToMemory"] = function() { abort("'writeStringToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "writeArrayToMemory")) Module["writeArrayToMemory"] = function() { abort("'writeArrayToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "writeAsciiToMemory")) Module["writeAsciiToMemory"] = function() { abort("'writeAsciiToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "addRunDependency")) Module["addRunDependency"] = function() { abort("'addRunDependency' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Object.getOwnPropertyDescriptor(Module, "removeRunDependency")) Module["removeRunDependency"] = function() { abort("'removeRunDependency' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Object.getOwnPropertyDescriptor(Module, "ENV")) Module["ENV"] = function() { abort("'ENV' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "FS")) Module["FS"] = function() { abort("'FS' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "FS_createFolder")) Module["FS_createFolder"] = function() { abort("'FS_createFolder' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Object.getOwnPropertyDescriptor(Module, "FS_createPath")) Module["FS_createPath"] = function() { abort("'FS_createPath' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Object.getOwnPropertyDescriptor(Module, "FS_createDataFile")) Module["FS_createDataFile"] = function() { abort("'FS_createDataFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Object.getOwnPropertyDescriptor(Module, "FS_createPreloadedFile")) Module["FS_createPreloadedFile"] = function() { abort("'FS_createPreloadedFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Object.getOwnPropertyDescriptor(Module, "FS_createLazyFile")) Module["FS_createLazyFile"] = function() { abort("'FS_createLazyFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Object.getOwnPropertyDescriptor(Module, "FS_createLink")) Module["FS_createLink"] = function() { abort("'FS_createLink' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Object.getOwnPropertyDescriptor(Module, "FS_createDevice")) Module["FS_createDevice"] = function() { abort("'FS_createDevice' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Object.getOwnPropertyDescriptor(Module, "FS_unlink")) Module["FS_unlink"] = function() { abort("'FS_unlink' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Object.getOwnPropertyDescriptor(Module, "GL")) Module["GL"] = function() { abort("'GL' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "dynamicAlloc")) Module["dynamicAlloc"] = function() { abort("'dynamicAlloc' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "loadDynamicLibrary")) Module["loadDynamicLibrary"] = function() { abort("'loadDynamicLibrary' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "loadWebAssemblyModule")) Module["loadWebAssemblyModule"] = function() { abort("'loadWebAssemblyModule' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "getLEB")) Module["getLEB"] = function() { abort("'getLEB' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "getFunctionTables")) Module["getFunctionTables"] = function() { abort("'getFunctionTables' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "alignFunctionTables")) Module["alignFunctionTables"] = function() { abort("'alignFunctionTables' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "registerFunctions")) Module["registerFunctions"] = function() { abort("'registerFunctions' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "addFunction")) Module["addFunction"] = function() { abort("'addFunction' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "removeFunction")) Module["removeFunction"] = function() { abort("'removeFunction' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "getFuncWrapper")) Module["getFuncWrapper"] = function() { abort("'getFuncWrapper' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "prettyPrint")) Module["prettyPrint"] = function() { abort("'prettyPrint' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "makeBigInt")) Module["makeBigInt"] = function() { abort("'makeBigInt' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "dynCall")) Module["dynCall"] = function() { abort("'dynCall' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "getCompilerSetting")) Module["getCompilerSetting"] = function() { abort("'getCompilerSetting' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "stackSave")) Module["stackSave"] = function() { abort("'stackSave' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "stackRestore")) Module["stackRestore"] = function() { abort("'stackRestore' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "stackAlloc")) Module["stackAlloc"] = function() { abort("'stackAlloc' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "establishStackSpace")) Module["establishStackSpace"] = function() { abort("'establishStackSpace' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "print")) Module["print"] = function() { abort("'print' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "printErr")) Module["printErr"] = function() { abort("'printErr' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "getTempRet0")) Module["getTempRet0"] = function() { abort("'getTempRet0' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "setTempRet0")) Module["setTempRet0"] = function() { abort("'setTempRet0' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "callMain")) Module["callMain"] = function() { abort("'callMain' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "Pointer_stringify")) Module["Pointer_stringify"] = function() { abort("'Pointer_stringify' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Object.getOwnPropertyDescriptor(Module, "warnOnce")) Module["warnOnce"] = function() { abort("'warnOnce' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };if (!Object.getOwnPropertyDescriptor(Module, "ALLOC_NORMAL")) Object.defineProperty(Module, "ALLOC_NORMAL", { get: function() { abort("'ALLOC_NORMAL' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") } });
if (!Object.getOwnPropertyDescriptor(Module, "ALLOC_STACK")) Object.defineProperty(Module, "ALLOC_STACK", { get: function() { abort("'ALLOC_STACK' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") } });
if (!Object.getOwnPropertyDescriptor(Module, "ALLOC_DYNAMIC")) Object.defineProperty(Module, "ALLOC_DYNAMIC", { get: function() { abort("'ALLOC_DYNAMIC' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") } });
if (!Object.getOwnPropertyDescriptor(Module, "ALLOC_NONE")) Object.defineProperty(Module, "ALLOC_NONE", { get: function() { abort("'ALLOC_NONE' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") } });
if (!Object.getOwnPropertyDescriptor(Module, "calledRun")) Object.defineProperty(Module, "calledRun", { get: function() { abort("'calledRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") } });



var calledRun;


/**
 * @constructor
 * @this {ExitStatus}
 */
function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
}

var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!calledRun) run();
  if (!calledRun) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
};





/** @type {function(Array=)} */
function run(args) {
  args = args || arguments_;

  if (runDependencies > 0) {
    return;
  }

  writeStackCookie();

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later

  function doRun() {
    // run may have just been called through dependencies being fulfilled just in this very frame,
    // or while the async setStatus time below was happening
    if (calledRun) return;
    calledRun = true;

    if (ABORT) return;

    initRuntime();

    preMain();

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    assert(!Module['_main'], 'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]');

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else
  {
    doRun();
  }
  checkStackCookie();
}
Module['run'] = run;

function checkUnflushedContent() {
  // Compiler settings do not allow exiting the runtime, so flushing
  // the streams is not possible. but in ASSERTIONS mode we check
  // if there was something to flush, and if so tell the user they
  // should request that the runtime be exitable.
  // Normally we would not even include flush() at all, but in ASSERTIONS
  // builds we do so just for this check, and here we see if there is any
  // content to flush, that is, we check if there would have been
  // something a non-ASSERTIONS build would have not seen.
  // How we flush the streams depends on whether we are in SYSCALLS_REQUIRE_FILESYSTEM=0
  // mode (which has its own special function for this; otherwise, all
  // the code is inside libc)
  var print = out;
  var printErr = err;
  var has = false;
  out = err = function(x) {
    has = true;
  }
  try { // it doesn't matter if it fails
    var flush = flush_NO_FILESYSTEM;
    if (flush) flush(0);
  } catch(e) {}
  out = print;
  err = printErr;
  if (has) {
    warnOnce('stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the FAQ), or make sure to emit a newline when you printf etc.');
    warnOnce('(this may also be due to not including full filesystem support - try building with -s FORCE_FILESYSTEM=1)');
  }
}

function exit(status, implicit) {
  checkUnflushedContent();

  // if this is just main exit-ing implicitly, and the status is 0, then we
  // don't need to do anything here and can just leave. if the status is
  // non-zero, though, then we need to report it.
  // (we may have warned about this earlier, if a situation justifies doing so)
  if (implicit && noExitRuntime && status === 0) {
    return;
  }

  if (noExitRuntime) {
    // if exit() was called, we may warn the user if the runtime isn't actually being shut down
    if (!implicit) {
      err('exit(' + status + ') called, but EXIT_RUNTIME is not set, so halting execution but not exiting the runtime or preventing further async execution (build with EXIT_RUNTIME=1, if you want a true shutdown)');
    }
  } else {

    ABORT = true;
    EXITSTATUS = status;

    exitRuntime();

    if (Module['onExit']) Module['onExit'](status);
  }

  quit_(status, new ExitStatus(status));
}

var abortDecorators = [];

function abort(what) {
  if (Module['onAbort']) {
    Module['onAbort'](what);
  }

  what += '';
  out(what);
  err(what);

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '';
  var output = 'abort(' + what + ') at ' + stackTrace() + extra;
  if (abortDecorators) {
    abortDecorators.forEach(function(decorator) {
      output = decorator(output, what);
    });
  }
  throw output;
}
Module['abort'] = abort;

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}


  noExitRuntime = true;

run();





// {{MODULE_ADDITIONS}}



