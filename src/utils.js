
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

export { select, getID, assert, checkType, deepEquals, roundToCanvasCoord, _ctxDrawPath, isInteger, isNonnegativeInteger,
isNonpositiveInteger, isNegativeInteger, isPositiveInteger, mergeDeep, isApproxEqual };
