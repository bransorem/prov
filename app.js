
/**
 * prov
 */

var CAMERA = '/tmp/rov.camera.sock';  // socket to communicate over
var CAMAPP = './camera';              // camera program

var express = require('express')  // express
  , routes = require('./routes')  // express
  , http = require('http')  // express
  , path = require('path')  // express
  , app = express()   // express
  , server = http.createServer(app) // server
  , net = require('net')    // unix domain socket
  , fs = require('fs')      // unix domain socket
  , io = require('socket.io').listen(server)  // client
  , spawn = require('child_process').spawn;  // camera

// TODO: move debug info to log file
io.set('log level', 1);   // no debug info for now

// Some Express bootstrapping
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'html');
  app.engine('html', require('hbs').__express);
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.get('/', routes.index);

// Server port
server.listen(3000);

// array buffer for full frame
var frame_size = 0;
var frame_array = [];

// Communictation with browser
io.sockets.on('connection', function(iosocket){
  iosocket.emit('message', 'init');  // kick off connection

  // unbind current Unix domain socket [UDS] (if there is one)
  fs.unlink(CAMERA, function(){

    // create Unix domain socket (UDS)
    var uds = net.createServer(function(socket){
      // handle new client connections on the UDS
      socket.on('connect', function(){ 
        debug.log({ str: 'new client connection' }); 
      });
      // handle UDS data input
      handleUDS({ uds: socket, io: iosocket });

      iosocket.on('disconnect', function(){ 
        cam.kill('SIGHUP'); 
        debug.log({ str: 'Camera terminated.' }); 
      });

      // message from client to camera process
      iosocket.on('message', function(mess){
        test_image(iosocket);
      });
      // frame acknowledged by client
      iosocket.on('frame_response', function(resp){
        if (resp.error) { debug.log({ str: "Frame not received." }); return; }
        debug.log({ str: "Frame acknowledged." });
      });
    });
    uds.listen(CAMERA); // listen on the camera UDS

    // start camera program
    var cam = spawn(CAMAPP, []);
  });
});


var handleUDS = function(config){
  var uds = config.uds;
  var io = config.io;
  var frame_start = "camera::framestart";
  var frame_end = "camera::frameend";
  var frame_collect = false;
  // handle data from the UDS
  uds.on('data', function(d){
    var message = d.toString();
    if (message == frame_start) frame_collect = true;
    else if (message == frame_end){
      debug.log({ str: "image size: " + frame_size });
      // create Node buffer for storing/sending full image
      var frm = new Buffer(frame_size);
      // copy frame array buffer data into Node buffer
      for (var i=0, len=frame_array.length, pos=0; i<len; i++){
        frame_array[i].copy(frm, pos);
        pos += frame_array[i].length;
      }
      // send frame to client
      io.volatile.emit('frame', frm);

      // clear frame array buffer for next frame
      frame_size = 0;
      frame_array = [];
    }
    else if (frame_collect) {
      // add frame chunck to frame array buffer
      frame_array.push(d);
      // keep track of the entire frame size
      frame_size += d.length;
    }
    else {
      frame_collect = false;
    }
  });
}


process.on('exit', function(){
  debug.log({ str: 'ended' });
});

// What to do with debug info
var debug = (function(){
  var self = {};
  self.log = function(obj){
    console.log(obj.str);
  }

  return self;
})();
