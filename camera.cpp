#include <iostream>
#include "cv.h"       // opencv
#include "highgui.h"  // opencv
#include <vector>   // opencv
#include <boost/asio.hpp> // unix domain socket
#include <boost/lexical_cast.hpp>

// Unix domain socket location
#define SOCKET  "/tmp/rov.camera.sock"
// frame commands
std::string start("camera::framestart");
std::string end("camera::frameend");

using boost::asio::local::stream_protocol;  // uds
using namespace cv;  // opencv

bool changed = false;

void handler(const boost::system::error_code& err, std::size_t size) {
  if (!err) {
    if (size > 0) {
      changed = (changed) ? false : true;
    }
  }
  else {
    throw boost::system::system_error(err);
  }
}

int main(int argc, char* argv[]){

  try {
    // Establish camera connection
    VideoCapture cap(0);
    cap.set(CV_CAP_PROP_FRAME_WIDTH, 640);
    cap.set(CV_CAP_PROP_FRAME_HEIGHT, 480);
    cap.set(CV_CAP_PROP_FPS, 30);
    if (!cap.isOpened()) return -1;

    // Prepare buffers
    Mat frame;  // stores the image upon capture
    std::vector<uchar> buff;  // convert to vector for UDS
    std::vector<int> compression; // compression settings
    compression.push_back(CV_IMWRITE_JPEG_QUALITY);  // use JPEG
    compression.push_back(80); // quality

    // Connect to unix domain socket
    boost::asio::io_service io_service;
    stream_protocol::socket sock(io_service);

    sock.connect(stream_protocol::endpoint(SOCKET));
    boost::array< uchar, 10240 > buf;
    boost::system::error_code error;

    boost::array< uchar, 1024 > command;

    // run forever
    while (1) {
      // capture frame from webcam
      cap >> frame;

      sock.async_read_some(boost::asio::buffer(command, 2), handler);

      if (changed) cv::flip(frame, frame, 1);

      // copy frame into vector container, and compress using JPEG
      bool enc = imencode(".jpg", frame, buff, compression);
      // send frame over UDS
      if (enc) {
          boost::asio::write(sock, boost::asio::buffer(start, start.length()));
          usleep(500); // add some delay between messages
          boost::asio::write(sock, boost::asio::buffer(buff));
          usleep(500); // add some delay between messages
          boost::asio::write(sock, boost::asio::buffer(end, end.length()));
        }
    }
  }
  catch (std::exception& e) {
    std::cerr << "Exception: " << e.what() << "\n";
  }

  return 0;
}