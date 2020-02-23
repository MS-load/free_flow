let app = new Vue({
  el: '.page',
  data: {
    start: true,
  },
}
)

/**-------------------Getting the data from PoseNet------------------- */
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
}

const videoWidth = 256
const videoHeight = 256


async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
      "Browser API navigator.mediaDevices.getUserMedia not available"
    )
  }

  const video = document.getElementById("video")
  video.width = videoWidth
  video.height = videoHeight

  const mobile = false
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
      width: mobile ? undefined : videoWidth,
      height: mobile ? undefined : videoHeight
    }
  })
  video.srcObject = stream

  return new Promise(resolve => {
    video.onloadedmetadata = () => {
      resolve(video)
    }
  })
}

async function loadVideo() {
  const video = await setupCamera()
  video.play()
  return video
}

function detectPoseInRealTime(video, net) {
  const canvas = document.getElementById("output")
  const ctx = canvas.getContext("2d")
  const flipPoseHorizontal = true

  canvas.width = videoWidth
  canvas.height = videoHeight

  async function poseDetectionFrame() {

    let poses = []
    let minPoseConfidence
    let minPartConfidence

    const pose = await net.estimatePoses(video, {
      flipHorizontal: flipPoseHorizontal,
      decodingMethod: "single-person"
    })
    poses = poses.concat(pose)
    minPoseConfidence = +poseNetState.singlePoseDetection.minPoseConfidence
    minPartConfidence = +poseNetState.singlePoseDetection.minPartConfidence
    console.log(pose)
    
    ctx.clearRect(0, 0, videoWidth, videoHeight)

    ctx.save()
    ctx.scale(-1, 1)
    ctx.translate(-videoWidth, 0)
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight)
    ctx.restore()

    // For each pose (i.e. person) detected in an image, loop through the poses
    // and draw the resulting skeleton and keypoints if over certain confidence
    // scores
    poses.forEach(({ score, keypoints }) => {
      if (score >= minPoseConfidence) {
        if (poseNetState.output.showPoints) {
          drawKeypoints(keypoints, minPartConfidence, ctx, canvas)
        }
      }
    })
    requestAnimationFrame(poseDetectionFrame)
  }
  poseDetectionFrame()
}

/**-------------------Creating the particles------------------- */
let vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 100)
let vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 100)

let canvasParticle = document.getElementById("particleSwarm")
canvasParticle.width = 10 * (Math.floor((0.9 * vw) / 10))
canvasParticle.height = 10 * (Math.floor((0.9 * vh) / 10))

let ctxParticle
let movePoint = {
  x: 0,
  y: 0,
  px: 0,
  py: 0,
  active: false
}

let resolution = 10 //Width and height of each cell in the grid.
let vec_cells = [] //The array that will contain the grid cells
let particles = [] //The array that will contain the particles

function setUpParticles() {
  ctxParticle = canvasParticle.getContext("2d")
  canvasParticle.height = canvasParticle.height
  const speck_count = 9000
  const num_cols = canvasParticle.width / resolution
  const num_rows = canvasParticle.height / resolution

  for (i = 0; i < speck_count; i++) {
    particles.push(new particle(Math.random() * canvasParticle.width, Math.random() * canvasParticle.height))
  }

  for (col = 0; col < num_cols; col++) {
    vec_cells[col] = []
    for (row = 0; row < num_rows; row++) {
      let cell_data = new cell(col * resolution, row * resolution, resolution)
      vec_cells[col][row] = cell_data
      vec_cells[col][row].col = col
      vec_cells[col][row].row = row
    }
  }
  for (col = 0; col < num_cols; col++) {
    for (row = 0; row < num_rows; row++) {
      let cell_data = vec_cells[col][row]
      let row_up = (row - 1 >= 0) ? row - 1 : num_rows - 1
      let col_left = (col - 1 >= 0) ? col - 1 : num_cols - 1
      let col_right = (col + 1 < num_cols) ? col + 1 : 0
      let up = vec_cells[col][row_up]
      let left = vec_cells[col_left][row]
      let up_left = vec_cells[col_left][row_up]
      let up_right = vec_cells[col_right][row_up]

      cell_data.up = up
      cell_data.left = left
      cell_data.up_left = up_left
      cell_data.up_right = up_right

      up.down = vec_cells[col][row]
      left.right = vec_cells[col][row]
      up_left.down_right = vec_cells[col][row]
      up_right.down_left = vec_cells[col][row]

    }
  }
  draw()

}

