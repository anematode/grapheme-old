import {GraphemeContext} from './grapheme_context';
import * as utils from './utils';

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
    utils.assert(!this._listenersAdded, "listeners already added!");
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

export {InteractiveContext};
