import {Context} from './context';
import * as utils from './utils';

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

    // We want coords to be fixed
    this.viewport.height *= scale_factor;
    this.viewport.width *= scale_factor;

    let new_cartesian_coords = this.canvasToCartesian(coords.x, coords.y);

    this.viewport.x += cartesian_coords[0] - new_cartesian_coords[0];
    this.viewport.y += cartesian_coords[1] - new_cartesian_coords[1];
  }
}

export {InteractiveContext};
