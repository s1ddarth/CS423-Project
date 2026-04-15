/**
 * Arrow Recognizer — $P Point-Cloud Recognizer (JavaScript version)
 * Contains only arrow-left and arrow-right templates recorded from user gestures.
 * Thresholds here are tuned exclusively for arrow recognition:
 * - No score threshold applied — the geometric gate in HandwritingCanvas
 *   (width, displacement ratio, arc-to-chord, arrowhead) already ensures
 *   only arrow-shaped strokes reach this recognizer.
 * - No gap threshold — with only two gesture classes and many templates each,
 *   the gap between arrow-left and arrow-right scores is always large enough.
 **/

function ArrowPoint(x, y, id) {
  this.X = x;
  this.Y = y;
  this.ID = id;
}

function ArrowPointCloud(name, points) {
  this.Name = name;
  this.Points = ArrowResample(points, ArrowNumPoints);
  this.Points = ArrowScale(this.Points);
  this.Points = ArrowTranslateTo(this.Points, ArrowOrigin);
}

function ArrowResult(name, score, ms) {
  this.Name = name;
  this.Score = score;
  this.Time = ms;
}

const ArrowNumPoints = 32;
const ArrowOrigin = new ArrowPoint(0, 0, 0);

function ArrowRecognizer() {
  this.PointClouds = [];

  // ── Arrow Left templates (undo) — iPad recorded ───────────────────────────
  this.PointClouds.push(new ArrowPointCloud("arrow-left", [
    new ArrowPoint(99.6, 1.2, 1), new ArrowPoint(100.0, 0.4, 1), new ArrowPoint(100.0, 0.0, 1),
    new ArrowPoint(100.0, 0.0, 1), new ArrowPoint(100.0, 0.0, 1), new ArrowPoint(99.6, 0.0, 1),
    new ArrowPoint(98.3, 0.0, 1), new ArrowPoint(95.4, 0.8, 1), new ArrowPoint(91.3, 1.7, 1),
    new ArrowPoint(86.3, 2.9, 1), new ArrowPoint(79.3, 4.6, 1), new ArrowPoint(70.5, 5.8, 1),
    new ArrowPoint(62.7, 7.5, 1), new ArrowPoint(53.9, 9.1, 1), new ArrowPoint(47.3, 10.8, 1),
    new ArrowPoint(41.5, 12.0, 1), new ArrowPoint(36.1, 12.9, 1), new ArrowPoint(32.0, 13.7, 1),
    new ArrowPoint(27.4, 14.1, 1), new ArrowPoint(22.8, 14.5, 1), new ArrowPoint(18.7, 14.9, 1),
    new ArrowPoint(16.2, 15.4, 1), new ArrowPoint(13.7, 15.8, 1), new ArrowPoint(10.4, 16.6, 1),
    new ArrowPoint(6.6, 17.0, 1), new ArrowPoint(2.9, 17.8, 1), new ArrowPoint(0.8, 18.3, 1),
    new ArrowPoint(0.0, 18.3, 1), new ArrowPoint(0.4, 18.3, 1), new ArrowPoint(2.1, 17.8, 1),
    new ArrowPoint(4.6, 17.0, 1), new ArrowPoint(7.5, 15.8, 1), new ArrowPoint(10.4, 14.1, 1),
    new ArrowPoint(13.7, 12.4, 1), new ArrowPoint(16.2, 11.2, 1), new ArrowPoint(17.4, 10.4, 1),
    new ArrowPoint(17.4, 10.0, 1), new ArrowPoint(17.0, 10.0, 1), new ArrowPoint(16.6, 10.4, 1),
    new ArrowPoint(15.8, 11.2, 1), new ArrowPoint(14.5, 12.0, 1), new ArrowPoint(13.3, 13.3, 1),
    new ArrowPoint(11.6, 14.9, 1), new ArrowPoint(9.1, 17.0, 1), new ArrowPoint(7.1, 19.1, 1),
    new ArrowPoint(5.4, 20.3, 1), new ArrowPoint(5.0, 20.7, 1), new ArrowPoint(5.4, 20.7, 1),
    new ArrowPoint(6.6, 20.7, 1), new ArrowPoint(7.9, 21.2, 1), new ArrowPoint(10.0, 22.0, 1),
    new ArrowPoint(12.4, 22.4, 1), new ArrowPoint(15.4, 23.2, 1), new ArrowPoint(17.4, 23.7, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-left", [
    new ArrowPoint(100.0, 0.5, 1), new ArrowPoint(99.5, 0.0, 1), new ArrowPoint(98.1, 0.0, 1),
    new ArrowPoint(93.4, 1.4, 1), new ArrowPoint(85.4, 2.8, 1), new ArrowPoint(74.5, 5.2, 1),
    new ArrowPoint(60.8, 7.5, 1), new ArrowPoint(48.6, 10.4, 1), new ArrowPoint(37.3, 12.7, 1),
    new ArrowPoint(27.4, 15.6, 1), new ArrowPoint(18.9, 17.5, 1), new ArrowPoint(12.3, 19.3, 1),
    new ArrowPoint(5.7, 20.3, 1), new ArrowPoint(1.4, 20.8, 1), new ArrowPoint(0.0, 20.8, 1),
    new ArrowPoint(0.5, 20.3, 1), new ArrowPoint(1.4, 19.8, 1), new ArrowPoint(3.3, 18.4, 1),
    new ArrowPoint(5.7, 17.0, 1), new ArrowPoint(8.5, 15.1, 1), new ArrowPoint(11.3, 13.2, 1),
    new ArrowPoint(14.6, 10.8, 1), new ArrowPoint(17.0, 9.9, 1), new ArrowPoint(17.9, 9.4, 1),
    new ArrowPoint(16.5, 10.4, 1), new ArrowPoint(14.2, 12.3, 1), new ArrowPoint(10.8, 14.6, 1),
    new ArrowPoint(8.0, 17.0, 1), new ArrowPoint(4.7, 19.8, 1), new ArrowPoint(2.8, 21.7, 1),
    new ArrowPoint(2.4, 22.6, 1), new ArrowPoint(2.4, 23.6, 1), new ArrowPoint(2.8, 24.5, 1),
    new ArrowPoint(3.8, 25.0, 1), new ArrowPoint(4.7, 25.9, 1), new ArrowPoint(6.1, 26.9, 1),
    new ArrowPoint(9.0, 27.8, 1), new ArrowPoint(12.3, 28.3, 1), new ArrowPoint(14.6, 28.3, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-left", [
    new ArrowPoint(100.0, 0.0, 1), new ArrowPoint(99.6, 0.0, 1), new ArrowPoint(98.7, 0.0, 1),
    new ArrowPoint(96.5, 0.4, 1), new ArrowPoint(92.1, 1.8, 1), new ArrowPoint(84.6, 3.9, 1),
    new ArrowPoint(75.4, 7.0, 1), new ArrowPoint(64.0, 9.6, 1), new ArrowPoint(52.6, 12.3, 1),
    new ArrowPoint(40.4, 15.4, 1), new ArrowPoint(30.3, 18.0, 1), new ArrowPoint(20.2, 20.2, 1),
    new ArrowPoint(12.7, 21.9, 1), new ArrowPoint(5.7, 23.2, 1), new ArrowPoint(1.8, 23.7, 1),
    new ArrowPoint(0.0, 23.7, 1), new ArrowPoint(0.4, 23.7, 1), new ArrowPoint(1.8, 22.8, 1),
    new ArrowPoint(3.5, 21.5, 1), new ArrowPoint(5.3, 20.6, 1), new ArrowPoint(7.5, 19.3, 1),
    new ArrowPoint(10.1, 18.0, 1), new ArrowPoint(12.7, 16.7, 1), new ArrowPoint(15.4, 15.4, 1),
    new ArrowPoint(17.1, 14.5, 1), new ArrowPoint(17.5, 14.0, 1), new ArrowPoint(16.7, 14.5, 1),
    new ArrowPoint(14.5, 15.4, 1), new ArrowPoint(11.8, 17.1, 1), new ArrowPoint(8.3, 19.3, 1),
    new ArrowPoint(5.3, 21.5, 1), new ArrowPoint(3.1, 23.2, 1), new ArrowPoint(1.8, 25.0, 1),
    new ArrowPoint(1.3, 25.4, 1), new ArrowPoint(1.8, 25.4, 1), new ArrowPoint(2.2, 25.4, 1),
    new ArrowPoint(3.1, 25.4, 1), new ArrowPoint(4.4, 25.9, 1), new ArrowPoint(6.6, 26.8, 1),
    new ArrowPoint(8.8, 27.6, 1), new ArrowPoint(12.3, 28.5, 1), new ArrowPoint(15.8, 28.9, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-left", [
    new ArrowPoint(100.0, 0.0, 1), new ArrowPoint(99.1, 0.0, 1), new ArrowPoint(96.3, 0.0, 1),
    new ArrowPoint(88.0, 1.4, 1), new ArrowPoint(74.7, 3.7, 1), new ArrowPoint(58.5, 6.5, 1),
    new ArrowPoint(42.9, 8.8, 1), new ArrowPoint(32.3, 10.6, 1), new ArrowPoint(22.1, 12.4, 1),
    new ArrowPoint(13.8, 13.8, 1), new ArrowPoint(6.9, 14.3, 1), new ArrowPoint(2.8, 14.7, 1),
    new ArrowPoint(1.4, 14.7, 1), new ArrowPoint(1.8, 14.7, 1), new ArrowPoint(1.8, 14.3, 1),
    new ArrowPoint(2.3, 13.4, 1), new ArrowPoint(3.2, 12.4, 1), new ArrowPoint(5.1, 11.5, 1),
    new ArrowPoint(7.8, 10.1, 1), new ArrowPoint(11.1, 8.8, 1), new ArrowPoint(14.3, 7.8, 1),
    new ArrowPoint(16.1, 7.4, 1), new ArrowPoint(16.6, 7.4, 1), new ArrowPoint(13.4, 8.8, 1),
    new ArrowPoint(9.7, 10.6, 1), new ArrowPoint(6.0, 12.4, 1), new ArrowPoint(2.3, 14.3, 1),
    new ArrowPoint(0.5, 15.7, 1), new ArrowPoint(0.0, 16.6, 1), new ArrowPoint(0.9, 17.1, 1),
    new ArrowPoint(1.8, 17.5, 1), new ArrowPoint(3.7, 18.0, 1), new ArrowPoint(6.0, 18.4, 1),
    new ArrowPoint(8.8, 18.9, 1), new ArrowPoint(12.0, 19.4, 1), new ArrowPoint(15.2, 20.3, 1),
    new ArrowPoint(16.1, 21.2, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-left", [
    new ArrowPoint(100.0, 0.0, 1), new ArrowPoint(99.6, 0.0, 1), new ArrowPoint(98.0, 0.4, 1),
    new ArrowPoint(94.1, 1.6, 1), new ArrowPoint(87.1, 3.1, 1), new ArrowPoint(78.4, 5.1, 1),
    new ArrowPoint(68.2, 7.1, 1), new ArrowPoint(58.8, 9.0, 1), new ArrowPoint(48.2, 11.0, 1),
    new ArrowPoint(37.3, 13.3, 1), new ArrowPoint(28.6, 15.7, 1), new ArrowPoint(20.0, 18.0, 1),
    new ArrowPoint(13.7, 19.6, 1), new ArrowPoint(8.2, 21.2, 1), new ArrowPoint(3.1, 22.7, 1),
    new ArrowPoint(0.8, 23.5, 1), new ArrowPoint(0.0, 23.5, 1), new ArrowPoint(0.4, 23.5, 1),
    new ArrowPoint(1.2, 22.7, 1), new ArrowPoint(2.7, 22.0, 1), new ArrowPoint(5.1, 20.4, 1),
    new ArrowPoint(7.5, 19.2, 1), new ArrowPoint(10.2, 17.6, 1), new ArrowPoint(12.5, 15.7, 1),
    new ArrowPoint(13.7, 14.9, 1), new ArrowPoint(13.3, 14.9, 1), new ArrowPoint(12.2, 15.7, 1),
    new ArrowPoint(10.2, 17.3, 1), new ArrowPoint(7.8, 18.8, 1), new ArrowPoint(5.5, 20.4, 1),
    new ArrowPoint(3.1, 22.4, 1), new ArrowPoint(1.2, 23.5, 1), new ArrowPoint(0.8, 24.3, 1),
    new ArrowPoint(0.8, 24.3, 1), new ArrowPoint(1.2, 24.3, 1), new ArrowPoint(2.0, 24.7, 1),
    new ArrowPoint(3.5, 25.1, 1), new ArrowPoint(6.3, 25.9, 1), new ArrowPoint(10.2, 26.3, 1),
    new ArrowPoint(15.3, 26.7, 1), new ArrowPoint(16.5, 26.7, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-left", [
    new ArrowPoint(100.0, 0.0, 1), new ArrowPoint(97.6, 0.0, 1), new ArrowPoint(93.2, 0.4, 1),
    new ArrowPoint(84.7, 1.6, 1), new ArrowPoint(73.1, 3.2, 1), new ArrowPoint(59.4, 5.6, 1),
    new ArrowPoint(45.8, 8.0, 1), new ArrowPoint(34.1, 10.8, 1), new ArrowPoint(23.3, 13.7, 1),
    new ArrowPoint(14.5, 16.1, 1), new ArrowPoint(7.2, 17.7, 1), new ArrowPoint(2.8, 18.5, 1),
    new ArrowPoint(0.0, 18.9, 1), new ArrowPoint(0.4, 18.9, 1), new ArrowPoint(1.6, 17.7, 1),
    new ArrowPoint(4.0, 16.5, 1), new ArrowPoint(8.0, 14.1, 1), new ArrowPoint(12.0, 12.0, 1),
    new ArrowPoint(14.9, 10.0, 1), new ArrowPoint(15.7, 9.6, 1), new ArrowPoint(14.9, 10.0, 1),
    new ArrowPoint(13.7, 10.4, 1), new ArrowPoint(12.0, 11.6, 1), new ArrowPoint(9.6, 12.9, 1),
    new ArrowPoint(7.2, 14.5, 1), new ArrowPoint(4.8, 16.5, 1), new ArrowPoint(3.2, 17.7, 1),
    new ArrowPoint(2.0, 19.3, 1), new ArrowPoint(1.6, 19.7, 1), new ArrowPoint(2.0, 19.7, 1),
    new ArrowPoint(2.4, 19.7, 1), new ArrowPoint(3.2, 20.1, 1), new ArrowPoint(4.8, 20.5, 1),
    new ArrowPoint(6.8, 20.9, 1), new ArrowPoint(10.4, 21.3, 1), new ArrowPoint(16.1, 21.3, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-left", [
    new ArrowPoint(100.0, 0.0, 1), new ArrowPoint(96.7, 0.4, 1), new ArrowPoint(92.9, 0.8, 1),
    new ArrowPoint(87.0, 1.3, 1), new ArrowPoint(77.4, 2.1, 1), new ArrowPoint(65.7, 3.3, 1),
    new ArrowPoint(52.7, 4.6, 1), new ArrowPoint(40.2, 5.9, 1), new ArrowPoint(29.7, 7.1, 1),
    new ArrowPoint(18.8, 8.4, 1), new ArrowPoint(11.3, 9.2, 1), new ArrowPoint(4.6, 10.0, 1),
    new ArrowPoint(0.8, 10.9, 1), new ArrowPoint(0.0, 10.9, 1), new ArrowPoint(0.4, 10.9, 1),
    new ArrowPoint(1.7, 10.9, 1), new ArrowPoint(2.9, 10.5, 1), new ArrowPoint(5.0, 10.0, 1),
    new ArrowPoint(7.9, 9.2, 1), new ArrowPoint(10.9, 8.4, 1), new ArrowPoint(13.8, 7.1, 1),
    new ArrowPoint(16.7, 5.9, 1), new ArrowPoint(18.8, 4.6, 1), new ArrowPoint(19.2, 3.8, 1),
    new ArrowPoint(18.4, 3.8, 1), new ArrowPoint(17.2, 4.2, 1), new ArrowPoint(15.5, 4.6, 1),
    new ArrowPoint(13.4, 5.9, 1), new ArrowPoint(11.7, 6.7, 1), new ArrowPoint(9.6, 7.9, 1),
    new ArrowPoint(7.5, 9.2, 1), new ArrowPoint(5.0, 10.5, 1), new ArrowPoint(3.3, 11.7, 1),
    new ArrowPoint(2.1, 12.1, 1), new ArrowPoint(2.5, 12.6, 1), new ArrowPoint(3.3, 13.0, 1),
    new ArrowPoint(4.2, 13.8, 1), new ArrowPoint(5.9, 14.6, 1), new ArrowPoint(8.8, 15.9, 1),
    new ArrowPoint(12.1, 16.3, 1), new ArrowPoint(15.5, 16.7, 1), new ArrowPoint(19.2, 16.7, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-left", [
    new ArrowPoint(100.0, 0.0, 1), new ArrowPoint(95.6, 0.5, 1), new ArrowPoint(88.7, 2.0, 1),
    new ArrowPoint(78.4, 3.9, 1), new ArrowPoint(63.7, 5.9, 1), new ArrowPoint(48.5, 8.8, 1),
    new ArrowPoint(35.8, 11.3, 1), new ArrowPoint(24.5, 13.7, 1), new ArrowPoint(17.2, 15.2, 1),
    new ArrowPoint(10.3, 16.7, 1), new ArrowPoint(4.4, 17.6, 1), new ArrowPoint(1.0, 18.1, 1),
    new ArrowPoint(0.0, 18.6, 1), new ArrowPoint(1.0, 17.6, 1), new ArrowPoint(2.9, 16.2, 1),
    new ArrowPoint(6.4, 14.2, 1), new ArrowPoint(10.8, 11.8, 1), new ArrowPoint(13.7, 9.8, 1),
    new ArrowPoint(15.2, 9.3, 1), new ArrowPoint(15.2, 8.8, 1), new ArrowPoint(14.7, 8.8, 1),
    new ArrowPoint(13.7, 9.3, 1), new ArrowPoint(12.7, 10.3, 1), new ArrowPoint(10.8, 10.8, 1),
    new ArrowPoint(8.8, 12.3, 1), new ArrowPoint(6.4, 13.7, 1), new ArrowPoint(4.4, 15.2, 1),
    new ArrowPoint(2.9, 16.7, 1), new ArrowPoint(1.5, 18.6, 1), new ArrowPoint(0.0, 19.6, 1),
    new ArrowPoint(0.0, 20.6, 1), new ArrowPoint(0.0, 21.1, 1), new ArrowPoint(0.5, 21.1, 1),
    new ArrowPoint(1.0, 21.1, 1), new ArrowPoint(2.9, 22.1, 1), new ArrowPoint(5.9, 22.5, 1),
    new ArrowPoint(10.3, 23.0, 1), new ArrowPoint(15.7, 23.5, 1), new ArrowPoint(19.1, 24.0, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-left", [
    new ArrowPoint(100.0, 0.0, 1), new ArrowPoint(98.2, 0.0, 1), new ArrowPoint(93.7, 0.9, 1),
    new ArrowPoint(83.9, 2.7, 1), new ArrowPoint(69.5, 5.4, 1), new ArrowPoint(53.8, 8.1, 1),
    new ArrowPoint(38.1, 11.2, 1), new ArrowPoint(25.6, 14.3, 1), new ArrowPoint(15.2, 17.5, 1),
    new ArrowPoint(9.4, 19.3, 1), new ArrowPoint(5.8, 20.2, 1), new ArrowPoint(4.5, 20.2, 1),
    new ArrowPoint(5.4, 20.2, 1), new ArrowPoint(5.8, 20.2, 1), new ArrowPoint(6.3, 20.2, 1),
    new ArrowPoint(7.6, 19.3, 1), new ArrowPoint(9.4, 17.5, 1), new ArrowPoint(12.1, 14.8, 1),
    new ArrowPoint(14.8, 12.1, 1), new ArrowPoint(16.1, 10.3, 1), new ArrowPoint(16.6, 9.9, 1),
    new ArrowPoint(15.7, 10.3, 1), new ArrowPoint(14.3, 11.2, 1), new ArrowPoint(12.6, 12.6, 1),
    new ArrowPoint(10.3, 14.3, 1), new ArrowPoint(7.6, 16.6, 1), new ArrowPoint(4.5, 19.3, 1),
    new ArrowPoint(1.8, 21.1, 1), new ArrowPoint(0.0, 22.4, 1), new ArrowPoint(0.4, 22.4, 1),
    new ArrowPoint(1.3, 22.4, 1), new ArrowPoint(3.1, 22.4, 1), new ArrowPoint(5.4, 22.9, 1),
    new ArrowPoint(8.5, 22.9, 1), new ArrowPoint(11.7, 22.9, 1), new ArrowPoint(14.8, 22.9, 1),
    new ArrowPoint(17.5, 23.3, 1), new ArrowPoint(18.8, 23.3, 1), new ArrowPoint(19.3, 23.8, 1),
    new ArrowPoint(18.8, 23.8, 1), new ArrowPoint(18.4, 22.9, 1), new ArrowPoint(17.9, 20.6, 1),
    new ArrowPoint(17.0, 17.0, 1), new ArrowPoint(16.6, 13.9, 1), new ArrowPoint(16.1, 12.6, 1),
    new ArrowPoint(16.1, 12.1, 1), new ArrowPoint(16.1, 12.6, 1), new ArrowPoint(16.1, 13.5, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-left", [
    new ArrowPoint(100.0, 0.0, 1), new ArrowPoint(98.1, 0.0, 1), new ArrowPoint(93.9, 0.5, 1),
    new ArrowPoint(86.4, 2.8, 1), new ArrowPoint(73.7, 5.6, 1), new ArrowPoint(58.2, 9.4, 1),
    new ArrowPoint(42.7, 13.1, 1), new ArrowPoint(27.2, 16.9, 1), new ArrowPoint(16.0, 20.2, 1),
    new ArrowPoint(7.5, 23.0, 1), new ArrowPoint(3.3, 24.9, 1), new ArrowPoint(0.9, 25.8, 1),
    new ArrowPoint(0.5, 25.8, 1), new ArrowPoint(0.9, 25.8, 1), new ArrowPoint(1.9, 25.8, 1),
    new ArrowPoint(2.3, 24.9, 1), new ArrowPoint(3.3, 23.9, 1), new ArrowPoint(5.6, 21.6, 1),
    new ArrowPoint(9.4, 19.2, 1), new ArrowPoint(13.1, 16.9, 1), new ArrowPoint(15.5, 15.0, 1),
    new ArrowPoint(16.0, 14.6, 1), new ArrowPoint(16.0, 14.1, 1), new ArrowPoint(15.5, 14.1, 1),
    new ArrowPoint(14.1, 14.1, 1), new ArrowPoint(12.7, 14.6, 1), new ArrowPoint(10.8, 16.0, 1),
    new ArrowPoint(8.5, 17.4, 1), new ArrowPoint(6.1, 19.7, 1), new ArrowPoint(4.2, 21.6, 1),
    new ArrowPoint(2.3, 23.9, 1), new ArrowPoint(0.9, 25.8, 1), new ArrowPoint(0.0, 26.8, 1),
    new ArrowPoint(0.0, 27.2, 1), new ArrowPoint(0.0, 28.2, 1), new ArrowPoint(0.5, 28.6, 1),
    new ArrowPoint(1.4, 28.6, 1), new ArrowPoint(3.8, 29.1, 1), new ArrowPoint(7.0, 29.1, 1),
    new ArrowPoint(11.3, 28.6, 1), new ArrowPoint(16.4, 27.7, 1), new ArrowPoint(20.2, 26.8, 1),
    new ArrowPoint(22.5, 25.8, 1), new ArrowPoint(22.1, 25.8, 1), new ArrowPoint(21.6, 25.8, 1),
    new ArrowPoint(20.7, 24.9, 1), new ArrowPoint(19.2, 23.0, 1), new ArrowPoint(17.4, 20.2, 1),
    new ArrowPoint(16.4, 18.3, 1), new ArrowPoint(15.0, 16.9, 1), new ArrowPoint(14.6, 16.0, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-left", [
    new ArrowPoint(100.0, 0.4, 1), new ArrowPoint(98.3, 0.4, 1), new ArrowPoint(92.1, 2.1, 1),
    new ArrowPoint(80.4, 5.0, 1), new ArrowPoint(62.9, 8.8, 1), new ArrowPoint(45.4, 12.9, 1),
    new ArrowPoint(29.2, 16.3, 1), new ArrowPoint(16.3, 19.2, 1), new ArrowPoint(7.9, 21.3, 1),
    new ArrowPoint(3.3, 22.5, 1), new ArrowPoint(0.4, 22.9, 1), new ArrowPoint(0.0, 22.9, 1),
    new ArrowPoint(0.4, 22.9, 1), new ArrowPoint(1.7, 22.9, 1), new ArrowPoint(3.3, 22.5, 1),
    new ArrowPoint(5.0, 21.7, 1), new ArrowPoint(6.7, 20.8, 1), new ArrowPoint(8.8, 20.0, 1),
    new ArrowPoint(10.8, 18.8, 1), new ArrowPoint(12.9, 17.5, 1), new ArrowPoint(15.8, 15.4, 1),
    new ArrowPoint(17.9, 14.2, 1), new ArrowPoint(18.3, 13.8, 1), new ArrowPoint(16.7, 14.2, 1),
    new ArrowPoint(13.3, 15.8, 1), new ArrowPoint(10.0, 17.9, 1), new ArrowPoint(6.3, 20.0, 1),
    new ArrowPoint(3.3, 22.5, 1), new ArrowPoint(1.3, 23.8, 1), new ArrowPoint(0.8, 24.2, 1),
    new ArrowPoint(0.8, 24.2, 1), new ArrowPoint(1.3, 24.2, 1), new ArrowPoint(1.7, 24.2, 1),
    new ArrowPoint(2.1, 24.2, 1), new ArrowPoint(2.9, 24.6, 1), new ArrowPoint(4.6, 25.0, 1),
    new ArrowPoint(7.1, 25.4, 1), new ArrowPoint(10.4, 25.4, 1), new ArrowPoint(14.2, 25.4, 1),
    new ArrowPoint(18.3, 25.0, 1), new ArrowPoint(21.3, 24.2, 1), new ArrowPoint(22.5, 23.8, 1),
    new ArrowPoint(22.1, 23.8, 1), new ArrowPoint(21.7, 22.9, 1), new ArrowPoint(20.8, 20.8, 1),
    new ArrowPoint(20.0, 17.9, 1), new ArrowPoint(19.6, 15.4, 1), new ArrowPoint(19.2, 14.2, 1),
    new ArrowPoint(18.8, 13.8, 1), new ArrowPoint(18.8, 14.2, 1), new ArrowPoint(19.2, 15.0, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-left", [
    new ArrowPoint(100.0, 0.0, 1), new ArrowPoint(98.8, 0.0, 1), new ArrowPoint(93.9, 0.8, 1),
    new ArrowPoint(84.2, 2.8, 1), new ArrowPoint(69.2, 5.7, 1), new ArrowPoint(52.2, 8.9, 1),
    new ArrowPoint(38.1, 11.7, 1), new ArrowPoint(25.9, 14.6, 1), new ArrowPoint(15.0, 17.0, 1),
    new ArrowPoint(8.9, 18.6, 1), new ArrowPoint(3.6, 19.8, 1), new ArrowPoint(1.2, 20.6, 1),
    new ArrowPoint(1.6, 20.6, 1), new ArrowPoint(2.0, 20.6, 1), new ArrowPoint(2.8, 20.2, 1),
    new ArrowPoint(3.6, 20.2, 1), new ArrowPoint(5.3, 19.4, 1), new ArrowPoint(7.7, 18.2, 1),
    new ArrowPoint(10.1, 17.0, 1), new ArrowPoint(13.0, 15.4, 1), new ArrowPoint(15.8, 13.4, 1),
    new ArrowPoint(17.8, 11.7, 1), new ArrowPoint(18.2, 10.9, 1), new ArrowPoint(17.0, 11.3, 1),
    new ArrowPoint(15.4, 12.6, 1), new ArrowPoint(13.4, 13.8, 1), new ArrowPoint(10.5, 15.8, 1),
    new ArrowPoint(7.3, 17.4, 1), new ArrowPoint(3.6, 19.4, 1), new ArrowPoint(1.2, 21.5, 1),
    new ArrowPoint(0.4, 22.3, 1), new ArrowPoint(0.0, 22.3, 1), new ArrowPoint(0.4, 22.3, 1),
    new ArrowPoint(0.8, 22.3, 1), new ArrowPoint(1.2, 22.7, 1), new ArrowPoint(2.0, 23.1, 1),
    new ArrowPoint(3.2, 23.5, 1), new ArrowPoint(5.3, 23.9, 1), new ArrowPoint(8.1, 23.9, 1),
    new ArrowPoint(11.7, 23.9, 1), new ArrowPoint(15.4, 23.9, 1), new ArrowPoint(18.6, 23.9, 1),
    new ArrowPoint(20.6, 23.5, 1), new ArrowPoint(21.5, 23.1, 1), new ArrowPoint(20.6, 22.7, 1),
    new ArrowPoint(19.8, 22.3, 1), new ArrowPoint(18.6, 21.1, 1), new ArrowPoint(17.4, 19.4, 1),
    new ArrowPoint(16.2, 17.0, 1), new ArrowPoint(15.4, 15.4, 1), new ArrowPoint(14.6, 14.6, 1),
    new ArrowPoint(15.0, 14.6, 1), new ArrowPoint(15.8, 14.6, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-left", [
    new ArrowPoint(100.0, 0.0, 1), new ArrowPoint(97.0, 0.0, 1), new ArrowPoint(92.3, 1.3, 1),
    new ArrowPoint(84.1, 3.0, 1), new ArrowPoint(70.8, 5.2, 1), new ArrowPoint(57.1, 7.7, 1),
    new ArrowPoint(44.6, 10.3, 1), new ArrowPoint(32.6, 12.4, 1), new ArrowPoint(23.2, 14.2, 1),
    new ArrowPoint(13.3, 16.3, 1), new ArrowPoint(8.2, 17.2, 1), new ArrowPoint(5.6, 17.6, 1),
    new ArrowPoint(5.2, 17.6, 1), new ArrowPoint(6.4, 17.2, 1), new ArrowPoint(7.7, 16.3, 1),
    new ArrowPoint(9.4, 15.0, 1), new ArrowPoint(11.2, 13.7, 1), new ArrowPoint(13.3, 12.0, 1),
    new ArrowPoint(15.9, 9.9, 1), new ArrowPoint(18.5, 8.2, 1), new ArrowPoint(21.0, 6.4, 1),
    new ArrowPoint(21.9, 6.0, 1), new ArrowPoint(22.3, 5.6, 1), new ArrowPoint(20.6, 6.4, 1),
    new ArrowPoint(18.0, 7.3, 1), new ArrowPoint(14.6, 8.6, 1), new ArrowPoint(11.2, 10.3, 1),
    new ArrowPoint(7.3, 12.0, 1), new ArrowPoint(4.3, 13.3, 1), new ArrowPoint(2.6, 14.6, 1),
    new ArrowPoint(1.3, 15.0, 1), new ArrowPoint(0.9, 15.5, 1), new ArrowPoint(0.9, 15.9, 1),
    new ArrowPoint(0.9, 16.3, 1), new ArrowPoint(0.4, 16.7, 1), new ArrowPoint(0.0, 17.6, 1),
    new ArrowPoint(0.0, 18.0, 1), new ArrowPoint(0.0, 18.9, 1), new ArrowPoint(0.0, 19.3, 1),
    new ArrowPoint(0.9, 19.7, 1), new ArrowPoint(4.3, 20.6, 1), new ArrowPoint(9.4, 21.5, 1),
    new ArrowPoint(15.0, 21.9, 1), new ArrowPoint(20.6, 21.9, 1), new ArrowPoint(24.9, 21.9, 1),
    new ArrowPoint(27.5, 21.9, 1), new ArrowPoint(28.3, 21.9, 1), new ArrowPoint(27.5, 21.9, 1),
    new ArrowPoint(26.6, 21.9, 1), new ArrowPoint(24.5, 21.9, 1), new ArrowPoint(20.6, 21.0, 1),
    new ArrowPoint(15.9, 20.6, 1), new ArrowPoint(11.6, 20.2, 1), new ArrowPoint(7.7, 20.2, 1),
    new ArrowPoint(6.0, 20.2, 1), new ArrowPoint(6.4, 20.2, 1), new ArrowPoint(7.3, 20.2, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-left", [
    new ArrowPoint(100.0, 0.0, 1), new ArrowPoint(98.3, 0.0, 1), new ArrowPoint(92.9, 1.3, 1),
    new ArrowPoint(81.5, 3.4, 1), new ArrowPoint(66.0, 6.3, 1), new ArrowPoint(50.8, 9.2, 1),
    new ArrowPoint(36.1, 13.0, 1), new ArrowPoint(23.1, 16.4, 1), new ArrowPoint(13.9, 18.5, 1),
    new ArrowPoint(6.3, 20.6, 1), new ArrowPoint(3.4, 21.8, 1), new ArrowPoint(2.9, 21.8, 1),
    new ArrowPoint(3.4, 21.8, 1), new ArrowPoint(4.2, 21.4, 1), new ArrowPoint(5.9, 21.0, 1),
    new ArrowPoint(8.0, 20.2, 1), new ArrowPoint(10.5, 19.3, 1), new ArrowPoint(13.0, 18.1, 1),
    new ArrowPoint(16.0, 16.8, 1), new ArrowPoint(18.9, 15.1, 1), new ArrowPoint(21.8, 13.4, 1),
    new ArrowPoint(23.9, 11.8, 1), new ArrowPoint(24.8, 10.5, 1), new ArrowPoint(23.5, 10.5, 1),
    new ArrowPoint(21.4, 10.9, 1), new ArrowPoint(18.1, 12.2, 1), new ArrowPoint(13.9, 13.9, 1),
    new ArrowPoint(9.2, 15.5, 1), new ArrowPoint(5.5, 17.6, 1), new ArrowPoint(2.9, 19.3, 1),
    new ArrowPoint(1.3, 20.6, 1), new ArrowPoint(0.4, 21.0, 1), new ArrowPoint(0.4, 21.4, 1),
    new ArrowPoint(0.4, 21.8, 1), new ArrowPoint(0.0, 22.3, 1), new ArrowPoint(0.0, 22.7, 1),
    new ArrowPoint(0.0, 23.5, 1), new ArrowPoint(0.4, 24.4, 1), new ArrowPoint(2.5, 24.8, 1),
    new ArrowPoint(6.7, 25.6, 1), new ArrowPoint(12.6, 25.6, 1), new ArrowPoint(20.2, 25.6, 1),
    new ArrowPoint(26.1, 24.8, 1), new ArrowPoint(28.6, 24.8, 1), new ArrowPoint(28.2, 24.4, 1),
    new ArrowPoint(27.3, 24.4, 1), new ArrowPoint(25.6, 24.4, 1), new ArrowPoint(23.1, 24.4, 1),
    new ArrowPoint(19.7, 24.4, 1), new ArrowPoint(16.0, 23.9, 1), new ArrowPoint(10.9, 23.5, 1),
    new ArrowPoint(6.7, 23.1, 1), new ArrowPoint(3.4, 23.1, 1), new ArrowPoint(2.5, 23.1, 1),
    new ArrowPoint(3.4, 23.1, 1), new ArrowPoint(4.6, 23.1, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-left", [
    new ArrowPoint(100.0, 0.4, 1), new ArrowPoint(99.6, 0.4, 1), new ArrowPoint(95.9, 0.8, 1),
    new ArrowPoint(91.0, 1.2, 1), new ArrowPoint(82.0, 1.6, 1), new ArrowPoint(68.9, 2.0, 1),
    new ArrowPoint(55.7, 2.9, 1), new ArrowPoint(41.8, 3.7, 1), new ArrowPoint(29.5, 4.9, 1),
    new ArrowPoint(22.1, 6.1, 1), new ArrowPoint(16.8, 7.0, 1), new ArrowPoint(13.9, 7.4, 1),
    new ArrowPoint(12.7, 7.8, 1), new ArrowPoint(12.7, 7.8, 1), new ArrowPoint(13.1, 7.4, 1),
    new ArrowPoint(13.5, 7.0, 1), new ArrowPoint(15.2, 5.7, 1), new ArrowPoint(18.0, 3.7, 1),
    new ArrowPoint(21.7, 2.0, 1), new ArrowPoint(25.4, 0.8, 1), new ArrowPoint(27.5, 0.0, 1),
    new ArrowPoint(27.0, 0.0, 1), new ArrowPoint(25.4, 0.4, 1), new ArrowPoint(23.0, 1.2, 1),
    new ArrowPoint(19.7, 2.0, 1), new ArrowPoint(16.0, 3.7, 1), new ArrowPoint(11.9, 5.3, 1),
    new ArrowPoint(7.8, 7.8, 1), new ArrowPoint(3.7, 9.4, 1), new ArrowPoint(1.2, 10.7, 1),
    new ArrowPoint(0.0, 11.1, 1), new ArrowPoint(0.4, 11.1, 1), new ArrowPoint(0.8, 11.5, 1),
    new ArrowPoint(2.5, 11.9, 1), new ArrowPoint(4.9, 12.7, 1), new ArrowPoint(8.2, 13.1, 1),
    new ArrowPoint(12.3, 13.5, 1), new ArrowPoint(17.6, 13.5, 1), new ArrowPoint(23.0, 13.1, 1),
    new ArrowPoint(26.6, 12.7, 1), new ArrowPoint(28.3, 12.3, 1), new ArrowPoint(27.9, 12.3, 1),
    new ArrowPoint(27.0, 12.3, 1), new ArrowPoint(25.8, 11.9, 1), new ArrowPoint(23.8, 11.5, 1),
    new ArrowPoint(21.7, 10.2, 1), new ArrowPoint(18.9, 9.4, 1), new ArrowPoint(16.4, 8.6, 1),
    new ArrowPoint(13.9, 8.2, 1), new ArrowPoint(12.7, 8.2, 1), new ArrowPoint(13.5, 8.2, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-left", [
    new ArrowPoint(100.0, 0.0, 1), new ArrowPoint(96.7, 0.0, 1), new ArrowPoint(91.9, 1.0, 1),
    new ArrowPoint(84.3, 2.4, 1), new ArrowPoint(73.8, 4.3, 1), new ArrowPoint(60.5, 6.2, 1),
    new ArrowPoint(47.1, 8.6, 1), new ArrowPoint(35.7, 11.0, 1), new ArrowPoint(25.2, 12.9, 1),
    new ArrowPoint(19.0, 14.3, 1), new ArrowPoint(14.3, 15.2, 1), new ArrowPoint(11.0, 15.7, 1),
    new ArrowPoint(10.0, 15.7, 1), new ArrowPoint(10.5, 15.2, 1), new ArrowPoint(11.0, 14.8, 1),
    new ArrowPoint(11.4, 13.8, 1), new ArrowPoint(12.4, 12.9, 1), new ArrowPoint(13.8, 11.4, 1),
    new ArrowPoint(15.7, 10.0, 1), new ArrowPoint(18.6, 8.6, 1), new ArrowPoint(21.0, 7.1, 1),
    new ArrowPoint(24.3, 5.2, 1), new ArrowPoint(26.7, 3.8, 1), new ArrowPoint(27.6, 2.9, 1),
    new ArrowPoint(26.7, 2.9, 1), new ArrowPoint(24.8, 3.3, 1), new ArrowPoint(21.9, 4.3, 1),
    new ArrowPoint(17.1, 5.7, 1), new ArrowPoint(11.9, 7.6, 1), new ArrowPoint(6.7, 9.0, 1),
    new ArrowPoint(2.9, 11.0, 1), new ArrowPoint(1.4, 11.9, 1), new ArrowPoint(0.5, 12.9, 1),
    new ArrowPoint(0.0, 13.8, 1), new ArrowPoint(0.0, 14.3, 1), new ArrowPoint(0.0, 15.2, 1),
    new ArrowPoint(0.0, 16.2, 1), new ArrowPoint(1.0, 17.1, 1), new ArrowPoint(2.9, 18.6, 1),
    new ArrowPoint(5.7, 20.0, 1), new ArrowPoint(10.0, 21.0, 1), new ArrowPoint(15.7, 21.4, 1),
    new ArrowPoint(21.0, 21.4, 1), new ArrowPoint(25.2, 21.0, 1), new ArrowPoint(27.6, 21.0, 1),
    new ArrowPoint(27.1, 21.0, 1), new ArrowPoint(26.7, 20.5, 1), new ArrowPoint(25.2, 20.0, 1),
    new ArrowPoint(22.9, 19.0, 1), new ArrowPoint(19.5, 17.6, 1), new ArrowPoint(15.7, 16.7, 1),
    new ArrowPoint(12.9, 16.2, 1), new ArrowPoint(11.4, 16.2, 1), new ArrowPoint(12.4, 16.2, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-left", [
    new ArrowPoint(100.0, 1.0, 1), new ArrowPoint(99.5, 0.5, 1), new ArrowPoint(98.6, 0.0, 1),
    new ArrowPoint(96.2, 0.0, 1), new ArrowPoint(90.9, 1.0, 1), new ArrowPoint(80.8, 2.9, 1),
    new ArrowPoint(66.8, 4.8, 1), new ArrowPoint(51.0, 6.7, 1), new ArrowPoint(34.6, 8.7, 1),
    new ArrowPoint(22.1, 10.6, 1), new ArrowPoint(13.9, 11.5, 1), new ArrowPoint(11.1, 12.0, 1),
    new ArrowPoint(10.6, 12.0, 1), new ArrowPoint(11.1, 12.0, 1), new ArrowPoint(11.5, 11.5, 1),
    new ArrowPoint(12.0, 11.1, 1), new ArrowPoint(13.0, 10.6, 1), new ArrowPoint(14.4, 10.1, 1),
    new ArrowPoint(16.3, 9.1, 1), new ArrowPoint(19.7, 8.2, 1), new ArrowPoint(25.5, 6.7, 1),
    new ArrowPoint(31.3, 4.8, 1), new ArrowPoint(35.1, 3.8, 1), new ArrowPoint(36.1, 3.4, 1),
    new ArrowPoint(35.6, 3.4, 1), new ArrowPoint(35.1, 3.4, 1), new ArrowPoint(33.2, 3.8, 1),
    new ArrowPoint(30.3, 4.3, 1), new ArrowPoint(26.0, 5.3, 1), new ArrowPoint(20.2, 6.7, 1),
    new ArrowPoint(14.9, 8.7, 1), new ArrowPoint(10.6, 10.6, 1), new ArrowPoint(6.3, 12.0, 1),
    new ArrowPoint(2.9, 13.5, 1), new ArrowPoint(1.0, 14.4, 1), new ArrowPoint(0.0, 14.4, 1),
    new ArrowPoint(0.0, 14.9, 1), new ArrowPoint(0.5, 14.9, 1), new ArrowPoint(1.4, 14.9, 1),
    new ArrowPoint(4.3, 14.9, 1), new ArrowPoint(8.2, 15.4, 1), new ArrowPoint(12.5, 15.4, 1),
    new ArrowPoint(17.3, 15.4, 1), new ArrowPoint(23.1, 14.9, 1), new ArrowPoint(28.4, 14.4, 1),
    new ArrowPoint(32.2, 13.9, 1), new ArrowPoint(33.7, 13.9, 1), new ArrowPoint(33.2, 13.9, 1),
    new ArrowPoint(32.2, 13.9, 1), new ArrowPoint(30.8, 13.9, 1), new ArrowPoint(28.4, 13.9, 1),
    new ArrowPoint(25.5, 13.5, 1), new ArrowPoint(21.6, 12.5, 1), new ArrowPoint(18.3, 11.5, 1),
    new ArrowPoint(15.9, 11.1, 1), new ArrowPoint(14.4, 10.6, 1), new ArrowPoint(14.9, 11.1, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-left", [
    new ArrowPoint(100.0, 0.0, 1), new ArrowPoint(99.5, 0.0, 1), new ArrowPoint(95.1, 0.5, 1),
    new ArrowPoint(85.2, 2.2, 1), new ArrowPoint(71.4, 4.4, 1), new ArrowPoint(56.0, 6.6, 1),
    new ArrowPoint(42.3, 8.2, 1), new ArrowPoint(28.0, 9.9, 1), new ArrowPoint(18.7, 11.5, 1),
    new ArrowPoint(12.1, 12.6, 1), new ArrowPoint(7.7, 13.7, 1), new ArrowPoint(6.6, 13.7, 1),
    new ArrowPoint(6.0, 13.7, 1), new ArrowPoint(6.6, 13.7, 1), new ArrowPoint(7.7, 13.2, 1),
    new ArrowPoint(9.3, 11.5, 1), new ArrowPoint(11.0, 9.3, 1), new ArrowPoint(13.2, 6.6, 1),
    new ArrowPoint(14.3, 3.3, 1), new ArrowPoint(14.8, 1.6, 1), new ArrowPoint(14.8, 0.5, 1),
    new ArrowPoint(14.8, 0.5, 1), new ArrowPoint(14.8, 1.1, 1), new ArrowPoint(14.3, 1.1, 1),
    new ArrowPoint(13.7, 1.6, 1), new ArrowPoint(11.5, 2.7, 1), new ArrowPoint(9.3, 4.4, 1),
    new ArrowPoint(6.0, 7.7, 1), new ArrowPoint(2.7, 12.1, 1), new ArrowPoint(1.1, 16.5, 1),
    new ArrowPoint(0.0, 20.3, 1), new ArrowPoint(0.0, 23.6, 1), new ArrowPoint(0.0, 25.8, 1),
    new ArrowPoint(0.5, 26.9, 1), new ArrowPoint(1.1, 27.5, 1), new ArrowPoint(1.6, 26.9, 1),
    new ArrowPoint(2.7, 26.9, 1), new ArrowPoint(5.5, 26.9, 1), new ArrowPoint(9.9, 26.9, 1),
    new ArrowPoint(14.8, 26.9, 1), new ArrowPoint(19.2, 26.9, 1), new ArrowPoint(22.5, 26.9, 1),
    new ArrowPoint(23.6, 26.9, 1), new ArrowPoint(23.1, 26.9, 1), new ArrowPoint(22.0, 26.4, 1),
    new ArrowPoint(20.3, 24.2, 1), new ArrowPoint(18.1, 19.8, 1), new ArrowPoint(15.4, 14.8, 1),
    new ArrowPoint(12.6, 10.4, 1), new ArrowPoint(10.4, 8.2, 1), new ArrowPoint(9.3, 7.1, 1),
    new ArrowPoint(9.9, 7.1, 1), new ArrowPoint(11.0, 7.1, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-left", [
    new ArrowPoint(100.0, 1.0, 1), new ArrowPoint(99.5, 1.5, 1), new ArrowPoint(96.5, 2.0, 1),
    new ArrowPoint(89.1, 3.0, 1), new ArrowPoint(75.6, 5.0, 1), new ArrowPoint(57.7, 7.5, 1),
    new ArrowPoint(42.3, 9.5, 1), new ArrowPoint(28.9, 11.4, 1), new ArrowPoint(18.9, 12.9, 1),
    new ArrowPoint(12.9, 13.9, 1), new ArrowPoint(10.9, 14.4, 1), new ArrowPoint(10.9, 14.9, 1),
    new ArrowPoint(11.9, 14.9, 1), new ArrowPoint(13.4, 14.4, 1), new ArrowPoint(14.4, 14.4, 1),
    new ArrowPoint(14.9, 13.9, 1), new ArrowPoint(15.4, 13.9, 1), new ArrowPoint(15.4, 12.9, 1),
    new ArrowPoint(16.4, 11.4, 1), new ArrowPoint(17.9, 9.0, 1), new ArrowPoint(19.4, 5.0, 1),
    new ArrowPoint(20.4, 2.0, 1), new ArrowPoint(20.9, 0.5, 1), new ArrowPoint(20.9, 0.0, 1),
    new ArrowPoint(20.4, 0.0, 1), new ArrowPoint(19.9, 0.0, 1), new ArrowPoint(18.9, 0.0, 1),
    new ArrowPoint(18.4, 0.5, 1), new ArrowPoint(17.4, 0.5, 1), new ArrowPoint(15.4, 1.5, 1),
    new ArrowPoint(12.4, 3.5, 1), new ArrowPoint(9.0, 7.0, 1), new ArrowPoint(5.5, 10.9, 1),
    new ArrowPoint(2.5, 14.4, 1), new ArrowPoint(1.0, 16.4, 1), new ArrowPoint(0.0, 18.4, 1),
    new ArrowPoint(0.0, 19.9, 1), new ArrowPoint(0.0, 20.4, 1), new ArrowPoint(0.0, 21.4, 1),
    new ArrowPoint(0.0, 21.9, 1), new ArrowPoint(0.5, 22.4, 1), new ArrowPoint(1.0, 22.4, 1),
    new ArrowPoint(3.0, 22.9, 1), new ArrowPoint(6.5, 22.9, 1), new ArrowPoint(10.9, 22.9, 1),
    new ArrowPoint(16.4, 22.4, 1), new ArrowPoint(21.9, 21.4, 1), new ArrowPoint(26.9, 20.9, 1),
    new ArrowPoint(29.9, 20.4, 1), new ArrowPoint(30.8, 20.4, 1), new ArrowPoint(29.9, 20.4, 1),
    new ArrowPoint(29.4, 20.4, 1), new ArrowPoint(28.9, 20.4, 1), new ArrowPoint(27.4, 19.9, 1),
    new ArrowPoint(25.4, 18.9, 1), new ArrowPoint(22.4, 17.9, 1), new ArrowPoint(19.4, 15.9, 1),
    new ArrowPoint(16.4, 13.9, 1), new ArrowPoint(14.4, 12.4, 1), new ArrowPoint(13.4, 11.4, 1),
    new ArrowPoint(13.4, 10.9, 1), new ArrowPoint(13.4, 10.4, 1), new ArrowPoint(14.4, 10.4, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-left", [
    new ArrowPoint(100.0, 5.8, 1), new ArrowPoint(99.5, 5.8, 1), new ArrowPoint(97.1, 5.8, 1),
    new ArrowPoint(92.3, 6.7, 1), new ArrowPoint(80.8, 8.7, 1), new ArrowPoint(65.4, 11.5, 1),
    new ArrowPoint(50.0, 13.9, 1), new ArrowPoint(38.9, 15.9, 1), new ArrowPoint(30.8, 17.3, 1),
    new ArrowPoint(27.4, 17.8, 1), new ArrowPoint(26.9, 17.8, 1), new ArrowPoint(27.4, 17.8, 1),
    new ArrowPoint(27.4, 17.8, 1), new ArrowPoint(27.4, 17.3, 1), new ArrowPoint(27.4, 16.8, 1),
    new ArrowPoint(26.9, 14.9, 1), new ArrowPoint(26.0, 11.5, 1), new ArrowPoint(25.0, 6.7, 1),
    new ArrowPoint(23.6, 2.9, 1), new ArrowPoint(22.1, 0.5, 1), new ArrowPoint(21.6, 0.0, 1),
    new ArrowPoint(21.6, 0.5, 1), new ArrowPoint(21.2, 1.0, 1), new ArrowPoint(21.2, 1.0, 1),
    new ArrowPoint(20.7, 1.0, 1), new ArrowPoint(20.2, 1.9, 1), new ArrowPoint(18.8, 3.4, 1),
    new ArrowPoint(16.3, 6.3, 1), new ArrowPoint(13.5, 10.6, 1), new ArrowPoint(11.1, 14.9, 1),
    new ArrowPoint(9.1, 17.8, 1), new ArrowPoint(7.2, 20.2, 1), new ArrowPoint(6.3, 22.1, 1),
    new ArrowPoint(5.3, 23.6, 1), new ArrowPoint(4.8, 24.5, 1), new ArrowPoint(3.8, 26.9, 1),
    new ArrowPoint(2.9, 27.9, 1), new ArrowPoint(1.9, 29.3, 1), new ArrowPoint(1.0, 30.3, 1),
    new ArrowPoint(0.5, 30.8, 1), new ArrowPoint(0.0, 31.3, 1), new ArrowPoint(0.0, 31.3, 1),
    new ArrowPoint(0.5, 31.3, 1), new ArrowPoint(1.9, 31.3, 1), new ArrowPoint(4.8, 31.7, 1),
    new ArrowPoint(9.1, 32.2, 1), new ArrowPoint(14.9, 32.7, 1), new ArrowPoint(19.7, 33.2, 1),
    new ArrowPoint(23.6, 34.1, 1), new ArrowPoint(26.9, 34.6, 1), new ArrowPoint(29.3, 35.6, 1),
    new ArrowPoint(31.3, 36.1, 1), new ArrowPoint(33.7, 36.1, 1), new ArrowPoint(34.6, 36.5, 1),
    new ArrowPoint(35.1, 36.5, 1), new ArrowPoint(34.1, 35.1, 1), new ArrowPoint(33.2, 32.2, 1),
    new ArrowPoint(31.7, 28.4, 1), new ArrowPoint(30.3, 24.5, 1), new ArrowPoint(28.8, 21.6, 1),
    new ArrowPoint(27.9, 19.7, 1), new ArrowPoint(27.4, 19.2, 1), new ArrowPoint(26.9, 19.2, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-left", [
    new ArrowPoint(100.0, 6.2, 1), new ArrowPoint(100.0, 5.7, 1), new ArrowPoint(97.6, 5.7, 1),
    new ArrowPoint(90.5, 7.1, 1), new ArrowPoint(77.6, 9.5, 1), new ArrowPoint(60.5, 11.9, 1),
    new ArrowPoint(46.2, 14.3, 1), new ArrowPoint(34.8, 16.2, 1), new ArrowPoint(28.6, 17.1, 1),
    new ArrowPoint(26.7, 17.1, 1), new ArrowPoint(27.1, 17.1, 1), new ArrowPoint(27.1, 16.2, 1),
    new ArrowPoint(27.1, 13.3, 1), new ArrowPoint(26.2, 7.1, 1), new ArrowPoint(25.2, 2.4, 1),
    new ArrowPoint(24.3, 0.0, 1), new ArrowPoint(24.3, 0.5, 1), new ArrowPoint(24.3, 1.0, 1),
    new ArrowPoint(24.3, 1.4, 1), new ArrowPoint(24.3, 1.9, 1), new ArrowPoint(22.4, 3.8, 1),
    new ArrowPoint(18.6, 7.1, 1), new ArrowPoint(13.3, 12.4, 1), new ArrowPoint(7.1, 16.2, 1),
    new ArrowPoint(2.9, 18.6, 1), new ArrowPoint(0.5, 19.5, 1), new ArrowPoint(0.0, 19.5, 1),
    new ArrowPoint(0.5, 19.5, 1), new ArrowPoint(1.4, 20.0, 1), new ArrowPoint(3.3, 21.0, 1),
    new ArrowPoint(6.7, 22.9, 1), new ArrowPoint(11.0, 25.2, 1), new ArrowPoint(15.2, 28.1, 1),
    new ArrowPoint(18.6, 30.0, 1), new ArrowPoint(22.4, 31.9, 1), new ArrowPoint(26.2, 32.9, 1),
    new ArrowPoint(27.6, 32.9, 1), new ArrowPoint(28.1, 32.9, 1), new ArrowPoint(27.6, 32.9, 1),
    new ArrowPoint(27.1, 32.9, 1), new ArrowPoint(27.1, 31.9, 1), new ArrowPoint(26.2, 29.0, 1),
    new ArrowPoint(25.7, 23.3, 1), new ArrowPoint(25.2, 19.0, 1), new ArrowPoint(25.2, 16.7, 1),
    new ArrowPoint(25.2, 17.1, 1), new ArrowPoint(25.2, 17.6, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-left", [
    new ArrowPoint(99.0, 4.4, 1), new ArrowPoint(100.0, 3.4, 1), new ArrowPoint(99.5, 3.4, 1),
    new ArrowPoint(97.1, 3.4, 1), new ArrowPoint(90.7, 4.9, 1), new ArrowPoint(78.4, 6.9, 1),
    new ArrowPoint(61.8, 8.8, 1), new ArrowPoint(46.1, 10.3, 1), new ArrowPoint(31.9, 11.8, 1),
    new ArrowPoint(22.5, 13.2, 1), new ArrowPoint(17.6, 13.7, 1), new ArrowPoint(16.2, 13.7, 1),
    new ArrowPoint(15.7, 13.7, 1), new ArrowPoint(15.7, 13.2, 1), new ArrowPoint(15.7, 11.8, 1),
    new ArrowPoint(15.7, 8.8, 1), new ArrowPoint(15.2, 4.9, 1), new ArrowPoint(14.7, 2.5, 1),
    new ArrowPoint(14.7, 1.0, 1), new ArrowPoint(14.2, 1.0, 1), new ArrowPoint(13.7, 0.5, 1),
    new ArrowPoint(13.7, 0.0, 1), new ArrowPoint(13.2, 0.5, 1), new ArrowPoint(12.7, 2.9, 1),
    new ArrowPoint(11.3, 5.9, 1), new ArrowPoint(9.3, 9.3, 1), new ArrowPoint(6.9, 12.3, 1),
    new ArrowPoint(3.9, 15.2, 1), new ArrowPoint(1.5, 16.7, 1), new ArrowPoint(0.0, 17.6, 1),
    new ArrowPoint(0.0, 17.6, 1), new ArrowPoint(0.5, 17.6, 1), new ArrowPoint(1.5, 18.1, 1),
    new ArrowPoint(2.9, 18.6, 1), new ArrowPoint(5.4, 19.6, 1), new ArrowPoint(8.3, 21.1, 1),
    new ArrowPoint(11.8, 22.1, 1), new ArrowPoint(14.2, 23.5, 1), new ArrowPoint(16.2, 24.5, 1),
    new ArrowPoint(16.7, 25.0, 1), new ArrowPoint(17.2, 25.5, 1), new ArrowPoint(17.2, 25.5, 1),
    new ArrowPoint(16.7, 25.5, 1), new ArrowPoint(16.2, 24.0, 1), new ArrowPoint(15.7, 22.1, 1),
    new ArrowPoint(15.2, 20.1, 1), new ArrowPoint(14.7, 18.1, 1), new ArrowPoint(14.2, 16.2, 1),
    new ArrowPoint(13.7, 15.2, 1), new ArrowPoint(13.7, 13.7, 1), new ArrowPoint(13.7, 13.2, 1),
    new ArrowPoint(13.7, 12.7, 1), new ArrowPoint(13.7, 13.2, 1), new ArrowPoint(14.2, 13.7, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-left", [
    new ArrowPoint(99.1, 4.4, 1), new ArrowPoint(99.1, 3.5, 1), new ArrowPoint(99.6, 3.1, 1),
    new ArrowPoint(100.0, 2.2, 1), new ArrowPoint(98.7, 2.2, 1), new ArrowPoint(94.3, 2.6, 1),
    new ArrowPoint(84.2, 3.5, 1), new ArrowPoint(71.5, 4.4, 1), new ArrowPoint(57.9, 5.3, 1),
    new ArrowPoint(45.2, 6.6, 1), new ArrowPoint(35.1, 7.5, 1), new ArrowPoint(27.2, 8.3, 1),
    new ArrowPoint(21.5, 9.2, 1), new ArrowPoint(19.7, 9.2, 1), new ArrowPoint(19.7, 8.8, 1),
    new ArrowPoint(19.3, 6.6, 1), new ArrowPoint(18.4, 3.5, 1), new ArrowPoint(18.0, 1.3, 1),
    new ArrowPoint(18.0, 0.4, 1), new ArrowPoint(17.5, 0.0, 1), new ArrowPoint(17.5, 0.4, 1),
    new ArrowPoint(17.5, 0.9, 1), new ArrowPoint(17.1, 1.3, 1), new ArrowPoint(15.4, 2.2, 1),
    new ArrowPoint(12.3, 3.5, 1), new ArrowPoint(7.9, 6.1, 1), new ArrowPoint(3.5, 8.8, 1),
    new ArrowPoint(0.9, 10.5, 1), new ArrowPoint(0.0, 11.4, 1), new ArrowPoint(0.4, 11.4, 1),
    new ArrowPoint(0.9, 11.4, 1), new ArrowPoint(1.8, 11.4, 1), new ArrowPoint(4.4, 12.3, 1),
    new ArrowPoint(9.2, 14.0, 1), new ArrowPoint(14.5, 16.2, 1), new ArrowPoint(17.5, 17.1, 1),
    new ArrowPoint(18.4, 17.5, 1), new ArrowPoint(18.4, 18.0, 1), new ArrowPoint(18.9, 18.4, 1),
    new ArrowPoint(19.3, 18.9, 1), new ArrowPoint(19.7, 18.9, 1), new ArrowPoint(20.2, 19.3, 1),
    new ArrowPoint(20.2, 18.9, 1), new ArrowPoint(19.7, 17.5, 1), new ArrowPoint(19.3, 15.4, 1),
    new ArrowPoint(19.3, 13.2, 1), new ArrowPoint(18.9, 11.4, 1), new ArrowPoint(18.9, 10.1, 1),
    new ArrowPoint(18.9, 9.6, 1), new ArrowPoint(18.9, 9.2, 1), new ArrowPoint(18.9, 9.6, 1),
    new ArrowPoint(18.9, 10.1, 1), new ArrowPoint(19.3, 10.1, 1), new ArrowPoint(19.7, 10.1, 1)
  ]));

  // ── Arrow Right templates (redo) — iPad recorded ─────────────────────────
  this.PointClouds.push(new ArrowPointCloud("arrow-right", [
    new ArrowPoint(2.0, 15.2, 1), new ArrowPoint(0.5, 15.2, 1), new ArrowPoint(0.0, 15.2, 1),
    new ArrowPoint(0.0, 15.2, 1), new ArrowPoint(1.5, 15.2, 1), new ArrowPoint(7.1, 15.2, 1),
    new ArrowPoint(18.7, 15.2, 1), new ArrowPoint(34.3, 14.6, 1), new ArrowPoint(51.0, 13.6, 1),
    new ArrowPoint(65.2, 11.6, 1), new ArrowPoint(76.8, 10.1, 1), new ArrowPoint(86.9, 8.6, 1),
    new ArrowPoint(93.9, 8.1, 1), new ArrowPoint(96.5, 7.6, 1), new ArrowPoint(97.5, 7.6, 1),
    new ArrowPoint(98.0, 7.6, 1), new ArrowPoint(98.0, 7.1, 1), new ArrowPoint(97.5, 6.6, 1),
    new ArrowPoint(96.5, 5.6, 1), new ArrowPoint(94.9, 4.5, 1), new ArrowPoint(92.9, 3.0, 1),
    new ArrowPoint(90.4, 2.0, 1), new ArrowPoint(87.9, 1.0, 1), new ArrowPoint(85.4, 0.5, 1),
    new ArrowPoint(83.8, 0.0, 1), new ArrowPoint(83.8, 1.0, 1), new ArrowPoint(86.4, 2.5, 1),
    new ArrowPoint(89.4, 4.0, 1), new ArrowPoint(92.4, 5.6, 1), new ArrowPoint(95.5, 7.1, 1),
    new ArrowPoint(98.0, 8.6, 1), new ArrowPoint(99.5, 9.6, 1), new ArrowPoint(100.0, 9.6, 1),
    new ArrowPoint(99.5, 9.6, 1), new ArrowPoint(99.0, 10.6, 1), new ArrowPoint(97.5, 11.6, 1),
    new ArrowPoint(96.5, 13.6, 1), new ArrowPoint(94.9, 15.7, 1), new ArrowPoint(94.4, 16.7, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-right", [
    new ArrowPoint(0.0, 15.5, 1), new ArrowPoint(0.0, 14.9, 1), new ArrowPoint(1.0, 14.9, 1),
    new ArrowPoint(6.2, 14.9, 1), new ArrowPoint(18.0, 15.5, 1), new ArrowPoint(34.5, 14.9, 1),
    new ArrowPoint(50.5, 13.4, 1), new ArrowPoint(64.9, 12.4, 1), new ArrowPoint(75.8, 10.8, 1),
    new ArrowPoint(85.1, 9.8, 1), new ArrowPoint(90.2, 8.8, 1), new ArrowPoint(91.8, 8.2, 1),
    new ArrowPoint(90.2, 7.7, 1), new ArrowPoint(88.1, 7.2, 1), new ArrowPoint(86.6, 6.7, 1),
    new ArrowPoint(85.1, 5.7, 1), new ArrowPoint(84.0, 4.6, 1), new ArrowPoint(82.5, 3.1, 1),
    new ArrowPoint(80.4, 2.1, 1), new ArrowPoint(78.9, 1.0, 1), new ArrowPoint(77.8, 0.5, 1),
    new ArrowPoint(76.8, 0.0, 1), new ArrowPoint(77.3, 1.0, 1), new ArrowPoint(79.9, 2.6, 1),
    new ArrowPoint(83.5, 4.6, 1), new ArrowPoint(87.6, 6.7, 1), new ArrowPoint(92.3, 9.3, 1),
    new ArrowPoint(96.9, 10.8, 1), new ArrowPoint(99.5, 11.9, 1), new ArrowPoint(100.0, 12.4, 1),
    new ArrowPoint(99.0, 12.9, 1), new ArrowPoint(97.4, 13.4, 1), new ArrowPoint(95.9, 14.4, 1),
    new ArrowPoint(93.3, 16.0, 1), new ArrowPoint(91.2, 17.5, 1), new ArrowPoint(88.7, 20.1, 1),
    new ArrowPoint(87.6, 21.6, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-right", [
    new ArrowPoint(0.0, 14.6, 1), new ArrowPoint(1.5, 14.6, 1), new ArrowPoint(5.7, 14.6, 1),
    new ArrowPoint(14.6, 14.3, 1), new ArrowPoint(28.0, 13.1, 1), new ArrowPoint(42.6, 11.3, 1),
    new ArrowPoint(56.5, 9.8, 1), new ArrowPoint(69.0, 8.3, 1), new ArrowPoint(80.7, 7.1, 1),
    new ArrowPoint(90.2, 6.0, 1), new ArrowPoint(96.1, 5.1, 1), new ArrowPoint(99.7, 4.5, 1),
    new ArrowPoint(100.0, 4.2, 1), new ArrowPoint(99.1, 4.2, 1), new ArrowPoint(97.6, 3.9, 1),
    new ArrowPoint(95.8, 3.6, 1), new ArrowPoint(94.3, 3.3, 1), new ArrowPoint(92.9, 3.0, 1),
    new ArrowPoint(91.1, 2.1, 1), new ArrowPoint(89.9, 1.5, 1), new ArrowPoint(88.4, 0.9, 1),
    new ArrowPoint(87.2, 0.3, 1), new ArrowPoint(86.6, 0.0, 1), new ArrowPoint(86.9, 0.3, 1),
    new ArrowPoint(87.8, 1.2, 1), new ArrowPoint(89.6, 2.4, 1), new ArrowPoint(91.7, 3.3, 1),
    new ArrowPoint(93.8, 4.5, 1), new ArrowPoint(95.8, 5.4, 1), new ArrowPoint(97.6, 6.3, 1),
    new ArrowPoint(97.9, 6.8, 1), new ArrowPoint(97.9, 7.4, 1), new ArrowPoint(97.6, 8.0, 1),
    new ArrowPoint(96.7, 8.6, 1), new ArrowPoint(95.5, 9.5, 1), new ArrowPoint(93.8, 10.7, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-right", [
    new ArrowPoint(0.0, 11.6, 1), new ArrowPoint(0.3, 11.6, 1), new ArrowPoint(2.2, 11.9, 1),
    new ArrowPoint(6.5, 11.9, 1), new ArrowPoint(15.1, 11.9, 1), new ArrowPoint(25.7, 11.6, 1),
    new ArrowPoint(36.8, 11.1, 1), new ArrowPoint(48.6, 10.0, 1), new ArrowPoint(59.7, 8.9, 1),
    new ArrowPoint(70.8, 7.8, 1), new ArrowPoint(80.3, 6.5, 1), new ArrowPoint(88.4, 5.4, 1),
    new ArrowPoint(94.3, 4.6, 1), new ArrowPoint(98.6, 4.1, 1), new ArrowPoint(99.7, 3.8, 1),
    new ArrowPoint(98.1, 3.8, 1), new ArrowPoint(96.5, 3.5, 1), new ArrowPoint(94.9, 3.2, 1),
    new ArrowPoint(92.7, 2.7, 1), new ArrowPoint(90.8, 2.2, 1), new ArrowPoint(89.2, 1.4, 1),
    new ArrowPoint(88.1, 0.5, 1), new ArrowPoint(87.0, 0.0, 1), new ArrowPoint(87.6, 0.3, 1),
    new ArrowPoint(88.9, 1.1, 1), new ArrowPoint(90.8, 1.9, 1), new ArrowPoint(93.2, 2.7, 1),
    new ArrowPoint(96.5, 3.5, 1), new ArrowPoint(98.9, 4.1, 1), new ArrowPoint(100.0, 4.6, 1),
    new ArrowPoint(100.0, 5.1, 1), new ArrowPoint(99.5, 5.4, 1), new ArrowPoint(98.9, 5.9, 1),
    new ArrowPoint(97.8, 6.8, 1), new ArrowPoint(96.2, 7.8, 1), new ArrowPoint(93.8, 9.2, 1),
    new ArrowPoint(91.6, 10.5, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-right", [
    new ArrowPoint(0.3, 16.9, 1), new ArrowPoint(0.0, 16.9, 1), new ArrowPoint(1.3, 16.9, 1),
    new ArrowPoint(6.9, 16.3, 1), new ArrowPoint(17.8, 14.7, 1), new ArrowPoint(32.8, 12.5, 1),
    new ArrowPoint(48.4, 10.3, 1), new ArrowPoint(63.4, 8.8, 1), new ArrowPoint(75.3, 7.5, 1),
    new ArrowPoint(85.3, 6.3, 1), new ArrowPoint(93.4, 5.3, 1), new ArrowPoint(96.6, 4.7, 1),
    new ArrowPoint(97.5, 4.7, 1), new ArrowPoint(95.9, 4.7, 1), new ArrowPoint(94.1, 4.7, 1),
    new ArrowPoint(92.2, 4.7, 1), new ArrowPoint(89.7, 4.1, 1), new ArrowPoint(86.9, 3.4, 1),
    new ArrowPoint(83.1, 2.5, 1), new ArrowPoint(80.0, 1.6, 1), new ArrowPoint(77.2, 0.6, 1),
    new ArrowPoint(75.3, 0.0, 1), new ArrowPoint(75.6, 0.3, 1), new ArrowPoint(76.9, 1.3, 1),
    new ArrowPoint(77.8, 2.5, 1), new ArrowPoint(78.8, 4.7, 1), new ArrowPoint(79.7, 6.9, 1),
    new ArrowPoint(80.6, 9.7, 1), new ArrowPoint(81.6, 12.2, 1), new ArrowPoint(81.9, 14.1, 1),
    new ArrowPoint(82.5, 15.3, 1), new ArrowPoint(82.8, 15.9, 1), new ArrowPoint(83.4, 15.3, 1),
    new ArrowPoint(85.0, 14.1, 1), new ArrowPoint(86.9, 12.2, 1), new ArrowPoint(89.7, 9.7, 1),
    new ArrowPoint(93.1, 7.5, 1), new ArrowPoint(95.9, 5.6, 1), new ArrowPoint(98.1, 4.1, 1),
    new ArrowPoint(99.4, 3.1, 1), new ArrowPoint(100.0, 2.8, 1), new ArrowPoint(99.1, 2.8, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-right", [
    new ArrowPoint(0.7, 15.4, 1), new ArrowPoint(0.0, 15.1, 1), new ArrowPoint(0.3, 15.1, 1),
    new ArrowPoint(3.3, 15.1, 1), new ArrowPoint(10.2, 15.1, 1), new ArrowPoint(23.6, 14.1, 1),
    new ArrowPoint(40.0, 12.1, 1), new ArrowPoint(55.7, 10.2, 1), new ArrowPoint(70.8, 8.2, 1),
    new ArrowPoint(82.6, 6.9, 1), new ArrowPoint(92.1, 5.6, 1), new ArrowPoint(98.7, 4.6, 1),
    new ArrowPoint(100.0, 4.3, 1), new ArrowPoint(99.3, 4.3, 1), new ArrowPoint(98.0, 4.3, 1),
    new ArrowPoint(96.7, 4.3, 1), new ArrowPoint(95.1, 3.9, 1), new ArrowPoint(93.4, 3.6, 1),
    new ArrowPoint(90.5, 3.0, 1), new ArrowPoint(86.6, 2.3, 1), new ArrowPoint(83.3, 1.3, 1),
    new ArrowPoint(80.0, 0.7, 1), new ArrowPoint(78.0, 0.3, 1), new ArrowPoint(77.0, 0.0, 1),
    new ArrowPoint(77.4, 0.0, 1), new ArrowPoint(78.0, 0.7, 1), new ArrowPoint(78.7, 1.6, 1),
    new ArrowPoint(79.7, 3.3, 1), new ArrowPoint(80.7, 5.6, 1), new ArrowPoint(82.0, 7.9, 1),
    new ArrowPoint(82.6, 10.5, 1), new ArrowPoint(83.0, 12.1, 1), new ArrowPoint(83.3, 13.4, 1),
    new ArrowPoint(83.6, 14.4, 1), new ArrowPoint(83.9, 14.8, 1), new ArrowPoint(84.9, 13.8, 1),
    new ArrowPoint(86.9, 12.1, 1), new ArrowPoint(90.2, 10.2, 1), new ArrowPoint(94.1, 7.9, 1),
    new ArrowPoint(97.7, 5.6, 1), new ArrowPoint(99.7, 4.3, 1), new ArrowPoint(100.0, 3.6, 1),
    new ArrowPoint(99.0, 3.9, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-right", [
    new ArrowPoint(0.0, 17.0, 1), new ArrowPoint(0.3, 17.0, 1), new ArrowPoint(3.3, 17.0, 1),
    new ArrowPoint(10.2, 17.0, 1), new ArrowPoint(23.0, 15.7, 1), new ArrowPoint(38.7, 13.4, 1),
    new ArrowPoint(55.4, 11.5, 1), new ArrowPoint(70.8, 10.2, 1), new ArrowPoint(83.9, 9.5, 1),
    new ArrowPoint(93.8, 8.5, 1), new ArrowPoint(98.4, 8.2, 1), new ArrowPoint(99.7, 7.9, 1),
    new ArrowPoint(100.0, 7.9, 1), new ArrowPoint(99.3, 7.9, 1), new ArrowPoint(98.0, 7.9, 1),
    new ArrowPoint(97.4, 7.9, 1), new ArrowPoint(95.7, 7.5, 1), new ArrowPoint(94.8, 7.2, 1),
    new ArrowPoint(93.4, 6.2, 1), new ArrowPoint(90.8, 4.9, 1), new ArrowPoint(87.2, 3.3, 1),
    new ArrowPoint(83.0, 1.6, 1), new ArrowPoint(79.7, 0.3, 1), new ArrowPoint(77.7, 0.0, 1),
    new ArrowPoint(77.7, 0.0, 1), new ArrowPoint(78.0, 0.7, 1), new ArrowPoint(78.7, 1.6, 1),
    new ArrowPoint(79.3, 3.3, 1), new ArrowPoint(80.0, 5.2, 1), new ArrowPoint(80.3, 7.5, 1),
    new ArrowPoint(80.7, 10.2, 1), new ArrowPoint(81.0, 12.5, 1), new ArrowPoint(81.0, 14.8, 1),
    new ArrowPoint(81.0, 16.4, 1), new ArrowPoint(81.3, 18.0, 1), new ArrowPoint(81.3, 18.7, 1),
    new ArrowPoint(81.6, 19.3, 1), new ArrowPoint(82.0, 19.7, 1), new ArrowPoint(82.3, 20.0, 1),
    new ArrowPoint(82.6, 20.0, 1), new ArrowPoint(83.3, 19.7, 1), new ArrowPoint(84.3, 19.0, 1),
    new ArrowPoint(85.6, 18.4, 1), new ArrowPoint(87.5, 17.4, 1), new ArrowPoint(89.8, 16.1, 1),
    new ArrowPoint(92.1, 14.8, 1), new ArrowPoint(94.8, 13.1, 1), new ArrowPoint(96.1, 11.5, 1),
    new ArrowPoint(97.0, 10.5, 1), new ArrowPoint(97.0, 9.8, 1), new ArrowPoint(96.4, 9.8, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-right", [
    new ArrowPoint(0.7, 14.2, 1), new ArrowPoint(0.0, 13.9, 1), new ArrowPoint(0.7, 13.9, 1),
    new ArrowPoint(4.6, 13.9, 1), new ArrowPoint(12.6, 13.2, 1), new ArrowPoint(26.8, 11.6, 1),
    new ArrowPoint(43.7, 9.3, 1), new ArrowPoint(60.9, 7.3, 1), new ArrowPoint(75.5, 6.3, 1),
    new ArrowPoint(87.4, 5.3, 1), new ArrowPoint(96.0, 4.6, 1), new ArrowPoint(99.0, 4.3, 1),
    new ArrowPoint(99.3, 4.0, 1), new ArrowPoint(99.0, 4.0, 1), new ArrowPoint(98.3, 4.0, 1),
    new ArrowPoint(97.7, 3.6, 1), new ArrowPoint(96.7, 3.3, 1), new ArrowPoint(94.4, 2.6, 1),
    new ArrowPoint(90.7, 2.0, 1), new ArrowPoint(85.4, 1.3, 1), new ArrowPoint(79.5, 0.7, 1),
    new ArrowPoint(73.8, 0.3, 1), new ArrowPoint(70.2, 0.0, 1), new ArrowPoint(68.2, 0.0, 1),
    new ArrowPoint(68.2, 0.3, 1), new ArrowPoint(68.5, 0.3, 1), new ArrowPoint(68.9, 0.3, 1),
    new ArrowPoint(69.2, 0.7, 1), new ArrowPoint(69.5, 1.3, 1), new ArrowPoint(69.9, 2.0, 1),
    new ArrowPoint(70.5, 3.0, 1), new ArrowPoint(71.2, 4.6, 1), new ArrowPoint(71.9, 6.6, 1),
    new ArrowPoint(72.5, 8.9, 1), new ArrowPoint(73.2, 11.3, 1), new ArrowPoint(73.5, 13.6, 1),
    new ArrowPoint(73.8, 15.2, 1), new ArrowPoint(74.2, 16.2, 1), new ArrowPoint(74.2, 16.9, 1),
    new ArrowPoint(74.5, 16.9, 1), new ArrowPoint(75.2, 16.6, 1), new ArrowPoint(76.5, 15.9, 1),
    new ArrowPoint(78.5, 14.6, 1), new ArrowPoint(81.1, 13.2, 1), new ArrowPoint(84.4, 11.6, 1),
    new ArrowPoint(89.1, 9.6, 1), new ArrowPoint(93.4, 7.3, 1), new ArrowPoint(97.0, 5.6, 1),
    new ArrowPoint(99.0, 4.6, 1), new ArrowPoint(99.7, 4.3, 1), new ArrowPoint(100.0, 4.0, 1),
    new ArrowPoint(99.7, 4.0, 1), new ArrowPoint(99.0, 4.0, 1), new ArrowPoint(98.3, 4.3, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-right", [
    new ArrowPoint(3.8, 24.9, 1), new ArrowPoint(0.9, 24.9, 1), new ArrowPoint(0.0, 24.9, 1),
    new ArrowPoint(0.0, 24.9, 1), new ArrowPoint(1.4, 25.4, 1), new ArrowPoint(4.7, 25.4, 1),
    new ArrowPoint(11.7, 24.9, 1), new ArrowPoint(25.4, 23.9, 1), new ArrowPoint(42.7, 22.1, 1),
    new ArrowPoint(58.7, 20.7, 1), new ArrowPoint(69.5, 19.7, 1), new ArrowPoint(77.0, 18.3, 1),
    new ArrowPoint(79.3, 17.8, 1), new ArrowPoint(78.9, 17.8, 1), new ArrowPoint(77.9, 17.8, 1),
    new ArrowPoint(77.9, 18.3, 1), new ArrowPoint(77.5, 17.8, 1), new ArrowPoint(77.5, 16.4, 1),
    new ArrowPoint(76.5, 13.1, 1), new ArrowPoint(75.6, 8.5, 1), new ArrowPoint(74.6, 4.2, 1),
    new ArrowPoint(73.7, 1.4, 1), new ArrowPoint(73.2, 0.5, 1), new ArrowPoint(72.8, 0.0, 1),
    new ArrowPoint(72.8, 0.5, 1), new ArrowPoint(72.8, 0.9, 1), new ArrowPoint(73.2, 1.4, 1),
    new ArrowPoint(74.6, 1.9, 1), new ArrowPoint(76.1, 3.3, 1), new ArrowPoint(78.9, 5.2, 1),
    new ArrowPoint(83.1, 7.5, 1), new ArrowPoint(88.3, 10.3, 1), new ArrowPoint(93.0, 12.7, 1),
    new ArrowPoint(96.2, 14.1, 1), new ArrowPoint(98.1, 14.6, 1), new ArrowPoint(99.1, 15.0, 1),
    new ArrowPoint(100.0, 15.0, 1), new ArrowPoint(99.1, 15.5, 1), new ArrowPoint(97.7, 16.4, 1),
    new ArrowPoint(95.8, 17.8, 1), new ArrowPoint(93.4, 20.2, 1), new ArrowPoint(90.1, 23.5, 1),
    new ArrowPoint(86.9, 26.3, 1), new ArrowPoint(84.5, 28.6, 1), new ArrowPoint(82.6, 31.0, 1),
    new ArrowPoint(82.2, 32.4, 1), new ArrowPoint(81.7, 33.3, 1), new ArrowPoint(81.7, 34.7, 1),
    new ArrowPoint(81.2, 35.7, 1), new ArrowPoint(81.2, 37.1, 1), new ArrowPoint(81.2, 37.6, 1),
    new ArrowPoint(80.3, 35.7, 1), new ArrowPoint(79.8, 33.3, 1), new ArrowPoint(78.9, 31.0, 1),
    new ArrowPoint(77.9, 28.6, 1), new ArrowPoint(77.5, 26.8, 1), new ArrowPoint(76.5, 24.4, 1),
    new ArrowPoint(75.6, 22.5, 1), new ArrowPoint(75.6, 21.6, 1), new ArrowPoint(75.6, 21.1, 1),
    new ArrowPoint(75.6, 21.6, 1), new ArrowPoint(76.5, 22.1, 1), new ArrowPoint(77.0, 22.5, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-right", [
    new ArrowPoint(4.9, 7.8, 1), new ArrowPoint(2.5, 6.9, 1), new ArrowPoint(1.0, 6.4, 1),
    new ArrowPoint(0.0, 6.4, 1), new ArrowPoint(0.5, 6.4, 1), new ArrowPoint(4.4, 6.9, 1),
    new ArrowPoint(13.2, 7.4, 1), new ArrowPoint(29.4, 7.8, 1), new ArrowPoint(52.9, 7.8, 1),
    new ArrowPoint(74.5, 7.4, 1), new ArrowPoint(90.2, 6.4, 1), new ArrowPoint(98.5, 5.4, 1),
    new ArrowPoint(100.0, 3.9, 1), new ArrowPoint(97.5, 2.0, 1), new ArrowPoint(90.2, 1.0, 1),
    new ArrowPoint(80.4, 0.5, 1), new ArrowPoint(73.0, 0.0, 1), new ArrowPoint(69.6, 0.0, 1),
    new ArrowPoint(70.6, 0.5, 1), new ArrowPoint(74.5, 1.5, 1), new ArrowPoint(81.9, 2.5, 1),
    new ArrowPoint(89.7, 3.4, 1), new ArrowPoint(96.1, 4.4, 1), new ArrowPoint(98.5, 5.4, 1),
    new ArrowPoint(97.5, 6.4, 1), new ArrowPoint(94.6, 7.8, 1), new ArrowPoint(89.7, 10.3, 1),
    new ArrowPoint(83.8, 12.7, 1), new ArrowPoint(78.9, 15.2, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-right", [
    new ArrowPoint(1.9, 5.6, 1), new ArrowPoint(0.5, 4.7, 1), new ArrowPoint(0.0, 4.7, 1),
    new ArrowPoint(2.3, 4.7, 1), new ArrowPoint(8.5, 4.7, 1), new ArrowPoint(18.8, 4.7, 1),
    new ArrowPoint(35.7, 4.7, 1), new ArrowPoint(55.4, 3.8, 1), new ArrowPoint(75.6, 2.8, 1),
    new ArrowPoint(91.5, 1.9, 1), new ArrowPoint(98.6, 1.4, 1), new ArrowPoint(100.0, 0.5, 1),
    new ArrowPoint(97.2, 0.0, 1), new ArrowPoint(92.0, 0.0, 1), new ArrowPoint(85.4, 0.0, 1),
    new ArrowPoint(79.3, 0.0, 1), new ArrowPoint(75.6, 0.0, 1), new ArrowPoint(74.6, 0.0, 1),
    new ArrowPoint(78.4, 0.0, 1), new ArrowPoint(85.0, 0.9, 1), new ArrowPoint(91.5, 1.9, 1),
    new ArrowPoint(95.3, 2.3, 1), new ArrowPoint(96.7, 3.3, 1), new ArrowPoint(96.2, 4.2, 1),
    new ArrowPoint(94.4, 5.2, 1), new ArrowPoint(91.5, 7.0, 1), new ArrowPoint(87.8, 8.9, 1),
    new ArrowPoint(82.6, 10.8, 1), new ArrowPoint(78.4, 13.1, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-right", [
    new ArrowPoint(0.5, 4.1, 1), new ArrowPoint(0.0, 4.1, 1), new ArrowPoint(3.7, 4.1, 1),
    new ArrowPoint(11.9, 4.6, 1), new ArrowPoint(28.4, 4.6, 1), new ArrowPoint(49.1, 4.1, 1),
    new ArrowPoint(69.7, 4.1, 1), new ArrowPoint(86.7, 4.1, 1), new ArrowPoint(96.8, 3.2, 1),
    new ArrowPoint(100.0, 2.3, 1), new ArrowPoint(98.6, 1.4, 1), new ArrowPoint(93.6, 0.9, 1),
    new ArrowPoint(87.6, 0.5, 1), new ArrowPoint(81.7, 0.0, 1), new ArrowPoint(77.5, 0.0, 1),
    new ArrowPoint(74.8, 0.0, 1), new ArrowPoint(76.1, 0.5, 1), new ArrowPoint(81.7, 0.9, 1),
    new ArrowPoint(87.6, 1.4, 1), new ArrowPoint(92.7, 2.3, 1), new ArrowPoint(95.4, 2.8, 1),
    new ArrowPoint(95.9, 3.7, 1), new ArrowPoint(95.0, 4.6, 1), new ArrowPoint(93.6, 6.0, 1),
    new ArrowPoint(91.7, 7.3, 1), new ArrowPoint(89.0, 9.2, 1), new ArrowPoint(84.9, 11.0, 1),
    new ArrowPoint(83.0, 11.5, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-right", [
    new ArrowPoint(0.9, 6.3, 1), new ArrowPoint(0.0, 6.3, 1), new ArrowPoint(0.0, 6.3, 1),
    new ArrowPoint(1.8, 6.3, 1), new ArrowPoint(8.6, 6.3, 1), new ArrowPoint(22.1, 6.3, 1),
    new ArrowPoint(41.4, 5.9, 1), new ArrowPoint(61.7, 5.4, 1), new ArrowPoint(78.8, 5.0, 1),
    new ArrowPoint(91.9, 4.1, 1), new ArrowPoint(99.1, 3.2, 1), new ArrowPoint(100.0, 2.7, 1),
    new ArrowPoint(98.2, 1.8, 1), new ArrowPoint(93.7, 1.8, 1), new ArrowPoint(88.7, 1.4, 1),
    new ArrowPoint(84.2, 0.9, 1), new ArrowPoint(81.1, 0.9, 1), new ArrowPoint(78.8, 0.5, 1),
    new ArrowPoint(78.4, 0.5, 1), new ArrowPoint(80.2, 0.5, 1), new ArrowPoint(84.2, 0.0, 1),
    new ArrowPoint(89.2, 0.0, 1), new ArrowPoint(94.1, 0.0, 1), new ArrowPoint(96.8, 0.5, 1),
    new ArrowPoint(98.2, 0.9, 1), new ArrowPoint(99.1, 1.8, 1), new ArrowPoint(98.6, 2.7, 1),
    new ArrowPoint(96.8, 3.6, 1), new ArrowPoint(93.7, 5.4, 1), new ArrowPoint(88.7, 7.2, 1),
    new ArrowPoint(83.8, 9.5, 1), new ArrowPoint(82.4, 9.9, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-right", [
    new ArrowPoint(0.9, 3.9, 1), new ArrowPoint(0.0, 3.4, 1), new ArrowPoint(0.4, 3.4, 1),
    new ArrowPoint(4.7, 3.4, 1), new ArrowPoint(14.7, 3.4, 1), new ArrowPoint(32.8, 3.0, 1),
    new ArrowPoint(55.2, 3.0, 1), new ArrowPoint(75.9, 3.0, 1), new ArrowPoint(89.7, 3.0, 1),
    new ArrowPoint(98.3, 3.0, 1), new ArrowPoint(100.0, 2.6, 1), new ArrowPoint(98.3, 1.7, 1),
    new ArrowPoint(93.5, 1.7, 1), new ArrowPoint(86.6, 1.3, 1), new ArrowPoint(81.9, 1.3, 1),
    new ArrowPoint(78.0, 0.9, 1), new ArrowPoint(75.9, 0.4, 1), new ArrowPoint(76.3, 0.4, 1),
    new ArrowPoint(78.4, 0.4, 1), new ArrowPoint(82.3, 0.0, 1), new ArrowPoint(86.6, 0.0, 1),
    new ArrowPoint(91.4, 0.0, 1), new ArrowPoint(94.4, 0.4, 1), new ArrowPoint(94.8, 1.3, 1),
    new ArrowPoint(94.4, 2.2, 1), new ArrowPoint(92.7, 3.4, 1), new ArrowPoint(91.4, 4.7, 1),
    new ArrowPoint(88.8, 6.0, 1), new ArrowPoint(85.8, 7.8, 1), new ArrowPoint(82.8, 9.5, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-right", [
    new ArrowPoint(0.0, 6.4, 1), new ArrowPoint(0.0, 6.0, 1), new ArrowPoint(0.0, 5.6, 1),
    new ArrowPoint(0.9, 5.6, 1), new ArrowPoint(3.9, 5.6, 1), new ArrowPoint(12.4, 5.6, 1),
    new ArrowPoint(25.8, 5.6, 1), new ArrowPoint(42.1, 5.6, 1), new ArrowPoint(58.8, 5.2, 1),
    new ArrowPoint(72.5, 4.7, 1), new ArrowPoint(84.1, 4.3, 1), new ArrowPoint(91.8, 3.4, 1),
    new ArrowPoint(96.1, 2.6, 1), new ArrowPoint(97.0, 1.3, 1), new ArrowPoint(95.3, 0.4, 1),
    new ArrowPoint(91.0, 0.4, 1), new ArrowPoint(86.3, 0.0, 1), new ArrowPoint(82.8, 0.0, 1),
    new ArrowPoint(81.1, 0.0, 1), new ArrowPoint(80.7, 0.4, 1), new ArrowPoint(82.0, 0.9, 1),
    new ArrowPoint(87.1, 1.3, 1), new ArrowPoint(93.6, 2.1, 1), new ArrowPoint(98.3, 3.0, 1),
    new ArrowPoint(100.0, 3.9, 1), new ArrowPoint(99.6, 4.3, 1), new ArrowPoint(97.0, 5.6, 1),
    new ArrowPoint(91.4, 7.3, 1), new ArrowPoint(84.1, 9.4, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-right", [
    new ArrowPoint(1.6, 7.1, 1), new ArrowPoint(0.8, 6.7, 1), new ArrowPoint(0.4, 6.3, 1),
    new ArrowPoint(0.0, 6.3, 1), new ArrowPoint(0.8, 6.3, 1), new ArrowPoint(4.8, 6.3, 1),
    new ArrowPoint(12.7, 6.3, 1), new ArrowPoint(24.2, 6.3, 1), new ArrowPoint(38.5, 6.3, 1),
    new ArrowPoint(52.4, 6.3, 1), new ArrowPoint(65.5, 6.3, 1), new ArrowPoint(76.6, 6.3, 1),
    new ArrowPoint(86.5, 6.0, 1), new ArrowPoint(93.3, 5.6, 1), new ArrowPoint(97.2, 5.2, 1),
    new ArrowPoint(97.6, 4.8, 1), new ArrowPoint(97.2, 4.8, 1), new ArrowPoint(96.4, 4.4, 1),
    new ArrowPoint(94.8, 3.6, 1), new ArrowPoint(92.9, 3.2, 1), new ArrowPoint(90.1, 2.4, 1),
    new ArrowPoint(88.1, 1.6, 1), new ArrowPoint(86.1, 0.8, 1), new ArrowPoint(84.9, 0.4, 1),
    new ArrowPoint(84.5, 0.0, 1), new ArrowPoint(85.7, 0.0, 1), new ArrowPoint(87.7, 0.4, 1),
    new ArrowPoint(89.7, 1.2, 1), new ArrowPoint(92.5, 2.4, 1), new ArrowPoint(95.6, 3.6, 1),
    new ArrowPoint(98.0, 5.2, 1), new ArrowPoint(99.6, 6.3, 1), new ArrowPoint(100.0, 6.7, 1),
    new ArrowPoint(99.6, 7.5, 1), new ArrowPoint(96.8, 8.3, 1), new ArrowPoint(92.9, 9.1, 1),
    new ArrowPoint(88.1, 10.7, 1), new ArrowPoint(85.7, 11.5, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-right", [
    new ArrowPoint(0.8, 6.8, 1), new ArrowPoint(0.4, 6.4, 1), new ArrowPoint(0.0, 6.4, 1),
    new ArrowPoint(0.8, 6.4, 1), new ArrowPoint(4.8, 6.8, 1), new ArrowPoint(11.6, 6.8, 1),
    new ArrowPoint(23.6, 6.8, 1), new ArrowPoint(37.6, 6.8, 1), new ArrowPoint(51.2, 6.8, 1),
    new ArrowPoint(65.2, 6.8, 1), new ArrowPoint(78.4, 6.8, 1), new ArrowPoint(86.4, 6.8, 1),
    new ArrowPoint(93.2, 6.4, 1), new ArrowPoint(96.8, 6.0, 1), new ArrowPoint(98.4, 5.2, 1),
    new ArrowPoint(98.4, 4.4, 1), new ArrowPoint(98.4, 4.0, 1), new ArrowPoint(97.2, 2.8, 1),
    new ArrowPoint(95.2, 2.0, 1), new ArrowPoint(92.4, 1.2, 1), new ArrowPoint(90.4, 0.8, 1),
    new ArrowPoint(88.4, 0.4, 1), new ArrowPoint(87.2, 0.0, 1), new ArrowPoint(86.8, 0.0, 1),
    new ArrowPoint(88.4, 0.0, 1), new ArrowPoint(91.2, 1.2, 1), new ArrowPoint(94.8, 2.4, 1),
    new ArrowPoint(98.0, 3.6, 1), new ArrowPoint(99.6, 4.4, 1), new ArrowPoint(100.0, 4.8, 1),
    new ArrowPoint(98.8, 6.0, 1), new ArrowPoint(96.4, 7.6, 1), new ArrowPoint(92.8, 9.2, 1),
    new ArrowPoint(88.4, 11.2, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-right", [
    new ArrowPoint(1.6, 12.4, 1), new ArrowPoint(0.0, 12.4, 1), new ArrowPoint(0.0, 12.4, 1),
    new ArrowPoint(1.6, 12.4, 1), new ArrowPoint(9.7, 12.4, 1), new ArrowPoint(27.4, 11.8, 1),
    new ArrowPoint(50.0, 10.8, 1), new ArrowPoint(71.5, 10.8, 1), new ArrowPoint(87.1, 10.8, 1),
    new ArrowPoint(97.8, 10.2, 1), new ArrowPoint(100.0, 9.7, 1), new ArrowPoint(98.9, 9.1, 1),
    new ArrowPoint(95.7, 8.1, 1), new ArrowPoint(88.2, 6.5, 1), new ArrowPoint(79.0, 4.3, 1),
    new ArrowPoint(71.0, 2.2, 1), new ArrowPoint(64.5, 0.5, 1), new ArrowPoint(62.4, 0.0, 1),
    new ArrowPoint(62.9, 0.0, 1), new ArrowPoint(64.5, 1.1, 1), new ArrowPoint(66.7, 3.2, 1),
    new ArrowPoint(68.8, 6.5, 1), new ArrowPoint(69.9, 10.2, 1), new ArrowPoint(71.0, 14.5, 1),
    new ArrowPoint(71.5, 18.8, 1), new ArrowPoint(71.5, 22.6, 1), new ArrowPoint(71.0, 25.3, 1),
    new ArrowPoint(71.0, 26.9, 1), new ArrowPoint(70.4, 26.9, 1), new ArrowPoint(71.5, 25.3, 1),
    new ArrowPoint(74.2, 22.0, 1), new ArrowPoint(78.0, 17.2, 1), new ArrowPoint(82.3, 12.9, 1),
    new ArrowPoint(86.6, 10.8, 1), new ArrowPoint(88.2, 10.8, 1), new ArrowPoint(89.8, 10.8, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-right", [
    new ArrowPoint(1.3, 8.6, 1), new ArrowPoint(0.0, 8.6, 1), new ArrowPoint(1.7, 8.6, 1),
    new ArrowPoint(8.0, 8.6, 1), new ArrowPoint(20.9, 7.6, 1), new ArrowPoint(40.2, 6.3, 1),
    new ArrowPoint(58.1, 6.0, 1), new ArrowPoint(72.8, 6.3, 1), new ArrowPoint(85.0, 6.3, 1),
    new ArrowPoint(94.4, 6.3, 1), new ArrowPoint(99.7, 5.6, 1), new ArrowPoint(100.0, 5.0, 1),
    new ArrowPoint(98.0, 4.3, 1), new ArrowPoint(93.4, 3.7, 1), new ArrowPoint(86.7, 2.7, 1),
    new ArrowPoint(80.7, 1.3, 1), new ArrowPoint(74.8, 0.3, 1), new ArrowPoint(69.4, 0.0, 1),
    new ArrowPoint(67.8, 0.0, 1), new ArrowPoint(68.1, 0.3, 1), new ArrowPoint(68.8, 0.7, 1),
    new ArrowPoint(69.8, 1.3, 1), new ArrowPoint(71.1, 2.3, 1), new ArrowPoint(72.1, 4.0, 1),
    new ArrowPoint(72.8, 6.3, 1), new ArrowPoint(73.1, 9.0, 1), new ArrowPoint(73.4, 12.0, 1),
    new ArrowPoint(73.4, 14.6, 1), new ArrowPoint(73.1, 16.9, 1), new ArrowPoint(72.8, 18.6, 1),
    new ArrowPoint(73.8, 17.3, 1), new ArrowPoint(76.7, 14.6, 1), new ArrowPoint(81.4, 11.0, 1),
    new ArrowPoint(86.0, 8.0, 1), new ArrowPoint(88.4, 6.6, 1), new ArrowPoint(89.0, 6.6, 1),
    new ArrowPoint(88.7, 6.6, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-right", [
    new ArrowPoint(0.0, 12.7, 1), new ArrowPoint(0.0, 12.3, 1), new ArrowPoint(2.9, 12.3, 1),
    new ArrowPoint(12.3, 12.0, 1), new ArrowPoint(29.3, 10.5, 1), new ArrowPoint(50.0, 8.7, 1),
    new ArrowPoint(68.8, 7.2, 1), new ArrowPoint(85.1, 6.5, 1), new ArrowPoint(96.4, 5.8, 1),
    new ArrowPoint(100.0, 5.1, 1), new ArrowPoint(99.6, 4.7, 1), new ArrowPoint(95.7, 4.0, 1),
    new ArrowPoint(89.9, 3.6, 1), new ArrowPoint(81.9, 3.3, 1), new ArrowPoint(73.6, 2.5, 1),
    new ArrowPoint(66.3, 1.8, 1), new ArrowPoint(60.5, 0.7, 1), new ArrowPoint(58.7, 0.4, 1),
    new ArrowPoint(58.7, 0.0, 1), new ArrowPoint(59.4, 0.0, 1), new ArrowPoint(60.5, 0.4, 1),
    new ArrowPoint(61.6, 1.1, 1), new ArrowPoint(63.0, 2.5, 1), new ArrowPoint(64.1, 4.7, 1),
    new ArrowPoint(64.5, 8.3, 1), new ArrowPoint(64.9, 12.3, 1), new ArrowPoint(64.9, 15.9, 1),
    new ArrowPoint(64.9, 18.8, 1), new ArrowPoint(65.6, 20.3, 1), new ArrowPoint(65.9, 20.7, 1),
    new ArrowPoint(66.3, 20.7, 1), new ArrowPoint(67.4, 20.3, 1), new ArrowPoint(70.3, 18.5, 1),
    new ArrowPoint(74.6, 15.9, 1), new ArrowPoint(79.7, 12.7, 1), new ArrowPoint(84.8, 9.4, 1),
    new ArrowPoint(89.1, 8.0, 1), new ArrowPoint(92.0, 6.9, 1), new ArrowPoint(93.1, 6.5, 1),
    new ArrowPoint(92.8, 6.5, 1), new ArrowPoint(92.0, 6.5, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-right", [
    new ArrowPoint(1.2, 12.1, 1), new ArrowPoint(0.0, 11.7, 1), new ArrowPoint(0.8, 11.7, 1),
    new ArrowPoint(7.7, 11.7, 1), new ArrowPoint(23.4, 10.5, 1), new ArrowPoint(44.4, 8.1, 1),
    new ArrowPoint(65.3, 6.5, 1), new ArrowPoint(83.1, 6.0, 1), new ArrowPoint(94.4, 5.2, 1),
    new ArrowPoint(100.0, 4.4, 1), new ArrowPoint(99.2, 4.0, 1), new ArrowPoint(94.0, 3.6, 1),
    new ArrowPoint(85.5, 3.2, 1), new ArrowPoint(76.6, 2.4, 1), new ArrowPoint(67.7, 1.6, 1),
    new ArrowPoint(60.1, 0.8, 1), new ArrowPoint(56.5, 0.4, 1), new ArrowPoint(56.9, 0.4, 1),
    new ArrowPoint(57.7, 0.4, 1), new ArrowPoint(59.3, 0.4, 1), new ArrowPoint(60.5, 0.0, 1),
    new ArrowPoint(62.1, 0.0, 1), new ArrowPoint(62.9, 0.8, 1), new ArrowPoint(63.7, 2.4, 1),
    new ArrowPoint(64.1, 4.8, 1), new ArrowPoint(64.1, 8.9, 1), new ArrowPoint(63.7, 13.3, 1),
    new ArrowPoint(63.7, 16.9, 1), new ArrowPoint(64.1, 19.4, 1), new ArrowPoint(65.3, 20.2, 1),
    new ArrowPoint(66.5, 20.2, 1), new ArrowPoint(68.5, 19.0, 1), new ArrowPoint(72.2, 16.5, 1),
    new ArrowPoint(77.8, 12.9, 1), new ArrowPoint(83.9, 8.5, 1), new ArrowPoint(89.1, 5.6, 1),
    new ArrowPoint(92.7, 4.4, 1), new ArrowPoint(93.1, 4.4, 1), new ArrowPoint(91.5, 4.8, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-right", [
    new ArrowPoint(0.0, 11.8, 1), new ArrowPoint(0.4, 11.8, 1), new ArrowPoint(7.5, 11.8, 1),
    new ArrowPoint(25.4, 10.1, 1), new ArrowPoint(47.4, 8.3, 1), new ArrowPoint(68.9, 7.5, 1),
    new ArrowPoint(85.5, 6.1, 1), new ArrowPoint(96.9, 4.8, 1), new ArrowPoint(100.0, 3.5, 1),
    new ArrowPoint(97.8, 2.2, 1), new ArrowPoint(90.8, 1.3, 1), new ArrowPoint(81.1, 1.3, 1),
    new ArrowPoint(72.4, 1.3, 1), new ArrowPoint(63.6, 1.3, 1), new ArrowPoint(59.2, 0.9, 1),
    new ArrowPoint(59.6, 0.9, 1), new ArrowPoint(61.0, 0.9, 1), new ArrowPoint(62.7, 0.4, 1),
    new ArrowPoint(64.0, 0.0, 1), new ArrowPoint(64.9, 0.0, 1), new ArrowPoint(65.4, 0.0, 1),
    new ArrowPoint(65.8, 0.4, 1), new ArrowPoint(65.8, 2.6, 1), new ArrowPoint(65.8, 6.6, 1),
    new ArrowPoint(65.8, 11.4, 1), new ArrowPoint(65.8, 15.8, 1), new ArrowPoint(66.2, 18.9, 1),
    new ArrowPoint(66.2, 20.2, 1), new ArrowPoint(66.7, 20.2, 1), new ArrowPoint(67.1, 19.7, 1),
    new ArrowPoint(68.9, 17.5, 1), new ArrowPoint(72.8, 14.0, 1), new ArrowPoint(78.5, 9.6, 1),
    new ArrowPoint(84.6, 6.6, 1), new ArrowPoint(90.4, 4.4, 1), new ArrowPoint(92.5, 3.5, 1),
    new ArrowPoint(91.7, 3.9, 1), new ArrowPoint(91.2, 3.9, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-right", [
    new ArrowPoint(0.0, 10.1, 1), new ArrowPoint(0.0, 10.1, 1), new ArrowPoint(4.8, 10.1, 1),
    new ArrowPoint(17.3, 9.7, 1), new ArrowPoint(35.5, 8.5, 1), new ArrowPoint(54.8, 6.9, 1),
    new ArrowPoint(73.4, 6.0, 1), new ArrowPoint(87.5, 5.6, 1), new ArrowPoint(97.2, 5.6, 1),
    new ArrowPoint(100.0, 5.6, 1), new ArrowPoint(98.0, 5.6, 1), new ArrowPoint(93.1, 5.2, 1),
    new ArrowPoint(86.7, 4.8, 1), new ArrowPoint(81.5, 4.0, 1), new ArrowPoint(76.6, 3.2, 1),
    new ArrowPoint(72.6, 2.4, 1), new ArrowPoint(70.6, 1.2, 1), new ArrowPoint(70.2, 0.4, 1),
    new ArrowPoint(70.6, 0.0, 1), new ArrowPoint(71.0, 0.0, 1), new ArrowPoint(71.4, 0.0, 1),
    new ArrowPoint(71.4, 1.2, 1), new ArrowPoint(71.4, 4.0, 1), new ArrowPoint(71.4, 7.7, 1),
    new ArrowPoint(71.8, 10.9, 1), new ArrowPoint(72.2, 14.1, 1), new ArrowPoint(72.6, 16.5, 1),
    new ArrowPoint(73.4, 17.7, 1), new ArrowPoint(73.8, 18.1, 1), new ArrowPoint(74.2, 17.3, 1),
    new ArrowPoint(76.2, 15.7, 1), new ArrowPoint(80.6, 12.1, 1), new ArrowPoint(85.5, 8.9, 1),
    new ArrowPoint(89.9, 6.5, 1), new ArrowPoint(92.7, 5.6, 1), new ArrowPoint(94.0, 4.8, 1),
    new ArrowPoint(94.4, 4.8, 1), new ArrowPoint(94.0, 4.8, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-right", [
    new ArrowPoint(4.3, 23.4, 1), new ArrowPoint(2.1, 23.4, 1), new ArrowPoint(0.5, 23.4, 1),
    new ArrowPoint(0.0, 23.4, 1), new ArrowPoint(0.5, 23.4, 1), new ArrowPoint(3.2, 23.4, 1),
    new ArrowPoint(11.2, 24.5, 1), new ArrowPoint(23.4, 25.0, 1), new ArrowPoint(41.0, 25.5, 1),
    new ArrowPoint(56.4, 25.5, 1), new ArrowPoint(69.7, 24.5, 1), new ArrowPoint(76.6, 23.4, 1),
    new ArrowPoint(77.1, 22.9, 1), new ArrowPoint(76.1, 22.3, 1), new ArrowPoint(73.9, 20.2, 1),
    new ArrowPoint(71.8, 17.6, 1), new ArrowPoint(69.7, 14.4, 1), new ArrowPoint(67.6, 10.6, 1),
    new ArrowPoint(64.9, 5.9, 1), new ArrowPoint(62.8, 2.1, 1), new ArrowPoint(62.2, 0.5, 1),
    new ArrowPoint(62.2, 0.0, 1), new ArrowPoint(62.2, 0.5, 1), new ArrowPoint(62.2, 1.1, 1),
    new ArrowPoint(62.8, 1.1, 1), new ArrowPoint(63.3, 1.6, 1), new ArrowPoint(65.4, 3.2, 1),
    new ArrowPoint(68.6, 5.9, 1), new ArrowPoint(75.0, 9.0, 1), new ArrowPoint(84.6, 12.2, 1),
    new ArrowPoint(93.1, 15.4, 1), new ArrowPoint(97.3, 18.6, 1), new ArrowPoint(99.5, 20.2, 1),
    new ArrowPoint(100.0, 21.8, 1), new ArrowPoint(100.0, 22.9, 1), new ArrowPoint(98.9, 23.4, 1),
    new ArrowPoint(95.7, 25.0, 1), new ArrowPoint(91.0, 27.1, 1), new ArrowPoint(86.2, 30.3, 1),
    new ArrowPoint(83.0, 32.4, 1), new ArrowPoint(80.3, 34.6, 1), new ArrowPoint(78.7, 37.2, 1),
    new ArrowPoint(78.2, 40.4, 1), new ArrowPoint(77.7, 42.0, 1), new ArrowPoint(77.7, 43.1, 1),
    new ArrowPoint(77.7, 42.0, 1), new ArrowPoint(77.1, 39.9, 1), new ArrowPoint(76.1, 35.1, 1),
    new ArrowPoint(75.0, 30.3, 1), new ArrowPoint(73.9, 27.1, 1), new ArrowPoint(73.4, 26.1, 1),
    new ArrowPoint(73.4, 25.5, 1), new ArrowPoint(73.4, 26.1, 1), new ArrowPoint(73.4, 26.6, 1),
    new ArrowPoint(73.4, 27.1, 1), new ArrowPoint(73.4, 27.7, 1)
  ]));

  this.PointClouds.push(new ArrowPointCloud("arrow-right", [
    new ArrowPoint(7.6, 21.0, 1), new ArrowPoint(0.8, 20.2, 1), new ArrowPoint(0.0, 20.2, 1),
    new ArrowPoint(5.0, 20.2, 1), new ArrowPoint(16.0, 19.3, 1), new ArrowPoint(32.8, 18.5, 1),
    new ArrowPoint(53.8, 16.8, 1), new ArrowPoint(77.3, 14.3, 1), new ArrowPoint(91.6, 11.8, 1),
    new ArrowPoint(96.6, 8.4, 1), new ArrowPoint(95.8, 5.0, 1), new ArrowPoint(89.9, 1.7, 1),
    new ArrowPoint(82.4, 0.0, 1), new ArrowPoint(72.3, 0.0, 1), new ArrowPoint(63.0, 1.7, 1),
    new ArrowPoint(58.0, 4.2, 1), new ArrowPoint(57.1, 6.7, 1), new ArrowPoint(63.0, 9.2, 1),
    new ArrowPoint(73.1, 10.9, 1), new ArrowPoint(84.9, 12.6, 1), new ArrowPoint(95.0, 13.4, 1),
    new ArrowPoint(100.0, 16.0, 1), new ArrowPoint(96.6, 21.0, 1), new ArrowPoint(83.2, 28.6, 1),
    new ArrowPoint(73.1, 33.6, 1)
  ]));

  // ── $P API ───────────────────────────────────────────────────────────────
  this.Recognize = function(points) {
    var t0 = Date.now();
    var candidate = new ArrowPointCloud("", points);

    var bestIndex = -1;
    var bestDistance = +Infinity;

    for (var i = 0; i < this.PointClouds.length; i++) {
      var d = ArrowGreedyCloudMatch(candidate.Points, this.PointClouds[i]);
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = i;
      }
    }

    var t1 = Date.now();

    if (bestIndex == -1) {
      return new ArrowResult("No match.", 0.0, t1 - t0);
    }

    var bestScore = bestDistance > 1.0 ? 1.0 / bestDistance : 1.0;
    var bestName  = this.PointClouds[bestIndex].Name;

    // Score threshold — even after passing the geometric gate, a poor $P
    // match means the stroke doesn't look enough like any recorded arrow.
    // Real arrows consistently score above 0.70 against the templates.
    if (bestScore < 0.89) {
      return new ArrowResult("No match.", bestScore, t1 - t0);
    }

    return new ArrowResult(bestName, bestScore, t1 - t0);
  }
}

function ArrowGreedyCloudMatch(points, P) {
  var e = 0.50;
  var step = Math.floor(Math.pow(points.length, 1.0 - e));
  var min = +Infinity;
  for (var i = 0; i < points.length; i += step) {
    var d1 = ArrowCloudDistance(points, P.Points, i);
    var d2 = ArrowCloudDistance(P.Points, points, i);
    min = Math.min(min, Math.min(d1, d2));
  }
  return min;
}

function ArrowCloudDistance(pts1, pts2, start) {
  var matched = new Array(pts1.length);
  for (var k = 0; k < pts1.length; k++) matched[k] = false;

  var sum = 0;
  var i = start;
  do {
    var index = -1;
    var min = +Infinity;
    for (var j = 0; j < matched.length; j++) {
      if (!matched[j]) {
        var d = ArrowDistance(pts1[i], pts2[j]);
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

function ArrowResample(points, n) {
  var I = ArrowPathLength(points) / (n - 1);
  var D = 0.0;
  var newpoints = new Array(points[0]);

  for (var i = 1; i < points.length; i++) {
    if (points[i].ID == points[i - 1].ID) {
      var d = ArrowDistance(points[i - 1], points[i]);
      if ((D + d) >= I) {
        var qx = points[i - 1].X + ((I - D) / d) * (points[i].X - points[i - 1].X);
        var qy = points[i - 1].Y + ((I - D) / d) * (points[i].Y - points[i - 1].Y);
        var q = new ArrowPoint(qx, qy, points[i].ID);
        newpoints[newpoints.length] = q;
        points.splice(i, 0, q);
        D = 0.0;
      } else D += d;
    }
  }

  if (newpoints.length == n - 1)
    newpoints[newpoints.length] = new ArrowPoint(
      points[points.length - 1].X,
      points[points.length - 1].Y,
      points[points.length - 1].ID
    );

  return newpoints;
}

function ArrowScale(points) {
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
    newpoints[newpoints.length] = new ArrowPoint(qx, qy, points[i].ID);
  }
  return newpoints;
}

function ArrowTranslateTo(points, pt) {
  var c = ArrowCentroid(points);
  var newpoints = new Array();
  for (var i = 0; i < points.length; i++) {
    var qx = points[i].X + pt.X - c.X;
    var qy = points[i].Y + pt.Y - c.Y;
    newpoints[newpoints.length] = new ArrowPoint(qx, qy, points[i].ID);
  }
  return newpoints;
}

function ArrowCentroid(points) {
  var x = 0.0, y = 0.0;
  for (var i = 0; i < points.length; i++) {
    x += points[i].X;
    y += points[i].Y;
  }
  x /= points.length;
  y /= points.length;
  return new ArrowPoint(x, y, 0);
}

function ArrowPathLength(points) {
  var d = 0.0;
  for (var i = 1; i < points.length; i++) {
    if (points[i].ID == points[i - 1].ID)
      d += ArrowDistance(points[i - 1], points[i]);
  }
  return d;
}

function ArrowDistance(p1, p2) {
  var dx = p2.X - p1.X;
  var dy = p2.Y - p1.Y;
  return Math.sqrt(dx * dx + dy * dy);
}

export { ArrowRecognizer, ArrowPoint };