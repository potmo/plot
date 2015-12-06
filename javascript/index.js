var output = '';
output += getIntro();
//output += getPlot();
//output += getWedge2(1000, 2000, 10, 10, 100);
//for (var i = 0; i < 10; i++) {
//  output += getWedge3(8000, 0, 5 * i, 10, 10, 1000, 100);
//}

var xOffset = 0;
var yOffset = 0;
var rotation = 0;
var inDegrees = 41;
var outDegrees = 41;
var amplitude = 25;
var radius = 3;
var pivot = {
  x: 0,
  y: 0
};

var startPoint = rotatePointAroundPoint({x:xOffset, y:yOffset}, pivot, rotation);
output += 'PU' + startPoint.x.toFixed(2) + ',' + startPoint.y.toFixed(2) + ';\n';

for (var j = 0; j < 40; j++) {
  for (var i = 0; xOffset < 5000; i++) {
    radius = 5 + inDegrees * 1.5;
    var result = getWedge3(xOffset, yOffset, rotation, pivot, inDegrees, outDegrees, amplitude, radius, (i % 2 == 0));
    output += result.commands;
    outDegrees = inDegrees;
    inDegrees = Math.min(inDegrees, 45);
    xOffset += result.travel;
  }
  //output += 'PU' + result.pen.x.toFixed(2) + ',' + result.pen.y.toFixed(2) + ';\n';
  yOffset += 180;
  xOffset = 0;
  radius = 3;
  inDegrees -= 1;
  outDegrees = inDegrees;
  amplitude += 1.5;

}


output += getOutro();

console.log(output);


var fs = require('fs');
fs.writeFile("output.hpgl", output, function(err) {
  if(err) {
    return console.log(err);
  }

  console.log("saved output.hpgl");
});


