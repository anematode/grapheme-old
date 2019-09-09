## Drawing THICC Polyline Primitives

WebGL has a primitive for lines, but it can only draw lines that are one pixel in thickness. (Technically, the range of thicknesses is implementation-defined, but the minimum REQUIRED maximum thickness is also 1, and in practice almost all implementations of WebGL only use these lines.) Thus, we must use triangles. There are multiple ways to do this that I can think of, but let's go with the "normal" one first.

## Normale Approach

Step 1: Given a thickness, we draw "normals" going on both sides of each point with length thickness/2, interpolating the angle between consecutive segments. At endcaps, we just look at the one segment it's connected to.
Step 2: We connect adjacent "normals" into quadrilaterals.

We represent a set of lines as a list of vertices. A break in the line is represented as two NaNs instead of x and y values in that place. For example, we might have the following vertices:

[1, 2, 1.002, 2.01, 1.004, 2.04, ..., 1.428, 4821.52, NaN, NaN, 1.429, -4393.23, ...]

This makes the process a bit more complicated, but we'll figure it out!

Given: A grapheme context, pixel thickness t, FloatArray f of Cartesian vertices of the polyline of length 2n  (Thus, there are n vertices to draw, including the NaN spacers)
Desired result: A FloatArray v of GL vertices, which has at most length 4n, which will be used by TRIANGLE_STRIP to draw the polyline.

For every point (x, y): let the previous point be (xp, yp) and the next point be (xn, yn).

Then the "normal" at the edge is u = ±unit(unit(xn - x, yn - y) + unit(xp - x, yp - y));

Edge cases that are annoying as fuck:
0. if x or y is NaN, then vertex doesn't exist
1. If xp or yp is NaN, then
a. if xn or yn in NaN, then
Vertex doesn't exist.
b. else, u = rotate(90) * unit(xn - x, yn - y)
2. If xn or yn is NaN, then u = rotate(90) *
