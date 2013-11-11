#include <iostream>
#include <fstream>
#include "cv.h"       // opencv
#include "highgui.h"  // opencv
#include <vector>   // opencv
#include <boost/asio.hpp> // unix domain socket
#include <time.h>

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
}

int main(int argc, char* argv[]) {

  std::ofstream _log("log.txt");
  
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
    std::vector<int> compression = setCompression(80);

    // Connect to unix domain socket
    boost::asio::io_service io_service;
    stream_protocol::socket sock(io_service);

    sock.connect(stream_protocol::endpoint(SOCKET));
    boost::array< uchar, 10240 > buf;
    boost::array< char, 1024 > command;
    // char* command;
    boost::system::error_code error;

    // run forever
    while (1) {
      // capture frame from webcam
      cap >> frame;

      // try to read command from socket
      // sock.async_read_some(boost::asio::buffer(command, 10), handler);
      boost::asio::async_read_until(sock, boost::asio::buffer(buf), ';', handler);

      // std::string cmd(command.begin(), 10);

      // _log << "test" << std::endl;

      if (changed) cv::flip(frame, frame, 1);
      cv::cvtColor(frame, frame, CV_BGR2GRAY);

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
    _log << getTime() << "Exception: " << e.what() << "\n";
  }

  _log.close();

  return 0;
}