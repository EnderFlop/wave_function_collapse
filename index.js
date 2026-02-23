window.addEventListener('DOMContentLoaded', () => {
  WIDTH = window.innerWidth
  HEIGHT = window.innerHeight

  main()
})

function main() {
  // get possible cell states
  const starting_transforms = generate_transforms()

  // initialize grid of cells
  const width = 11
  const height = 11
  const grid = init_cells(width, height, starting_transforms)
  const html = init_html(width, height)

  // observe center cell
  const center_cell = grid[Math.floor(height / 2)][Math.floor(width / 2)]
  center_cell.observe()


  //  while any cells are not yet observed (do as step?)
  //  find cell with lowest entropy (optimize: keep track of neighbor list so we don't scan shitty nodes over and over, or sort a list, or something)
}

class Cell {
  constructor(x, y, starting_transforms) {
    this.x = x
    this.y = y
    this.possible_transforms = starting_transforms
    this.observed = false
  }

  // needs function that scans neighbors and prunes possible_transforms
  // need observe() function that collapses cell

  observe() {

  }


}

class Transform {
  constructor(encoding) {
    //each cell can be pointing in any four of the possible directions.
    // we will represent this with a four byte string, {UP RIGHT DOWN LEFT}
    // 0000 will be no connections, 0110 will be right and down, 1111 will be four way
    this.encoding = encoding
    this.up = this.encoding_to_bool(encoding[0])
    this.right = this.encoding_to_bool(encoding[1])
    this.down = this.encoding_to_bool(encoding[2])
    this.left = this.encoding_to_bool(encoding[3])
    this.box_char = this.get_box_char(encoding)
  }

  encoding_to_bool(char) {
    return char === "1"
  }

  get_box_char(encoding) {
    const boxMap = {
      "0000": ' ',
      "0001": '╶', // left
      "0010": '╷', // down
      "0011": '└',
      "0100": '╴', // right
      "0101": '─',
      "0110": '┌',
      "0111": '├',
      "1000": '╵', // up
      "1001": '┘',
      "1010": '│',
      "1011": '┴',
      "1100": '┐',
      "1101": '┤',
      "1110": '┬',
      "1111": '┼'
    };

    return boxMap[encoding]
  }
}

function generate_transforms() {
  const transforms = []

  for (let i = 0; i < 16; i++) {
    transforms.push(new Transform(i.toString(2).padStart(4, "0")))
  }

  return transforms
}

function init_cells(width, height, starting_transforms) {
  const grid = []

  for (let h = 0; h < height; h++) {
    grid.push([])
    for (let w = 0; w < width; w++){
      grid[h].push(new Cell(w, h, starting_transforms))
    }
  }

  return grid
}

function init_html(width, height) {
  const container = document.getElementById("container")

  for (let h = 0; h < height; h++) {
    const row = document.createElement("div")
    row.id = "row"
    container.appendChild(row)
    for (let w = 0; w < width; w++){
      const cell = document.createElement("div")
      cell.id = "cell"
      cell.style.backgroundColor = (w + h) % 2 == 0 ?  `rgb(96, 56, 242)` : `rgb(119, 84, 247)`
      cell.innerText = "@"
      row.appendChild(cell)
    }
  }

}