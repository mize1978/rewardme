import { Controller } from "@hotwired/stimulus"

const TIME_LIMIT      = 30
const SPAWN_MS        = 380
const RIBBON_LIFE_MS  = 2400

const RESULT_MESSAGES = {
  low:    ["次は絶対もっとできるよ！♪", "練習あるのみ！一緒に頑張ろうね♡", "ゆっくりでも大丈夫だよ♪"],
  mid:    ["よく頑張ったね！", "リボンをたくさんキャッチしたね♪", "かなり上手くなってきた！"],
  high:   ["すごい！！天才かも♡", "リボンハンターの素質あり✨", "最高スコア更新したかも！？"],
  perfect:["神業だよ！！👑", "リボンちゃん大感激♡♡", "もしかして…チート？笑 最高すぎる！"],
}

export default class extends Controller {
  static targets = [
    "startScreen", "gameScreen", "resultScreen",
    "countdown", "timer", "scoreDisplay",
    "ribbonContainer",
    "resultScore", "resultCoins", "resultMessage", "resultHighScore"
  ]

  connect() {
    this.score    = 0
    this.timeLeft = TIME_LIMIT
    this.active   = false
  }

  start() {
    this.score    = 0
    this.timeLeft = TIME_LIMIT
    this.startScreenTarget.hidden = true
    this.gameScreenTarget.hidden  = false
    this.scoreDisplayTarget.textContent = "0"
    this.timerTarget.textContent        = TIME_LIMIT
    this.timerTarget.classList.remove("game-timer--danger")
    this._countdown(3)
  }

  _countdown(n) {
    const el = this.countdownTarget
    el.hidden = false
    el.textContent = n > 0 ? n : "GO！"
    el.classList.toggle("game-countdown--go", n === 0)

    if (n > 0) {
      setTimeout(() => this._countdown(n - 1), 700)
    } else {
      setTimeout(() => {
        el.hidden = true
        this._startGame()
      }, 500)
    }
  }

  _startGame() {
    this.active = true

    this.timerInterval = setInterval(() => {
      this.timeLeft--
      this.timerTarget.textContent = this.timeLeft
      if (this.timeLeft <= 5) this.timerTarget.classList.add("game-timer--danger")
      if (this.timeLeft <= 0) this._endGame()
    }, 1000)

    this.spawnInterval = setInterval(() => {
      if (this.active) this._spawnRibbon()
    }, SPAWN_MS)

    // 最初の1個は即スポーン
    this._spawnRibbon()
  }

  _spawnRibbon() {
    const el        = document.createElement("div")
    el.className    = "game-ribbon"
    el.textContent  = "🎀"

    const container = this.ribbonContainerTarget
    const w = container.offsetWidth
    const h = container.offsetHeight
    const side = Math.floor(Math.random() * 4)
    let sx, sy, tx, ty

    if (side === 0) {       // top → bottom
      sx = Math.random() * w; sy = -56
      tx = (Math.random() - 0.5) * w * 0.6; ty = h + 80
    } else if (side === 1) { // right → left
      sx = w + 56;            sy = Math.random() * h
      tx = -(w + 80);         ty = (Math.random() - 0.5) * h * 0.6
    } else if (side === 2) { // bottom → top
      sx = Math.random() * w; sy = h + 56
      tx = (Math.random() - 0.5) * w * 0.6; ty = -(h + 80)
    } else {                 // left → right
      sx = -56;              sy = Math.random() * h
      tx = w + 80;           ty = (Math.random() - 0.5) * h * 0.6
    }

    el.style.cssText = `
      left: ${sx}px;
      top:  ${sy}px;
      --tx: ${tx}px;
      --ty: ${ty}px;
      animation-duration: ${1.2 + Math.random() * 1.2}s;
      font-size: ${32 + Math.random() * 24}px;
    `

    el.addEventListener("pointerdown", (e) => {
      e.preventDefault()
      if (!this.active) return
      this._tap(el, e)
    }, { once: true })

    container.appendChild(el)
    setTimeout(() => el.remove(), RIBBON_LIFE_MS)
  }

  _tap(el, e) {
    this.score++
    this.scoreDisplayTarget.textContent = this.score

    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width  / 2
    const cy = rect.top  + rect.height / 2

    el.remove()
    this._sparkle(cx, cy)
    this._floatPlus(cx, cy)
  }

  _sparkle(x, y) {
    const el = document.createElement("div")
    el.className = "game-sparkle"
    el.style.cssText = `left:${x}px; top:${y}px`

    // 放射状に8個のパーティクル
    for (let i = 0; i < 8; i++) {
      const p = document.createElement("span")
      p.style.setProperty("--angle", (i * 45) + "deg")
      el.appendChild(p)
    }

    document.body.appendChild(el)
    setTimeout(() => el.remove(), 600)
  }

  _floatPlus(x, y) {
    const el = document.createElement("div")
    el.className   = "game-float-score"
    el.textContent = "+1"
    el.style.cssText = `left:${x}px; top:${y}px`
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 700)
  }

  _endGame() {
    this.active = false
    clearInterval(this.timerInterval)
    clearInterval(this.spawnInterval)
    this.ribbonContainerTarget.innerHTML = ""

    const score = this.score
    const coins = score >= 100 ? 100 : score >= 50 ? 50 : 20
    const cat   = score >= 100 ? "perfect" : score >= 50 ? "high" : score >= 20 ? "mid" : "low"
    const msgs  = RESULT_MESSAGES[cat]
    const msg   = msgs[Math.floor(Math.random() * msgs.length)]

    this.resultScoreTarget.textContent     = score
    this.resultCoinsTarget.textContent     = `+${coins} コイン`
    this.resultMessageTarget.textContent   = msg

    this.gameScreenTarget.hidden   = true
    this.resultScreenTarget.hidden = false

    // サーバーに送信
    fetch(this.element.dataset.tapGameResultUrl, {
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
          this.resultHighScoreTarget.textContent = `🏆 ハイスコア更新！ ${score} 点`
          this.resultHighScoreTarget.classList.add("game-result-hs--new")
        } else {
          this.resultHighScoreTarget.textContent = `ハイスコア: ${hs} 点`
        }
      }
    })
  }

  disconnect() {
    clearInterval(this.timerInterval)
    clearInterval(this.spawnInterval)
    this.active = false
  }
}
