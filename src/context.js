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

export {Context};
