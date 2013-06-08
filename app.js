
/**
 * prov
 */

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

// Routing table
app.get('/', routes.index);

// Server port
server.listen(3000);


// What to do with debug info
var debug = (function(){
  var self = {};
  self.log = function(obj){
    console.log(obj.str);
  }
  return self;
})();

// Configuration settings
var CONFIG = (function(){
    var init = function() {
        return {
            cameras: [{
                socket:  '/tmp/rov.camera.sock'  // socket to communicate over
              , process: './camera'  // process that runs OpenCV
              , frame: {
                  start: 'camera::framestart'
                , end:   'camera::frameend'
              }
            }]
        };
    };
    var instance;
    return {
        getInstance: function() {
            if (!instance) instance = init();
            return instance;
        }
    };
})();

// Camera frame
var Frame = function(){
    var self = {};

    self.data = [];
    self.size = 0;
    self.collecting = false;

    self.push = function(d) {
        self.data.push(d);
        // keep track of the entire frame size
        self.size += d.length;
    }

    return self;
};


var Transport = function(config){
    var self = {};
    // array buffer for full frame
    var frame = new Frame();
    var camera = config.camera;

    self.frame = frame;

    self.io = config.io;
    self.camera = camera;

    self.handler = function(socket){
        // handle new client connections on the UDS
        socket.on('connect', function(){ 
          debug.log({ str: 'new client connection' }); 
        });
        // handle UDS data input
        socket.on('data', self.onData);

        self.io.on('disconnect', function(){ 
          self.child[0].kill('SIGHUP'); 
          debug.log({ str: 'Camera terminated.' }); 
        });

        // frame acknowledged by client
        self.io.on('frame_response', function(resp){
          if (resp.error) { debug.log({ str: "Frame not received." }); return; }
          debug.log({ str: "Frame acknowledged." });
        });
    };

    self.onData = function(data){
        var message = data.toString();
        if (message == camera.frame.start) frame.collecting = true;
        else if (message == camera.frame.end){
            debug.log({ str: "image size: " + frame.size });
            // create Node buffer for storing/sending full image
            var frm = new Buffer(frame.size);
            // copy frame array buffer data into Node buffer
            for (var i=0, len=frame.data.length, pos=0; i<len; i++){
                frame.data[i].copy(frm, pos);
                pos += frame.data[i].length;
            }
            // send frame to client
            self.io.volatile.emit('frame', frm);

            // clear frame array buffer for next frame
            frame.size = 0;
            frame.data = [];
        }
        else if (frame.collecting) {
            // add frame chunck to frame array buffer
            frame.push(data);
        }
        else {
            frame.collecting = false;
        }
    };

    return self;
};


// Communictation with browser
io.sockets.on('connection', function(iosocket){
    iosocket.emit('message', 'init');  // kick off connection
    var config = CONFIG.getInstance();
    var uds = new Transport({ io: iosocket, camera: config.cameras[0] });

    // unbind current Unix domain socket [UDS] (if there is one)
    fs.unlink(uds.camera.socket, function(){
        // create Unix domain socket (UDS)
        uds.server = net.createServer(uds.handler);
        // listen on the camera UDS
        uds.server.listen(uds.camera.socket);
        // start camera program
        uds.child = [];
        uds.child.push(spawn(uds.camera.process, []));
    });
});


process.on('exit', function(){
  debug.log({ str: 'ended' });
});