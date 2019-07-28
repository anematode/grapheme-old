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

  var utils = /*#__PURE__*/Object.freeze({
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
    createGLProgram: createGLProgram
  });

  let alignment_types = ["N", "NW", "NE", "S", "SW", "SE", "E", "W"];
  let DEFAULT_LOCATION = {x: 0, y: 0};

  function setElementLocation(elem, x, y) {
    elem.style.top = y + 'px';
    elem.style.left = x + 'px';
  }

  class _FancyTicket {
    constructor(fancy_div, id) {
      this.fancy_div = fancy_div;
      this.id = id;
      this.valid = true;
    }

    get elements() {
      let list =this.fancy_div.div.querySelectorAll("." + this.id);
      if (list === null)
        return [];
      else return list;
    }

    _checkValid() {
      assert(this.valid, "invalid ticket");
    }

    addElement(tag, classes, location = DEFAULT_LOCATION) {
      let element = document.createElement(tag);
      element.classList.add(this.id);

      setElementLocation(element, location.x, location.y);

      for (let i = 0; i < classes.length; ++i) {
        element.classList.add(classes[i]);
      }

      this.fancy_div.div.appendChild(element);

      return element;
    }

    removeElement(elem) {
      assert(elem.classList.contains(this.id), "this ticket is not responsible");
      elem.remove();
    }

    addText(text="cow", location=DEFAULT_LOCATION, align="SE") {
      if (!alignment_types.includes(align))
        align = "C";

      let elem = this.addElement("p", ["fancy-text-" + align], location);
      elem.innerHTML = text;

      return elem;
    }

    clearElements() {
      let elems = this.elements;
      for (let i = 0; i < elems.length; ++i) {
        elems[i].remove();
      }
    }
  }

  // This class manipulates the weird fancy div element that grapheme uses for text and such
  class FancyDiv {
    constructor(div) {
      assert(div.tagName === "DIV", "FancyDiv needs a div to zombify!");

      this.div = div;
      this.tickets = [];
    }

    getTicket() {
      let ticket = new _FancyTicket(this, "honkibilia_" + getID());
      this.tickets.push(ticket);
      return ticket;
    }

    getTicketById(id) {
      for (let i = 0; i < this.tickets.length; ++i) {
        if (this.ticket[i].id === id)
          return this.ticket[i];
      }
    }

    removeTicket(id_or_ticket) {
      if (id_or_ticket instanceof _FancyTicket) {
        id_or_ticket = id_or_ticket.id;
      }

      for (let i = 0; i < this.tickets.length; ++i) {
        if (this.ticket[i].id === id_or_ticket) {
          this.ticket[i].clearElements();
          this.ticket[i].valid = false;
          this.tickets.splice(i,1);
          return true;
        }
      }

      return false;
    }

    removeAllTickets() {
      for (let i = 0; i < this.tickets.length; ++i) {
        this.removeTicket(this.tickets[i]); // could be optimized a lot
      }
    }
  }

  class ContextElement {
    constructor(grapheme_context, params={}) {
      this.context = grapheme_context;

      this.id = getID();
      this.precedence = select(params.precedence, 1);
      this.display = select(params.display, true);
      this.lastDrawn = -1;

      this.fancy_ticket = this.context.fancy_div.getTicket();
      this.context.addElement(this);
    }

    draw(info) {
      this.lastDrawn = Date.now();
    }

    destroy() {
      this.remove();
      this.fancy_div.removeTicket(this.fancy_ticket);
    }

    remove() {
      this.context.removeElement(this);
    }
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

      let fancy_div_elem = document.createElement("div");
      fancy_div_elem.classList.add("grapheme-fancy-div");
      this.container_div.append(fancy_div_elem);

      this.fancy_div = new FancyDiv(fancy_div_elem);

      this.text_canvas_ctx = this.text_canvas.getContext("2d");
      this.gl = this.canvas.getContext("webgl") || this.canvas.getContext("experimental-webgl");

      assert(this.gl, "This browser does not support WebGL, which is required by Grapheme");

      this.elements = [];

      // x is of the center, y is of the center, width is the total width, height is the total height
      this.viewport = {x: 0, y: 0, width: 1, height: 1};

      // 0 <= r,g,b <= 255, 0 <= a <= 1 please!
      this.clear_color = {r: 255, g: 255, b: 255, a: 0.95};

      this._addResizeEventListeners();
    }

    drawFrame() {
      this.clearCanvas();
      let info = {viewport: this.viewport};

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

    _addResizeEventListeners() {
      this.resize_observer = new ResizeObserver(() => this.onResize());
      this.resize_observer.observe(this.container_div);
      window.addEventListener("load", () => this.onResize(), {once: true});
    }

    onResize() {
      this.resizeCanvas();
    }

    resizeCanvas() {
      let boundingRect = this.container_div.getBoundingClientRect();

      this.width = this.canvas.width = this.text_canvas.width = devicePixelRatio * boundingRect.width;
      this.height = this.canvas.height = this.text_canvas.height = devicePixelRatio * boundingRect.height;

      // set the GL viewport to the whole canvas
      this.gl.viewport(0, 0, this.width, this.height);
    }

    clearCanvas(color=this.clear_color) {
      let gl = this.gl; // alias for the GL context

      // set the COLOR_CLEAR_VALUE to the desired color
      gl.clearColor(color.r / 255, color.g / 255, color.b / 255, color.a);

      // set all colors to the COLOR_CLEAR_VALUE
      gl.clear(gl.COLOR_BUFFER_BIT);

      this.text_canvas_ctx.clearRect(0, 0, this.width, this.height);
    }

    pixelToCartesian(x,y) {
      return {x: (x / this.width - 0.5) * this.viewport.width + this.viewport.x,
        y: -(y / this.height - 0.5) * this.viewport.height + this.viewport.y};
    }

    pixelToCartesianFloatArray(arr) {
      let w = this.width, vw = this.viewport.width, vx = this.viewport.x;
      let h = this.height, vh = this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = (arr[i] / w - 0.5) * vw + vx;
        arr[i+1] = -(arr[i+1] / h - 0.5) * vh + vy;
      }

      return arr;
    }

    cartesianToPixel(x,y) {
      return {x: this.width * ((x - this.viewport.x) / this.viewport.width + 0.5),
        y: this.height * (-(y - this.viewport.y) / this.viewport.height + 0.5)};
    }

    cartesianToPixelFloatArray(arr) {
      let w = this.width, vw = this.viewport.width, vx = this.viewport.x;
      let h = this.height, vh = this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = w * ((arr[i] - vx) / vw + 0.5);
        arr[i+1] = h * (-(arr[i+1] - vy) / vh + 0.5);
      }

      return arr;
    }

    pixelToCartesianX(x) {
      return (x / this.width - 0.5) * this.viewport.width + this.viewport.x;
    }

    pixelToCartesianXFloatArray(arr) {
      let w = this.width, vw = this.viewport.width, vx = this.viewport.x;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = (arr[i] / w - 0.5) * vw + vx;
      }

      return arr;
    }

    cartesianToPixelX(x) {
      return this.width * ((x - this.viewport.x) / this.viewport.width + 0.5);
    }

    cartesianToPixelXFloatArray(arr) {
      let w = this.width, vw = this.viewport.width, vx = this.viewport.x;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = w * ((arr[i] - vx) / vw + 0.5);
      }

      return arr;
    }

    pixelToCartesianY(y) {
      return -(y / this.height - 0.5) * this.viewport.height + this.viewport.y;
    }

    pixelToCartesianYFloatArray(arr) {
      let h = this.height, vh = this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = -(arr[i] / h - 0.5) * vh + vy;
      }

      return arr;
    }

    cartesianToPixelY(y) {
      return this.height * (-(y - this.viewport.y) / this.viewport.height + 0.5);
    }

    cartesianToCartesianYFloatArray(arr) {
      let h = this.height, vh = this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = h * (-(arr[i] - vy) / vh + 0.5);
      }

      return arr;
    }

    cartesianToPixelV(x,y) {
      return {x: this.width * x / this.viewport.width, y: -this.height * y / this.viewport.height};
    }

    cartesianToPixelVFloatArray(arr) {
      let wr = this.width / this.viewport.width;
      let hr = -this.height / this.viewport.height;

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = wr * arr[i];
        arr[i+1] = hr * arr[i+1];
      }

      return arr;
    }

    pixelToCartesianV(x,y) {
      return {x: this.viewport.width * x / this.width, y: -this.viewport.height * y / this.height};
    }

    pixelToCartesianVFloatArray(arr) {
      let wrp = this.viewport.width / this.width;
      let hrp = -this.viewport.height / this.height;

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = wrp * arr[i];
        arr[i+1] = hrp * arr[i+1];
      }

      return arr;
    }

    cartesianToPixelVX(x) {
      return this.width * x / this.viewport.width;
    }

    cartesianToPixelVXFloatArray(arr) {
      let wr = this.width / this.viewport.width;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = wr * arr[i];
      }

      return arr;
    }

    cartesianToPixelVY(y) {
      return -this.height * y / this.viewport.height;
    }

    cartesianToPixelVYFloatArray(y) {
      let hr = -this.height / this.viewport.height;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = hr * arr[i];
      }

      return arr;
    }

    pixelToCartesianVX(x) {
      return this.viewport.width * x / this.width;
    }

    pixelToCartesianVXFloatArray(arr) {
      let wrp = this.viewport.width / this.width;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = wrp * arr[i];
      }

      return arr;
    }

    pixelToCartesianVY(y) {
      return -this.viewport.height * y / this.height;
    }

    pixelToCartesianVYFloatArray(arr) {
      let hrp = -this.viewport.height / this.height;

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

  importGraphemeCSS();

  function getMouseOnCanvas(canvas, evt) {
    let rect = canvas.getBoundingClientRect();
    return {x: evt.clientX - rect.left, y: evt.clientY - rect.top};
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
        "mouseup": evt => this._mouseUp(evt),
        "mousemove": evt => this._mouseMove(evt),
        "wheel": evt => this._onScroll(evt)
      };

      for (let key in this.listeners) {
        this.container_div.addEventListener(key, this.listeners[key]);
      }
    }

    _removeMouseEvtListeners() {
      this._listenersAdded = false;

      for (let key in this.listeners) {
        this.container_div.removeEventListener(key, this.listeners[key]);
        delete this.listeners[key];
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

      this.orientation = select(params.orientation);

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
      let vertShad = createShaderFromSource(gl /* rendering context */,
        gl.VERTEX_SHADER /* enum for vertex shader type */,
        vertexShaderSource /* source of the vertex shader*/ );

      // create the frag shader.
      let fragShad = createShaderFromSource(gl /* rendering context */,
        gl.FRAGMENT_SHADER /* enum for vertex shader type */,
        fragmentShaderSource /* source of the vertex shader*/ );

      // create the program
      let program = this.context._gridlinesShader = createGLProgram(gl, vertShad, fragShad);

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
          let thickness_d = gridline.pen / 2;


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
                    y_draw_pos = this.context.height;
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
                      y_draw_pos = this.context.height;
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
                    x_draw_pos = this.context.width;
                    textAlign = "right";
                    break;
                  case "axis":
                    x_draw_pos = this.context.cartesianToPixelX(0);
                    break;
                  case "dynamic":
                    if (0 > maxX) { // put label at the right of the canvas
                      x_draw_pos = this.context.width;
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
    assert(isInteger(integer), "needs to be an integer");
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
        let exponent = Math.floor(Math.log10(Math.abs(x)));
        let mantissa = x / (10 ** exponent);

        let prefix = (isApproxEqual(mantissa,1) ? '' : (beautifyFloat(mantissa, 8) + CDOT));
        let exponent_suffix = "10" + exponentify(exponent);

        return prefix + exponent_suffix;
      }
    }
  };

  const DEFAULT_COLOR = {r: 0, g: 0, b: 0, a: 1};

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
            font: "bold 15px Helvetica",
            color: "#000",
            align: "SW", // corner/side on which to align the x label,
                         // note that anything besides N,S,W,E,NW,NE,SW,SE is centered
            location: "dynamic" // can be axis, top, bottom, or dynamic (switches between)
          },
          y: {
            display: true,
            font: "bold 15px Helvetica",
            color: "#000",
            align: "SW", // corner/side on which to align the y label
            location: "dynamic" // can be axis, left, right, or dynamic (switches between)
          }
        }
      }, params.bold);
      this.normal = mergeDeep({
        thickness: 0.8, // Thickness of the normal lines
        color: 0x000000ff, // Color of the normal lines
        ideal_dist: 140, // ideal distance between lines in pixels
        display: true, // whether to display the lines
        label_function: "default",
        labels: {
          x: {
            display: true,
            font: "14px Helvetica",
            color: "#000",
            align: "SE", // corner/side on which to align the x label,
                         // note that anything besides N,S,W,E,NW,NE,SW,SE is centered
            location: "dynamic" // can be axis, top, bottom, or dynamic (switches between)
          },
          y: {
            display: true,
            font: "14px Helvetica",
            color: "#000",
            align: "W", // corner/side on which to align the y label
            location: "dynamic"
          }
        }
      }, params.normal);
      this.thin = mergeDeep({
        thickness: 0.5, // Thickness of the finer demarcations
        color: 0x777777ff, // Color of the finer demarcations
        ideal_dist: 50, // ideal distance between lines in pixels
        display: true, // whether to display them
        label_function: "default",
        labels: {
          x: {
            display: false,
            font: "10px Helvetica",
            color: "#000",
            align: "S", // corner/side on which to align the x label,
                         // note that anything besides N,S,W,E,NW,NE,SW,SE is centered
            location: "dynamic" // can be axis, top, bottom, or dynamic (switches between)
          },
          y: {
            display: true,
            font: "8px Helvetica",
            color: "#000",
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
                  font: label.font,
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
              font: labelx.font,
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
              font: labely.font,
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

  exports.AutoGridlines = AutoGridlines;
  exports.GraphemeContext = GraphemeContext;
  exports.Gridlines = Gridlines;
  exports.InteractiveContext = InteractiveContext;
  exports.convert_char = convert_char;
  exports.exponent_reference = exponent_reference;
  exports.exponentify = exponentify;
  exports.getTextAlign = getTextAlign;
  exports.getTextBaseline = getTextBaseline;
  exports.utils = utils;

  return exports;

}({}));
