
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

export { select, getID, assert, checkType, deepEquals, roundToCanvasCoord };
