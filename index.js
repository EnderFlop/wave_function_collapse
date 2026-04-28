let grid = null
let runInterval = null
let restartTimeout = null

const RESTART_DELAY_MS = 5000

const SPEED_SLIDER_MIN = 40
const SPEED_SLIDER_MAX = 1000

function stepMsFromSpeedSlider(value) {
  return SPEED_SLIDER_MIN + SPEED_SLIDER_MAX - Number(value)
}

let STEP_MS
let WIDTH = 33
let HEIGHT = 7

const ENTROPY_COLORS = { 4: "#555555", 8: "#777777", 16: "#999999" }

const BOX_CHARS = {
  "0000": ' ',
  "0001": '╴',
  "0010": '╷',
  "0011": '┐',
  "0100": '╶',
  "0101": '─',
  "0110": '┌',
  "0111": '┬',
  "1000": '╵',
  "1001": '┘',
  "1010": '│',
  "1011": '┤',
  "1100": '└',
  "1110": '├',
  "1101": '┴',
  "1111": '┼'
}

// Weight by number of connections: fewer connections = less likely to be chosen
const WEIGHTS = { 0: 0.05, 1: 0.35, 2: 1, 3: 1, 4: 1 }

window.addEventListener('DOMContentLoaded', () => {
  const btnStart = document.getElementById("btn-start")
  const btnStop  = document.getElementById("btn-stop")
  const btnStep  = document.getElementById("btn-step")
  const btnReset = document.getElementById("btn-reset")

  const speed = document.getElementById("speed")
  const width = document.getElementById("width")
  const height = document.getElementById("height")

  STEP_MS = stepMsFromSpeedSlider(speed.value)

  speed.addEventListener("input", () => {
    STEP_MS = stepMsFromSpeedSlider(speed.value)
    reset()
  })
  width.addEventListener("input", () => {
    WIDTH = width.value
    reset()
  })
  height.addEventListener("input", () => {
    HEIGHT = height.value
    reset()
  })

  reset()

  btnStart.addEventListener("click", () => {
    if (runInterval || grid.unobservedCellCount <= 0) return
    btnStart.disabled = true
    btnStop.disabled = false
    btnStep.disabled = true
    runInterval = setInterval(() => {
      if (grid.unobservedCellCount <= 0) {
        clearInterval(runInterval)
        runInterval = null
        grid.render()
        restartTimeout = setTimeout(() => {
          restartTimeout = null
          reset()
          btnStart.click()
        }, RESTART_DELAY_MS)
        return
      }
      grid.step()
    }, STEP_MS)
  })

  btnStop.addEventListener("click", stop)
  btnStep.addEventListener("click", () => {
    if (grid.unobservedCellCount > 0) grid.step()
  })
  btnReset.addEventListener("click", reset)

  function stop() {
    clearInterval(runInterval)
    runInterval = null
    if (restartTimeout) {
      clearTimeout(restartTimeout)
      restartTimeout = null
    }
    btnStart.disabled = grid.unobservedCellCount <= 0
    btnStop.disabled = true
    btnStep.disabled = grid.unobservedCellCount <= 0
  }

  function reset() {
    if (runInterval) {
      clearInterval(runInterval)
      runInterval = null
    }
    if (restartTimeout) {
      clearTimeout(restartTimeout)
      restartTimeout = null
    }
    document.getElementById("container").innerHTML = ""
    grid = new Grid(WIDTH, HEIGHT)
    grid.observeCell(grid.cells[Math.floor(HEIGHT / 2)][Math.floor(WIDTH / 2)])
    btnStart.disabled = false
    btnStop.disabled = true
    btnStep.disabled = false
  }
})

class Grid {
  constructor(width, height) {
    this.width = width
    this.height = height
    this.cells = this.initCells()
    this.unobservedCellCount = width * height
    this.initHtml()
  }

  initCells() {
    const allTransforms = Transform.generateAll()
    const cells = []
    for (let y = 0; y < this.height; y++) {
      cells.push([])
      for (let x = 0; x < this.width; x++) {
        cells[y].push(new Cell(x, y, allTransforms))
      }
    }
    return cells
  }

