var socket = io.connect('http://localhost');
var str = "";
socket.on("frame", function(data){
     // get canvas context
     var context = document.getElementById("video").getContext('2d');
     // new blob for storing image data
     var blob = new Blob([new Uint8Array(data)], {'type': 'image\/jpeg'});
     // make it a "url" to make...
     var src = window.URL.createObjectURL(blob);
     // ... an image from
     var img = new Image();
     img.src = src;
     // and put it into the canvas context
     img.onload = function(){
          context.drawImage(this, 0, 0);
     }
});