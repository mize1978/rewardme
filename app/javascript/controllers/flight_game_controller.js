import { Controller } from "@hotwired/stimulus"

// リボンフライト：押し続け＝上昇 / 離す＝下降で夜空を飛び、光の輪をくぐる。
// 手触りの数値はプロト(prototype/ribbon_flight.html)で確定した基準。ここでは変えない。
export default class extends Controller {
  static targets = [
    "startScreen", "gameScreen", "resultScreen", "canvas",
    "resultScore", "resultCoins", "resultMessage", "resultHighScore",
    "rankBlock", "rankCta", "rankForm", "rankInput", "rankErr"
  ]

  connect() {
    this.ctx = this.canvasTarget.getContext("2d")
    this.W = this.canvasTarget.width
    this.H = this.canvasTarget.height
    // ── 手触りチューニング（固定） ──
    this.GRAV = 0.17; this.LIFT = -0.42; this.MAXV = 4.4
    this.PX = 118; this.PS = 34; this.GATEW = 26; this.GAP = 320; this.SPACING = 360
    this._press = this._press.bind(this)
    this._release = this._release.bind(this)
    this.phase = "idle"
    // 背景（夜空）。リング/キャラ/軌跡は別レイヤーでこの上に描く。
    this.bg = new Image(); this.bgReady = false
    const bgUrl = this.element.dataset.flightGameBgUrl
    if (bgUrl) { this.bg.onload = () => { this.bgReady = true }; this.bg.src = bgUrl }
  }

  disconnect() { this._teardownInput(); if (this.raf) cancelAnimationFrame(this.raf) }

  curSpeed() { return 1.5 + Math.min(this.score * 0.05, 1.1) }

  start() {
    this.startScreenTarget.hidden = true
    this.resultScreenTarget.hidden = true
    this.gameScreenTarget.hidden = false
    this.resultHighScoreTarget.classList.remove("game-result-hs--new")
    this._setupInput()
    this._reset()
    this.phase = "countdown"
    this.countTimer = 0
    this._loop()
  }

  retry() { this.start() }

  _reset() {
    this.py = this.H * 0.42; this.pvy = 0; this.gates = []
    this.score = 0; this.combo = 0; this.holding = false; this.trail = []
    for (let i = 0; i < 3; i++) this._spawn(this.W + 360 + i * this.SPACING)
    this.gates[0].gy = (this.H - this.GAP) / 2   // 最初の輪は必ず中央
  }

  _spawn(x) {
    const gy = 110 + Math.random() * (this.H - 220 - this.GAP)
    this.gates.push({ x, gy, scored: false, flash: 0 })
  }

  _loop() {
    if (this.phase === "countdown") {
      this.countTimer += 1
      if (this.countTimer > 110) this.phase = "play"
      this._draw()
    } else if (this.phase === "play") {
      this._step()
      this._draw()
    }
    if (this.phase !== "over") this.raf = requestAnimationFrame(() => this._loop())
  }

  _step() {
    this.pvy += this.GRAV
    if (this.holding) this.pvy += this.LIFT
    this.pvy = Math.max(-this.MAXV, Math.min(this.MAXV, this.pvy))
    this.py += this.pvy
    if (this.py < 0) { this.py = 0; this.pvy = 0 }
    if (this.py > this.H - this.PS) { this.py = this.H - this.PS; this.pvy = 0 }

    this.trail.push({ x: this.PX + this.PS / 2, y: this.py + this.PS / 2 })
    if (this.trail.length > 10) this.trail.shift()

    for (const g of this.gates) {
      g.x -= this.curSpeed()
      if (!g.scored && g.x + this.GATEW < this.PX) { g.scored = true; g.flash = 1; this.score++; this.combo++ }
      if (g.flash > 0) g.flash -= 0.06
      const px2 = this.PX + this.PS, gx2 = g.x + this.GATEW
      if (this.PX < gx2 && px2 > g.x) {
        if (this.py < g.gy || this.py + this.PS > g.gy + this.GAP) { this._gameOver(); return }
      }
    }
    if (this.gates.length && this.gates[0].x < -this.GATEW) this.gates.shift()
    const last = this.gates[this.gates.length - 1]
    if (last && last.x < this.W - this.SPACING) this._spawn(last.x + this.SPACING)
  }

