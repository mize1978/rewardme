import { Controller } from "@hotwired/stimulus"

const CAPACITY = 4

const COLOR_META = {
  pink:   { gradient: "linear-gradient(to bottom, #ff9de0, #ff4db8)" },
  blue:   { gradient: "linear-gradient(to bottom, #90d8ff, #40a8f0)" },
  purple: { gradient: "linear-gradient(to bottom, #d090ff, #9040e8)" },
  yellow: { gradient: "linear-gradient(to bottom, #ffe878, #ffb820)" },
  green:  { gradient: "linear-gradient(to bottom, #90ffcc, #30c880)" },
  rose:   { gradient: "linear-gradient(to bottom, #ff6666, #cc0011)" },
  orange: { gradient: "linear-gradient(to bottom, #ffd080, #ff8020)" },
}

const MAGIC_MSGS = [
  { min: 100, msg: "錬成完了！ポーション誕生！" },
  { min: 75,  msg: "錬成が間もなく完了する…！" },
  { min: 50,  msg: "魔法が高まってきている…" },
  { min: 25,  msg: "魔法が少しずつ集まってきた！" },
  { min: 0,   msg: "まだ魔法が集まっていない…" },
]

const STAGES = [
  { vials: [
    ["pink",   "blue",   "pink",   "yellow"],
    ["yellow", "purple", "yellow", "blue"],
    ["blue",   "pink",   "purple", "purple"],
    ["purple", "yellow", "blue",   "pink"],
    [],
  ]},
  { vials: [
    ["pink",   "blue",   "purple", "pink"],
    ["purple", "yellow", "blue",   "yellow"],
    ["blue",   "pink",   "yellow", "purple"],
    ["yellow", "purple", "pink",   "blue"],
    [],
  ]},
  { vials: [
    ["pink",   "green",  "blue",   "purple"],
    ["blue",   "pink",   "green",  "yellow"],
    ["yellow", "purple", "pink",   "green"],
    ["green",  "blue",   "yellow", "pink"],
    ["purple", "yellow", "purple", "blue"],
    [],
  ]},
  { vials: [
    ["rose",   "blue",   "purple", "pink"],
    ["pink",   "rose",   "yellow", "blue"],
    ["yellow", "purple", "rose",   "yellow"],
    ["blue",   "pink",   "blue",   "purple"],
    ["purple", "yellow", "pink",   "rose"],
    [],
  ]},
  { vials: [
    ["pink",   "blue",   "purple", "yellow"],
    ["blue",   "green",  "rose",   "pink"],
    ["purple", "pink",   "green",  "blue"],
    ["yellow", "rose",   "pink",   "green"],
    ["green",  "purple", "yellow", "rose"],
    ["rose",   "yellow", "blue",   "purple"],
    [],
  ]},
  { vials: [
    ["pink",   "blue",   "purple", "yellow"],
    ["blue",   "green",  "rose",   "orange"],
    ["purple", "pink",   "orange", "green"],
    ["yellow", "rose",   "pink",   "blue"],
    ["green",  "orange", "purple", "rose"],
    ["orange", "purple", "yellow", "green"],
    ["rose",   "yellow", "blue",   "pink"],
    [],
  ]},
]

export default class extends Controller {
  static targets = [
    "startScreen", "gameScreen", "clearScreen",
    "topRow", "leftCol", "rightCol", "bottomRow",
    "moveCount", "stageBadge",
    "magicCircle", "magicPct", "magicMsg", "starPotion",
    "clearStageMsg", "clearCoins", "nextBtn",
  ]

  connect() {
    this.resultUrl     = this.element.dataset.potionGameResultUrl
    this.alreadyPlayed = this.element.dataset.potionGameAlreadyPlayed === "true"
    this.currentStage  = 0
    this.vials         = []
    this.selected      = null
    this.moves         = 0
    this.history       = []
    this.coinAwarded   = false
    this.initialFilled = 0
  }

  start() {
    this.currentStage = 0
    this.coinAwarded  = false
    this._loadStage(0)
    this.startScreenTarget.hidden = true
    this.gameScreenTarget.hidden  = false
  }

