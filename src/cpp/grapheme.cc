#include "grapheme.h"

extern "C" {
// convert pixel space into GL space quickly?
void pixelToGLFloatArray(float *vertex_buffer, int vertex_buffer_size, float x_scale, float y_scale) {
  for (int i = 0; i < vertex_buffer_size; i += 2) {
    vertex_buffer[i] = vertex_buffer[i] * x_scale - 1;
    vertex_buffer[i+1] = vertex_buffer[i+1] * y_scale + 1;
  }
}

}
