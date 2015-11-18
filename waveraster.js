console.log('bas')

function onLoad() {
  var canvas = document.getElementById("canvas");
  var context = canvas.getContext("2d");


  context.moveTo(0,0);
  context.lineTo(100,100);

  console.log("done")
}