  backToStart() {
    this.gameScreenTarget.hidden  = true
    this.clearScreenTarget.hidden = true
    this.startScreenTarget.hidden = false
  }

  nextStage() {
    this.currentStage++
    if (this.currentStage >= STAGES.length) { this.backToStart(); return }
    this._loadStage(this.currentStage)
    this.clearScreenTarget.hidden = true
    this.gameScreenTarget.hidden  = false
  }

  _loadStage(idx) {
    this.vials         = STAGES[idx].vials.map(v => [...v])
    this.initialFilled = this.vials.filter(v => v.length > 0).length
    this.selected      = null
    this.moves         = 0
    this.history       = []
    this.stageBadgeTarget.textContent = `Stage ${idx + 1}`
    this.moveCountTarget.textContent  = "0"
    // 魔法陣をリセット
    this.magicCircleTarget.dataset.level = "0"
    this.magicPctTarget.textContent      = ""
    this.magicMsgTarget.textContent      = ""
    this.starPotionTarget.classList.remove("pg-star-potion--born")
    this._render()
  }

  resetStage() { this._loadStage(this.currentStage) }

  // ─── 操作 ───

  selectVial(e) {
    const idx = parseInt(e.currentTarget.dataset.vialIdx)
    if (isNaN(idx)) return
    this._handleSelect(idx)
  }

  _handleSelect(idx) {
    if (this.selected === null) {
      if (this.vials[idx].length === 0) return
      this.selected = idx
      this._render()
      return
    }
    if (this.selected === idx) {
      this.selected = null
      this._render()
      return
    }
    if (this._canPour(this.selected, idx)) {
      this.history.push(this.vials.map(v => [...v]))
      this._pour(this.selected, idx)
      this.moves++
      this.moveCountTarget.textContent = this.moves
      this.selected = null
      this._render()
      if (this._isWon()) setTimeout(() => this._showClear(), 400)
    } else {
      this._shakeTarget(idx)
      this._render()
    }
  }

  _shakeTarget(idx) {
    const el = this.element.querySelector(`[data-vial-idx="${idx}"]`)
    if (!el) return
    el.classList.remove("pg-shake")
    void el.offsetWidth
    el.classList.add("pg-shake")
    el.addEventListener("animationend", () => el.classList.remove("pg-shake"), { once: true })
  }

  undo() {
    if (this.history.length === 0) return
    this.vials    = this.history.pop()
    this.selected = null
    this.moves    = Math.max(0, this.moves - 1)
    this.moveCountTarget.textContent = this.moves
    this._render()
  }

  // ─── ロジック ───

  _canPour(fromIdx, toIdx) {
    const from = this.vials[fromIdx]
    const to   = this.vials[toIdx]
    if (from.length === 0) return false
    if (to.length >= CAPACITY) return false
    const fromTop = from[from.length - 1]
    const toTop   = to.length > 0 ? to[to.length - 1] : null
    if (toTop !== null && toTop !== fromTop) return false
    if (from.length === CAPACITY && from.every(c => c === from[0])) return false
    return true
  }

  _pour(fromIdx, toIdx) {
    const from    = this.vials[fromIdx]
    const to      = this.vials[toIdx]
    const fromTop = from[from.length - 1]
    let count = 0
    for (let i = from.length - 1; i >= 0 && from[i] === fromTop; i--) count++
    const move = Math.min(count, CAPACITY - to.length)
    for (let i = 0; i < move; i++) to.push(from.pop())
  }

  _isWon() {
    return this.vials.every(v =>
      v.length === 0 || (v.length === CAPACITY && v.every(c => c === v[0]))
    )
  }

  // ─── 描画 ───

  _distribute(count) {
    if (count <= 3) return { top: 2, left: 0, right: 0, bottom: count - 2 }
    if (count === 4) return { top: 2, left: 0, right: 0, bottom: 2 }
    if (count === 5) return { top: 2, left: 1, right: 0, bottom: 2 }
    if (count === 6) return { top: 2, left: 1, right: 1, bottom: 2 }
    return                   { top: 3, left: 1, right: 1, bottom: count - 5 }
  }

