var Canvas = require('canvas'),
    Image = Canvas.Image,
    fs = require('fs');


function plot() {
  console.log("loading image")
  var image = loadImage('../explotion01.png')

  var output = '';
  output += getIntro();

  //output += getPixels(45, 4, sampleCyan); // blue
  //output += getPixels(15, 2, sampleMagenta); // red
  output += rasterizeImage(75, 1, image, sampleLuminocity); // black

  output += getOutro();
  printOutputToFile(output, '../output.hpgl');
}


function rasterizeImage(rotation, color, image, sample) {

  var debug = true;
  var output = '';

  var outputWidth = 16158;
  var outputHeight = 11040;

  var scale = Math.min(outputWidth / image.width, outputHeight / image.height);
  console.log(scale);

  var stepSize = 5;

  for (var sampleY = 0; sampleY < image.height; sampleY += stepSize) {
    var positions = [];
    for (var sampleX = 0; sampleX < image.width; sampleX += stepSize) {

      var x = sampleX * scale;
      var y = sampleY * scale;

      var stength = sample(image, sampleX, sampleY);

      stength = Math.max(0.01, stength);

      positions.push({x: x + stepSize * scale/2, y: y - stepSize * scale / 2 * stength});
      positions.push({x: x + stepSize * scale, y: y + stepSize * scale / 2 * stength});

    }
    output += rasterizeLine(positions, debug)
  }

/*
    positions = [];
    positions.push({x: 100 + 100/2, y: 100 - 100 / 2});
    positions.push({x: 100 + 100, y: 100 + 100 / 2});

    positions.push({x: 200 + 100/2, y: 100 - 100 / 2});
    positions.push({x: 200 + 100, y: 100 + 100 / 2});

    positions.push({x: 300 + 100/2, y: 100 - 100 / 2});
    positions.push({x: 300 + 100, y: 100 + 100 / 2});
    output += rasterizeLine(positions, debug)
    */

  return output;

}

function rasterizeLine(positions, debug) {
  output = '';
  positions

  // draw endpoints
  .iterate(function(pos){
    if (debug) output += drawCircle(pos.x, pos.y, 30, 1);
  })

  // move a sliding window with size 3 other the array and return the triplets
  .slideOver(3)

  // deep clone
  .map(function(vertices){
    return vertices.map(function(node){
      return {x: node.x, y: node.y};
    });
  })

  // shorten the triangles to be relative to their width
  .map(function(vertices){
    v0 = vertices[0];
    v1 = vertices[1];
    v2 = vertices[2];

    var height = getHeightOfTriangle(v0.x ,v0.y, v1.x, v1.y, v2.x, v2.y);
    var width = getDistance(v0.x, v0.y, v2.x, v2.y);

    var factor = Math.pow(width / height, 2) / 2 - 0.3;

    v0.x = v1.x + (v0.x - v1.x) * factor;
    v0.y = v1.y + (v0.y - v1.y) * factor;

    v2.x = v1.x + (v2.x - v1.x) * factor;
    v2.y = v1.y + (v2.y - v1.y) * factor;

    return [v0, v1, v2];
  })

   // print legs
  .iterate(function(vertices){
    if (debug) output += drawLine(vertices[0].x, vertices[0].y, vertices[1].x, vertices[1].y, 2);
    if (debug) output += drawLine(vertices[1].x, vertices[1].y, vertices[2].x, vertices[2].y, 2);
    if (debug) output += drawLine(vertices[0].x, vertices[0].y, vertices[2].x, vertices[2].y, 5);
  })

  // draw the incenters
  .map(function(vertices){
    var incenter = findIncenter(vertices[0].x, vertices[0].y,
                                vertices[1].x, vertices[1].y,
                                vertices[2].x, vertices[2].y);

    var inradius = findIncenterRadius(vertices[0].x, vertices[0].y,
                                      vertices[1].x, vertices[1].y,
                                      vertices[2].x, vertices[2].y);

    if (debug) output += drawCircle(incenter.x, incenter.y, inradius, 3);

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

    if (debug) output += drawCircle(ta.x, ta.y, 10, 4);
    if (debug) output += drawCircle(tb.x, tb.y, 10, 4);

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
    /*
    var dx = slice.tangent2.x - slice.tangent1.x;
    var dy = slice.tangent2.y - slice.tangent1.y;
    var chord = Math.sqrt(dx * dx + dy * dy);
    var arcAngle = Math.asin(0.5 * Math.sqrt(Math.pow(chord,2) / Math.pow(slice.inradius, 2))) * 2;
    var arcDegrees = toDegrees(arcAngle) ;

    var leg1 = {x: slice.vertices[1].x - slice.vertices[0].x, y: slice.vertices[1].y - slice.vertices[0].y };
    var leg2 = {x: slice.vertices[1].x - slice.vertices[2].x, y: slice.vertices[1].y - slice.vertices[2].y };

    var leg1normal = getNormalized(leg1);
    var leg2normal = getNormalized(leg2);

    var bisector = {x: leg1normal.x + leg2normal.x, y: leg1normal.y + leg2normal.y};
    var bisectorAngle = getAngleFromVector(bisector) - 180;

    arcDegrees = 20;

    output += drawLine(slice.incenter.x, slice.incenter.y, slice.incenter.x + cos(bisectorAngle) * 200, slice.incenter.y + sin(bisectorAngle) * 200, 2);
    */

    output += drawThreePointArc(slice.tangent1.x, slice.tangent1.y, slice.tangent2.x, slice.tangent2.y, slice.incenter.x, slice.incenter.y, 4);

  })

  // draw the legs
  .iterate(function(slice) {
    //output += drawLine(slice.vertices[0].x, slice.vertices[0].y, slice.tangent1.x, slice.tangent1.y, 4);
    //output += drawLine(slice.tangent2.x, slice.tangent2.y, slice.vertices[2].x, slice.vertices[2].y, 4);
  })

  .collect(2)

  .iterate(function(slices){
    output += drawLine(slices[0].tangent2.x, slices[0].tangent2.y, slices[1].tangent2.x, slices[1].tangent2.y, 4);
  })

  .explode()

  .dropFirst()

  .collect(2)

  .iterate(function(slices){
    output += drawLine(slices[0].tangent1.x, slices[0].tangent1.y, slices[1].tangent1.x, slices[1].tangent1.y, 4);
  })

  //positions.reduce([], function())

  return output;
}


