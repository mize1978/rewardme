import { Controller } from "@hotwired/stimulus"

const GRID_SIZE  = 6
const TILE_COUNT = 8
const TIME_LIMIT = 60

const TILE_COLORS = [
  "linear-gradient(135deg, #ffe4f0, #ffc8e0)", // ribbon  - pink
  "linear-gradient(135deg, #fff8e0, #ffe8a0)", // crown   - yellow
  "linear-gradient(135deg, #ddeeff, #c8d8f8)", // wand    - blue
  "linear-gradient(135deg, #ede0ff, #d8c8ff)", // rainbow - lavender
  "linear-gradient(135deg, #ffd8e8, #ffb8d0)", // tiara   - pink
  "linear-gradient(135deg, #f8d8ff, #eec0f8)", // heart   - lavender pink
  "linear-gradient(135deg, #e4eeff, #ccd8f8)", // wings   - pale blue
  "linear-gradient(135deg, #ffdce8, #ffc0d4)", // slipper - light pink
]

const RESULT_MESSAGES = {
  low:    ["ゆっくりでも大丈夫♪", "次はもっとできるよ！", "練習あるのみ！一緒に頑張ろうね♡"],
  mid:    ["なかなか上手！", "いい調子だよ♪", "どんどん上手くなってる！"],
  high:   ["すごい！！センスあるね♡", "リボンマッチの才能あり✨", "最高スコア更新したかも！？"],
  perfect:["神業だよ！！👑", "リボンちゃん大感激♡♡", "もしかして…パズル天才？笑"],
}

export default class extends Controller {
  static targets = [
    "startBtn", "boardOverlay",
    "countdown", "timer", "scoreDisplay", "board",
    "resultScore", "resultCoins", "resultMessage", "resultHighScore",
    "highScoreDisplay", "comboDisplay", "startHint", "ribbonMsg"
  ]

  connect() {
    this.score      = 0
    this.combo      = 0
    this.timeLeft   = TIME_LIMIT
    this.active     = false
    this.processing = false
    this.selected   = null
    this.grid       = []
    this.tileImages = JSON.parse(this.element.dataset.matchGameTileUrls)
    this._initBoard()
    this._renderBoard()
    this._startBoardStars()
  }

  start() {
    this.score    = 0
    this.combo    = 0
    this.timeLeft = TIME_LIMIT
    this.selected = null
    this._milestone30 = false
    this._milestone60 = false
    this._setRibbonMsg("その調子！✨")
    if (this.hasStartBtnTarget) this.startBtnTarget.disabled = true
    this.scoreDisplayTarget.textContent  = "0"
    this.timerTarget.textContent         = TIME_LIMIT
    this.timerTarget.classList.remove("mg-timer--danger")
    this.resultMessageTarget.textContent = ""
    this.resultScoreTarget.textContent   = "0"
    if (this.hasComboDisplayTarget) this.comboDisplayTarget.textContent = "×0"
    if (this.hasResultCoinsTarget) this.resultCoinsTarget.textContent = ""
    this._initBoard()
    this._renderBoard()
    this._countdown(3)
  }

  _countdown(n) {
    const el = this.countdownTarget
    el.textContent = n > 0 ? n : "GO！"
    el.classList.remove("mg-overlay-hidden")
    el.classList.toggle("mg-countdown--go", n === 0)
    if (this.hasStartHintTarget) this.startHintTarget.classList.add("mg-overlay-hidden")
    if (this.hasBoardOverlayTarget) this.boardOverlayTarget.classList.add("mg-overlay-hidden")
    if (n > 0) {
      setTimeout(() => this._countdown(n - 1), 700)
    } else {
      setTimeout(() => {
        el.classList.add("mg-overlay-hidden")
        this._startGame()
      }, 500)
    }
  }

  _startGame() {
    this.active = true
    this.element.querySelector('.mg-board-wrap')?.classList.add('mg-board-wrap--active')
    this._boardHandler = (e) => {
      const tile = e.target.closest(".mg-tile")
      if (!tile) return
      e.preventDefault()
      this._handleClick(parseInt(tile.dataset.row), parseInt(tile.dataset.col))
    }
    this.boardTarget.addEventListener("pointerdown", this._boardHandler)
    this.timerInterval = setInterval(() => {
      this.timeLeft--
      this.timerTarget.textContent = this.timeLeft
      if (this.timeLeft <= 10) this.timerTarget.classList.add("mg-timer--danger")
      if (this.timeLeft <= 0)  this._endGame()
    }, 1000)
  }

