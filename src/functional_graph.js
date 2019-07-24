import * as utils from "./utils";
import {ContextElement} from "./context_element";

// Graph of the form y = x


class FunctionalGraph extends ContextElement {
  constructor(context, params={}) {
    super(context, params);

    this.line_thickness = 2;
    this.line_color = "#662255";

    this.func = (x) => Math.sin(2*x) - x/5 + Math.cos(15*x)/4;
  }

  draw(context, ctx, info) { // note that I have numerous algorithms for this, this is just a placeholder
    super.draw(context, ctx, info);

    ctx.lineWidth = this.line_thickness;
    ctx.strokeStyle = this.line_color;

    const samples = 2000;

    ctx.beginPath();

    for (let i = 0; i <= samples; ++i) {
      let x = this.context.viewport.x + (this.context.viewport.width) * (i - samples / 2) / samples;
      let y = this.func(x);

      if (i !== 0) {
        ctx.lineTo(...this.context.cartesianToCanvas(x, y));
      } else {
        ctx.moveTo(...this.context.cartesianToCanvas(x, y));
      }
    }

    ctx.stroke();
  }
}

export {FunctionalGraph};
