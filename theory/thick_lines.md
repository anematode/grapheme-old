## Drawing thick lines

WebGL has a primitive for lines, but it can only draw lines that are one pixel in thickness. (Technically, the range of thicknesses is implementation-defined, but the minimum REQUIRED maximum thickness is also 1, and in practice almost all implementations of WebGL only use these lines.) Thus, we must use triangles.

The main strategy here, since the curves we are drawing have a lot of vertices, is to just draw a bunch of triangles. Given a thickness, we draw "normals" on each point interpolating the angle between consecutive segments. At endcaps, we just use the one segment it's connected to.

We represent a set of lines as a list of vertices. A break in the line is represented as two NaNs instead of x and y values in that place. For example, we might have the following vertices:

[1, 2, 1.002, 2.01, 1.004, 2.04, ..., 1.428, 4821.52, NaN, NaN, 1.429, -4393.23, ...]

Let's just say these are in cartesian coordinates. Suppose we want to draw a line with thickness 
