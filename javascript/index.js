var Canvas = require('canvas'),
    Image = Canvas.Image,
    fs = require('fs');


function plot() {
  console.log("loading image")
  var image = loadImage('../skeleton2.jpg')

  var output = [];
  output.pushAll(getIntro());

  output.pushAll( rasterizeImage(45, 4, image, sampleCyan)); // blue
  output.pushAll( rasterizeImage(75, 1, image, sampleLuminocity)); // black
  output.pushAll( rasterizeImage(15, 2, image, sampleMagenta)); // red

  output.pushAll( getOutro() );
  printOutputToFile(output, '../output.hpgl');
}


function rasterizeImage(rotation, color, image, sample) {

  var debug = false;
  var output = [];

  output.addCommand('SP', color.toFixed(0));

  var outputWidth = 12000;//16158;
  var outputHeight = 10000;//11040;

  var scale = Math.min(outputWidth / image.width, outputHeight / image.height);
  var horizontalSlices = 4;
  var verticalSlices = 2;

  var amplitudeGain = 2.0;

  for (var sliceY = 1; sliceY < verticalSlices; sliceY++){
    var positions = [];
    for (var sliceX = 0; sliceX < horizontalSlices; sliceX++){
      var relativeX = sliceX / horizontalSlices;
      var relativeY = sliceY / verticalSlices;

      var sampleX = image.width * relativeX;
      var sampleY = image.height * relativeY;

      var stength = sample(image, sampleX, sampleY);

      var x = sampleX * scale;
      var y = sampleY * scale;

      var ocilationsPerSlice = 1;// + Math.round(stength * 4);

      var frequencyLength = (image.width / horizontalSlices) * scale;
      var amplitudeHeight = (image.height / verticalSlices) * scale;

      var subsliceFrequencyLength = frequencyLength / ocilationsPerSlice;

      for (var o = 0; o < ocilationsPerSlice; o++) {
        var subsliceStart = subsliceFrequencyLength * o;
        positions.push({x: x + subsliceStart + subsliceFrequencyLength / 2, y: y - amplitudeHeight / 2 * stength * amplitudeGain});
        positions.push({x: x + subsliceStart + subsliceFrequencyLength, y: y + amplitudeHeight / 2 * stength * amplitudeGain});
      }

    }
    var line = rasterizeLine(positions, color, debug);
    output.pushAll(line);
  }


  return output;

}

function rasterizeLine(positions, color, debug) {
  return positions

  // draw endpoints
  .iterate(function(pos){
    if (debug) output.pushAll( drawCircle(pos.x, pos.y, 30) );
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

    //var height = getHeightOfTriangle(v0.x ,v0.y, v1.x, v1.y, v2.x, v2.y);

    var leg2Length = getDistance(v1.x, v1.y, v2.x, v2.y);
    var b = getDistance(v0.x, v0.y, v2.x, v2.y);
    var leg1Length = getDistance(v0.x, v0.y, v1.x, v1.y);

    var longestLeg = Math.max(leg1Length, leg2Length);

    v0.x = v1.x + (v0.x - v1.x) / leg1Length * longestLeg;
    v0.y = v1.y + (v0.y - v1.y) / leg1Length * longestLeg;

    v2.x = v1.x + (v2.x - v1.x) / leg2Length * longestLeg;
    v2.y = v1.y + (v2.y - v1.y) / leg2Length * longestLeg;

    //var angle = getAngleBetweenVectors({x: v0.x - v1.x, y: v0.y - v1.y}, {x: v2.x - v1.x, y: v2.y - v1.y});
    //var base = sin(angle) * longestLeg;

    //var height = getHeightOfTriangleFromSides(longestLeg,base,longestLeg);
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
     if(debug) output.pushAll( drawLine(vertices[0].x, vertices[0].y, vertices[1].x, vertices[1].y) );
     if(debug) output.pushAll( drawLine(vertices[1].x, vertices[1].y, vertices[2].x, vertices[2].y) );
     if(debug) output.pushAll( drawLine(vertices[0].x, vertices[0].y, vertices[2].x, vertices[2].y) );
  })

  // draw the incenters
  .map(function(vertices){
    var incenter = findIncenter(vertices[0].x, vertices[0].y,
                                vertices[1].x, vertices[1].y,
                                vertices[2].x, vertices[2].y);

    var inradius = findIncenterRadius(vertices[0].x, vertices[0].y,
                                      vertices[1].x, vertices[1].y,
                                      vertices[2].x, vertices[2].y);

    if (debug) output.pushAll( drawCircle(incenter.x, incenter.y, inradius) );

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

    if (debug) output.pushAll( drawCircle(ta.x, ta.y, 10) );
    if (debug) output.pushAll( drawCircle(tb.x, tb.y, 10) );

    return {
              vertices: slice.vertices,
              incenter: slice.incenter,
              inradius: slice.inradius,
              tangent1: ta,
              tangent2: tb
            };

  })

  .wrap()

  .teeMap(function(slices){
    return slices
      .map(function(slice){
        return drawThreePointArcFromCurrentLocation(slice.tangent1.x, slice.tangent1.y, slice.tangent2.x, slice.tangent2.y, slice.incenter.x, slice.incenter.y, 1);
      })
  })

  .teeMap(function(slices){
    return slices
      .collect(2)
      .map(function(slicePairs){
        return drawLineFromCurrentLocation(slicePairs[1].tangent2.x, slicePairs[1].tangent2.y);
      });
  })

  .teeMap(function(slices){
    return slices
      .map(function(slice){
        return drawThreePointArcFromCurrentLocation(slice.tangent1.x, slice.tangent1.y, slice.tangent2.x, slice.tangent2.y, slice.incenter.x, slice.incenter.y, -1);
      })
  })

  .teeMap(function(slices){
    return slices
      .dropFirst()
      .collect(2)
      .map(function(slicePairs){
        return drawLineFromCurrentLocation(slicePairs[1].tangent1.x, slicePairs[1].tangent1.y);
      })
  })

  .introspect(function(array){
    var commands = []

  // 0 is the original slices
  // 1 is the top arc
  // 2 is right leg
  // 3 is the bottom arc
  // 4 is the left leg

    // move the pen to the start position

    commands.addCommand('PU', array[0][0].tangent1.x, array[0][0].tangent1.y);
    commands.addCommand('PD');


    while(array[1].length >= 2 || array[2].length >= 1 || array[3].length >= 2 || array[4].length >= 1){

      if (array[1].length >= 2) {
        commands.pushAll(array[1].shift());
        array[1].shift() // discard the even
      }

      if (array[2].length >= 1){
        commands.pushAll(array[2].shift());
      }

      if (array[3].length >= 2){
        array[3].shift() // discard the uneven
        commands.pushAll(array[3].shift());
      }

      if (array[4].length >= 1){
        commands.pushAll(array[4].shift());
      }

    }

    return commands;
  });

}