  _render() {
    const d   = this._distribute(this.vials.length)
    let   pos = 0

    const fill = (target, count) => {
      target.innerHTML = ""
      for (let i = 0; i < count; i++) {
        target.appendChild(this._createVialEl(this.vials[pos], pos))
        pos++
      }
    }

    fill(this.topRowTarget,    d.top)
    fill(this.leftColTarget,   d.left)
    fill(this.rightColTarget,  d.right)
    fill(this.bottomRowTarget, d.bottom)

    this._updateMagicCircle()
  }

  _updateMagicCircle() {
    const completed = this.vials.filter(v =>
      v.length === CAPACITY && v.every(c => c === v[0])
    ).length
    const pct   = this.initialFilled > 0 ? Math.round(completed / this.initialFilled * 100) : 0
    const level = Math.min(Math.floor(pct / 25), 4)

    this.magicCircleTarget.dataset.level = level
    this.magicPctTarget.textContent      = pct > 0 ? `${pct}%` : ""
    const stage = MAGIC_MSGS.find(s => pct >= s.min)
    this.magicMsgTarget.textContent = stage.msg
  }

  // ─── クリア演出 ───

  async _showClear() {
    // 魔法陣MAX発光
    this.magicCircleTarget.dataset.level = "5"
    this.magicMsgTarget.textContent = "錬成完了！🔮"

    await new Promise(r => setTimeout(r, 700))

    // 星型ポーション誕生
    this.starPotionTarget.classList.add("pg-star-potion--born")

    await new Promise(r => setTimeout(r, 1400))

    // クリア画面へ
    const stageNum = this.currentStage + 1
    this.gameScreenTarget.hidden  = true
    this.clearScreenTarget.hidden = false
    this.clearStageMsgTarget.textContent = `Stage ${stageNum} クリア！`
    this.nextBtnTarget.hidden = this.currentStage + 1 >= STAGES.length

    if (!this.coinAwarded) {
      try {
        const res  = await fetch(this.resultUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content,
          },
          body: JSON.stringify({ stage: stageNum }),
        })
        const data = await res.json()
        if (data.coins > 0) {
          this.coinAwarded = true
          this.clearCoinsTarget.innerHTML =
            `<span class="pg-clear-coin">🪙 +${data.coins} コイン獲得！</span>`
        } else {
          this.clearCoinsTarget.innerHTML =
            `<span class="pg-clear-coin pg-clear-coin--used">（今日のコインは獲得済み）</span>`
        }
      } catch { this.clearCoinsTarget.textContent = "" }
    } else {
      this.clearCoinsTarget.innerHTML =
        `<span class="pg-clear-coin pg-clear-coin--used">続けて遊んでいます♡</span>`
    }
  }

  _createVialEl(vial, idx) {
    const isSelected = this.selected === idx
    const isDone     = vial.length === CAPACITY && vial.every(c => c === vial[0])

    const el = document.createElement("div")
    el.className = ["pg-vial", isSelected ? "pg-vial--selected" : "", isDone ? "pg-vial--done" : ""].join(" ").trim()
    el.dataset.vialIdx = idx
    el.dataset.action  = "click->potion-game#selectVial"

    const neck = document.createElement("div")
    neck.className = "pg-vial-neck"
    el.appendChild(neck)

    const body = document.createElement("div")
    body.className = "pg-vial-body"

    const layers = [...vial].reverse()              // game-top → game-bottom
    while (layers.length < CAPACITY) layers.unshift(null)  // 空きは視覚的に上
    layers.forEach(color => {
      const layer = document.createElement("div")
      layer.className = color ? "pg-liquid" : "pg-liquid pg-liquid--empty"
      if (color) layer.style.background = COLOR_META[color].gradient
      body.appendChild(layer)
    })

    el.appendChild(body)

    if (isDone) {
      const check = document.createElement("div")
      check.className = "pg-vial-done-mark"
      check.textContent = "✓"
      el.appendChild(check)
    }

    return el
  }
}
