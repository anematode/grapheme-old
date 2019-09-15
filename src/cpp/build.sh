em++ grapheme.cc -s WASM=1 -s EXPORTED_FUNCTIONS="[_pixelToGLFloatArray]" -s EXTRA_EXPORTED_RUNTIME_METHODS="[ccall]" -o ../../build/grapheme_wasm.js