function update_particle() {

  for (i = 0; i < particles.length; i++) {

    let p = particles[i]

    if (p.x >= 0 && p.x < canvasParticle.width && p.y >= 0 && p.y < canvasParticle.height) {

      let col = parseInt(p.x / resolution)
      let row = parseInt(p.y / resolution)

      let cell_data = vec_cells[col][row]

      let ax = (p.x % resolution) / resolution
      let ay = (p.y % resolution) / resolution
      p.xv += (1 - ax) * cell_data.xv * 0.05
      p.yv += (1 - ay) * cell_data.yv * 0.05
      p.xv += ax * cell_data.right.xv * 0.05
      p.yv += ax * cell_data.right.yv * 0.05

      p.xv += ay * cell_data.down.xv * 0.05
      p.yv += ay * cell_data.down.yv * 0.05

      p.x += p.xv
      p.y += p.yv

      let dx = p.px - p.x
      let dy = p.py - p.y
      let dist = Math.sqrt(dx * dx + dy * dy)

      let limit = Math.random() * 0.5

      if (dist > limit) {
        ctxParticle.lineWidth = 1
        ctxParticle.beginPath()
        ctxParticle.moveTo(p.x, p.y)
        ctxParticle.lineTo(p.px, p.py)
        ctxParticle.stroke()
      } else {

        ctxParticle.beginPath()
        ctxParticle.moveTo(p.x, p.y)

        ctxParticle.lineTo(p.x + limit, p.y + limit)

        ctxParticle.stroke()
      }
      p.px = p.x
      p.py = p.y
    }
    else {
      p.x = p.px = Math.random() * canvasParticle.width
      p.y = p.py = Math.random() * canvasParticle.height

      p.xv = 0
      p.yv = 0
    }

    p.xv *= 0.5
    p.yv *= 0.5
  }
}

function draw() {
  let movePoint_xv = movePoint.x - movePoint.px
  let movePoint_yv = movePoint.y - movePoint.py

  for (i = 0; i < vec_cells.length; i++) {
    let cell_datas = vec_cells[i]

    for (j = 0; j < cell_datas.length; j++) {

      let cell_data = cell_datas[j]

      if (movePoint.active) {
        change_cell_velocity(cell_data, movePoint_xv, movePoint_yv)
      }

      update_pressure(cell_data)
    }
  }

  ctxParticle.clearRect(0, 0, canvasParticle.width, canvasParticle.height)

  const gradient = ctxParticle.createLinearGradient(0, 0, 1000, 0)
  gradient.addColorStop("0", 'magenta')
  gradient.addColorStop("1", 'yellow')
  ctxParticle.strokeStyle = gradient

  update_particle()
  for (i = 0; i < vec_cells.length; i++) {
    let cell_datas = vec_cells[i]

    for (j = 0; j < cell_datas.length; j++) {
      let cell_data = cell_datas[j]

      update_velocity(cell_data)

    }
  }
  movePoint.px = movePoint.x
  movePoint.py = movePoint.y
  requestAnimationFrame(draw)

}

function change_cell_velocity(cell_data, mvelX, mvelY) {
  let pen_size = 20
  let dx = cell_data.x - movePoint.x
  let dy = cell_data.y - movePoint.y
  let dist = Math.sqrt(dy * dy + dx * dx)

  if (dist < pen_size) {
    if (dist < 4) {
      dist = pen_size
    }
    let power = pen_size / dist

    cell_data.xv += mvelX * power
    cell_data.yv += mvelY * power
  }
}