Array.prototype.pushAll = function(otherArray) {
  var self = this;
  otherArray.forEach(function(item){
    self.push(item);
  });
  return this;
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

// just get a reference to this
Array.prototype.introspect = function(callback) {
  return callback(this);
}

// map the first element of the array (that is expected to be an array) but make a copy of the result and put that last
Array.prototype.teeMap = function(callback) {
  var mapped = callback(this[0].slice());
  this.push(mapped);
  return this;
}

// just wrap the array in an array
Array.prototype.wrap = function() {
  return [this.slice()];
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

Array.prototype.jump = function(offset, jumpSize, mutatorFunction) {

  for (var i = offset; i < this.length; i++){
    this[i] = mutatorFunction(this[i]);
  }

  return this;
}

Array.prototype.addCommand = function(name) {
  var args = [];
  for(var i = 1; i < arguments.length; i++ ){
    args.push(arguments[i]);
  }
  this.push({name: name, args: args});
  return this;
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
  var clone = this.slice();
  clone.pop();
  return clone;
}

// unshift an element from the list
Array.prototype.dropFirst = function() {
  var clone = this.slice();
  clone.shift();
  return clone;
}

function drawArc(x, y, radius, fromAngle, toAngle) {
  var startX = x + cos(fromAngle) * radius;
  var startY = y + sin(fromAngle) * radius;
  var arcAngle = toAngle - fromAngle;

  return []
    .addCommand('PU', startX, startY)
    .addCommand('PD')
    .addCommand('AA', x, y, arcAngle);
}

function drawThreePointArc(startX, startY, endX, endY, centerX, centerY, direction) {

  var centerToStart = {x: startX - centerX, y: startY - centerY};
  var centerToEnd = {x: endX - centerX, y: endY - centerY};

  var arcDegrees = getAngleBetweenVectors(centerToStart, centerToEnd) * -1;

  var output = [];
  if (direction > 0){
    output.addCommand('PU', startX, startY);
  } else{
    output.addCommand('PU', endX, endY);
  }
  output
    .addCommand('PD')
    .addCommand('AA', centerX, centerY, (arcDegrees * direction));
  return output;
}

function drawThreePointArcFromCurrentLocation(startX, startY, endX, endY, centerX, centerY, direction) {

  var centerToStart = {x: startX - centerX, y: startY - centerY};
  var centerToEnd = {x: endX - centerX, y: endY - centerY};

  var arcDegrees = getAngleBetweenVectors(centerToStart, centerToEnd) * -1;

  return []
    .addCommand('AA', centerX, centerY, (arcDegrees * direction));
}

function drawRotatedBox(x, y, side, rotation) {
  var ax = x;
  var ay = y;
  var bx = ax + cos(rotation) * side;
  var by = ay + sin(rotation) * side;
  var cx = bx + cos(rotation + 90) * side;
  var cy = by + sin(rotation + 90) * side;
  var dx = cx + cos(rotation + 180) * side;
  var dy = cy + sin(rotation + 180) * side;

  return []
    .addCommand('PU', ax, ay)
    .addCommand('PD', bx, by)
    .addCommand('PD', cx, cy)
    .addCommand('PD', dx, dy)
    .addCommand('PD', ax, ay);
}

function drawRectangle(x, y, width, height) {
  return []
    .addCommand('PU', x, y)
    .addCommand('PD',
      x + width, y,
      x + width, y + height,
      x, y + height,
      x, y);
  }

function drawCircle(x, y, radius) {
  return []
    .addCommand('PU', x, y)
    .addCommand('CI', radius, 10.0);
}

function drawLine(x1, y1, x2, y2) {
  return []
    .addCommand('PU', x1,  y1)
    .addCommand('PD', x2,  y2);
}

function drawLineFromCurrentLocation(x1, y1) {
  return []
    .addCommand('PD', x1,  y1);
}

function getIntro() {
  return []
    .addCommand('IN') // initialize
    .addCommand('IP', '0', '0', '16158', '11040') // set the work area
    .addCommand('VS', '10'); // set pen speed (1 to 128)
}

function getOutro() {
  return [].addCommand('SP', '0');
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
  return getHeightOfTriangleFromSides(a,b,c)
}

function getHeightOfTriangleFromSides(a, b ,c) {
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

  var cleanCommands = removeRedundantCommands(output);

  var hpgl = commandsToHPGL(output);

  fs.writeFile(__dirname + '/' + file, hpgl, function(err) {
    if(err) {
      return console.log(err);
    }
    console.log("saved " + file);
  });
}



function removeRedundantCommands(commands){
  var state = { x: 0, y: 0, pressure: false, color: '0'};

  // TODO: move sliding window with size 3 and filter those not doing anything
  // the idea is to remove those just lifting the pen at the current
  // position just to put it down on the same position in the command
  // also removing unnessesary pen changes
  var output = [];
  for (var i=0; i < commands.length; i++){
    var newState = getNewState(state, commands[i]);
    console.log('%s moves to %s,%s with pen %s and color %s', commands[i].name, newState.x.toFixed(2), newState.y.toFixed(2), newState.pressure, newState.color);

    if (newState.pressure) {
      output.addCommand('PD', newState.x, newState.y)
    }else{
      output.addCommand('PU', newState.x, newState.y)
    }

    state = newState;
  }



  return output;

}

function getNewState(oldState, command){
  switch(command.name) {
    case 'IN': return oldState;
    case 'IP': return oldState;
    case 'VS': return oldState;
    case 'SP': return getNewStateFromSP(oldState, command);
    case 'PU': return getNewStateFromPU(oldState, command);
    case 'PD': return getNewStateFromPD(oldState, command);
    case 'AA': return getNewStateFromAA(oldState, command);
    default: throw 'not handling ' + command.name;
  }
}

function getNewStateFromSP(oldState, command) {
  var newColor = command.args[0]
  return { x: oldState.x, y: oldState.y, pressure: oldState.pressure, color: newColor};
}

function getNewStateFromPU(oldState, command) {
  if (command.args.length > 0){
    var newEndX = command.args[command.args.length-2];
    var newEndY = command.args[command.args.length-1];
    return { x: newEndX, y: newEndY, pressure: false, color: oldState.color};
  }else{
    return { x: oldState.x, y: oldState.y, pressure: false, color: oldState.color};
  }
}

function getNewStateFromPD(oldState, command) {
  if (command.args.length > 0){
    var newEndX = command.args[command.args.length-2];
    var newEndY = command.args[command.args.length-1];
    return { x: newEndX, y: newEndY, pressure: true, color: oldState.color};
  }else{
    return { x: oldState.x, y: oldState.y, pressure: true, color: oldState.color};
  }
}

function getNewStateFromAA(oldState, command) {

  var start = {x: oldState.x, y: oldState.y};

  var pivot = {x: command.args[0], y: command.args[1]};

  var degrees = command.args[2];

  var end = rotatePointAroundPoint(start, pivot, -degrees);

  return { x: end.x, y: end.y, pressure: oldState.pressure, color: oldState.color};
}

function stateChanged(oldState, newState) {
  return
    oldState.x === newState.x &&
    oldState.y === newState.y &&
    oldState.pressure === newState.pressure &&
    oldState.color === newState.color;
}

function commandsToHPGL(commands) {
  return commands.map(function(command) {
    return command.name + command.args.map(function(arg) {
      if (typeof arg === 'number'){
        return arg.toFixed(2);
      }else{
        return arg;
      }
    }).join(',') + ';';
  }).join('\n');
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

plot();