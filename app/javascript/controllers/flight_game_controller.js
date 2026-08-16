import { Controller } from "@hotwired/stimulus"

// リボンフライト：完成プロト(prototype/ribbon_flight.html)を唯一の挙動正本にStimulusへ移植。
// 物理/棒ゲート/難易度/SE/当たり判定/テンポは再設計禁止＝プロトの値をそのまま写す（移植であって改善ではない）。
// スタート/リザルト/ランキングの画面遷移は Rails の ff-wrap（工程1）に接続する。
export default class extends Controller {
  static targets = [
    "startScreen", "gameScreen", "resultScreen", "canvas",
    "resultScore", "resultCoins", "resultMessage", "resultHighScore",
    "rankBlock", "rankCta", "rankForm", "rankInput", "rankErr"
  ]

  connect() {
    const cv = this.canvasTarget
    this.ctx = cv.getContext("2d")
    this.W = cv.width; this.H = cv.height

    // ===== プロト確定の手触り（移植・変更禁止） =====
    this.GRAV = 0.34; this.LIFT = -0.85; this.MAXV = 8.8
    this.PX = 118; this.PS = 34; this.GATEW = 26; this.GAP = 320; this.SPACING = 360
    this.WORLD = 2.0
    this.BENNY_H = 40; this.nSX = 0; this.nSY = 0; this.nSW = 1374; this.nSH = 1145  // 初期🔳(=当たりPS34)に寄せた表示高さ。当たり判定は不変

    // 前進感の星（起動時に位置固定・奥行き別スクロール＝プロトA2）
    this.STARS = []
    for (let i = 0; i < 44; i++) this.STARS.push({
      x: Math.random() * this.W, y: Math.random() * this.H,
      r: 0.5 + Math.random() * 1.2, a: 0.10 + Math.random() * 0.32, depth: 0.28 + Math.random() * 0.5
    })

    // 画像（背景＝夜空／キャラ＝キューブベニー）。asset は data 属性から。
    this.bg = new Image(); this.bgReady = false
    const bgUrl = this.element.dataset.flightGameBgUrl
    if (bgUrl) { this.bg.onload = () => { this.bgReady = true }; this.bg.src = bgUrl }
    this.benny = new Image(); this.bennyReady = false
    const bennyUrl = this.element.dataset.flightGameBennyUrl
    if (bennyUrl) { this.benny.onload = () => { this.bennyReady = true }; this.benny.src = bennyUrl }
    this.oc = document.createElement("canvas"); this.octx = this.oc.getContext("2d")

    // SE（Web Audio・音源ファイル無し・プロトと同じ）
    this.AC = null; this.master = null

    this._press = this._press.bind(this)
    this._release = this._release.bind(this)
    this.phase = "idle"
    this._lastT = 0; this.dts = 1
  }

  disconnect() { this._teardownInput(); if (this.raf) cancelAnimationFrame(this.raf) }

  // ===== 画面遷移（Rails ff-wrap・工程1の器） =====
  start() {
    this.startScreenTarget.hidden = true
    this.resultScreenTarget.hidden = true
    this.gameScreenTarget.hidden = false
    this.resultHighScoreTarget.classList.remove("game-result-hs--new")
    this._audioInit(); this._audioResume()
    this._setupInput()
    this._reset()
    this.phase = "play"       // プロトは即play（カウントダウン無し）＝移植
    this._lastT = 0
    this._loop()
  }

  retry() { this.start() }

  // ===== ゲーム本体（プロト移植・変更禁止） =====
  curSpeed() { return (1.5 + Math.min(this.score * 0.05, 1.1)) * this.WORLD }

  _reset() {
    this.py = this.H * 0.42; this.pvy = 0; this.gates = []
    this.score = 0; this.combo = 0; this.holding = false; this.rot = 0; this.bgX = 0
    for (let i = 0; i < 3; i++) this._spawn(this.W + 360 + i * this.SPACING)
    this.gates[0].gy = (this.H - this.GAP) / 2   // 最初の1個は必ず中央
  }

  _spawn(x) {
    const gy = 110 + Math.random() * (this.H - 220 - this.GAP)
    this.gates.push({ x, gy, scored: false, flash: 0, gone: 1 })
  }

