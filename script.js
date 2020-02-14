const poseNetState = {
  algorithm: 'single-pose',
  input: {
    architecture: 'MobileNetV1',
    outputStride: 16,
    inputResolution: 513,
    multiplier: 0.75,
    quantBytes: 2
  },
  singlePoseDetection: {
    minPoseConfidence: 0.1,
    minPartConfidence: 0.5,
  },
  output: {
    showVideo: true,
    showPoints: true,
  },
};

const videoWidth = window.innerWidth/2;
const videoHeight = window.innerHeight;


function drawPoint(ctx, y, x, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Draw pose keypoints onto a canvas
 */
function drawKeypoints(keypoints, minConfidence, ctx, scale = 1,rect) {
  let leftWrist = keypoints.find(point => point.part === 'leftWrist');
  let rightWrist = keypoints.find(point => point.part === 'rightWrist');
  

  if (leftWrist.score > minConfidence) {
    const { y, x } = leftWrist.position;
    drawPoint(ctx, y * scale, x * scale, 10, "yellow");
    console.log("left:", x, y)
    disturb((window.innerWidth/2)-(window.innerWidth-x), y);
  }

  if (rightWrist.score > minConfidence) {
    const { y, x } = rightWrist.position;
    drawPoint(ctx, y * scale, x * scale, 10, "blue");
    console.log("right:", x, y)
    disturb((window.innerWidth/2)-(window.innerWidth-x), y);
  }

}



async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
      "Browser API navigator.mediaDevices.getUserMedia not available"
    );
  }

  const video = document.getElementById("video");
  video.width = videoWidth;
  video.height = videoHeight;

  const mobile = false;
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
      width: mobile ? undefined : videoWidth,
      height: mobile ? undefined : videoHeight
    }
  });
  video.srcObject = stream;

  return new Promise(resolve => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

async function loadVideo() {
  const video = await setupCamera();
  video.play();

  return video;
}

function detectPoseInRealTime(video, net) {
  const canvas = document.getElementById("output");
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect()

  // since images are being fed from a webcam, we want to feed in the
  // original image and then just flip the keypoints' x coordinates. If instead
  // we flip the image, then correcting left-right keypoint pairs requires a
  // permutation on all the keypoints.
  const flipPoseHorizontal = true;

  canvas.width = videoWidth;
  canvas.height = videoHeight;

  async function poseDetectionFrame() {
    // Begin monitoring code for frames per second
    //stats.begin();

    let poses = [];
    let minPoseConfidence;
    let minPartConfidence;

    const pose = await net.estimatePoses(video, {
      flipHorizontal: flipPoseHorizontal,
      decodingMethod: "single-person"
    });
    poses = poses.concat(pose);
    minPoseConfidence = +poseNetState.singlePoseDetection.minPoseConfidence;
    minPartConfidence = +poseNetState.singlePoseDetection.minPartConfidence;

    ctx.clearRect(0, 0, videoWidth, videoHeight);

    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-videoWidth, 0);
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    ctx.restore();

    // For each pose (i.e. person) detected in an image, loop through the poses
    // and draw the resulting skeleton and keypoints if over certain confidence
    // scores
    poses.forEach(({ score, keypoints }) => {
      if (score >= minPoseConfidence) {
        if (poseNetState.output.showPoints) {
          drawKeypoints(keypoints, minPartConfidence, ctx,rect);
        }
      }
    });

    // End monitoring code for frames per second
    // stats.end();

    requestAnimationFrame(poseDetectionFrame);
  }

  poseDetectionFrame();
}

async function bindPage() {
  const net = await posenet.load({
    architecture: "MobileNetV1",
    outputStride: 16,
    inputResolution: 500,
    multiplier: 0.75,
    quantBytes: 2
  });

  let video;

  try {
    video = await loadVideo();
  } catch (e) {
    let info = document.getElementById("info");
    info.textContent =
      "this browser does not support video capture," +
      "or this device does not have a camera";
    info.style.display = "block";
    throw e;
  }

  // setupGui([], net);
  // setupFPS();
  detectPoseInRealTime(video, net);
}

