import * as utils from './utils';
import {ContextElement} from "./context_element";

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

  addElement(element) {
    utils.assert(!this.containsElement(element), "element already added to this context");
    utils.assert(element.context === this, "element cannot be a child of two contexts");

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

export {Context};
