var Canvas = require('canvas'),
    Image = Canvas.Image,
    fs = require('fs');


function plot() {
  console.log("loading image")
  var image = loadImage('../moonland.jpg')

  var output = '';
  output += getIntro();

  output += drawLine(0, 0, 10000, 0, 1);

  //output += getPixels(45, 4, sampleCyan); // blue
  //output += getPixels(15, 2, sampleMagenta); // red
  output += rasterizeImage(75, 1, sampleLuminocity); // black

  output += drawArc(0,0, 1000, 45, 90, 1);

  output += getOutro();
  printOutputToFile(output, '../output.hpgl');
}


function rasterizeImage(rotation, color, sample) {

  var output = '';

  var positions = [];
  // TODO: be able to sample from rotated position
  // TODO: stop when we reached the limit of the image
  var y = 0;
  var x = 0;
  var max = 20;

  for (var i = 0; i < max; i++){

    var strength = i / max;

    var angle = 45 - 90 * strength;
    var length = 5000; //TODO: get a way to get this from the amplitude

    var xtravel = length * strength;
    var ytravel = length ;

    //TODO: sample to get the length
    positions.push({x: x + xtravel/2, y: y - ytravel / 2});
    positions.push({x: x + xtravel, y: y + ytravel / 2});

    x += xtravel;

  }

  positions

  // draw endpoints
  .iterate(function(pos){
    output += drawCircle(pos.x, pos.y, 30, 1);
  })

  // move a sliding window with size 3 other the array and return the triplets
  .slideOver(3)

  // deep clone
  .map(function(vertices){
    return vertices.map(function(node){
      return {x: node.x, y: node.y};
    });
  })

  // shorten the triangles to be half their lengths
  .map(function(vertices){
    v0 = vertices[0];
    v1 = vertices[1];
    v2 = vertices[2];

    var factor = 0.25;

    v0.x = v1.x + (v0.x - v1.x) * factor;
    v0.y = v1.y + (v0.y - v1.y) * factor;

    v2.x = v1.x + (v2.x - v1.x) * factor;
    v2.y = v1.y + (v2.y - v1.y) * factor;

    return [v0, v1, v2];
  })

   // print legs
  .iterate(function(vertices){
    output += drawLine(vertices[0].x, vertices[0].y, vertices[1].x, vertices[1].y, 2);
    output += drawLine(vertices[1].x, vertices[1].y, vertices[2].x, vertices[2].y, 2);
  })

  // draw the incenters
  .map(function(vertices){
    var incenter = findIncenter(vertices[0].x, vertices[0].y,
                                vertices[1].x, vertices[1].y,
                                vertices[2].x, vertices[2].y);

    var inradius = findIncenterRadius(vertices[0].x, vertices[0].y,
                                      vertices[1].x, vertices[1].y,
                                      vertices[2].x, vertices[2].y);

    output += drawCircle(incenter.x, incenter.y, inradius, 3);

    return {vertices: vertices, incenter: incenter, inradius: inradius};
  })

  // draw the tangents
  .map(function(slice){
    var dx = slice.incenter.x - slice.vertices[1].x;
    var dy = slice.incenter.y - slice.vertices[1].y;
    var dd = Math.sqrt(dx * dx + dy * dy);
    var a = Math.asin(slice.inradius / dd);
    var b = Math.atan2(dy, dx);

    var t1 = b - a
    var t2 = b + a
    var ta = { x: slice.incenter.x + slice.inradius * Math.sin(t1),
               y: slice.incenter.y + slice.inradius * -Math.cos(t1) };

    var tb = { x: slice.incenter.x + slice.inradius * -Math.sin(t2),
               y: slice.incenter.y + slice.inradius * Math.cos(t2) };

    output += drawCircle(ta.x, ta.y, 10, 4);
    output += drawCircle(tb.x, tb.y, 10, 4);

    return {
              vertices: slice.vertices,
              incenter: slice.incenter,
              inradius: slice.inradius,
              tangent1: ta,
              tangent2: tb
            };

  })

  // draw the arc (http://math.stackexchange.com/questions/285866/calculating-circle-radius-from-two-points-on-circumference-for-game-movement)
  // http://www.wolframalpha.com/input/?i=find+a+in+c+%3D+sqrt%282r%5E2%281%E2%88%92cos%282a%29%29%29
  .iterate(function(slice){
    var dx = slice.tangent2.x - slice.tangent1.x;
    var dy = slice.tangent2.y - slice.tangent1.y;
    var chord = Math.sqrt(dx * dx + dy * dy);
    var arcAngle = Math.asin(0.5 * Math.sqrt(Math.pow(chord,2) / Math.pow(slice.inradius, 2))) * 2;
    var arcDegrees = toDegrees(arcAngle) ;
    //TODO: Find the actual angle to go from
    output += drawArc(slice.incenter.x, slice.incenter.y, slice.inradius, 0 + 90 + 90 + arcDegrees / 2, arcDegrees + 90 + 90 + arcDegrees / 2, 4);

  })

  //positions.reduce([], function())

  return output;
}

