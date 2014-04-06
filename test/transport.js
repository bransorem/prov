var assert = require('assert')
  , Frame = require('../Frame');

describe('Frame', function(){
    var frame = new Frame();

    describe('#push', function(){
        it('should change size', function(){
            assert.equal(0, frame.data.length);
            frame.push(1);
            frame.push(2);
            assert.equal(2, frame.data.length);
        });
    });
});