bindPage();

/**
 * Water ripple effect.
 * Original code (Java) by Neil Wallis 
 * @link http://www.neilwallis.com/java/water.html
 * 
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 */

const
  canvasWater = document.getElementById('canvasWater'),
  ctxWater = canvasWater.getContext('2d'),
  delay = 30,
  riprad = 3,
  width = canvasWater.width,
  height = canvasWater.height,
  half_width = width >> 1,
  half_height = height >> 1,
  size = width * (height + 2) * 2;

let ripplemap = [],
  last_map = [],
  ripple,
  texture,
  oldind = width,
  newind = width * (height + 3);


function waterRipple() {

  let img = document.querySelector('img')
  ctxWater.drawImage(img, 0, 0,width, height);
  texture = ctxWater.getImageData(0, 0, width, height);
  ripple = ctxWater.getImageData(0, 0, width, height);

  for (var i = 0; i < size; i++) {
    last_map[i] = ripplemap[i] = 0;
  }

  run()

};
/**
     * Main loop
     */
function run() {
  newframe();

  ctxWater.putImageData(ripple, 0, 0)
    ;
}

/**
 * Generates new ripples
 */
function newframe() {
  var a, b, data, cur_pixel, new_pixel, old_data;

  var t = oldind; oldind = newind; newind = t;
  var i = 0;

  // create local copies of variables to decrease
  // scope lookup time in Firefox
  var _width = width,
    _height = height,
    _ripplemap = ripplemap,
    _last_map = last_map,
    _rd = ripple.data,
    _td = texture.data,
    _half_width = half_width,
    _half_height = half_height;

  for (var y = 0; y < _height; y++) {
    for (var x = 0; x < _width; x++) {
      var _newind = newind + i, _mapind = oldind + i;
      data = (
        _ripplemap[_mapind - _width] +
        _ripplemap[_mapind + _width] +
        _ripplemap[_mapind - 1] +
        _ripplemap[_mapind + 1]) >> 1;

      data -= _ripplemap[_newind];
      data -= data >> 5;

      _ripplemap[_newind] = data;

      //where data=0 then still, where data>0 then wave
      data = 1024 - data;

      old_data = _last_map[i];
      _last_map[i] = data;

      if (old_data != data) {
        //offsets
        a = (((x - _half_width) * data / 1024) << 0) + _half_width;
        b = (((y - _half_height) * data / 1024) << 0) + _half_height;

        //bounds check
        if (a >= _width) a = _width - 1;
        if (a < 0) a = 0;
        if (b >= _height) b = _height - 1;
        if (b < 0) b = 0;

        new_pixel = (a + (b * _width)) * 4;
        cur_pixel = i * 4;

        _rd[cur_pixel] = _td[new_pixel];
        _rd[cur_pixel + 1] = _td[new_pixel + 1];
        _rd[cur_pixel + 2] = _td[new_pixel + 2];
      }

      ++i;
    }
  }
}

/**
    * Disturb water at specified point
    */
function disturb(dx, dy) {
  dx <<= 0;
  dy <<= 0;

  for (var j = dy - riprad; j < dy + riprad; j++) {
    for (var k = dx - riprad; k < dx + riprad; k++) {
      ripplemap[oldind + (j * width) + k] += 1000;
    }
  }
  //console.log("moving")
}

canvasWater.onclick = function (/* Event */ evt) {
  //console.log(evt.offsetX , evt.offsetY)
  //disturb(evt.offsetX || evt.layerX, evt.offsetY || evt.layerY);
};

setInterval(run, delay);

// generate random ripples
var rnd = Math.random;
// setInterval(function () {
//     disturb(rnd() * width, rnd() * height);
// }, 700);

waterRipple()