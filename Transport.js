var net = require('net')
  , debug = require('./Log')
  , Frame = require('./Frame');

/**
 * Handle transportation of data
 *
 * @param config {Object} Configuration settings
 * @param config.camera {Object} Camera settings
 * @param config.camera.socket {String} Location to Unix domain socket
 * @param config.camera.process {String} Name of executable
 * @param config.camera.frame {Object} Frame settings related to camera
 * @param config.camera.frame.start {String} Frame start signifier
 * @param config.camera.frame.end {String} Frame end signifier
 */
var Transport = function(config){
    var self = {};
    // array buffer for single frame
    var frame = new Frame();
    var camera = config.camera;

    self.frame = frame;
    self.io = config.io;
    self.camera = camera;

    self.messages = {};

    // establish socket connection
    self.init = function(){
        // create Unix domain socket (UDS)
        self.server = net.createServer(self.handler);
        // listen on the camera UDS
        self.server.listen(camera.socket);
    };

    // handle socket connection once established
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

        // expose socket to API
        self.socket = socket;
    };

    self.registerMessage = function(message, action){
        self.messages[message] = action;
    }

    self.checkMessage = function(message) {
        if (self.messages[message]){
            action = self.messages[message];
            action();

            return true;
        }
        return false;
    }

    // when data comes through the socket
    self.onData = function(data){
        // convert data to string for comparisons
        var message = data.toString();

        if (self.checkMessage(message)){
            // 
        }
        else if (frame.collecting) {
            frame.push(data);
        }
        else {
            frame.collecting = false;
        }
    };

    self.toBuffer = function(data){
        // create Node buffer for storing/sending full image
        var buffer = new Buffer(frame.size);
        self.buffer = buffer;
        // copy frame array buffer data into Node buffer
        for (var i=0, len=frame.data.length, pos=0; i<len; i++){
            frame.data[i].copy(buffer, pos);
            pos += frame.data[i].length;
        }
    };

    self.addIOListener = function(on, callback){
        self.io.on(on, callback);
    }
    self.addSocketListener = function(on, callback){
        self.socket.on(on, callback);
    }

    // register camera frame start message
    self.registerMessage(camera.frame.start, function(){
        frame.collecting = true;
    });

    // register camera frame end message
    self.registerMessage(camera.frame.end, function(){
        debug.log({ str: "image size: " + frame.size });
        self.toBuffer(frame);
        // send frame to client
        self.io.volatile.emit('frame', self.buffer);
        // clear frame array buffer for next frame
        frame.size = 0;
        frame.data = [];
    });

    return self;
};


module.exports = Transport;