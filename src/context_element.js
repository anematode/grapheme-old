import * as utils from './utils';

class ContextElement {
  constructor(grapheme_context, params={}) {
    this.context = grapheme_context;

    this.id = utils.getID();
    this.precedence = utils.select(params.precedence, 1);
    this.display = utils.select(params.display, true);
    this.lastDrawn = -1;
  }

  draw(info) {
    this.lastDrawn = Date.now();
  }
}

export {ContextElement};
