// What to do with debug info
var Debug = (function(){
  var self = {};
  self.log = function(obj){
    console.log(obj.str);
  }
  return self;
})();

module.exports = Debug;