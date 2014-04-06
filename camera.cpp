#include <iostream>
#include <fstream>
#include "cv.h"       // opencv
#include "highgui.h"  // opencv
#include <vector>   // opencv
#include <uv.h> // unix domain socket
#include <time.h>  // logging

// Unix domain socket location
#define SOCKET  "/tmp/rov.camera.sock"
uv_loop_t *loop;
uv_pipe_t pipe;

// frame commands
std::string start("camera::framestart");
std::string end("camera::frameend");

using namespace cv;  // opencv

bool changed = false;

std::string getTime() {
  time_t now = time(0);
  struct tm tstruct;
  char buf[80];
  tstruct = *localtime(&now);
  strftime(buf, sizeof(buf), "%Y-%m-%d.%X \t", &tstruct);
  std::string ret(buf);
  return ret;
}

std::vector<int> setCompression(int val) {
  std::vector<int> compression; // compression settings
  compression.push_back(CV_IMWRITE_JPEG_QUALITY);  // use JPEG
  compression.push_back(val); // quality
  return compression;
}

uv_buf_t alloc_buffer(uv_handle_t *handle, size_t suggested_size) {
    return uv_buf_init((char*) calloc(suggested_size, 1), suggested_size);
}

void echo_read(uv_stream_t *client, ssize_t nread, uv_buf_t buf) {
    if (nread == -1) {
        // if (uv_last_error(loop).code != UV_EOF)
        //     fprintf(stderr, "Read error %s\n", uv_err_name(uv_last_error(loop)));
        uv_close((uv_handle_t*) client, NULL);
        return;
    }

    uv_write_t *req = (uv_write_t *) malloc(sizeof(uv_write_t));
    req->data = (void*) buf.base;
    buf.len = nread;
    
    char *cmd;
    cmd = buf.base;
    string c = cmd;
    if (c == "flip;") changed = true;
}

void on_connect(uv_pipe_t *q, ssize_t nread, uv_buf_t buf, uv_handle_type pending) {
  if (pending == UV_UNKNOWN_HANDLE) return;

  uv_pipe_t *client = (uv_pipe_t*) malloc(sizeof(uv_pipe_t));
  uv_pipe_init(loop, client, 0);
  if (uv_accept((uv_stream_t*) q, (uv_stream_t*) client) == 0) {
    uv_read_start((uv_stream_t*) client, alloc_buffer, echo_read);
  }
  else {
    uv_close((uv_handle_t*) client, NULL);
  }
}






int main(int argc, char* argv[]) {
  // std::ofstream _log("log.txt");
  loop = uv_default_loop();
  uv_pipe_t *pipe;
  uv_pipe_init(loop, pipe, 0);
  uv_connect_t connect;

  uv_pipe_connect(&connect, pipe, SOCKET, on_connect);

  uv_pipe_start(pipe);

  uv_run(loop, UV_RUN_DEFAULT);
  return 0;
}