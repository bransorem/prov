/**
 * Establish a frame container
 *
 * @return {Object} Frame object
 */
var Frame = function(){
    var self = {};

    // initializations
    self.data = [];
    self.size = 0;
    self.collecting = false;

    // add some data to the frame array
    self.push = function(d) {
        self.data.push(d);
        // keep track of the entire frame size
        self.size += d.length;
    }

    return self;
};

module.exports = Frame;