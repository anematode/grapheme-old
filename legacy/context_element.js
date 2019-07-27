import * as utils from './utils';

class ContextElement {
  constructor(context, params={}) {
    this.context = context;

    this.precedence = utils.select(params.precedence, 1);
    this.id = utils.getID();
    this.display = utils.select(params.display, true);
  }

  draw(canvas, canvas_ctx, info) {
    this.lastDrawn = Date.now();
  }
}

export {ContextElement};
