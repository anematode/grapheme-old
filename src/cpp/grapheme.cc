#include "grapheme.h"
#include <vector>
#include <cmath>

extern "C" {
  // convert pixel space into GL space quickly?
  void pixelToGLFloatArray(float *vertex_buffer, int vertex_buffer_size, float x_scale, float y_scale) {
    float* end = vertex_buffer + vertex_buffer_size;
    for (float *i = 0; i < end; ++i) {
      *i = (*i) * x_scale - 1;
      ++i;
      *i = (*i) * y_scale - 1;
    }
  }

  static inline float wrap_pi(float angle) {
      while (angle > 2 * M_PI)
          angle -= 2 * M_PI;
      while (angle < 0)
          angle += 2 * M_PI;
      return angle;
  }

  void polylineCalculateTriangles(float *vertex_buffer,
    int vertex_buffer_size,
    float **return_vector_buffer,
    float thickness,
    int endcap_type,
    float endcap_res,
    int join_type,
    float join_res) {

    std::vector<float> ret_vertices;
    ret_vertices.reserve(2 * vertex_buffer_size); // at least

    float x1, x2 = NAN, x3 = NAN;
    float y1, y2 = NAN, y3 = NAN;
    float v1x, v1y, v2x, v2y, v1l, v2l;

    float max_miter_length = thickness / std::cos(join_res / 2);
    bool need_to_dupe_vertex = false;

    for (int i = 0; i <= vertex_buffer_size; i += 2) {
      x1 = x2;
      x2 = x3;
      y1 = y2;
      y2 = y3;
      x3 = (i == vertex_buffer_size) ? NAN : vertex_buffer[i];
      y3 = (i == vertex_buffer_size) ? NAN : vertex_buffer[i+1];

      if (i == 0) continue;

      bool is_starting_endcap = x1 != x1;
      bool is_ending_endcap = x3 != x3;

      v1x = -v2x;
      v1y = -v2y;
      v2x = x3 - x2;
      v2y = y3 - y2;

      v1l = v2l;
      v2l = std::hypot(v2x, v2y);

      if (is_starting_endcap || is_ending_endcap) {
        float du_x, du_y;

        if (is_ending_endcap) {
          du_x = -v1x * thickness / v1l;
          du_y = -v1y * thickness / v1l;
        } else {
          du_x = v2x * thickness / v2l;
          du_y = v2y * thickness / v2l;
        }

        ret_vertices.push_back(x2 + du_y);
        ret_vertices.push_back(y2 - du_x);

        if (need_to_dupe_vertex) {
          ret_vertices.push_back(x2 + du_y);
          ret_vertices.push_back(y2 - du_x);
          need_to_dupe_vertex = false;
        }

        ret_vertices.push_back(x2 - du_y);
        ret_vertices.push_back(y2 + du_x);

        if (endcap_type == 1) {
          // round endcap
          float theta = std::atan2(du_y, du_x) + ((is_starting_endcap) ? M_PI / 2 : 3 * M_PI / 2);

          int steps_needed = M_PI / endcap_res + 1;

          float cx = x2 - du_y, cy = y2 + du_x;

          for (int i = 1; i <= steps_needed; ++i) {
            float theta_c = theta + static_cast<float>(i) / steps_needed * M_PI;

            ret_vertices.push_back(x2 + thickness * std::cos(theta_c));
            ret_vertices.push_back(y2 + thickness * std::sin(theta_c));
            ret_vertices.push_back(cx);
            ret_vertices.push_back(cy);
          }
        }

        continue;
      }

      if (x2 != x2) {
        // break between polyline segments

        // duplicate the last element
        ret_vertices.push_back(ret_vertices.end()[-2]);
        ret_vertices.push_back(ret_vertices.end()[-2]);
      } else {
        // all three points are defined, joiner time!

        if ((join_type == 2) || (join_type == 3)) {
          float b1_x = v2l * v1x + v1l * v2x, b1_y = v2l * v1y + v1l * v2y;
          float scale = 1 / std::hypot(b1_x, b1_y);

          if (std::isinf(scale)) {
            b1_x = -v1y;
            b1_y = v1x;
            scale = 1 / std::hypot(b1_x, b1_y);
          }

          b1_x *= scale;
          b1_y *= scale;

          scale = thickness * v1l / (b1_x * v1y - b1_y * v1x);

          if ((join_type == 2) || (std::abs(scale) < max_miter_length)) {
            b1_x *= scale;
            b1_y *= scale;

            ret_vertices.push_back(x2 - b1_x);
            ret_vertices.push_back(y2 - b1_y);
            ret_vertices.push_back(x2 + b1_x);
            ret_vertices.push_back(y2 + b1_y);

            continue;
          }
        }

        float pu_factor = -thickness / v1l;
        float nu_factor = thickness / v2l;

        ret_vertices.push_back(x2 + pu_factor * v1y);
        ret_vertices.push_back(y2 - pu_factor * v1x);
        ret_vertices.push_back(x2 - pu_factor * v1y);
        ret_vertices.push_back(y2 + pu_factor * v1x);

        if ((join_type == 1) || (join_type == 3)) {
          float a1 = std::atan2(v1y, v1x) - M_PI / 2;
          float a2 = std::atan2(v2y, v2x) - M_PI / 2;

          float start_a, end_a;

          if (wrap_pi(a1 - a2) < M_PI) {
            // left turn
            start_a = M_PI + a1;
            end_a = a2;
          } else {
            start_a = M_PI + a2;
            end_a = a1;
          }

          float angle_subtended = wrap_pi(end_a - start_a);
          int steps_needed = angle_subtended / join_res + 1;

          for (int i = 0; i <= steps_needed; ++i) {
            float theta_c = start_a + static_cast<float>(i) / steps_needed * angle_subtended;

            ret_vertices.push_back(x2 + thickness * std::cos(theta_c));
            ret_vertices.push_back(y2 + thickness * std::sin(theta_c));
            ret_vertices.push_back(x2);
            ret_vertices.push_back(y2);
          }
        }

        ret_vertices.push_back(x2 + nu_factor * v2y);
        ret_vertices.push_back(y2 - nu_factor * v2x);
        ret_vertices.push_back(x2 - nu_factor * v2y);
        ret_vertices.push_back(y2 + nu_factor * v2x);
      }
    }

    return_vector_buffer[0] = ret_vertices.data();
    return_vector_buffer[1] = reinterpret_cast<float*>(ret_vertices.size());

    return;
  }

}
