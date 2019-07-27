
function select(opt1, ...opts) {
  // this function takes in a variadic list of arguments and returns the first
  // one that's not undefined lol

  if (opts.length === 0)
    return opt1;
  if (opt1 === undefined) {
    return select(...opts);
  }
  return opt1;
}

let id = 0;

function getID() {
  return id++;
}

function assert(statement, error = "Unknown error") {
  if (!statement) {
    throw new Error(error);
  }
}

function checkType(obj, type, funcName="") {
  assert(obj instanceof type,
    (funcName ? "Function " + funcName : ": ")
    + "Object must be instanceof " + type);
}

// https://stackoverflow.com/questions/201183/how-to-determine-equality-for-two-javascript-objects
function deepEquals(x, y) {
  const ok = Object.keys, tx = typeof x, ty = typeof y;
  return x && y && tx === 'object' && tx === ty ? (
    ok(x).length === ok(y).length &&
      ok(x).every(key => deepEquals(x[key], y[key]))
  ) : (x === y);
}

function roundToCanvasCoord(c) {
  return Math.round(c-0.5)+0.5;
}

function _ctxDrawPath(ctx, arr) {
  ctx.beginPath();

  for (let i = 2; i < arr.length; i += 2) {
    ctx.lineTo(arr[i], arr[i+1]);
  }

  ctx.stroke();
}

function isInteger(z) {
  return Number.isInteger(z); // didn't know about this lol
}

function isNonnegativeInteger(z) {
  return Number.isInteger(z) && z >= 0;
}

function isPositiveInteger(z) {
  return Number.isInteger(z) && z > 0;
}

function isNonpositiveInteger(z) {
  return Number.isInteger(z) && z <= 0;
}

function isNegativeInteger(z) {
  return Number.isInteger(z) && z < 0;
}

// https://stackoverflow.com/a/34749873
function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

// https://stackoverflow.com/a/34749873
function mergeDeep(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}

function isApproxEqual(v, w, eps=1e-5) {
  return Math.abs(v - w) < eps;
};

// This function takes in a GL rendering context, a type of shader (fragment/vertex),
// and the GLSL source code for that shader, then returns the compiled shader
function createShaderFromSource(gl, shaderType, shaderSourceText) {
  // create an (empty) shader of the provided type
  let shader = gl.createShader(shaderType);

  // set the source of the shader to the provided source
  gl.shaderSource(shader, shaderSourceText);

  // compile the shader!! piquant
  gl.compileShader(shader);

  // get whether the shader compiled properly
  let succeeded = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

  if (succeeded)
    return shader; // return it if it compiled properly
  else {
    // throw an error with the details of why the compilation failed
    throw new Error(gl.getShaderInfoLog(shader));

    // delete the shader to free it from memory
    gl.deleteShader(shader);
  }
}

// This function takes in a GL rendering context, the fragment shader, and the vertex shader,
// and returns a compiled program.
function createGLProgram(gl, vertShader, fragShader) {
  // create an (empty) GL program
  let program = gl.createProgram();

  // link the vertex shader
  gl.attachShader(program, vertShader);

  // link the fragment shader
  gl.attachShader(program, fragShader);

  // compile the program
  gl.linkProgram(program);

  // get whether the program compiled properly
  let succeeded = gl.getProgramParameter(program, gl.LINK_STATUS);

  if (succeeded)
    return program;
  else {
    // throw an error with the details of why the compilation failed
    throw new Error(gl.getProgramInfoLog(program));

    // delete the program to free it from memory
    gl.deleteProgram(program);
  }
}

export { select, getID, assert, checkType, deepEquals, roundToCanvasCoord, _ctxDrawPath, isInteger, isNonnegativeInteger,
isNonpositiveInteger, isNegativeInteger, isPositiveInteger, mergeDeep, isApproxEqual, createShaderFromSource, createGLProgram};
