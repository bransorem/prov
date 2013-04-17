#include "cv.h"       // opencv
#include "highgui.h"  // opencv
#include <vector>     // opencv
#include <boost/asio.hpp> // unix domain socket

#define SOCKET  "/tmp/rov.camera.sock"

using boost::asio::local::stream_protocol;

int main(int argc, char* argv[]){

  try {
    cv::Mat frame;
    std::vector<uchar> buff;
    std::vector<int> compression;
    compression.push_back(CV_IMWRITE_JPEG_QUALITY);
    compression.push_back(80);

    // Connect to unix domain socket
    boost::asio::io_service io_service;
    stream_protocol::socket sock(io_service);
    sock.connect(stream_protocol::endpoint(SOCKET));
    boost::system::error_code error;

    bool enc = 0;

    while(1) {
      if (!enc){
        // read image from file
        frame = cv::imread("rov.jpg", CV_LOAD_IMAGE_COLOR);
        buff.resize(frame.rows * frame.cols);
        enc = cv::imencode(".jpg", frame, buff, compression);
        if (enc) {
          std::string start("camera::framestart");
          std::string end("camera::frameend");
          boost::asio::write(sock, boost::asio::buffer(start, start.length()));
          usleep(100); // add some delay between messages
          boost::asio::write(sock, boost::asio::buffer(buff));
          usleep(500); // add some delay between messages
          boost::asio::write(sock, boost::asio::buffer(end, end.length()));
        }
      }
    }
  }
  catch (std::exception& e) {
    std::cerr << "Exception: " << e.what() << "\n";
  }

  return 0;
}