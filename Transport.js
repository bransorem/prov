var net = require('net');
var debug = require('./Debug');

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

    self.init = function(){
        // create Unix domain socket (UDS)
        self.server = net.createServer(self.handler);
        // listen on the camera UDS
        self.server.listen(camera.socket);
    };

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

        self.socket = socket;
    };

    self.onData = function(data){
        var message = data.toString();
        if (message == camera.frame.start) frame.collecting = true;
        else if (message == camera.frame.end){
            debug.log({ str: "image size: " + frame.size });
            self.toBuffer(frame);
            // send frame to client
            self.io.volatile.emit('frame', self.buffer);

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

    return self;
};


module.exports = Transport;