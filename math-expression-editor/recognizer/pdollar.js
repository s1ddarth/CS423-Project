/**
 * The $P Point-Cloud Recognizer (JavaScript version)
 * Modified: improved scribble templates + stricter recognition thresholds
 **/

function Point(x, y, id) {
  this.X = x;
  this.Y = y;
  this.ID = id;
}

function PointCloud(name, points) {
  this.Name = name;
  this.Points = Resample(points, NumPoints);
  this.Points = Scale(this.Points);
  this.Points = TranslateTo(this.Points, Origin);
}

function Result(name, score, ms) {
  this.Name = name;
  this.Score = score;
  this.Time = ms;
}

const NumPointClouds = 0;
const NumPoints = 32;
const Origin = new Point(0, 0, 0);

function PDollarRecognizer() {
  this.PointClouds = [];

  // ── Straight lines (so "1", "/", "-" never match scribble) ──────────────
  this.PointClouds.push(new PointCloud("line-vertical", [
    new Point(50, 10, 1), new Point(50, 30, 1),
    new Point(50, 50, 1), new Point(50, 70, 1),
    new Point(50, 90, 1)
  ]));

  this.PointClouds.push(new PointCloud("line-diagonal", [
    new Point(10, 10, 1), new Point(25, 25, 1),
    new Point(50, 50, 1), new Point(75, 75, 1),
    new Point(90, 90, 1)
  ]));

  this.PointClouds.push(new PointCloud("line-diagonal-reverse", [
    new Point(90, 10, 1), new Point(75, 25, 1),
    new Point(50, 50, 1), new Point(25, 75, 1),
    new Point(10, 90, 1)
  ]));

  // ── Other math gestures ──────────────────────────────────────────────────
  this.PointClouds.push(new PointCloud("plus", [
    new Point(50, 10, 1), new Point(50, 90, 1),
    new Point(10, 50, 2), new Point(90, 50, 2)
  ]));

  this.PointClouds.push(new PointCloud("minus", [
    new Point(10, 50, 1), new Point(90, 50, 1)
  ]));

  this.PointClouds.push(new PointCloud("equals", [
    new Point(10, 40, 1), new Point(90, 40, 1),
    new Point(10, 60, 2), new Point(90, 60, 2)
  ]));

  this.PointClouds.push(new PointCloud("circle", [
    new Point(50, 10, 1), new Point(68, 14, 1),
    new Point(82, 24, 1), new Point(90, 38, 1),
    new Point(92, 50, 1), new Point(88, 66, 1),
    new Point(78, 80, 1), new Point(64, 88, 1),
    new Point(50, 90, 1), new Point(34, 86, 1),
    new Point(20, 76, 1), new Point(12, 62, 1),
    new Point(10, 50, 1), new Point(14, 32, 1),
    new Point(24, 18, 1), new Point(38, 10, 1),
    new Point(50, 10, 1)
  ]));

  // ── Scribble templates (aggressive back-and-forth, many reversals) ───────
  // Each template has tight, rapid direction changes that writing never has.

  // Scribble A — fast horizontal back-and-forth (classic eraser motion)
  this.PointClouds.push(new PointCloud("scribble", [
    new Point(10, 40, 1), new Point(30, 38, 1), new Point(50, 42, 1),
    new Point(70, 38, 1), new Point(90, 40, 1), new Point(70, 44, 1),
    new Point(50, 40, 1), new Point(30, 44, 1), new Point(10, 42, 1),
    new Point(30, 40, 1), new Point(50, 44, 1), new Point(70, 40, 1),
    new Point(90, 42, 1)
  ]));

  // Scribble B — horizontal back-and-forth drifting downward
  this.PointClouds.push(new PointCloud("scribble", [
    new Point(10, 20, 1), new Point(90, 24, 1), new Point(10, 30, 1),
    new Point(90, 34, 1), new Point(10, 40, 1), new Point(90, 44, 1),
    new Point(10, 50, 1), new Point(90, 54, 1), new Point(10, 60, 1),
    new Point(90, 64, 1), new Point(10, 70, 1), new Point(90, 74, 1)
  ]));

  // Scribble C — diagonal zigzag down-right with tight reversals
  this.PointClouds.push(new PointCloud("scribble", [
    new Point(10, 10, 1), new Point(35, 20, 1), new Point(15, 32, 1),
    new Point(42, 40, 1), new Point(18, 52, 1), new Point(50, 58, 1),
    new Point(22, 70, 1), new Point(58, 76, 1), new Point(28, 88, 1),
    new Point(66, 92, 1)
  ]));

  // Scribble D — diagonal zigzag down-left with tight reversals
  this.PointClouds.push(new PointCloud("scribble", [
    new Point(90, 10, 1), new Point(62, 18, 1), new Point(82, 30, 1),
    new Point(52, 38, 1), new Point(76, 50, 1), new Point(44, 56, 1),
    new Point(70, 68, 1), new Point(36, 74, 1), new Point(64, 86, 1),
    new Point(28, 92, 1)
  ]));

  // Scribble E — tight vertical up/down zigzag
  this.PointClouds.push(new PointCloud("scribble", [
    new Point(20, 10, 1), new Point(26, 35, 1), new Point(18, 10, 1),
    new Point(30, 38, 1), new Point(22, 12, 1), new Point(34, 40, 1),
    new Point(26, 14, 1), new Point(38, 42, 1), new Point(30, 16, 1),
    new Point(42, 44, 1), new Point(34, 18, 1), new Point(46, 46, 1)
  ]));

  // Scribble F — messy crossing scribble (all directions)
  this.PointClouds.push(new PointCloud("scribble", [
    new Point(20, 50, 1), new Point(80, 50, 1), new Point(50, 20, 1),
    new Point(50, 80, 1), new Point(20, 30, 1), new Point(80, 70, 1),
    new Point(80, 30, 1), new Point(20, 70, 1), new Point(40, 10, 1),
    new Point(60, 90, 1), new Point(10, 50, 1), new Point(90, 50, 1)
  ]));

  // Scribble G — short tight zigzag (small eraser strokes)
  this.PointClouds.push(new PointCloud("scribble", [
    new Point(30, 45, 1), new Point(50, 42, 1), new Point(35, 50, 1),
    new Point(55, 46, 1), new Point(38, 54, 1), new Point(58, 50, 1),
    new Point(40, 58, 1), new Point(62, 54, 1), new Point(42, 62, 1),
    new Point(64, 58, 1), new Point(44, 66, 1), new Point(66, 62, 1)
  ]));

  // Scribble H — wide fast horizontal (large eraser motion)
  this.PointClouds.push(new PointCloud("scribble", [
    new Point(5, 50, 1),  new Point(95, 48, 1), new Point(5, 54, 1),
    new Point(95, 52, 1), new Point(5, 58, 1),  new Point(95, 56, 1),
    new Point(5, 62, 1),  new Point(95, 60, 1), new Point(5, 66, 1),
    new Point(95, 64, 1)
  ]));

  // Scribble I — long wide sweep back and forth (erasing full equation)
  this.PointClouds.push(new PointCloud("scribble", [
    new Point(5, 45, 1),  new Point(95, 45, 1), new Point(5, 50, 1),
    new Point(95, 50, 1), new Point(5, 55, 1),  new Point(95, 55, 1),
    new Point(5, 60, 1),  new Point(95, 60, 1), new Point(5, 65, 1),
    new Point(95, 65, 1), new Point(5, 70, 1),  new Point(95, 70, 1)
  ]));

  // Scribble J — long zigzag with slight vertical drift (natural long erase)
  this.PointClouds.push(new PointCloud("scribble", [
    new Point(5, 40, 1),  new Point(95, 44, 1), new Point(5, 50, 1),
    new Point(95, 46, 1), new Point(5, 56, 1),  new Point(95, 52, 1),
    new Point(5, 62, 1),  new Point(95, 58, 1), new Point(5, 68, 1),
    new Point(95, 64, 1), new Point(5, 74, 1),  new Point(95, 70, 1)
  ]));

  // Scribble K — long stroke with more aggressive vertical variation
  this.PointClouds.push(new PointCloud("scribble", [
    new Point(5, 30, 1),  new Point(95, 50, 1), new Point(5, 55, 1),
    new Point(95, 35, 1), new Point(5, 60, 1),  new Point(95, 55, 1),
    new Point(5, 65, 1),  new Point(95, 45, 1), new Point(5, 70, 1),
    new Point(95, 60, 1), new Point(5, 75, 1),  new Point(95, 50, 1)
  ]));

  // Scribble L — long stroke starting right to left
  this.PointClouds.push(new PointCloud("scribble", [
    new Point(95, 45, 1), new Point(5, 45, 1),  new Point(95, 52, 1),
    new Point(5, 52, 1),  new Point(95, 58, 1), new Point(5, 58, 1),
    new Point(95, 64, 1), new Point(5, 64, 1),  new Point(95, 70, 1),
    new Point(5, 70, 1),  new Point(95, 76, 1), new Point(5, 76, 1)
  ]));

  // ── $P API ───────────────────────────────────────────────────────────────
  this.Recognize = function(points) {
    var t0 = Date.now();
    var candidate = new PointCloud("", points);

    var bestIndex = -1;
    var bestDistance = +Infinity;
    var secondBestDistance = +Infinity;

    for (var i = 0; i < this.PointClouds.length; i++) {
      var d = GreedyCloudMatch(candidate.Points, this.PointClouds[i]);

      if (d < bestDistance) {
        secondBestDistance = bestDistance;
        bestDistance = d;
        bestIndex = i;
      } else if (d < secondBestDistance) {
        secondBestDistance = d;
      }
    }

    var t1 = Date.now();

    if (bestIndex == -1) {
      return new Result("No match.", 0.0, t1 - t0);
    }

    var bestScore = bestDistance > 1.0 ? 1.0 / bestDistance : 1.0;
    var secondBestScore = secondBestDistance > 1.0 ? 1.0 / secondBestDistance : 1.0;

    // Reject weak matches
    if (bestScore < 0.60) {
      return new Result("No match.", bestScore, t1 - t0);
    }

    // Reject ambiguous matches where best and second-best are too close
    if (Math.abs(bestScore - secondBestScore) < 0.08) {
      return new Result("No match.", bestScore, t1 - t0);
    }

    return new Result(this.PointClouds[bestIndex].Name, bestScore, t1 - t0);
  }

  this.AddGesture = function(name, points) {
    this.PointClouds[this.PointClouds.length] = new PointCloud(name, points);
    var num = 0;
    for (var i = 0; i < this.PointClouds.length; i++) {
      if (this.PointClouds[i].Name == name) num++;
    }
    return num;
  }

  this.DeleteUserGestures = function() {
    this.PointClouds.length = NumPointClouds;
    return NumPointClouds;
  }
}