  _loop() {
    const now = performance.now()
    if (this._lastT) { const dt = now - this._lastT; if (dt > 0) this.dts = Math.max(0, Math.min(3, dt / 16.667)) }
    this._lastT = now
    this._step()
    this._draw()
    if (this.phase !== "over") this.raf = requestAnimationFrame(() => this._loop())
  }

  _step() {
    if (this.phase !== "play") return
    const dts = this.dts
    this.bgX += this.curSpeed() * dts
    this.pvy += this.GRAV * dts
    if (this.holding) this.pvy += this.LIFT * dts
    this.pvy = Math.max(-this.MAXV, Math.min(this.MAXV, this.pvy))
    this.py += this.pvy * dts
    // 上下端は即死しない＝止めるだけ（激甘）。見た目のはみ出し分を内側クランプ。
    const vm = (this.BENNY_H - this.PS) / 2
    if (this.py < vm) { this.py = vm; this.pvy = 0 }
    if (this.py > this.H - this.PS - vm) { this.py = this.H - this.PS - vm; this.pvy = 0 }
    // 傾きを速度へLERP追従（物理pvyは不変・Hz非依存）
    const tr = Math.max(-0.22, Math.min(0.30, this.pvy * 0.05))
    this.rot += (tr - this.rot) * (1 - Math.pow(0.15, dts))
    for (const g of this.gates) {
      g.x -= this.curSpeed() * dts
      if (!g.scored && g.x + this.GATEW < this.PX) { g.scored = true; g.flash = 1; this.score++; this.combo++; this._sfxRing() }
      if (g.flash > 0) g.flash -= 0.06 * dts
      if (g.scored) g.gone -= 0.14 * dts
      const px2 = this.PX + this.PS
      if (this.PX < g.x + this.GATEW && px2 > g.x) {
        if (this.py < g.gy || this.py + this.PS > g.gy + this.GAP) { this._gameOver(); return }
      }
    }
    while (this.gates.length && (this.gates[0].x < -this.GATEW || this.gates[0].gone <= 0)) this.gates.shift()
    const last = this.gates[this.gates.length - 1]
    if (last && last.x < this.W - this.SPACING) this._spawn(last.x + this.SPACING)
  }

  _gameOver() {
    if (this.phase === "over") return
    this.phase = "over"
    this._teardownInput()
    this._sfxCrash()
    this._submit(this.score)
  }

