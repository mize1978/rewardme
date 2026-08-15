import { Controller } from "@hotwired/stimulus"

const CAPACITY = 4

// ══════════════════════════════
//  魔法の雫（エッセンス）の色
//  c1=芯の明るさ / c2=中間 / c3=底の深い色 / glow=外周の発光(RGB)
//  ベタ塗りのボールではなく「半透明の宝石」として見せるため、
//  1色につき3段の明度を持たせる。
// ══════════════════════════════
const COLOR_META = {
  pink:   { c1: "#ffd6f2", c2: "#ff69c8", c3: "#dc2691", glow: "255,110,200" },
  blue:   { c1: "#cceeff", c2: "#56b6f5", c3: "#1b74cc", glow: "90,190,255"  },
  purple: { c1: "#ead2ff", c2: "#a760ee", c3: "#6823b4", glow: "180,110,255" },
  yellow: { c1: "#fff4c4", c2: "#ffcc4d", c3: "#dc8c00", glow: "255,205,90"  },
  green:  { c1: "#ccffe9", c2: "#4fdca0", c3: "#0f9c66", glow: "90,230,175"  },
  rose:   { c1: "#ffcfcf", c2: "#ff5c5c", c3: "#bc0a20", glow: "255,100,100" },
  orange: { c1: "#ffe4c2", c2: "#ff9a3d", c3: "#d45c00", glow: "255,150,70"  },
}

// ── 雫のジオメトリ（CSS の .pg-drop / .pg-vial-body と一致させること）──
const DROP        = 45   // 雫の直径
const PITCH       = 38   // 段の間隔（少し重なって「詰まって」見える）
const BASE        = 10   // 底から1段目までの余白
const PITCH_TIGHT = 34.5 // 錬成できた状態（4つ揃い）で「きゅっと」詰まったときの間隔
const FLY_MS      = 420  // 1粒が飛ぶ時間
const FLY_STAGGER = 105  // 次の粒が飛び出すまでの間隔
const TILT_MS     = 220  // 瓶が傾き切るまで（CSS transition と一致させること）
const ARC_STEPS   = 24   // 弧を何点でサンプリングするか（多いほど滑らか）

