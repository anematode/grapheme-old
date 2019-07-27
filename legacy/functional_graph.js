import * as utils from "./utils";
import {ContextElement} from "./context_element";

// Graph of the form y = x


class FunctionalGraph extends ContextElement {
  constructor(context, params={}) {
    super(context, params);

    this.line_thickness = 2;
    this.line_color = "#662255";
    this.samples = utils.select(params.samples, 500);

    this.func = (x) => Math.sin(2*x) - x/5 + Math.cos(15*x)/4;
  }

  get samples() {
    return this.points.length / 2;
  }

  set samples(val) {
    this.points = new Float64Array(2 * val);
  }

  draw(context, ctx, info) { // note that I have numerous algorithms for this, this is just a placeholder
    super.draw(context, ctx, info);

    const samples = this.samples;
    let points = this.points;

    for (let i = 0; i <= samples; ++i) {
      let x = this.context.viewport.x + (this.context.viewport.width) * (i - samples / 2) / samples;

      points[2 * i] = x;
      points[2 * i + 1] = this.func(x);
    }

    this.context.cartesianToCanvasFloatArray(points);

    ctx.lineWidth = this.line_thickness;
    ctx.strokeStyle = this.line_color;

    utils._ctxDrawPath(ctx, points);
  }
}

export {FunctionalGraph};