  // ─── ボード初期化 ────────────────────────────────────────
  _initBoard() {
    const N = GRID_SIZE
    this.grid = Array.from({ length: N }, () => Array(N).fill(null))
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        let sym
        do {
          sym = Math.floor(Math.random() * TILE_COUNT)
        } while (
          (c >= 2 && this.grid[r][c-1] === sym && this.grid[r][c-2] === sym) ||
          (r >= 2 && this.grid[r-1][c] === sym && this.grid[r-2][c] === sym)
        )
        this.grid[r][c] = sym
      }
    }
  }

  // ─── 描画 ────────────────────────────────────────────────
  _renderBoard(newPositions = new Set()) {
    const el = this.boardTarget
    el.innerHTML = ""
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const sym  = this.grid[r][c]
        const tile = document.createElement("div")
        tile.className = "mg-tile"
        tile.dataset.row = r
        tile.dataset.col = c

        if (sym !== null) {
          if (TILE_COLORS[sym]) tile.style.background = TILE_COLORS[sym]
          tile.classList.add("mg-tile--full")
          tile.dataset.tileType = sym

          const img = document.createElement("img")
          img.src       = this.tileImages[sym]
          img.alt       = ""
          img.className = "mg-tile-img"
          img.draggable = false
          tile.appendChild(img)
        }

        if (this.selected && this.selected.r === r && this.selected.c === c) {
          tile.classList.add("mg-tile--selected")
        }
        if (newPositions.has(`${r},${c}`)) {
          tile.classList.add("mg-tile--new")
        }
        el.appendChild(tile)
      }
    }
  }

  _getTileEl(r, c) {
    return this.boardTarget.children[r * GRID_SIZE + c]
  }

  // ─── クリック処理 ────────────────────────────────────────
  _handleClick(r, c) {
    if (!this.active || this.processing) return
    if (!this.selected) {
      this.selected = { r, c }
      this._renderBoard()
      return
    }
    const dr = Math.abs(r - this.selected.r)
    const dc = Math.abs(c - this.selected.c)
    if (this.selected.r === r && this.selected.c === c) {
      this.selected = null
      this._renderBoard()
    } else if (dr + dc === 1) {
      this._trySwap(this.selected.r, this.selected.c, r, c)
    } else {
      this.selected = { r, c }
      this._renderBoard()
    }
  }

  async _trySwap(r1, c1, r2, c2) {
    this.processing = true
    this.selected   = null
    ;[this.grid[r1][c1], this.grid[r2][c2]] = [this.grid[r2][c2], this.grid[r1][c1]]
    this._renderBoard()
    await this._delay(120)
    const matches = this._findMatches()
    if (matches.length === 0) {
      ;[this.grid[r1][c1], this.grid[r2][c2]] = [this.grid[r2][c2], this.grid[r1][c1]]
      this._renderBoard()
      const t1 = this._getTileEl(r1, c1)
      const t2 = this._getTileEl(r2, c2)
      t1?.classList.add("mg-tile--shake")
      t2?.classList.add("mg-tile--shake")
      this.combo = 0
      if (this.hasComboDisplayTarget) this.comboDisplayTarget.textContent = "×0"
      await this._delay(400)
    } else {
      await this._cascade()
    }
    this.processing = false
  }

  // ─── マッチ検出 ──────────────────────────────────────────
  _findMatches() {
    const N = GRID_SIZE
    const found = new Set()
    for (let r = 0; r < N; r++) {
      let c = 0
      while (c < N - 2) {
        const sym = this.grid[r][c]
        if (sym === null) { c++; continue }
        let end = c + 1
        while (end < N && this.grid[r][end] === sym) end++
        if (end - c >= 3) for (let i = c; i < end; i++) found.add(`${r},${i}`)
        c = end
      }
    }
    for (let c = 0; c < N; c++) {
      let r = 0
      while (r < N - 2) {
        const sym = this.grid[r][c]
        if (sym === null) { r++; continue }
        let end = r + 1
        while (end < N && this.grid[end][c] === sym) end++
        if (end - r >= 3) for (let i = r; i < end; i++) found.add(`${i},${c}`)
        r = end
      }
    }
    return [...found].map(k => {
      const [r, c] = k.split(",").map(Number)
      return { r, c }
    })
  }

  // ─── 連鎖処理 ────────────────────────────────────────────
  async _cascade() {
    while (true) {
      const matches = this._findMatches()
      if (matches.length === 0) break
      this.combo++
      matches.forEach(({ r, c }) => {
        this._getTileEl(r, c)?.classList.add("mg-tile--match")
      })
      await this._delay(350)
      this.score += matches.length
      if (this.active) {
        this.scoreDisplayTarget.textContent = this.score
        this.resultScoreTarget.textContent  = this.score
        if (this.hasComboDisplayTarget) {
          this.comboDisplayTarget.textContent = `×${this.combo}`
        }
        this._floatScore(matches)
        this._spawnSparkles(matches)
        this._bounceScore()
        if (this.combo >= 2) this._showComboText(this.combo)
        if (!this._milestone60 && this.score >= 60) {
          this._milestone60 = true
          this._setRibbonMsg("最高記録を目指そう！🏆")
        } else if (!this._milestone30 && this.score >= 30) {
          this._milestone30 = true
          this._setRibbonMsg("すごい！半分超えたね！")
        }
      }
      matches.forEach(({ r, c }) => { this.grid[r][c] = null })
      const newPositions = this._applyGravity()
      this._renderBoard(newPositions)
      await this._delay(200)
    }
    this.combo = 0
    if (this.hasComboDisplayTarget) this.comboDisplayTarget.textContent = "×0"
  }

  // ─── キラキラパーティクル ────────────────────────────────
  _spawnSparkles(matches) {
    if (!matches.length) return
    const colors = ['#ff80c8','#ffd700','#ffffff','#c060ff','#ff60a8','#80e8ff','#ffb3f0']
    const mid  = matches[Math.floor(matches.length / 2)]
    const tile = this._getTileEl(mid.r, mid.c)
    if (!tile) return
    const rect  = tile.getBoundingClientRect()
    const cx    = rect.left + rect.width  / 2
    const cy    = rect.top  + rect.height / 2
    const count = Math.min(8 + matches.length, 16)
    for (let i = 0; i < count; i++) {
      const el    = document.createElement('div')
      const angle = (i / count) * 360 + Math.random() * (360 / count)
      const dist  = 28 + Math.random() * 40
      const size  = 5 + Math.random() * 7
      el.className = 'mg-sparkle'
      el.style.cssText = `
        left:${cx}px; top:${cy}px;
        width:${size}px; height:${size}px;
        --dx:${(Math.cos(angle * Math.PI / 180) * dist).toFixed(1)}px;
        --dy:${(Math.sin(angle * Math.PI / 180) * dist).toFixed(1)}px;
        background:${colors[i % colors.length]};
        border-radius:${Math.random() > 0.5 ? '50%' : '3px'};
        animation-duration:${(0.45 + Math.random() * 0.35).toFixed(2)}s;
      `
      document.body.appendChild(el)
      setTimeout(() => el.remove(), 900)
    }
  }

  // ─── コンボテキスト ──────────────────────────────────────
  _showComboText(combo) {
    const map = {
      2: { text: 'Nice! ✨',          cls: '' },
      3: { text: 'Great! 🎀',         cls: '' },
      4: { text: 'Ribbon Combo! 🎀',  cls: 'mg-combo-text--big' },
      5: { text: 'Perfect! 💖',       cls: 'mg-combo-text--big' },
    }
    const entry = combo >= 5 ? map[5] : map[combo]
    if (!entry) return
    const el = document.createElement('div')
    el.className = `mg-combo-text ${entry.cls}`
    el.textContent = entry.text
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 1400)
  }

  // ─── スコアバウンス ──────────────────────────────────────
  _bounceScore() {
    [this.scoreDisplayTarget, this.resultScoreTarget].forEach(el => {
      el.classList.remove('mg-score-bounce')
      void el.offsetWidth
      el.classList.add('mg-score-bounce')
    })
  }

  // ─── 重力（新タイルの位置を返す） ───────────────────────
  _applyGravity() {
    const N = GRID_SIZE
    const newPositions = new Set()
    for (let c = 0; c < N; c++) {
      const existing = []
      for (let r = N - 1; r >= 0; r--) {
        if (this.grid[r][c] !== null) existing.push(this.grid[r][c])
      }
      const newCount = N - existing.length
      while (existing.length < N) existing.push(Math.floor(Math.random() * TILE_COUNT))
      for (let r = N - 1; r >= 0; r--) this.grid[r][c] = existing[N - 1 - r]
      for (let r = 0; r < newCount; r++) newPositions.add(`${r},${c}`)
    }
    return newPositions
  }

  _floatScore(matches) {
    if (matches.length === 0) return
    const mid  = matches[Math.floor(matches.length / 2)]
    const tile  = this._getTileEl(mid.r, mid.c)
    if (!tile) return
    const rect  = tile.getBoundingClientRect()
    const el    = document.createElement("div")
    el.className   = "mg-float-score"
    el.textContent = `+${matches.length}`
    el.style.cssText = `left:${rect.left + rect.width/2}px; top:${rect.top}px`
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 700)
  }

  // ─── ゲーム終了 ──────────────────────────────────────────
  _endGame() {
    this.active = false
    this.element.querySelector('.mg-board-wrap')?.classList.remove('mg-board-wrap--active')
    clearInterval(this.timerInterval)
    if (this._boardHandler) this.boardTarget.removeEventListener("pointerdown", this._boardHandler)
    const score = this.score
    const coins = score >= 60 ? 100 : score >= 30 ? 60 : score >= 10 ? 30 : 10
    const cat   = score >= 60 ? "perfect" : score >= 30 ? "high" : score >= 10 ? "mid" : "low"
    const msgs  = RESULT_MESSAGES[cat]
    const msg   = msgs[Math.floor(Math.random() * msgs.length)]
    this.resultScoreTarget.textContent   = score
    this.resultCoinsTarget.textContent   = `+${coins} コイン`
    this.resultMessageTarget.textContent = msg
    fetch(this.element.dataset.matchGameResultUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content,
      },
      body: JSON.stringify({ score }),
    })
    .then(r => r.json())
    .then(data => {
      if (data.error) return
      if (this.hasResultHighScoreTarget) {
        const hs = parseInt(this.resultHighScoreTarget.dataset.prev || 0)
        if (score > hs) {
          this.resultHighScoreTarget.textContent = `🏆 ハイスコア更新！ ${score} 枚`
          this.resultHighScoreTarget.classList.add("mg-result-hs--new")
          if (this.hasHighScoreDisplayTarget) {
            this.highScoreDisplayTarget.textContent = `${score} 枚`
          }
        } else {
          this.resultHighScoreTarget.textContent = `ハイスコア: ${hs} 枚`
        }
      }
    })
  }

  _delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }

  _setRibbonMsg(text) {
    if (this.hasRibbonMsgTarget) this.ribbonMsgTarget.textContent = text
  }

  disconnect() {
    clearInterval(this.timerInterval)
    clearTimeout(this._starTimer)
    this.active = false
    if (this._boardHandler) this.boardTarget.removeEventListener("pointerdown", this._boardHandler)
  }

  _startBoardStars() {
    const schedule = () => {
      this._starTimer = setTimeout(() => {
        this._spawnBoardStar()
        schedule()
      }, 2000 + Math.random() * 1500)
    }
    this._starTimer = setTimeout(() => { this._spawnBoardStar(); schedule() }, 800 + Math.random() * 1200)
  }

  _spawnBoardStar() {
    const wrap = this.element.querySelector('.mg-board-wrap')
    if (!wrap) return
    const rect   = wrap.getBoundingClientRect()
    const chars  = ['✦', '✦', '★', '·', '✦']
    const colors = ['#ffd700', '#ff90d8', '#ffffff', '#c8a0ff', '#ffe066']
    const sizes  = [7, 9, 11, 8, 10]

    const edge = Math.floor(Math.random() * 4)
    const pad  = 8 + Math.random() * 28
    let x, y
    if (edge === 0)      { x = rect.left + Math.random() * rect.width; y = rect.top    - pad }
    else if (edge === 1) { x = rect.right  + pad * 0.6;                y = rect.top    + Math.random() * rect.height }
    else if (edge === 2) { x = rect.left + Math.random() * rect.width; y = rect.bottom + pad * 0.6 }
    else                 { x = rect.left   - pad * 0.6;                y = rect.top    + Math.random() * rect.height }

    const el    = document.createElement('span')
    el.className = 'mg-board-star'
    el.textContent = chars[Math.floor(Math.random() * chars.length)]
    el.style.cssText = `
      left:${x.toFixed(0)}px;
      top:${y.toFixed(0)}px;
      font-size:${sizes[Math.floor(Math.random() * sizes.length)]}px;
      color:${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration:${(2.0 + Math.random() * 0.8).toFixed(2)}s;
    `
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 3000)
  }
}