function GreedyCloudMatch(points, P) {
  var e = 0.50;
  var step = Math.floor(Math.pow(points.length, 1.0 - e));
  var min = +Infinity;
  for (var i = 0; i < points.length; i += step) {
    var d1 = CloudDistance(points, P.Points, i);
    var d2 = CloudDistance(P.Points, points, i);
    min = Math.min(min, Math.min(d1, d2));
  }
  return min;
}

function CloudDistance(pts1, pts2, start) {
  var matched = new Array(pts1.length);
  for (var k = 0; k < pts1.length; k++) matched[k] = false;

  var sum = 0;
  var i = start;
  do {
    var index = -1;
    var min = +Infinity;
    for (var j = 0; j < matched.length; j++) {
      if (!matched[j]) {
        var d = Distance(pts1[i], pts2[j]);
        if (d < min) { min = d; index = j; }
      }
    }
    matched[index] = true;
    var weight = 1 - ((i - start + pts1.length) % pts1.length) / pts1.length;
    sum += weight * min;
    i = (i + 1) % pts1.length;
  } while (i != start);

  return sum;
}

function Resample(points, n) {
  var I = PathLength(points) / (n - 1);
  var D = 0.0;
  var newpoints = new Array(points[0]);

  for (var i = 1; i < points.length; i++) {
    if (points[i].ID == points[i - 1].ID) {
      var d = Distance(points[i - 1], points[i]);
      if ((D + d) >= I) {
        var qx = points[i - 1].X + ((I - D) / d) * (points[i].X - points[i - 1].X);
        var qy = points[i - 1].Y + ((I - D) / d) * (points[i].Y - points[i - 1].Y);
        var q = new Point(qx, qy, points[i].ID);
        newpoints[newpoints.length] = q;
        points.splice(i, 0, q);
        D = 0.0;
      } else D += d;
    }
  }

  if (newpoints.length == n - 1)
    newpoints[newpoints.length] = new Point(
      points[points.length - 1].X,
      points[points.length - 1].Y,
      points[points.length - 1].ID
    );

  return newpoints;
}

