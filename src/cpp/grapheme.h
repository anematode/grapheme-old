
extern "C" {
  void pixelToGLFloatArray(float *vertex_buffer, int vertex_buffer_size, float x_scale, float y_scale);
  void polylineCalculateTriangles(float *vertex_buffer,
    int vertex_buffer_size,
    float **return_vector_buffer,
    float thickness,
    int endcap_type,
    float endcap_res,
    int join_type,
    float join_res);
}
