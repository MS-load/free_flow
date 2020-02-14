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

function drawPoint(ctx, y, x, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Draw pose keypoints onto a canvas
 */
function drawKeypoints(keypoints, minConfidence, ctx, scale = 1,boundX,boundY) {
  let leftWrist = keypoints.find(point => point.part === 'leftWrist');
  let rightWrist = keypoints.find(point => point.part === 'rightWrist');

  if (leftWrist.score > minConfidence) {
    const { y, x } = leftWrist.position;
    drawPoint(ctx, y * scale, x * scale, 10, "yellow");
    console.log("left:", x, y)
    mx = x - bounds.left;
   my = y - bounds.top;
    man = true;
  }

  if (rightWrist.score > minConfidence) {
    const { y, x } = rightWrist.position;
    drawPoint(ctx, y * scale, x * scale, 10, "blue");
    console.log("right:", x, y)
    mx = x - bounds.left;
    my = y - bounds.top;
    man = true;
  }

}

const videoWidth = (window.innerWidth/2)-250;
const videoHeight = window.innerHeight-250;

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
  bounds = container.getBoundingClientRect();
  let boundX = bounds.left;
  let boundY = bounds.top;
  

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
          drawKeypoints(keypoints, minPartConfidence, ctx,boundX,boundY);
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

var NUM_PARTICLES = (ROWS = 150) * (COLS = 100),
  THICKNESS = Math.pow(80, 2),
  SPACING = 3,
  MARGIN = 100,
  COLOR = 220,
  DRAG = 0.95,
  EASE = 0.25,
  /*
    
    used for sine approximation, but Math.sin in Chrome is still fast enough :)http://jsperf.com/math-sin-vs-sine-approximation

    B = 4 / Math.PI,
    C = -4 / Math.pow( Math.PI, 2 ),
    P = 0.225,

    */

  container,
  particle,
  canvas,
  mouse,
  stats,
  list,
  ctx,
  tog,
  man,
  dx,
  dy,
  mx,
  my,
  d,
  t,
  f,
  a,
  b,
  i,
  n,
  w,
  h,
  p,
  s,
  r,
  c;

particle = {
  vx: 0,
  vy: 0,
  x: 0,
  y: 0
};

function init() {
  container = document.getElementById("container");
  canvas = document.getElementById("swarm");

  ctx = canvas.getContext("2d");
  man = false;
  tog = true;

  list = [];

  w = canvas.width = (window.innerWidth/2)-150;
  h = canvas.height = window.innerHeight-100;
 
  for (i = 0; i < NUM_PARTICLES; i++) {
    p = Object.create(particle);
    p.x = p.ox = MARGIN + SPACING * (i % COLS);
    p.y = p.oy = MARGIN + SPACING * Math.floor(i / COLS);

    list[i] = p;
  }

  // container.addEventListener("mousemove", function(e) {
  //   bounds = container.getBoundingClientRect();
  //   mx = e.clientX - bounds.left;
  //   my = e.clientY - bounds.top;
  //   man = true;
  // });

  if (typeof Stats === "function") {
    document.body.appendChild((stats = new Stats()).domElement);
  }
}

function step() {
  if (stats) stats.begin();

  if ((tog = !tog)) {
    if (!man) {
      t = +new Date() * 0.001;
      mx = w * 0.5 + Math.cos(t * 2.1) * Math.cos(t * 0.9) * w * 0.45;
      my = h * 0.5 + Math.sin(t * 3.2) * Math.tan(Math.sin(t * 0.8)) * h * 0.45;
    }

    for (i = 0; i < NUM_PARTICLES; i++) {
      p = list[i];

      d = (dx = mx - p.x) * dx + (dy = my - p.y) * dy;
      f = -THICKNESS / d;

      if (d < THICKNESS) {
        t = Math.atan2(dy, dx);
        p.vx += f * Math.cos(t);
        p.vy += f * Math.sin(t);
      }

      p.x += (p.vx *= DRAG) + (p.ox - p.x) * EASE;
      p.y += (p.vy *= DRAG) + (p.oy - p.y) * EASE;
    }
  } else {
    b = (a = ctx.createImageData(w, h)).data;

    for (i = 0; i < NUM_PARTICLES; i++) {
      p = list[i];
      (b[(n = (~~p.x + ~~p.y * w) * 4)] = b[n + 1] = b[n + 2] = COLOR),
        (b[n + 3] = 255);
    }

    ctx.putImageData(a, 0, 0);
  }

  if (stats) stats.end();

  requestAnimationFrame(step);
}

init();
step();
