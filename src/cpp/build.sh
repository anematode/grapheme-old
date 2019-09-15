em++ grapheme.cc -O3 -s WASM=1 -s EXPORTED_FUNCTIONS="[_pixelToGLFloatArray, _malloc, _free, _polylineCalculateTriangles]" -s EXTRA_EXPORTED_RUNTIME_METHODS="[ccall]" -o ../../build/grapheme_wasm.js