const MAGIC_MSGS = [
  { min: 100, msg: "魔法の雫がすべて揃った！" },
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
    "magicCircle", "magicPct", "magicMsg",
    "clearStageMsg", "clearCoins", "nextBtn", "clearPotion",
  ]

  connect() {
    this.resultUrl     = this.element.dataset.potionGameResultUrl
    this.alreadyPlayed = this.element.dataset.potionGameAlreadyPlayed === "true"
    // 到達済みの最高Stage（1始まり・未プレイは0）。次の未攻略Stageから再開するために使う。
    this.bestStage     = parseInt(this.element.dataset.potionGameBestStage || "0", 10)
    this.currentStage  = 0
    this.vials         = []
    this.selected      = null
    this.moves         = 0
    this.history       = []
    this.coinAwarded   = false
    this.initialFilled = 0
    this.animating     = false
    this.lastCompletedColor = null
  }

  // 次の未攻略Stageから始める（BEST 4 なら Stage 5）。
  // 全クリア済みなら最終Stageをもう一度。
  start() {
    const next = Math.min(this.bestStage, STAGES.length - 1)  // 0-indexed
    this._begin(next)
  }

  // 最初(Stage 1)から遊ぶ
  startFromBeginning() {
    this._begin(0)
  }

  _begin(idx) {
    this.currentStage = idx
    this.coinAwarded  = false
    this._loadStage(idx)
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
    this.lastCompletedColor = null
    this.stageBadgeTarget.textContent = `Stage ${idx + 1}`
    this.moveCountTarget.textContent  = "0"
    // 魔法陣をリセット
    this.magicCircleTarget.dataset.level = "0"
    this.magicPctTarget.textContent      = ""
    this.magicMsgTarget.textContent      = ""
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
    if (this.animating) return
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
      // 状態を変える前に「注ぐ」を見せる。演出が終わってから確定＆再描画する。
      const from = this.selected
      this.selected = null
      this._animatePour(from, idx).then(() => {
        this.history.push(this.vials.map(v => [...v]))
        this._pour(from, idx)
        this.moves++
        this.moveCountTarget.textContent = this.moves
        this._render()
        if (this._isWon()) setTimeout(() => this._showClear(), 400)
      })
    } else {
      this._shakeTarget(idx)
      this._render()
    }
  }

  // ══════════════════════════════
  //  移動演出（演出層）— 魔法の雫が飛ぶ
  //  ゲームロジックには一切触れない。this.vials は変更しない。
  //  送り出す側が少し傾いて差し出す → 最上段の雫が弧を描いて飛ぶ
  //  → 受け側に着地 → 4つ揃っていれば「錬成」へ
  // ══════════════════════════════
  async _animatePour(fromIdx, toIdx) {
    this.animating = true
    const wait = ms => new Promise(r => setTimeout(r, ms))

    const fromEl = this.element.querySelector(`[data-vial-idx="${fromIdx}"]`)
    const toEl   = this.element.querySelector(`[data-vial-idx="${toIdx}"]`)
    if (!fromEl || !toEl) { this.animating = false; return }

    // 何ユニット動かすか（_pour と同じ計算。状態は変えない）
    const from  = this.vials[fromIdx]
    const to    = this.vials[toIdx]
    const color = from[from.length - 1]
    let run = 0
    for (let i = from.length - 1; i >= 0 && from[i] === color; i--) run++
    const units = Math.min(run, CAPACITY - to.length)
    if (units <= 0) { this.animating = false; return }

    const toBody   = toEl.querySelector(".pg-vial-body")
    const srcDrops = [...fromEl.querySelectorAll(".pg-drop")]   // [0] が底
    const toRight  = toEl.getBoundingClientRect().left >= fromEl.getBoundingClientRect().left

    // ① 送り出す側が「差し出す」（瓶は傾くが、雫は丸いので向きの問題が起きない）
    fromEl.style.transition      = "transform .22s cubic-bezier(.34,.9,.4,1)"
    fromEl.style.transformOrigin = "50% 94%"
    fromEl.style.transform       = `translateY(-9px) rotate(${toRight ? 9 : -9}deg)`
    fromEl.style.zIndex          = "30"
    // 傾き切ってから離す。途中で離すと、回転していた雫が急に別の動きを始めて
    // 速度が繋がらず「カクッ」と見える。
    await wait(TILT_MS + 20)

    // ② 上の雫から順に飛ばす（少しずつ間隔をあける）
    const flights = []
    for (let j = 0; j < units; j++) {
      const src = srcDrops[srcDrops.length - 1 - j]
      if (!src) continue
      flights.push(this._flyDrop(src, toBody, to.length + j, color))
      if (j < units - 1) await wait(FLY_STAGGER)
    }

    // ③ 最後の1粒が頂点を越えたあたりで瓶が戻り始める。
    //    「全部着地してから戻る」より、落下と戻りが重なるほうが動きが途切れない。
    await wait(FLY_MS * 0.38)
    fromEl.style.transform = ""

    await Promise.all(flights)
    await this._settle(toBody)      // 着地のバネを最後まで見せる
    fromEl.style.transition = ""
    fromEl.style.transformOrigin = ""
    fromEl.style.zIndex = ""

    // ④ 4つ揃ったら「錬成できた状態」を見せる。
    //    ここで液体にはしない。盤面はあくまで“素材の魔法雫を4つ揃える”場所で、
    //    完成したポーションはステージクリア画面で初めて登場する。
    if (to.length + units === CAPACITY && to.every(c => c === color)) {
      this.lastCompletedColor = color     // クリア画面の主役はこの色になる
      await this._animateComplete(toEl, color)
    }

    this.animating = false
  }

  // 1粒を弧を描いて飛ばす。着地したら受け側のDOMに雫を1つ足す（状態は変えない）
  _flyDrop(srcEl, toBody, destIdx, color) {
    return new Promise(resolve => {
      const r = srcEl.getBoundingClientRect()
      const b = toBody.getBoundingClientRect()

      // 盤面には body { zoom: .9 }（ダッシュボードの密度合わせ）が効いている。
      // CSSのpxと画面上のpxが一致しないので、実測から倍率を出して換算する。
      const z = toBody.offsetHeight > 0 ? b.height / toBody.offsetHeight : 1

      // 着地点（.pg-drop は本体の内容ボックス内で bottom: BASE + i*PITCH に置かれる）
      const destLeft = b.left   + (b.width - r.width) / 2
      const destTop  = b.bottom - (1.5 + BASE + destIdx * PITCH + DROP) * z

      // クローンは zoom の外（documentElement 直下）に置き、すべて画面座標で扱う。
      // 大きさは実測値をそのまま使うので、盤面の雫と同じサイズで飛ぶ。
      const fly = srcEl.cloneNode(true)
      fly.classList.add("pg-drop--fly")
      fly.classList.remove("pg-drop--top")
      Object.assign(fly.style, {
        left: `${r.left}px`, top: `${r.top}px`, bottom: "auto", marginLeft: "0",
        width: `${r.width}px`, height: `${r.height}px`,
      })
      document.documentElement.appendChild(fly)
      srcEl.style.visibility = "hidden"

      const dx = destLeft - r.left
      const dy = destTop  - r.top

      // 弧の持ち上げ量。遠くへ投げるほど高く上がる（一定だと距離差で不自然になる）
      const lift = (58 + Math.min(Math.abs(dx) * 0.16, 46)) * z

      // 以前は「打ち上げ」「落下」の2キーフレームを別イージングで繋いでいたため、
      // 接続点（＝頂点）で両者の速度が 0 になり、一瞬止まって見えていた。
      // ここでは放物線を等間隔にサンプリングし、間を linear で結ぶ。
      // 速度が式そのものから出るので、頂点に継ぎ目が存在しない。
      const frames = []
      for (let k = 0; k <= ARC_STEPS; k++) {
        const t  = k / ARC_STEPS
        const tx = t * t * (3 - 2 * t)                  // 横: 静かに出て静かに着く
        const x  = dx * tx
        const y  = dy * t - lift * 4 * t * (1 - t)      // 縦: 重力の放物線
        const sc = 1 + 0.12 * Math.sin(Math.PI * t)     // 頂点でいちばん大きい
        frames.push({ offset: t, transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${sc.toFixed(4)})`, easing: "linear" })
      }
      const anim = fly.animate(frames, { duration: FLY_MS })

      // 着地は一度きり。タブが裏に回ると WAAPI が止まって onfinish が来ないので、
      // タイマー側の保険を必ず用意する（来なければ盤面が永久ロックする）
      let landed = false
      const land = () => {
        if (landed) return
        landed = true
        clearTimeout(guard)
        fly.remove()
        const drop = this._makeDrop(color, destIdx)
        drop.classList.add("pg-drop--land")
        toBody.appendChild(drop)
        resolve()
      }
      const guard = setTimeout(land, FLY_MS + 500)
      anim.onfinish = land
      anim.oncancel = land
    })
  }

  // ══════════════════════════════
  //  錬成演出 — 4つの雫が溶け合って1本のポーションになる
  //  少し浮く → 中央へ吸い寄せられる → ふわっと発光 → とろっと溶ける
  // ══════════════════════════════
  async _animateComplete(vialEl, color) {
    const wait  = ms => new Promise(r => setTimeout(r, ms))
    const body  = vialEl.querySelector(".pg-vial-body")
    if (!body) return
    const drops = [...body.querySelectorAll(".pg-drop")]
    if (drops.length === 0) return

    // 着地のバネが終わり切ってから始める（途中で差し替えると段差になる）
    await this._settle(body)

    // ① きゅっと整列
    //    重心に向かって間隔が詰まり、わずかに行き過ぎてから収まる。
    //    この「詰まった間隔」は完成後もそのまま保たれる（_makeDrop の tight）。
    drops.forEach((d, i) => {
      d.classList.remove("pg-drop--land", "pg-drop--top")
      d.style.setProperty("--ay", `${((i - (CAPACITY - 1) / 2) * (PITCH - PITCH_TIGHT)).toFixed(2)}px`)
      d.classList.add("pg-drop--align")
    })
    await wait(300)

    // ② 全体が発光（雫の後ろから、その色で内側が満たされる）
    const glow = document.createElement("div")
    glow.className = "pg-vial-glow"
    glow.style.setProperty("--glow", COLOR_META[color].glow)
    body.appendChild(glow)
    drops.forEach(d => { d.classList.remove("pg-drop--align"); d.classList.add("pg-drop--charged") })
    await wait(230)

    // ③ キラッ（ガラスを光が横切る＋小さな輝き）
    const spark = document.createElement("div")
    spark.className = "pg-vial-spark"
    body.appendChild(spark)
    const twinkle = document.createElement("div")
    twinkle.className = "pg-twinkle"
    vialEl.appendChild(twinkle)
    await wait(250)

    // ④ 完成マーク
    vialEl.classList.add("pg-vial--done")
    const mark = document.createElement("div")
    mark.className   = "pg-vial-done-mark pg-vial-done-mark--pop"
    mark.textContent = "✓"
    vialEl.appendChild(mark)
    await wait(380)

    glow.remove(); spark.remove(); twinkle.remove()
  }

  // 要素とその子孫の「終わりのあるアニメーション」が全部終わるまで待つ。
  // 無限ループ（ゆらめき・浮遊）は除外し、裏タブ対策に上限も設ける。
  _settle(el, capMs = 700) {
    let anims = []
    try {
      anims = (el.getAnimations ? el.getAnimations({ subtree: true }) : []).filter(a => {
        const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null
        return t && t.iterations !== Infinity && t.activeDuration !== Infinity
      })
    } catch { anims = [] }
    if (anims.length === 0) return Promise.resolve()
    return Promise.race([
      Promise.all(anims.map(a => a.finished.catch(() => {}))),
      new Promise(r => setTimeout(r, capMs)),
    ])
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
    // 盤面はここで静かに終わる。派手な打ち上げはしない。
    //
    // かつてここは level = "5" を立てていた。これは tasks.css の
    //   .pg-magic-circle[data-level="5"] { animation: pgMagicExplode ... }
    //   .pg-magic-circle[data-level="5"] .pg-magic-core { background:#fff; ... }
    // を踏んで、魔法陣の中心を純白にし 1.4 倍へ膨らませる演出だった。
    // ★虹色ポリゴンと対で「クリアを豪華に見せる」ための仕掛けだが、
    // 完成ポーションの初登場より先に画面を光らせてしまうので使わない。
    // 魔法陣は最後の完成で自然に上がった level 4 のまま。
    // メッセージも _updateMagicCircle が既に「魔法の雫がすべて揃った！」を
    // 出しているので、ここで書き換えない（切り替わり際の変化を1つ減らす）。
    await new Promise(r => setTimeout(r, 950))

    const stageNum = this.currentStage + 1
    this._buildClearPotion(this.lastCompletedColor || this.vials.find(v => v.length)?.[0] || "pink")

    this.gameScreenTarget.hidden  = true
    this.clearScreenTarget.hidden = false
    this.clearStageMsgTarget.textContent = `Stage ${stageNum} CLEAR`
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
            `<span class="pg-clear-coin">+${data.coins} COIN</span>`
        } else {
          this.clearCoinsTarget.innerHTML =
            `<span class="pg-clear-coin pg-clear-coin--used">今日のコインは獲得済み</span>`
        }
      } catch { this.clearCoinsTarget.textContent = "" }
    } else {
      this.clearCoinsTarget.innerHTML =
        `<span class="pg-clear-coin pg-clear-coin--used">続けて遊んでいます♡</span>`
    }
  }

  // ═══════════════════════════════════════════════
  //  クリア画面の主役 — 完成したポーション瓶
  //  盤面で使っている部品（ガラス胴・リム・反射）をそのまま組み直し、
  //  中身だけ雫ではなく液体にする。器が同じだから、
  //  「さっき集めた雫が、これになった」と読める。
  // ═══════════════════════════════════════════════
  _buildClearPotion(color) {
    if (!this.hasClearPotionTarget) return
    const wrap = this.clearPotionTarget
    wrap.innerHTML = ""

    const vial = document.createElement("div")
    vial.className = "pg-vial pg-vial--hero"

    const body = document.createElement("div")
    body.className = "pg-vial-body"
    body.appendChild(this._makePotion(color))

    const sh1 = document.createElement("div"); sh1.className = "pg-glass-shine"
    const sh2 = document.createElement("div"); sh2.className = "pg-glass-shine2"
    body.appendChild(sh1); body.appendChild(sh2)
    vial.appendChild(body)

    const rim = document.createElement("div")
    rim.className = "pg-vial-rim"
    vial.appendChild(rim)

    // 周囲のごく小さな光。3つを別々の間隔で瞬かせて、規則性を感じさせない。
    for (let i = 1; i <= 3; i++) {
      const sp = document.createElement("div")
      sp.className = `pg-hero-spark pg-hero-spark--${i}`
      vial.appendChild(sp)
    }

    // 瓶の背後のほのかな色光
    const halo = document.createElement("div")
    halo.className = "pg-hero-halo"
    halo.style.setProperty("--glow", COLOR_META[color].glow)
    wrap.appendChild(halo)
    wrap.appendChild(vial)
  }

  // ══════════════════════════════
  //  雫の描画
  //  1粒 = 1ユニット。液体の「帯」と違い、常に数えられるのが利点。
  // ══════════════════════════════
  // tight = 錬成できた状態。整列アニメの着地点と同じ位置に置くので、
  // 演出が終わって _render() が走っても雫が跳ね戻らない。
  _dropBottom(i, tight) {
    if (!tight) return BASE + i * PITCH
    const center = BASE + (CAPACITY - 1) / 2 * PITCH
    return center + (i - (CAPACITY - 1) / 2) * PITCH_TIGHT
  }

  _makeDrop(color, i, tight = false) {
    const m  = COLOR_META[color]
    const el = document.createElement("div")
    el.className     = "pg-drop"
    el.dataset.color = color
    el.style.bottom  = `${this._dropBottom(i, tight).toFixed(2)}px`
    el.style.setProperty("--c1",   m.c1)
    el.style.setProperty("--c2",   m.c2)
    el.style.setProperty("--c3",   m.c3)
    el.style.setProperty("--glow", m.glow)
    return el
  }

  // 完成したポーション（1本ぶんの液体）。
  // ※ 盤面では使わない。ステージクリア画面で初めて登場させるための部品。
  _makePotion(color) {
    const m  = COLOR_META[color]
    const el = document.createElement("div")
    el.className = "pg-potion"
    el.style.setProperty("--c1",   m.c1)
    el.style.setProperty("--c2",   m.c2)
    el.style.setProperty("--c3",   m.c3)
    el.style.setProperty("--glow", m.glow)
    return el
  }

  _createVialEl(vial, idx) {
    const isSelected = this.selected === idx
    const isDone     = vial.length === CAPACITY && vial.every(c => c === vial[0])

    const el = document.createElement("div")
    el.className = ["pg-vial", isSelected ? "pg-vial--selected" : "", isDone ? "pg-vial--done" : ""].join(" ").trim()
    el.dataset.vialIdx = idx
    el.dataset.action  = "click->potion-game#selectVial"

    // ── v3 のガラス試験管はそのまま。中身だけ雫にする ──
    const body = document.createElement("div")
    body.className = "pg-vial-body"

    // 揃っていても雫のまま。表現のルールを途中で変えない。
    // 違いは「間隔がきゅっと詰まっている」ことと、金の縁・✓ だけ。
    vial.forEach((color, i) => {            // vial[0] が底
      const drop = this._makeDrop(color, i, isDone)
      if (!isDone && i === vial.length - 1) drop.classList.add("pg-drop--top")
      body.appendChild(drop)
    })

    // ガラスの反射（雫より手前に出す。z-index はCSS側で指定）
    const sh1 = document.createElement("div"); sh1.className = "pg-glass-shine"
    const sh2 = document.createElement("div"); sh2.className = "pg-glass-shine2"
    body.appendChild(sh1); body.appendChild(sh2)

    el.appendChild(body)

    // 口のリム（ガラスの厚み。首は作らない）
    const rim = document.createElement("div")
    rim.className = "pg-vial-rim"
    el.appendChild(rim)

    if (isDone) {
      const check = document.createElement("div")
      check.className = "pg-vial-done-mark"
      check.textContent = "✓"
      el.appendChild(check)
    }

    return el
  }
}