  initHtml() {
    const container = document.getElementById("container")
    container.style.setProperty("--cols", this.width)
    container.style.setProperty("--rows", this.height)

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const div = document.createElement("div")
        div.id = `cell-${x}-${y}`
        div.className = "cell"
        container.appendChild(div)
      }
    }
    this.render()
  }

  step() {
    const cell = this.getLowestEntropyCell()
    if (!cell) return
    this.observeCell(cell)
  }

  observeCell(cell) {
    cell.observe()
    this.propagateConstraints(cell)
    this.unobservedCellCount--
    this.render([cell.x, cell.y])
  }

  getLowestEntropyCell() {
    let candidates = []
    let lowestEntropy = Infinity
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.cells[y][x]
        if (cell.observed) continue
        const entropy = cell.possibleTransforms.length
        if (entropy < lowestEntropy) {
          lowestEntropy = entropy
          candidates = [cell]
        } else if (entropy === lowestEntropy) {
          candidates.push(cell)
        }
      }
    }
    return candidates[Math.floor(Math.random() * candidates.length)]
  }

  propagateConstraints(cell) {
    const { state, x, y } = cell
    if (y > 0) {
      const cellDown = this.cells[y - 1][x]
      if (!cellDown.observed)
        cellDown.possibleTransforms = cellDown.possibleTransforms.filter(t => t.down === state.up)
    }
    if (y < this.height - 1) {
      const cellUp = this.cells[y + 1][x]
      if (!cellUp.observed)
        cellUp.possibleTransforms = cellUp.possibleTransforms.filter(t => t.up === state.down)
    }
    if (x > 0) {
      const cellLeft = this.cells[y][x - 1]
      if (!cellLeft.observed)
        cellLeft.possibleTransforms = cellLeft.possibleTransforms.filter(t => t.right === state.left)
    }
    if (x < this.width - 1) {
      const cellRight = this.cells[y][x + 1]
      if (!cellRight.observed)
        cellRight.possibleTransforms = cellRight.possibleTransforms.filter(t => t.left === state.right)
    }
  }

  render(lastObservedCoord = null) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.cells[y][x]
        const div = document.getElementById(`cell-${x}-${y}`)
        const isLast = lastObservedCoord && lastObservedCoord[0] === x && lastObservedCoord[1] === y
        if (cell.observed) {
          div.innerText = cell.state.boxChar
          div.style.backgroundColor = isLast ? "#bbbbbb" : ""
        } else {
          div.innerText = ""
          div.style.backgroundColor = ENTROPY_COLORS[cell.possibleTransforms.length]
        }
      }
    }
  }
}

class Cell {
  constructor(x, y, possibleTransforms) {
    this.x = x
    this.y = y
    this.possibleTransforms = possibleTransforms
    this.observed = false
    this.state = null
  }

  observe() {
    this.observed = true
    // Imagine lining up every possible transform on a number line.
    // Each one takes up a slice as wide as its `weight`.
    // We pick a random point on that line — whichever slice we land
    // in, that's our transform.
    const totalWeight = this.possibleTransforms.reduce((sum, t) => sum + t.weight, 0)
    let pick = Math.random() * totalWeight
    for (const t of this.possibleTransforms) {
      pick -= t.weight
      if (pick <= 0) {
        this.state = t
        return
      }
    }
  }
}

class Transform {
  constructor(encoding) {
    this.encoding = encoding
    this.up    = encoding[0] === "1"
    this.right = encoding[1] === "1"
    this.down  = encoding[2] === "1"
    this.left  = encoding[3] === "1"
    this.boxChar = BOX_CHARS[encoding]
    this.connections = [this.up, this.right, this.down, this.left].filter(Boolean).length
    this.weight = WEIGHTS[this.connections]
  }

  static generateAll() {
    const transforms = []
    for (let i = 0; i < 16; i++) {
      transforms.push(new Transform(i.toString(2).padStart(4, "0")))
    }
    return transforms
  }
}