function Scale(points) {
  var minX = +Infinity, maxX = -Infinity, minY = +Infinity, maxY = -Infinity;
  for (var i = 0; i < points.length; i++) {
    minX = Math.min(minX, points[i].X);
    minY = Math.min(minY, points[i].Y);
    maxX = Math.max(maxX, points[i].X);
    maxY = Math.max(maxY, points[i].Y);
  }
  var size = Math.max(maxX - minX, maxY - minY);
  var newpoints = new Array();
  for (var i = 0; i < points.length; i++) {
    var qx = (points[i].X - minX) / size;
    var qy = (points[i].Y - minY) / size;
    newpoints[newpoints.length] = new Point(qx, qy, points[i].ID);
  }
  return newpoints;
}

function TranslateTo(points, pt) {
  var c = Centroid(points);
  var newpoints = new Array();
  for (var i = 0; i < points.length; i++) {
    var qx = points[i].X + pt.X - c.X;
    var qy = points[i].Y + pt.Y - c.Y;
    newpoints[newpoints.length] = new Point(qx, qy, points[i].ID);
  }
  return newpoints;
}

function Centroid(points) {
  var x = 0.0, y = 0.0;
  for (var i = 0; i < points.length; i++) {
    x += points[i].X;
    y += points[i].Y;
  }
  x /= points.length;
  y /= points.length;
  return new Point(x, y, 0);
}

function PathLength(points) {
  var d = 0.0;
  for (var i = 1; i < points.length; i++) {
    if (points[i].ID == points[i - 1].ID)
      d += Distance(points[i - 1], points[i]);
  }
  return d;
}

function Distance(p1, p2) {
  var dx = p2.X - p1.X;
  var dy = p2.Y - p1.Y;
  return Math.sqrt(dx * dx + dy * dy);
}

export { PDollarRecognizer, Point };
