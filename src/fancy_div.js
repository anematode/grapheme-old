import * as utils from './utils';

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
    utils.assert(this.valid, "invalid ticket");
  }

  addElement(tag, classes, location = DEFAULT_LOCATION) {
    let element = document.createElement(tag);
    element.classList.add(this.id);

    setElementLocation(element, location.x, location.y)

    for (let i = 0; i < classes.length; ++i) {
      element.classList.add(classes[i]);
    }

    this.fancy_div.div.appendChild(element);

    return element;
  }

  removeElement(elem) {
    utils.assert(elem.classList.contains(this.id), "this ticket is not responsible");
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
    utils.assert(div.tagName === "DIV", "FancyDiv needs a div to zombify!");

    this.div = div;
    this.tickets = [];
  }

  getTicket() {
    let ticket = new _FancyTicket(this, "honkibilia_" + utils.getID());
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


export {FancyDiv};
