import * as utils from './utils';
import {FancyDiv} from "./fancy_div";
import {ContextElement} from "./context_element";

class GraphemeContext {
  constructor(params = {}) {
    this.container_div = utils.select(params.container, params.container_div);

    utils.assert(this.container_div.tagName === "DIV",
      "Grapheme Context needs to be given a container div. Please give Grapheme a house to live in! :(")

    this.canvas = document.createElement("canvas");
    this.container_div.appendChild(this.canvas);
    this.text_canvas = document.createElement("canvas");
    this.container_div.appendChild(this.text_canvas);

    this.canvas.classList.add("grapheme-canvas");
    this.text_canvas.classList.add("grapheme-text-canvas");

    this.text_canvas_ctx = this.text_canvas.getContext("2d");
    this.gl = this.canvas.getContext("webgl") || this.canvas.getContext("experimental-webgl");

    utils.assert(this.gl, "This browser does not support WebGL, which is required by Grapheme");

    this.elements = [];

    // x is of the center, y is of the center, width is the total width, height is the total height
    // Cartesian coordinates
    this.viewport = {x: 0, y: 0, width: 1, height: 1};
    this._margins = {top: 40, left: 40, bottom: 40, right: 40}; // pixels

    // 0 <= r,g,b <= 255, 0 <= a <= 1 please!
    this.clear_color = {r: 255, g: 255, b: 255, a: 0.95};
    this.gl_infos = {};

    this._addResizeEventListeners();
  }

  get margin_top() {
    return this._margins.top;
  }

  set margin_top(val) {
    utils.assert(val >= 0, "Margin must be nonnegative");

    this._margins.top = val;
  }

  get margin_bottom() {
    return this._margins.bottom;
  }

  set margin_bottom(val) {
    utils.assert(val >= 0, "Margin must be nonnegative");

    this._margins.bottom = val;
  }

  drawFrame() {
    this.clearCanvas();

    let info = {
      viewport: this.viewport,
      viewport_changed: utils.deepEquals(this.viewport, this._last_viewport)
    };

    this._last_viewport = {...this.viewport};

    for (let i = 0; i < this.elements.length; ++i) {
      this.elements[i].draw(this.canvas, this.canvas_ctx, info);
    }
  }

  // Element manipulation stuffs

  addElement(element) {
    utils.assert(!this.containsElement(element), "element already added to this context");
    utils.assert(element.context === this, "element cannot be a child of two contexts");

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
    utils.checkType(elem, ContextElement, "deleteElement");
    return this.containsElementById(elem.id);
  }

  deleteElement(elem) {
    utils.checkType(elem, ContextElement, "deleteElement");
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

    utils.assert(compute_first <= arr.length);

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

export {GraphemeContext};