function rasterizeLine() {

}



Array.prototype.slideOver = function(windowSize){
  var output = [];
  this.reduce(function(array, element){
    array.push(element);

    if (array.length > windowSize){
      array.shift();
    }

    if (array.length === windowSize){
      output.push([].concat(array));
    }

    return array;

  }, []);
  return output;
}

Array.prototype.iterate = function(callback) {
  return this.map(function(currentValue, index, array){
    callback(currentValue, index, array);
    return currentValue;
  });
}

console.log([1,2,3,4,5,6,7,8].slideOver(3).join(', '));
console.log([1,2,3,4,5,6,7,8].iterate(function(){}).join(', '));

function drawArc(x, y, radius, fromAngle, toAngle, color) {
  var startX = x + cos(fromAngle) * radius;
  var startY = y + sin(fromAngle) * radius;
  var arcAngle = toAngle - fromAngle;
  var output = '';
  output += 'SP'+color+';\n'
  output += 'PU' + startX.toFixed(2) + ',' + startY.toFixed(2) + ';\n';
  output += 'PD;\n';
  output += 'AA' + x.toFixed(2) + ',' + y.toFixed(2) + ',' + arcAngle.toFixed(2) + ';\n';
  output += 'SP1;\n'
  return output;
}

function drawBox(x, y, side, rotation, color) {
  var output = '';
  var ax = x;
  var ay = y;
  var bx = ax + cos(rotation) * side;
  var by = ay + sin(rotation) * side;
  var cx = bx + cos(rotation + 90) * side;
  var cy = by + sin(rotation + 90) * side;
  var dx = cx + cos(rotation + 180) * side;
  var dy = cy + sin(rotation + 180) * side;

  output += 'SP'+color+';\n'
  output += 'PU' + ax.toFixed(2) + ',' + ay.toFixed(2) + ';\n';
  output += 'PD' + bx.toFixed(2) + ',' + by.toFixed(2) + ';\n';
  output += 'PD' + cx.toFixed(2) + ',' + cy.toFixed(2) + ';\n';
  output += 'PD' + dx.toFixed(2) + ',' + dy.toFixed(2) + ';\n';
  output += 'PD' + ax.toFixed(2) + ',' + ay.toFixed(2) + ';\n';
  output += 'SP1;\n'

  return output;
}

function drawCircle(x, y, radius, color) {
  var output = '';
  output += 'SP'+color+';\n'
  output += 'PU' + x.toFixed(2) + ',' + y.toFixed(2) + ';\n';
  output += 'CI' + radius.toFixed(2) + ',' + 10.0.toFixed(2) + ';\n';
  output += 'SP1;\n'

  return output;
}

function drawLine(x1, y1, x2, y2, color) {
  var output = '';
  output += 'SP'+color+';\n'
  output += 'PU' + x1.toFixed(2) + ',' + y1.toFixed(2) + ';\n';
  output += 'PD' + x2.toFixed(2) + ',' + y2.toFixed(2) + ';\n';
  output += 'SP1;\n'
  return output;
}

function flipPointVertically(point, pivot) {
  var newX = point.x;
  var newY = pivot.y - (point.y - pivot.y);
  return {
    x: newX,
    y: newY
  };
}

function rotatePointAroundPoint(point, pivot, degrees) {
  var s = sin(-degrees);
  var c = cos(-degrees);

  // translate to origin
  var tx = point.x - pivot.x;
  var ty = point.y - pivot.y;

  // rotate
  var xnew = tx * c - ty * s;
  var ynew = tx * s + ty * c;

  // translate back
  tx = xnew + pivot.x;
  ty = ynew + pivot.y;

  return {
    x: tx,
    y: ty
  };
}

