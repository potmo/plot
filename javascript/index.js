var Canvas = require('canvas'),
    Image = Canvas.Image,
    fs = require('fs');


console.log("loading image")
var image = loadImage('../lenna.png')


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

var output = '';
output += getIntro();
//output += getGrayscale();
output += getPixels(45, 4, sampleMagenta); // blue
output += getPixels(15, 2, sampleCyan); // red
output += getPixels(75, 1, sampleBlack); // black
output += getOutro();
printOutputToFile(output, '../output.hpgl');


function getPixels(rotation, color, sample) {

  var output = "";
  var xOffset = 0;
  var yOffset = 0;
  var inDegrees = 0;
  var outDegrees = 0;
  var amplitude = 25;
  var pivot = {
    x: 0,
    y: 0
  };

  var outputWidth = 11040.0;
  var outputHeight = 11040.0;


  // side of square in raster coordinates
  var sideOfRotatedSquare = getSideLengthOfRotatedSquareInSquare(rotation, outputWidth);

  // calculate the offset that the image needs to be moved to not end up outside the box
  var yOffsetToFit = cos(rotation) * sideOfRotatedSquare;

  var strength = 0;

  pivot.y = yOffsetToFit;

  output += 'SP'+color+';\n'; // blue

  // The x offset and yOffset is in color-local raster coordinates
  for (var j = 0; yOffset < sideOfRotatedSquare; j++){
    for (var i = 0; xOffset < sideOfRotatedSquare; i++) {
      var flip = i % 2 == 0;
      var newLine = i == 0;
      var result = drawPixel(xOffset, yOffset + yOffsetToFit, -rotation-90, pivot, inDegrees, flip, newLine, strength);
      inDegrees = result.outDegrees;
      xOffset += result.travel;
      output += result.commands;

    // TODO: Calculate this for all positions before drawing instead by getting the scaled position in the image

      // convert the local color-raster coordinates to image coordinates
      strength = sample(result.pen.x, result.pen.y, outputWidth, outputHeight);

    }
    yOffset += 180;
    xOffset = 0;
  }

  //output += drawBox(0, 0, outputWidth, 0, 2);
  //output += drawBox(0, yOffsetToFit, sideOfRotatedSquare, rotation, 3);

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

function drawPixel(xOffset, yOffset, rotation, pivot, inDegrees, flip, newLine, strength) {
  var amplitude = 25 + 60 * strength;
  var outDegrees = 30 - 30 * strength;
  var result = getWedge3(xOffset, yOffset, rotation, pivot, inDegrees, outDegrees, amplitude, flip, newLine);
  return result;
}


function getWedge3(xOffset, yOffset, rotation, pivot, inDegrees, outDegrees, amplitude, flip, newLine) {

  var radius = 3 + inDegrees * 1.5;

  var arcDegrees = (180 - 90 - inDegrees) + (180 - 90 - outDegrees);

  var leftTangentX = cos(inDegrees - 90) * radius;
  var leftTangentY = sin(inDegrees - 90) * radius;

  var rightTangentX = cos(180 - outDegrees - 90) * radius;
  var rightTangentY = sin(180 - outDegrees - 90) * radius;

  var leftPeakCorner = 180 - 90 - inDegrees;
  var leftLegLength = (amplitude - radius + leftTangentY) / Math.sin(toRads(leftPeakCorner));

  var rightPeakCorner = 180 - 90 - outDegrees;
  var rightLegLength = (amplitude - radius + rightTangentY) / Math.sin(toRads(rightPeakCorner));

  var p0 = {
    x: xOffset,
    y: yOffset
  };

  var p1 = {
    x: p0.x + cos(inDegrees) * leftLegLength,
    y: p0.y + sin(inDegrees) * leftLegLength
  };

  var p2 = {
    x: p1.x - leftTangentX + rightTangentX,
    y: p1.y - leftTangentY + rightTangentY
  };

  var circle = {
    x: p1.x - leftTangentX,
    y: p1.y - leftTangentY
  };

  var p3 = {
    x: p2.x + cos(180 - outDegrees) * rightLegLength,
    y: p2.y + sin(180 - outDegrees) * rightLegLength
  };

  var travel = p3.x - p0.x;

  if (flip) {
    p1 = flipPointVertically(p1, p0)
    p2 = flipPointVertically(p2, p0)
    p3 = flipPointVertically(p3, p0)
    circle = flipPointVertically(circle, p0)
  } else {
    arcDegrees *= -1;
  }

  var p0 = rotatePointAroundPoint(p0, pivot, rotation);
  var p1 = rotatePointAroundPoint(p1, pivot, rotation);
  var p2 = rotatePointAroundPoint(p2, pivot, rotation);
  var p3 = rotatePointAroundPoint(p3, pivot, rotation);
  var circle = rotatePointAroundPoint(circle, pivot, rotation);

  var output = '';
  if (newLine) output += 'PU' + p0.x.toFixed(2) + ',' + p0.y.toFixed(2) + ';\n';
  output += 'PD' + p1.x.toFixed(2) + ',' + p1.y.toFixed(2) + ';\n';
  output += 'AA' + circle.x.toFixed(2) + ',' + circle.y.toFixed(2) + ',' + (arcDegrees).toFixed(2) + ',5;\n';
  // output += 'PD' + p3.x.toFixed(2) + ',' + p3.y.toFixed(2) + ';\n';
  return {
    commands: output,
    travel: travel,
    pen: { x: p3.x, y: p3.y },
    outDegrees: outDegrees
  };
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

  key = Math.min(cyan,magenta,yellow) * 0.8;

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