function update_pressure(cell_data) {
  let pressure_x = (
    cell_data.up_left.xv * 0.5
    + cell_data.left.xv
    + cell_data.down_left.xv * 0.5
    - cell_data.up_right.xv * 0.5
    - cell_data.right.xv
    - cell_data.down_right.xv * 0.5
  )

  let pressure_y = (
    cell_data.up_left.yv * 0.5
    + cell_data.up.yv
    + cell_data.up_right.yv * 0.5
    - cell_data.down_left.yv * 0.5
    - cell_data.down.yv
    - cell_data.down_right.yv * 0.5
  )
  cell_data.pressure = (pressure_x + pressure_y) * 0.25
}

function update_velocity(cell_data) {
  cell_data.xv += (
    cell_data.up_left.pressure * 0.5
    + cell_data.left.pressure
    + cell_data.down_left.pressure * 0.5
    - cell_data.up_right.pressure * 0.5
    - cell_data.right.pressure
    - cell_data.down_right.pressure * 0.5
  ) * 0.25

  cell_data.yv += (
    cell_data.up_left.pressure * 0.5
    + cell_data.up.pressure
    + cell_data.up_right.pressure * 0.5
    - cell_data.down_left.pressure * 0.5
    - cell_data.down.pressure
    - cell_data.down_right.pressure * 0.5
  ) * 0.25

  cell_data.xv *= 0.95
  cell_data.yv *= 0.95
}

//This function is used to create a cell object.
function cell(x, y, res) {
  this.x = x
  this.y = y
  this.r = res
  this.col = 0
  this.row = 0
  this.xv = 0
  this.yv = 0
  this.pressure = 0
}

function particle(x, y) {
  this.x = this.px = x
  this.y = this.py = y
  this.xv = this.yv = 0
}

let prevPos = 0
const min_jump = 5
/**-------------------Drawing the required points------------------- */
function drawKeypoints(keypoints, minConfidence, ctx, canvas) {
  let leftWrist = keypoints.find(point => point.part === 'leftWrist')
  let rightWrist = keypoints.find(point => point.part === 'rightWrist')
  let nose = keypoints.find(point => point.part === 'nose')
  const img = document.querySelector('img')


  if (leftWrist.score > minConfidence || rightWrist.score > minConfidence) {
    app.$data.start = false
  }

  if (!app.$data.start) {
    if (nose.score > minConfidence) {
      const { y, x } = nose.position

      if (Math.abs(prevPos - x) > min_jump) {
        let xPos = (x / canvas.width) * (vw)
        if (xPos < vw - 200) {
          img.style.left = `${1 + xPos}px`
        }
        else {
          img.style.left = 1
        }
        prevPos = x
      }
    }
  }

  if (leftWrist.score > minConfidence) {
    const { y, x } = leftWrist.position
    drawPoint(ctx, y, x, 10, "teal")
    console.log("left:", x, y)

    movePoint.px = movePoint.x
    movePoint.py = movePoint.y

    //Sets the new coordinates
    movePoint.x = (x / canvas.width) * (canvasParticle.width)
    movePoint.y = (y / canvas.height) * (canvasParticle.height)

    movePoint.active = true

  }
  if (rightWrist.score > minConfidence) {
    const { y, x } = rightWrist.position
    drawPoint(ctx, y, x, 10, "Turquoise")
    console.log("left:", x, y)

    movePoint.px = movePoint.x
    movePoint.py = movePoint.y

    //Sets the new coordinates
    movePoint.x = (x / canvas.width) * (canvasParticle.width)
    movePoint.y = (y / canvas.height) * (canvasParticle.height)

    movePoint.active = true
  }

}

function drawPoint(ctx, y, x, r, color) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, 2 * Math.PI)
  ctx.fillStyle = color
  ctx.fill()
  ctx.fillText(`points: ${Math.floor(x)},${Math.floor(y)}`, x + 10, y + 10)
}

async function bindPage() {

  const net = await posenet.load({
    architecture: "MobileNetV1",
    outputStride: 16,
    inputResolution: 500,
    multiplier: 0.75,
    quantBytes: 2
  })

  let video

  try {
    video = await loadVideo()
  } catch (e) {
    let info = document.getElementById("info")
    info.textContent =
      "this browser does not support video capture," +
      "or this device does not have a camera"
    info.style.display = "block"
    throw e
  }

  detectPoseInRealTime(video, net)
  setUpParticles()
}

bindPage()