function getWedge3(xOffset, yOffset, rotation, pivot, inDegrees, outDegrees, amplitude, radius, flip) {

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
  output += 'PU' + p0.x.toFixed(2) + ',' + p0.y.toFixed(2) + ';\n';
  output += 'PD' + p1.x.toFixed(2) + ',' + p1.y.toFixed(2) + ';\n';
  output += 'AA' + circle.x.toFixed(2) + ',' + circle.y.toFixed(2) + ',' + (arcDegrees).toFixed(2) + ',5;\n';
  output += 'PD' + p3.x.toFixed(2) + ',' + p3.y.toFixed(2) + ';\n';
  return {
    commands: output,
    travel: travel,
    pen: { x: p3.x, y: p3.y }
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
  var s = Math.sin(toRads(-degrees));
  var c = Math.cos(toRads(-degrees));

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

function getWedge2(xOffset, yOffset, inDegrees, outDegrees, amplitude) {
  var output = '';
  var leftPeakCorner = 180 - 90 - inDegrees;
  var leftLegLength = amplitude / Math.sin(toRads(leftPeakCorner));

  var rightPeakCorner = 180 - 90 - outDegrees;
  var rightLegLength = amplitude / Math.sin(toRads(rightPeakCorner));

  var arcDegrees = (180 - 90 - inDegrees) + (180 - 90 - outDegrees)

  var x0 = xOffset;
  var y0 = yOffset;

  var x1 = x0 + cos(inDegrees) * leftLegLength / 2;
  var y1 = y0 + sin(inDegrees) * leftLegLength / 2;

  var x2 = x0 + cos(inDegrees) * leftLegLength;
  var y2 = y0 + sin(inDegrees) * leftLegLength;

  var x3 = x2 + cos(180 - outDegrees) * rightLegLength / 2;
  var y3 = y2 + sin(180 - outDegrees) * rightLegLength / 2;

  var arcx = x1 + cos(inDegrees + 90) * (leftLegLength - amplitude);
  var arcy = y1 + sin(inDegrees + 90) * (leftLegLength - amplitude);

  var x4 = x2 + cos(180 - outDegrees) * rightLegLength;
  var y4 = y2 + sin(180 - outDegrees) * rightLegLength;

  var incenter = findIncenter(x1, y1, x2, y2, x3, y3);
  var incenterRadius = findIncenterRadius(x1, y1, x2, y2, x3, y3);

  var leftTangentX = incenter.x + cos(inDegrees - 90) * incenterRadius;
  var leftTangentY = incenter.y + sin(inDegrees - 90) * incenterRadius;

  var rightTangentX = incenter.x + cos(180 - outDegrees - 90) * incenterRadius;
  var rightTangentY = incenter.y + sin(180 - outDegrees - 90) * incenterRadius;

  //output += 'PU' + x0.toFixed(2) + ',' + y0.toFixed(2) + ';\n';
  //output += 'PD;\n';
  //output += 'CI20,5;\n';
  //output += 'PD' + x1.toFixed(2) + ',' + y1.toFixed(2) + ';\n';
  //output += 'CI20,5;\n';
  //output += 'PD' + x2.toFixed(2) + ',' + y2.toFixed(2) + ';\n';
  //output += 'CI20,5;\n';
  //output += 'PD' + x3.toFixed(2) + ',' + y3.toFixed(2) + ';\n';
  //output += 'CI20,5;\n';
  //output += 'PD' + x4.toFixed(2) + ',' + y4.toFixed(2) + ';\n';
  //output += 'CI20,5;\n';
  //output += 'PU' + incenter.x.toFixed(2) + ',' + incenter.y.toFixed(2) + ';\n';
  //output += 'PD;\n';
  //output += 'CI' + incenterRadius.toFixed(2) + ',5;\n';
  //output += 'PU' + leftTangentX.toFixed(2) + ',' + leftTangentY.toFixed(2) + ';\n';
  //output += 'PD;\n';
  //output += 'CI20,5;\n';
  //output += 'PU' + rightTangentX.toFixed(2) + ',' + rightTangentY.toFixed(2) + ';\n';
  //output += 'PD;\n';
  //output += 'CI20,5;\n';
  //output += 'PU' + leftTangentX.toFixed(2) + ',' + leftTangentY.toFixed(2) + ';\n';
  //output += 'PD;\n';
  //output += 'AA' + incenter.x.toFixed(2) + ',' + incenter.y.toFixed(2) + ',' + (-1 * arcDegrees).toFixed(2) + ',5;\n';

  output += 'PU' + x0.toFixed(2) + ',' + y0.toFixed(2) + ';\n';
  output += 'PD' + leftTangentX.toFixed(2) + ',' + leftTangentY.toFixed(2) + ';\n';
  output += 'AA' + incenter.x.toFixed(2) + ',' + incenter.y.toFixed(2) + ',' + (-1 * arcDegrees).toFixed(2) + ',5;\n';
  output += 'PD' + x4.toFixed(2) + ',' + y4.toFixed(2) + ';\n';
  return output;

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

// in degrees is clockwise from north. outdegrees is counter clockwise from south
function getWedge(xOffset, yOffset, inDegrees, outDegrees, amplitude) {
  var output = '';
  var arcDegrees = (180 - 90 - inDegrees) + (180 - 90 - outDegrees)
  var arcSpacing = (cos(inDegrees) + cos(180 - outDegrees)) * amplitude / 2;

  var x0 = xOffset;
  var y0 = yOffset;

  var x1 = x0 + cos(inDegrees) * amplitude / 2;
  var y1 = y0 + sin(inDegrees) * amplitude / 2;

  var arcx = x1 + cos(inDegrees + 90) * arcSpacing / 2;
  var arcy = y1 + sin(inDegrees + 90) * arcSpacing / 2;

  var x2 = x1 + arcSpacing;
  var y2 = y1;

  var x3 = x1 + arcSpacing + cos(180 - outDegrees) * amplitude / 2;
  var y3 = y1 + sin(180 - outDegrees) * amplitude / 2;

  /*
    output += 'PU' + x0.toFixed(2) + ',' + y0.toFixed(2) + ';\n';
    output += 'PD' + (x0 + cos(0) * amplitude / 2).toFixed(2) + ',' + (y0 + sin(0) * amplitude / 2).toFixed(2) + ';\n';

    output += 'PU' + x0.toFixed(2) + ',' + y0.toFixed(2) + ';\n';
    output += 'PD' + (x0 + cos(10) * amplitude / 2).toFixed(2) + ',' + (y0 + sin(10) * amplitude / 2).toFixed(2) + ';\n';

    output += 'PU' + x0.toFixed(2) + ',' + y0.toFixed(2) + ';\n';
    output += 'PD' + (x0 + cos(20) * amplitude / 2).toFixed(2) + ',' + (y0 + sin(20) * amplitude / 2).toFixed(2) + ';\n';

    output += 'PU' + x0.toFixed(2) + ',' + y0.toFixed(2) + ';\n';
    output += 'PD' + (x0 + cos(30) * amplitude / 2).toFixed(2) + ',' + (y0 + sin(30) * amplitude / 2).toFixed(2) + ';\n';

    output += 'PU' + x0.toFixed(2) + ',' + y0.toFixed(2) + ';\n';
    output += 'PD' + (x0 + cos(40) * amplitude / 2).toFixed(2) + ',' + (y0 + sin(40) * amplitude / 2).toFixed(2) + ';\n';
  */
  output += 'PU' + x0.toFixed(2) + ',' + y0.toFixed(2) + ';\n';
  output += 'PD' + x1.toFixed(2) + ',' + y1.toFixed(2) + ';\n';
  //output += 'PD' + x2.toFixed(2) + ',' + y2.toFixed(2) + ';\n';
  output += 'AA' + arcx.toFixed(2) + ',' + arcy.toFixed(2) + ',' + (-1 * arcDegrees).toFixed(2) + ',5;\n';
  output += 'PD' + x3.toFixed(2) + ',' + y3.toFixed(2) + ';\n';

  output += 'PU' + arcx.toFixed(2) + ',' + arcy.toFixed(2) + ';\n';
  output += 'CI10;\n';

  return output;

}

function getPlot() {

  var xOffset = 8000;
  var yOffset = 3000;
  var s = 40;
  var output = 'PU' + xOffset + ',' + yOffset + ';\n';
  for (i = 0; i < 30; i++) {
    // draw line
    output += 'PD' + (xOffset + i * s) + ',' + (yOffset + s) + ';\n';
    // draw arc
    output += 'AA' + (xOffset + (i + 0.25) * s) + ',' + (yOffset + s) + ',' + -180 + ',' + 5 + ';\n';
    // draw line
    output += 'PD' + (xOffset + (i + 0.5) * s) + ',' + (yOffset - s * i) + ';\n';
    //draw arc
    output += 'AA' + (xOffset + (i + 0.75) * s) + ',' + (yOffset - s * i) + ',' + 180 + ',' + 5 + ';\n';
    // draw line
    output += 'PD' + (xOffset + (i + 1) * s) + ',' + (yOffset) + ';\n';

  }
  return output;
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