  _gameOver() {
    if (this.phase === "over") return
    this.phase = "over"
    this._teardownInput()
    this._submit(this.score)
  }

  // ── 描画 ──
  _rrect(x, y, w, h, r) {
    const c = this.ctx; r = Math.min(r, w / 2, h / 2)
    c.beginPath(); c.moveTo(x + r, y)
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r)
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath()
  }

  _draw() {
    const c = this.ctx, W = this.W, H = this.H
    // 背景を敷く（アスペクト一致＝クロップ無し／cover配置で飛行エリアを潰さない）
    if (this.bgReady) {
      const s = Math.max(W / this.bg.width, H / this.bg.height)
      const dw = this.bg.width * s, dh = this.bg.height * s
      c.drawImage(this.bg, (W - dw) / 2, (H - dh) / 2, dw, dh)
    } else {
      const grad = c.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, "#1c1042"); grad.addColorStop(1, "#0e0722")
      c.fillStyle = grad; c.fillRect(0, 0, W, H)
    }

    for (const g of this.gates) {
      const cx = g.x + this.GATEW / 2, cy = g.gy + this.GAP / 2, fl = g.flash || 0
      const col = g.scored ? "rgba(160,130,225,0.28)" : "rgba(185,145,255,0.52)"
      c.fillStyle = col; this._rrect(g.x, 0, this.GATEW, g.gy, 12); c.fill()
      c.fillStyle = col; this._rrect(g.x, g.gy + this.GAP, this.GATEW, H - (g.gy + this.GAP), 12); c.fill()
      c.save()
      c.shadowColor = g.scored ? "rgba(150,120,220,0.6)" : "rgba(215,185,255,0.95)"
      c.shadowBlur = 16 + fl * 22
      c.strokeStyle = g.scored ? "rgba(200,180,245,0.65)" : `rgba(245,232,255,${0.9 + fl * 0.1})`
      c.lineWidth = 5 + fl * 3
      c.beginPath(); c.ellipse(cx, cy, 48, this.GAP / 2, 0, 0, Math.PI * 2); c.stroke()
      c.lineWidth = 2; c.strokeStyle = g.scored ? "rgba(180,150,230,0.4)" : "rgba(255,244,205,0.7)"
      c.beginPath(); c.ellipse(cx, cy, 42, this.GAP / 2 - 6, 0, 0, Math.PI * 2); c.stroke()
      c.restore()
    }

    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i], a = (i / this.trail.length) * 0.35
      c.fillStyle = `rgba(255,225,170,${a})`
      c.beginPath(); c.arc(t.x, t.y, this.PS * 0.34 * (i / this.trail.length + 0.3), 0, 7); c.fill()
    }

    c.save()
    c.translate(this.PX + this.PS / 2, this.py + this.PS / 2)
    c.rotate(Math.max(-0.42, Math.min(0.55, this.pvy * 0.09)))
    c.fillStyle = this.phase === "over" ? "#ff8fae" : "#ffe6a8"
    this._rrect(-this.PS / 2, -this.PS / 2, this.PS, this.PS, 8); c.fill()
    c.restore()

    c.textAlign = "center"
    c.fillStyle = "#f3e9ff"; c.font = "bold 44px sans-serif"
    c.fillText(this.score, W / 2, 74)
    if (this.combo > 1) {
      c.fillStyle = "#c9b2ff"; c.font = "bold 20px sans-serif"
      c.fillText(this.combo + " COMBO", W / 2, 104)
    }

    if (this.phase === "countdown") {
      const n = Math.max(1, 3 - Math.floor(this.countTimer / 36))
      c.fillStyle = "rgba(10,4,30,.45)"; c.fillRect(0, 0, W, H)
      c.fillStyle = "#fff"; c.font = "bold 90px sans-serif"; c.fillText(n, W / 2, H / 2 + 30)
    }
  }

  // ── 入力（押し続け＝上昇。Flappyのタップ跳ねではない） ──
  _setupInput() {
    this.canvasTarget.addEventListener("pointerdown", this._press)
    window.addEventListener("pointerup", this._release)
    window.addEventListener("pointercancel", this._release)
  }
  _teardownInput() {
    this.canvasTarget.removeEventListener("pointerdown", this._press)
    window.removeEventListener("pointerup", this._release)
    window.removeEventListener("pointercancel", this._release)
  }
  _press(e) { e.preventDefault(); if (this.phase === "play") this.holding = true }
  _release() { this.holding = false }

  // ── 結果送信（tap_game と同型） ──
  _submit(score) {
    this.resultScoreTarget.textContent = score
    this.resultMessageTarget.textContent =
      score >= 15 ? "すいすい飛べたね！🌟" : score >= 5 ? "いい飛びっぷり♪" : "また飛ぼう〜"
    this.gameScreenTarget.hidden = true
    this.resultScreenTarget.hidden = false

    fetch(this.element.dataset.flightGameResultUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content,
      },
      body: JSON.stringify({ score }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) { this.resultCoinsTarget.textContent = "" ; return }
        this.resultCoinsTarget.textContent = `🪙 +${data.coins} コイン`
        const hs = parseInt(this.resultHighScoreTarget.dataset.prev || 0)
        if (score > hs) {
          this.resultHighScoreTarget.textContent = `🏆 BEST更新！ ${score}`
          this.resultHighScoreTarget.classList.add("game-result-hs--new")
        } else {
          this.resultHighScoreTarget.textContent = `BEST ${hs}`
        }
        this._showRank(data)
      })
  }

  // ── ② ランキング表示（結果直後の"現在地＋前後"）／未参加ならCTA ──
  _showRank(data) {
    if (data.participating && data.rank_context) {
      this._renderRankBlock(data.rank_context)
    } else {
      this.rankBlockTarget.hidden = true
      this.rankFormTarget.hidden = true
      this.rankCtaTarget.hidden = false
    }
  }

  _renderRankBlock(ctx) {
    const row = (r) => r
      ? `<div class="ff-rank-row"><span class="ff-rank-pos">${r.rank}</span><span class="ff-rank-name">${this._esc(r.name)}</span><span class="ff-rank-score">${r.score}</span></div>`
      : ""
    const me = `<div class="ff-rank-row ff-rank-row--me"><span class="ff-rank-pos">${ctx.rank}</span><span class="ff-rank-name">${this._esc(ctx.name)}</span><span class="ff-rank-score">${ctx.score}</span></div>`
    const next = ctx.points_to_next != null
      ? `<p class="ff-rank-next">あと ${ctx.points_to_next} 点で ${ctx.rank - 1} 位！</p>`
      : `<p class="ff-rank-next">今 ${ctx.rank} 位！トップだ🎉</p>`
    this.rankBlockTarget.innerHTML =
      `<p class="ff-rank-title">FLIGHT RANKING（${ctx.total}人）</p>` +
      row(ctx.above) + me + row(ctx.below) + next
    this.rankBlockTarget.hidden = false
    this.rankCtaTarget.hidden = true
    this.rankFormTarget.hidden = true
  }

  openRankName() {
    this.rankCtaTarget.hidden = true
    this.rankFormTarget.hidden = false
    this.rankErrTarget.textContent = ""
    this.rankInputTarget.focus()
  }

  submitRankName() {
    const name = this.rankInputTarget.value.trim()
    if (!name) { this.rankErrTarget.textContent = "名前を入力してね"; return }
    fetch(this.element.dataset.flightGameRankNameUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content,
      },
      body: JSON.stringify({ name }),
    })
      .then(r => r.json())
      .then(data => {
        if (!data.ok) { this.rankErrTarget.textContent = data.error || "設定できなかった"; return }
        if (data.rank_context) this._renderRankBlock(data.rank_context)
      })
  }

  _esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))
  }
}