function findIncenter(Ax, Ay, Bx, By, Cx, Cy) {
  // http://www.mathopenref.com/coordincenter.html
  var a = getDistance(Bx, By, Cx, Cy);
  var b = getDistance(Ax, Ay, Cx, Cy);
  var c = getDistance(Ax, Ay, Bx, By);
  var perimiter = a + b + c;
  var incenterX = (a * Ax + b * Bx + c * Cx) / perimiter;
  var incenterY = (a * Ay + b * By + c * Cy) / perimiter;
  return {
    x: incenterX,
    y: incenterY
  };
}

function findIncenterRadius(Ax, Ay, Bx, By, Cx, Cy) {
  var a = getDistance(Bx, By, Cx, Cy);
  var b = getDistance(Ax, Ay, Cx, Cy);
  var c = getDistance(Ax, Ay, Bx, By);
  var perimiter = a + b + c;
  var p = perimiter / 2;

  // herons formula
  // http://www.mathopenref.com/heronsformula.html
  var area = Math.sqrt(p * (p - a) * (p - b) * (p - c));

  //calculate the radius
  // http://www.mathopenref.com/triangleincircle.html
  var radius = (2 * area) / perimiter;
  return radius;
}

function getDistance(Ax, Ay, Bx, By) {
  return Math.sqrt(Math.pow(Bx - Ax, 2) + Math.pow(By - Ay, 2));
}

function getIntro() {
  var output = '';
  output += 'IN;\n'; // initialize
  output += 'IP0,0,16158,11040;\n'; // set the work area
  output += 'VS5;\n'; // set pen speed (1 to 128)
  output += 'SP1;\n'; // select pen 1

  return output;
}

function getOutro() {
  return 'SP0;\n'; // select pen 0 (put back pen in tray)
}

function cos(inDegrees) {
  // make sure we have a polar coordinate that has 0 north
  return Math.cos(toRads(-1 * inDegrees + 90));
}


function sin(inDegrees) {
  // make sure we have a polar coordinate that has 0 north
  return Math.sin(toRads(-1 * inDegrees + 90));
}

function toRads(inDegreess) {
  return inDegreess * Math.PI / 180;
}

function toDegrees(inRads) {
  return inRads * 180 / Math.PI;
}


function getSideLengthOfRotatedSquareInSquare(angle, containerSideLength) {
  return containerSideLength / (cos(angle) + sin(angle) );
}

function loadImage(file) {
    var canvas,
        context,
        img,
        fileBuffer = fs.readFileSync(__dirname + '/' + file);

    img = new Image;

    img.src = fileBuffer;

    canvas = new Canvas(img.width, img.height);
    context = canvas.getContext('2d');

    context.drawImage(img, 0, 0, img.width, img.height);
    return context.getImageData(0, 0, canvas.width, canvas.height);
}

function setPixel(imageData, x, y, argb) {

    var i = getIndexFromCoordinate(imageData, x, y);

    imageData.data[i + 0] = (argb & 0x00ff0000) >>> 16;
    imageData.data[i + 1] = (argb & 0x0000ff00) >>> 8;
    imageData.data[i + 2] = (argb & 0x000000ff);
    imageData.data[i + 3] = (argb & 0xff000000) >>> 24;

}

function getPixel(imageData, x, y) {
    var i = getIndexFromCoordinate(imageData, x, y);
    //return ARGB color
    return ((imageData.data[i + 3] << 24) | (imageData.data[i + 0] << 16) | (imageData.data[i + 1] << 8) | imageData.data[i + 2]) >>> 0;
}

function getPixelARGB(imageData, x, y) {
    var i = getIndexFromCoordinate(imageData, x, y);
    //return ARGB color
    return {
      a: imageData.data[i + 3] >>> 0,
      r: imageData.data[i + 0] >>> 0,
      g: imageData.data[i + 1] >>> 0,
      b: imageData.data[i + 2] >>> 0
    }
}