// slide over the elements and create tuples of a size
// [1,2,3,4] = [[1,2], [2,3], [3,4]]
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

// just iterate over all elements
Array.prototype.iterate = function(callback) {
  return this.map(function(currentValue, index, array){
    callback(currentValue, index, array);
    return currentValue;
  });
}

// take an array and make tupels of size and return them in an array [1,2,3,4] = [[1,2], [3,4]]
Array.prototype.collect = function(windowSize){
  var output = [];
  this.reduce(function(array, element){
    array.push(element);

    if (array.length === windowSize){
      output.push([].concat(array));
      array = [];
    }

    return array;

  }, []);
  return output;
}

// like flat map. Take all elements of an array that contains 
// elements and return an array with all the elements elements concatenated
// [[1,2], [3,4]] = [1,2,3,4]
Array.prototype.explode = function() {
  return this.reduce(function(array, element){
    return array.concat(element);
  }, []);
}

// pop an element from the list
Array.prototype.dropLast = function() {
  this.pop();
  return this;
}

// unshift an element from the list
Array.prototype.dropFirst = function() {
  this.shift();
  return this;
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

function drawThreePointArc(startX, startY, endX, endY, centerX, centerY, color) {

  var centerToStart = {x: startX - centerX, y: startY - centerY};
  var centerToEnd = {x: endX - centerX, y: endY - centerY};

  var arcDegrees = getAngleBetweenVectors(centerToStart, centerToEnd) * -1;

  var output = '';
  output += 'SP'+color+';\n'
  output += 'PU' + startX.toFixed(2) + ',' + startY.toFixed(2) + ';\n';
  output += 'PD;\n';
  output += 'AA' + centerX.toFixed(2) + ',' + centerY.toFixed(2) + ',' + arcDegrees.toFixed(2) + ';\n';
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

function getAngleBetweenVectors( vector1, vector2) {
  //var radians = Math.atan2(vector2.y - vector1.y, vector2.x - vector1.x);
  //return toDegrees(radians);

  var normal1 = getNormalized(vector1);
  var normal2 = getNormalized(vector2);
  var dotProduct = getDot(normal1, normal2);
  var arcAngle = Math.acos(dotProduct);
  var arcDegrees = toDegrees(arcAngle);
  return arcDegrees;
}

function getAngleFromVector(vector){
  var degrees = toDegrees(Math.atan2(vector.x, vector.y));
  while(degrees < 0) degrees += 360;
  while(degrees >= 360) degrees -= 360;
  return degrees;
}

function getNormalized(vector) {
  var length = getDistance(0,0, vector.x, vector.y)
  var normalizedX = vector.x / length;
  var normalizedY = vector.y / length;
  return {x: normalizedX, y: normalizedY};
}

function getDot(vector1, vector2) {
  return vector1.x * vector2.x + vector1.y * vector2.y;
}

function getCross(vector1, vector2) {
  return (vector1.x * vector2.y) - (vector1.y * vector2.x);
}

function getHeightOfTriangle(Ax, Ay, Bx, By, Cx, Cy) {
  var a = getDistance(Bx, By, Cx, Cy);
  var b = getDistance(Ax, Ay, Cx, Cy);
  var c = getDistance(Ax, Ay, Bx, By);
  var semiperimiter = (a + b + c) / 2;
  return (2 * Math.sqrt(semiperimiter * (semiperimiter - a) * (semiperimiter - b) * (semiperimiter - c))) / a;
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



var sample = function(image, x, y){

  var argb = getPixelARGB(image, x, image.height - y);
  var cmyk = ARGBtoCMYK(argb);

  return cmyk;
}

var sampleCyan = function(image, x, y){
  var cmyk = sample(image, x, y);
  return cmyk.c;
}

var sampleBlack = function(image, x, y){
  var cmyk = sample(image, x, y);
  return cmyk.k;
}

var sampleMagenta = function(image, x, y){
  var cmyk = sample(image, x, y);
  return cmyk.m;
}

var sampleLuminocity = function(image, x, y){
  var argb = getPixelARGB(image, x, image.height - y);

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