import * as utils from './utils';

class ContextElement {
  constructor(grapheme_context, params={}) {
    this.context = grapheme_context;

    this.id = utils.getID();
    this.precedence = utils.select(params.precedence, 1);
    this.display = utils.select(params.display, true);
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

export {ContextElement};