function ARGBtoCMYK(argb) {
  cyan = 1.0 - argb.r/255;
  magenta = 1.0 - argb.g/255;
  yellow = 1.0 - argb.b/255;

  if (argb.a === 0){
    cyan = magenta = yellow = 0.0;
  }


  key = Math.min(cyan,magenta,yellow) * 0.9;

  //key = Math.max(key, 0.2);

  //avoid division by zero
  if (key == 1.0){
    cyan = 0;
    magenta = 0;
    yellow = 0;
    key = 1;
  }

  cyan = (cyan - key) / (1 - key);
  magenta = (magenta - key) / (1 - key);
  yellow = (yellow - key) / (1 - key);

  return {
    c: cyan,
    m: magenta,
    y: yellow,
    k: key
  }
}

/*
function ARGBtoCMYK(argb) {
  var r = argb.r / 255;
  var g = argb.g / 255;
  var b = argb.b / 255;

  var key = 1 - Math.max(r, g, b);
  var cyan = (1 - r - key) / (1 - key);
  var magenta = (1 - g - key) / (1 - key);
  var yellow = (1 - b - key) / (1 - key);

  return {
    c: cyan,
    m: magenta,
    y: yellow,
    k: key
  }
}
*/

function getBlueChannelPixel(imageData, x, y) {
    var i = getIndexFromCoordinate(imageData, x, y);
    return imageData.data[i + 2] >>> 0;
}

function setGrayscale(imageData, x, y, b) {
    var i = getIndexFromCoordinate(imageData, x, y);

    imageData.data[i + 0] = b >>> 0 & 0xff;
    imageData.data[i + 1] = b >>> 0 & 0xff;
    imageData.data[i + 2] = b >>> 0 & 0xff;
    //imageData.data[i + 3] = b >>> 0 & 0xff;
}

function getIndexFromCoordinate(imageData, x, y) {
    x = Math.floor(x);
    y = Math.floor(y);
    return (imageData.width * y + x) * 4;
}

function printOutputToFile(output, file) {
  fs.writeFile(__dirname + '/' + file, output, function(err) {
    if(err) {
      return console.log(err);
    }
    console.log("saved " + file);
  });
}



var sample = function(x, y, width, height ){

  // image width in pixel coordinates
  var imageWidth = image.width;
  var imageHeight = image.height;

  var scale = width / imageWidth;
  var sampleX = x / scale;
  var sampleY = y / scale;

  var argb = getPixelARGB(image, sampleX, imageHeight - sampleY);
  var cmyk = ARGBtoCMYK(argb);

  return cmyk;
}

var sampleCyan = function(x, y, width, height){
  var cmyk = sample(x, y, width, height);
  return cmyk.c;
}

var sampleBlack = function(x, y, width, height){
  var cmyk = sample(x, y, width, height);
  return cmyk.k;
}

var sampleMagenta = function(x, y, width, height){
  var cmyk = sample(x, y, width, height);
  return cmyk.m;
}

var sampleLuminocity = function(x,y, width, height){
  var imageWidth = image.width;
  var imageHeight = image.height;

  var scale = width / imageWidth;
  var sampleX = x / scale;
  var sampleY = y / scale;

  var argb = getPixelARGB(image, sampleX, imageHeight - sampleY);

  // get weighted average of the rgb taking human color peception into account
  var luminocity = 0.21 * argb.r + 0.72 * argb.g + 0.07 * argb.b;

  return 1.0 - luminocity / 255.0;
}


function getGrayscale() {
  var output = "";
  var xOffset = 0;
  var yOffset = 0;
  var rotation = 0;
  var inDegrees = 41;
  var outDegrees = 41;
  var amplitude = 25;
  var pivot = {
    x: 0,
    y: 0
  };

  for (var j = 0; j < 40; j++) {
    for (var i = 0; xOffset < 5000; i++) {
      var newLine  = i == 0;

      var result = getWedge3(xOffset, yOffset, rotation, pivot, inDegrees, outDegrees, amplitude, ((i) % 2 == 0), newLine);
      output += result.commands;
      outDegrees = inDegrees;
      inDegrees = Math.min(inDegrees, 45);
      xOffset += result.travel;
    }
    yOffset += 180;
    xOffset = 0;
    inDegrees -= 1;
    outDegrees = inDegrees;
    amplitude += 1.5;
  }

  return output;
}



plot();