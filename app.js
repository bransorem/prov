
/**
 * prov
 */

var express = require('express')  // express
  , routes = require('./routes')  // express
  , http = require('http')  // express
  , path = require('path')  // express
  , app = express()   // express
  , ejs = require('ejs')  // express
  , server = http.createServer(app) // server
  , fs = require('fs')      // unix domain socket
  , io = require('socket.io').listen(server)  // client
  , spawn = require('child_process').spawn;  // camera

var Transport = require('./Transport')
  , debug = require('./Log');

// TODO: move debug info to log file
io.set('log level', 1);   // no debug info for now

// Some Express bootstrapping
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.engine('ejs', require('ejs').renderFile);
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

// Routing table
app.get('/', routes.index);

// Server port
server.listen(3000);

// Configuration settings singleton
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


// Communictation with browser
io.sockets.on('connection', function(iosocket){
    iosocket.emit('message', 'init');  // kick off connection

    config = CONFIG.getInstance();
    uds = new Transport({ io: iosocket, camera: config.cameras[0] });

    uds.registerMessage(config.cameras[0].frame.start, function(){
      uds.frame.collecting = true;
    });

    // unbind current Unix domain socket [UDS] (if there is one)
    fs.unlink(uds.camera.socket, function(){
        uds.init();

        uds.addIOListener('flip', function(resp){
            var test = 'flip;';
            console.log('writing: ' + test);  
            uds.socket.write(test);
        });
        uds.addIOListener('b&w', function(resp){
            var test = 'b&w;';
            console.log('writing: ' + test);  
            uds.socket.write(test);
        });
        // start camera program
        uds.child = [];
        uds.child.push(spawn(uds.camera.process, []));
    });
});

process.on('SIGINT', function(){
    debug.log({str: ''});
    uds.child[0].kill('SIGINT');
    debug.log({ str: 'close camera' });
    process.exit(0);
});

process.on('exit', function(){ 
    debug.log({ str: 'ended' });
    process.exit(0);
});