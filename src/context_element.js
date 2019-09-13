import * as utils from './utils';

class ContextElement {
  constructor(grapheme_context, params={}) {
    // The grapheme context containing this element
    this.context = grapheme_context;

    // A unique numeric ID (nonnegative integer) associated with this element
    this.id = utils.getID();

    // Effectively the z-index of the element; in what order will this element be drawn?
    this.precedence = utils.select(params.precedence, 1);

    // Whether or not to call draw() on this element, though this can be overriden
    // by this.override_display (TODO)
    this.display = utils.select(params.display, true);

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

export {ContextElement};
