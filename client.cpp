#include <cstdlib>
#include <cstring>
#include <iostream>
#include <boost/asio.hpp>

#if defined(BOOST_ASIO_HAS_LOCAL_SOCKETS)
using boost::asio::local::stream_protocol;
enum { max_length = 1024 };

// Unix domain socket location
#define SOCKET  "/tmp/rov.camera.sock"
// frame commands
std::string start("camera::framestart");
std::string end("camera::frameend");

int main(int argc, char* argv[])
{
  try
  {
    boost::asio::io_service io_service;

    stream_protocol::socket s(io_service);
    s.connect(stream_protocol::endpoint(SOCKET));

    using namespace std; // For strlen.
    std::cout << "Enter message: ";
    char request[max_length];
    std::cin.getline(request, max_length);
    size_t request_length = strlen(request);
    boost::asio::write(s, boost::asio::buffer(request, request_length));

    char reply[max_length];
    size_t reply_length = boost::asio::read(s,
        boost::asio::buffer(reply, request_length));
    std::cout << "Reply is: ";
    std::cout.write(reply, reply_length);
    std::cout << "\n";
  }
  catch (std::exception& e)
  {
    std::cerr << "Exception: " << e.what() << "\n";
  }

  return 0;
}

#else // defined(BOOST_ASIO_HAS_LOCAL_SOCKETS)
# error Local sockets not available on this platform.
#endif // defined(BOOST_ASIO_HAS_LOCAL_SOCKETS)