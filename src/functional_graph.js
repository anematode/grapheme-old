import {ContextElement} from "./context_element";
import {IntervalFunctions as IF} from "./intervals";
import * as utils from "./utils";

const VERTEX_CALCULATION_MODES = {
  EVEN_SAMPLING: "es",
  EVEN_SAMPLING_LIMIT_FINDING: "eslf"
};

class FunctionalGraph extends ContextElement {
  constructor(context, params={}) {
    super(context, params);

    this.color = utils.select(params.color, 0x117711ff);
    this.axis = 'x'; // x means of the form y = f(x); y means of the form x = f(y);
    this.thickness = utils.select(params.thickness, 3);

    this.quick_func = x => x * (x + 1);
    this.vertex_calculation_mode = {type: VERTEX_CALCULATION_MODES.EVEN_SAMPLING, samples: 1500};

    this.max_vertices = 2000;
    this.vertices = new Float64Array(2 * this.max_vertices);
    this.actual_vertices = 0;

    this.gl_vertices = new Float32Array(6 * this.max_vertices);
    this.actual_gl_vertices = 0;
  }

  _calculateVerticesViaSampling(num_samples) {
    let minX, maxX;

    switch (this.axis) {
      case 'x':
        minX = this.context.minX();
        maxX = this.context.maxX();
        break;
      default:
        minX = this.context.minY();
        maxX = this.context.maxY();
    }

    let rat = (maxX - minX) / this.intended_samples;

    for (let i = 0; i < this.intended_samples; ++i) {
      let x1 = rat * i + minX;
      let x2 = rat * (i+1) + minX;

      this.vertices[2 * i] = x1;
      this.vertices[2 * i + 1] = this.quick_func(x1);
    }

    this.actual_vertices = this.intended_samples;
  }

  _calculateVerticesViaSamplingLimitFinding(samples) {

  }

  calculateVertices() {
    switch (this.vertex_calculation_mode.type) {
      case VERTEX_CALCULATION_MODES.EVEN_SAMPLING:
        this._calculateVerticesViaSampling();
        break;
    }
  }

  calculateGLVertices() {
    this.actual_gl_vertices = utils.expandVerticesIntoTriangles(this.thickness, this.actual_vertices, this.actual_gl_vertices);
  }

  draw() {
    let ctx = this.context.text_canvas_ctx;
    this.calculateVertices();

    ctx.strokeStyle = "purple";
    ctx.lineWidth = 3;
    ctx.beginPath();

    let pt = this.context.cartesianToPixel(this.vertices[0], this.vertices[1]);

    ctx.moveTo(pt.x, pt.y)

    for (let i = 2; i < this.vertices.length; i += 2) {
      pt = this.context.cartesianToPixel(this.vertices[i], this.vertices[i+1]);
      ctx.lineTo(pt.x, pt.y);
    }

    ctx.stroke();
  }

}

export {FunctionalGraph};