  // ===== 描画（プロト移植） =====
  _rrect(x, y, w, h, r) {
    const c = this.ctx; r = Math.min(r, w / 2, h / 2)
    c.beginPath(); c.moveTo(x + r, y)
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r)
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath()
  }

  // キューブベニー：環境光(source-atop)＋大気ヘイズをキャラ画素にだけ乗せる（プロトの馴染ませ）
  _drawBenny(dx, dy) {
    const c = this.ctx
    if (!this.bennyReady) {
      c.fillStyle = this.phase === "over" ? "#ff8fae" : "#ffe6a8"
      this._rrect(dx - this.PS / 2, dy - this.PS / 2, this.PS, this.PS, 8); c.fill(); return
    }
    const h = this.BENNY_H, w = h * (this.nSW / this.nSH)
    const ow = Math.max(1, Math.ceil(w)), oh = Math.max(1, Math.ceil(h))
    const o = this.octx; this.oc.width = ow; this.oc.height = oh; o.clearRect(0, 0, ow, oh)
    o.drawImage(this.benny, this.nSX, this.nSY, this.nSW, this.nSH, 0, 0, ow, oh)
    o.globalCompositeOperation = "source-atop"
    const ng = o.createLinearGradient(0, 0, 0, oh)
    ng.addColorStop(0, "rgba(150,170,235,0.10)"); ng.addColorStop(1, "rgba(90,80,170,0.18)")
    o.fillStyle = ng; o.fillRect(0, 0, ow, oh)
    o.fillStyle = "rgba(120,120,195,0.09)"; o.fillRect(0, 0, ow, oh)
    o.globalCompositeOperation = "source-over"
    c.drawImage(this.oc, dx - w / 2, dy - h / 2, w, h)
  }

  _draw() {
    const c = this.ctx, W = this.W, H = this.H
    c.clearRect(0, 0, W, H)
    if (this.bgReady) {
      const s = Math.max(W / this.bg.width, H / this.bg.height)
      const dw = this.bg.width * s, dh = this.bg.height * s
      c.drawImage(this.bg, (W - dw) / 2, (H - dh) / 2, dw, dh)
    } else {
      const grad = c.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, "#1c1042"); grad.addColorStop(1, "#0e0722")
      c.fillStyle = grad; c.fillRect(0, 0, W, H)
    }
    // 星の前進感（modで折り返し＝継ぎ目ゼロ）
    for (const s of this.STARS) {
      const sx = ((s.x - this.bgX * s.depth) % W + W) % W
      c.fillStyle = `rgba(226,232,255,${s.a})`
      c.beginPath(); c.arc(sx, s.y, s.r, 0, 7); c.fill()
    }
    // 棒ゲート（紫の角丸バー＋穴縁の淡い光）
    for (const g of this.gates) {
      const fl = g.flash || 0
      c.globalAlpha = Math.max(0, Math.min(1, g.gone))
      c.fillStyle = g.scored ? "rgba(150,120,220,.55)" : "#7460b0"
      this._rrect(g.x, 0, this.GATEW, g.gy, 10); c.fill()
      this._rrect(g.x, g.gy + this.GAP, this.GATEW, H - (g.gy + this.GAP), 10); c.fill()
      c.strokeStyle = `rgba(210,190,255,${0.6 + fl * 0.4})`; c.lineWidth = 3
      c.beginPath(); c.arc(g.x + this.GATEW / 2, g.gy, 15, 0, 7); c.stroke()
      c.beginPath(); c.arc(g.x + this.GATEW / 2, g.gy + this.GAP, 15, 0, 7); c.stroke()
      c.globalAlpha = 1
    }
    // ベニー（傾きLERP適用）
    c.save()
    c.translate(this.PX + this.PS / 2, this.py + this.PS / 2)
    c.rotate(this.rot)
    this._drawBenny(0, 0)
    c.restore()
    // HUD
    c.textAlign = "center"
    c.fillStyle = "#f3e9ff"; c.font = "bold 44px sans-serif"
    c.fillText(this.score, W / 2, 74)
    if (this.combo > 1) {
      c.fillStyle = "#c9b2ff"; c.font = "bold 20px sans-serif"
      c.fillText(this.combo + " COMBO", W / 2, 104)
    }
  }

  // ===== 入力（押し続け＝上昇。Flappyのタップ跳ねではない） =====
  _setupInput() {
    this.canvasTarget.style.touchAction = "none"
    this.canvasTarget.addEventListener("pointerdown", this._press)
    window.addEventListener("pointerup", this._release)
    window.addEventListener("pointercancel", this._release)
  }
  _teardownInput() {
    this.canvasTarget.removeEventListener("pointerdown", this._press)
    window.removeEventListener("pointerup", this._release)
    window.removeEventListener("pointercancel", this._release)
  }
  _press(e) { e.preventDefault(); if (this.phase === "play") { this.holding = true; this._sfxLift() } }
  _release() { this.holding = false }

  // ===== SE（Web Audio・プロトの音色そのまま） =====
  _audioInit() {
    if (this.AC) return
    try {
      this.AC = new (window.AudioContext || window.webkitAudioContext)()
      this.master = this.AC.createGain(); this.master.gain.value = 0.13; this.master.connect(this.AC.destination)
    } catch (e) { this.AC = null }
  }
  _audioResume() { if (this.AC && this.AC.state === "suspended") this.AC.resume() }
  _sfxLift() {
    if (!this.AC) return
    const t = this.AC.currentTime, o = this.AC.createOscillator(), g = this.AC.createGain()
    o.type = "triangle"; o.frequency.setValueAtTime(600, t); o.frequency.exponentialRampToValueAtTime(1200, t + 0.08)
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.55, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.22)
  }
  _sfxRing() {
    if (!this.AC) return
    const t = this.AC.currentTime
    ;[1250, 1700].forEach((f, i) => {
      const o = this.AC.createOscillator(), g = this.AC.createGain(), t0 = t + i * 0.045
      o.type = "sine"; o.frequency.value = f
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.45, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13)
      o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0 + 0.15)
    })
  }
  _sfxCrash() {
    if (!this.AC) return
    const t = this.AC.currentTime, o = this.AC.createOscillator(), g = this.AC.createGain()
    o.type = "sine"; o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.16)
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.22)
  }

  // ===== 結果送信＋ランキング（工程1の器・そのまま） =====
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
        if (data.error) { this.resultCoinsTarget.textContent = ""; return }
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
