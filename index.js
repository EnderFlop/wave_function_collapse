let grid = null
let runInterval = null

const WIDTH = 23
const HEIGHT = 11

window.addEventListener('DOMContentLoaded', () => {
  const btnStart = document.getElementById("btn-start")
  const btnStop  = document.getElementById("btn-stop")
  const btnStep  = document.getElementById("btn-step")
  const btnReset = document.getElementById("btn-reset")

  reset()

  btnStart.addEventListener("click", () => {
    if (runInterval || grid.unobservedCellCount <= 0) return
    btnStart.disabled = true
    btnStop.disabled = false
    btnStep.disabled = true
    runInterval = setInterval(() => {
      if (grid.unobservedCellCount <= 0) {
        stop()
        return
      }
      grid.step()
    }, 80)
  })

  btnStop.addEventListener("click", stop)
  btnStep.addEventListener("click", () => {
    if (grid.unobservedCellCount > 0) grid.step()
  })
  btnReset.addEventListener("click", reset)

  function stop() {
    clearInterval(runInterval)
    runInterval = null
    btnStart.disabled = grid.unobservedCellCount <= 0
    btnStop.disabled = true
    btnStep.disabled = grid.unobservedCellCount <= 0
  }

  function reset() {
    if (runInterval) {
      clearInterval(runInterval)
      runInterval = null
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
    this.transforms = generateTransforms()
    this.cells = this.initCells()
    this.unobservedCellCount = width * height
    this.initHtml()
  }

  initCells() {
    const cells = []
    for (let h = 0; h < this.height; h++) {
      cells.push([])
      for (let w = 0; w < this.width; w++) {
        cells[h].push(new Cell(w, h, this.transforms))
      }
    }
    return cells
  }

  initHtml() {
    const container = document.getElementById("container")
    container.style.setProperty("--cols", this.width)
    container.style.setProperty("--rows", this.height)

    for (let h = 0; h < this.height; h++) {
      for (let w = 0; w < this.width; w++) {
        const cell = document.createElement("div")
        cell.id = `cell-${w}-${h}`
        cell.className = "cell"
        cell.style.backgroundColor = (w + h) % 2 == 0 ? `rgb(96, 56, 242)` : `rgb(119, 84, 247)`
        cell.innerText = "@"
        container.appendChild(cell)
      }
    }
  }

  step() {
    const cell = this.getMostLikelyCell()
    if (!cell) return
    this.observeCell(cell)
  }

  observeCell(cell) {
    cell.observe()
    this.propagateConstraints(cell)
    this.unobservedCellCount--
    this.renderHtml()
  }


  getMostLikelyCell() {
    let bestCells = []
    let bestScore = Infinity
    for (let h = 0; h < this.height; h++) {
      for (let w = 0; w < this.width; w++) {
        const cell = this.cells[h][w]
        if (cell.observed) continue
        const score = cell.possibleTransforms.length
        if (score < bestScore) {
          bestScore = score
          bestCells = [cell]
        } else if (score === bestScore) {
          bestCells.push(cell)
        }
      }
    }
    const bestCell = bestCells[Math.floor(Math.random() * bestCells.length)]
    return bestCell
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

  getNeighbors(cell) {
    const neighbors = []
    const x = cell.x
    const y = cell.y
    if (y > 0) neighbors.push(this.cells[y - 1][x])
    if (y < this.height - 1) neighbors.push(this.cells[y + 1][x])
    if (x > 0) neighbors.push(this.cells[y][x - 1])
    if (x < this.width - 1) neighbors.push(this.cells[y][x + 1])
    return neighbors
  }

  renderHtml() {
    for (let h = 0; h < this.height; h++) {
      for (let w = 0; w < this.width; w++) {
        const cell = this.cells[h][w]
        const div = document.getElementById(`cell-${w}-${h}`)
        div.innerText = cell.state.boxChar
      }
    }
  }
}

class Cell {
  constructor(x, y, startingTransforms) {
    this.x = x
    this.y = y
    this.possibleTransforms = startingTransforms
    this.observed = false
    this.state = this.possibleTransforms[0];
  }

  // needs function that scans neighbors and prunes possibleTransforms
  // need observe() function that collapses cell

  observe() {
    this.observed = true
    this.state = this.possibleTransforms[Math.floor(Math.random() * this.possibleTransforms.length)]
    return this.state
  }
}

class Transform {
  constructor(encoding) {
    //each cell can be pointing in any four of the possible directions.
    // we will represent this with a four byte string, {UP RIGHT DOWN LEFT}
    // 0000 will be no connections, 0110 will be right and down, 1111 will be four way
    this.encoding = encoding
    this.up = this.encodingToBool(encoding[0])
    this.right = this.encodingToBool(encoding[1])
    this.down = this.encodingToBool(encoding[2])
    this.left = this.encodingToBool(encoding[3])
    this.boxChar = this.getBoxChar(encoding)
  }

  encodingToBool(char) {
    return char === "1"
  }

  getBoxChar(encoding) {
    const boxMap = {
      "0000": ' ',
      "0001": '╴', // left
      "0010": '╷', // down
      "0011": '┐',
      "0100": '╶', // right
      "0101": '─',
      "0110": '┌',
      "0111": '┬',
      "1000": '╵', // up
      "1001": '┘',
      "1010": '│',
      "1011": '┤',
      "1100": '└',
      "1110": '├',
      "1101": '┴',
      "1111": '┼'
    };

    return boxMap[encoding]
  }
}

function generateTransforms() {
  const transforms = []

  for (let i = 0; i < 16; i++) {
    transforms.push(new Transform(i.toString(2).padStart(4, "0")))
  }

  return transforms
}
