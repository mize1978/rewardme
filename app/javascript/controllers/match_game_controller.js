import { Controller } from "@hotwired/stimulus"

const GRID_SIZE  = 6
// 6種。8種だった頃は「初期盤面から動かせる手が無い」が実測 2.83%（6×6・2万回試行）
// あり、透明ぷに化したときの色の見分けも苦しかった。6種にすると 0.24% まで落ちる。
// 色数は絵の都合ではなく、ゲームの成立条件そのものだった。
const TILE_COUNT = 6
const TIME_LIMIT = 60

// ── ③ アニメーションの時間はここに集約する ──
//  以前は 120 / 350 / 200 / 400 が各所に直書きされていた。
//  MIT先生(Ghamza-Jd/Match-3)は animationtimetotal と swapTime の
//  2定数＋4状態の状態機械で全部を管理している。その構造を借りる。
//  ただし RewardMe は60秒スコアアタックなので、数値は先生の
//  0.3s / 0.2s をそのまま写さず、現行の手触りを保つ値から始める。
const T = {
  swap:    130,   // 交換が入れ替わって見えるまで
  revert:  380,   // 揃わなかったとき、戻し切るまで
  clear:   340,   // 消える演出
  fall:    210,   // 落ちて詰まるまで
  settle:  260,   // 手詰まりで混ぜ直したあとの間
}

// ── ③ ゲームの状態。入力を受け付けてよいのは idle のときだけ ──
//  「交換中にクリックされた」「連鎖中に触られた」「アニメが重なった」
//  という自作ゲーム特有の事故を、状態で一元的に止める。
const S = {
  idle:      "idle",       // 入力待ち
  swapping:  "swapping",   // 交換アニメ中
  resolving: "resolving",  // 消去・落下・連鎖の処理中
}

// ドラッグで隣へ動かしたと判定する距離（px）
const DRAG_THRESHOLD = 14

const TILE_COLORS = [
  "linear-gradient(135deg, #ff7eb8, #e8408a)", // ribbon  - vivid pink
  "linear-gradient(135deg, #ffd050, #ffaa18)", // crown   - vivid gold
  "linear-gradient(135deg, #80c4ff, #4888e8)", // wand    - vivid blue
  "linear-gradient(135deg, #c888ff, #9850e8)", // rainbow - vivid purple
  "linear-gradient(135deg, #ff90c0, #e84e88)", // tiara   - deep pink
  "linear-gradient(135deg, #e870f8, #c030d8)", // heart   - vivid magenta
  "linear-gradient(135deg, #88c8ff, #5090e8)", // wings   - vivid sky
  "linear-gradient(135deg, #ffa0c0, #e86888)", // slipper - deep rose
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
    "highScoreDisplay", "comboDisplay", "startHint", "ribbonMsg", "veilLabel"
  ]

  connect() {
    this.score      = 0
    this.combo      = 0
    this.timeLeft   = TIME_LIMIT
    this.active     = false
    this.processing = false
    this.selected   = null
    this.phase      = S.idle
    this.grid       = []
    this.tileImages = JSON.parse(this.element.dataset.matchGameTileUrls)
    this._initBoard()
    this._renderBoard()

    // 【一時的・調査用】チラつきの原因を切り分けるためのスイッチ。
    //   /games/match?fx=nostar          … 星の常時生成を止める
    //   /games/match?fx=nozoom          … body の zoom:0.9 を外す
    //   /games/match?fx=noshadow        … 盤面外周の多重box-shadowを消す
    //   /games/match?fx=noorn           … 四隅の✦アニメを止める
    //   複数指定可: ?fx=nostar,nozoom
    // 原因が確定したら、このブロックごと削除する。
    const fx = new URLSearchParams(location.search).get("fx") || ""
    document.documentElement.dataset.mgFx = fx
    if (!fx.includes("nostar")) this._startBoardStars()
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
    // 開始した瞬間から詰んでいる盤面を配らない
    if (!this._hasValidMove()) this._reshuffle()
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
    // ── ② 入力 ──
    //  Pointer Events で統一する。マウス・タッチ・ペンが同じ経路を通るので、
    //  スマホのスワイプにもそのまま繋がる（touch専用の分岐を作らない）。
    //
    //  操作は2通りを両立させる。完成品のマッチ3はどちらも使えるのが普通で、
    //  「1個クリック → 隣をクリック」しかできないのはプロトタイプに見える。
    //    ・ドラッグ／スワイプ … 掴んで隣へ動かすと、その時点で交換が成立する
    //    ・2回クリック       … 選んでから隣を押す（従来どおり）
    //  ドラッグで成立したときは、そのあと余計なクリックを要求しない。
    this._drag = null

    this._onDown = (e) => {
      if (this.phase !== S.idle) return
      const tile = e.target.closest(".mg-tile")
      if (!tile) return
      e.preventDefault()
      const r = parseInt(tile.dataset.row), c = parseInt(tile.dataset.col)
      this._drag = { r, c, x: e.clientX, y: e.clientY, moved: false, id: e.pointerId }
      // 掴んだ時点で選択状態にする（2クリック操作の1手目も兼ねる）
      this._handleClick(r, c)
      // 捕捉に失敗しても操作は続けられるべきなので握り潰す
      try { this.boardTarget.setPointerCapture(e.pointerId) } catch {}
    }

    this._onMove = (e) => {
      const d = this._drag
      if (!d || d.moved || this.phase !== S.idle) return
      const dx = e.clientX - d.x, dy = e.clientY - d.y
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return
      // 動かした向きから、隣の1マスを決める（斜めは水平/垂直の大きい方に倒す）
      const dr = Math.abs(dx) > Math.abs(dy) ? 0 : (dy > 0 ? 1 : -1)
      const dc = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : -1) : 0
      const r2 = d.r + dr, c2 = d.c + dc
      d.moved = true
      if (r2 < 0 || c2 < 0 || r2 >= GRID_SIZE || c2 >= GRID_SIZE) return
      this.selected = null
      this._trySwap(d.r, d.c, r2, c2)
    }

    this._onUp = (e) => {
      const d = this._drag
      this._drag = null
      if (!d) return
      // 捕捉していないIDで呼ぶと NotFoundError を投げる（連続ドラッグで踏む）
      try { this.boardTarget.releasePointerCapture(e.pointerId) } catch {}
      // 動かさずに離した＝タップ。選択は _onDown で入れてあるので何もしない
    }

    this.boardTarget.addEventListener("pointerdown", this._onDown)
    this.boardTarget.addEventListener("pointermove", this._onMove)
    this.boardTarget.addEventListener("pointerup", this._onUp)
    this.boardTarget.addEventListener("pointercancel", this._onUp)
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
  //
  //  以前はここで毎回 innerHTML="" → 36タイル＋36枚の<img>を作り直していた。
  //  タイルを1枚「選ぶ」だけでも、盤面の中身は1ミリも変わらないのに
  //  36枚の画像を破棄して再生成していた（実測: 選択1回で36枚、
  //  3つ消える1手で108枚）。JS自体は1〜2msだが、その後に
  //  角丸・グラデ・box-shadow・画像を持つ盤面レイヤー全体が
  //  ラスタライズし直されるため、操作のたびに盤面がちらついていた。
  //
  //  そこでタイルのDOMは最初に1度だけ作り、以後は
  //  「変わったところだけ」書き換える差分更新にする。
  //  ゲームロジック（grid / _findMatches / _applyGravity / _cascade）は無変更。

  // 36個のタイルとimgを1度だけ生成する。以後この要素を使い回す。
  _buildBoardOnce() {
    const el = this.boardTarget
    el.innerHTML = ""
    this.tileEls = []
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const tile = document.createElement("div")
        tile.className   = "mg-tile"
        tile.dataset.row = r
        tile.dataset.col = c

        const img = document.createElement("img")
        img.alt       = ""
        img.className = "mg-tile-img"
        img.draggable = false
        tile.appendChild(img)

        el.appendChild(tile)
        this.tileEls.push({ tile, img, sym: undefined })
      }
    }
  }

  _renderBoard(newPositions = new Set()) {
    if (!this.tileEls || this.tileEls.length !== GRID_SIZE * GRID_SIZE) this._buildBoardOnce()

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const idx  = r * GRID_SIZE + c
        const slot = this.tileEls[idx]
        const tile = slot.tile
        const sym  = this.grid[r][c]

        // 中身（絵柄）は、本当に変わったときだけ触る。
        // img.src の再代入はそれだけで再デコード・再描画を招くので避ける。
        if (slot.sym !== sym) {
          if (sym === null) {
            tile.classList.remove("mg-tile--full")
            delete tile.dataset.tileType
            slot.img.removeAttribute("src")
          } else {
            tile.classList.add("mg-tile--full")
            // 種類ごとの背景色は付けない。
            // ピンクの四角だからリボン、青い四角だから杖…という色分けは、
            // アイコン自体で十分区別できるうえ、四角のほうが先に目に入ってしまう。
            tile.dataset.tileType = sym
            // 駒は data-tile-type から CSS が描く（パステル版）。
            // img要素は構造として残すが src は与えない＝読み込みも発生しない。
          }
          slot.sym = sym
        }

        // 状態クラスだけを付け外しする（要素は使い回す）
        const isSel = !!this.selected && this.selected.r === r && this.selected.c === c
        tile.classList.toggle("mg-tile--selected", isSel)

        // 消える演出の名残りは、絵柄が入れ替わるこの瞬間に落とす
        tile.classList.remove("mg-tile--match", "mg-tile--shake")

        tile.classList.remove("mg-tile--new")
      }
    }

    // 落ちてきた／補充されたタイルに落下アニメを付け直す。
    // クラスを外した直後に付け直すだけではアニメが再生されないので
    // 一度だけレイアウトを確定させる。タイルごとに offsetWidth を読むと
    // その回数ぶんレイアウトが強制されるため、盤面まとめて1回にする。
    if (newPositions.size > 0) {
      void this.boardTarget.offsetWidth
      newPositions.forEach(key => {
        const [r, c] = key.split(",").map(Number)
        this.tileEls[r * GRID_SIZE + c]?.tile.classList.add("mg-tile--new")
      })
    }
  }

  _getTileEl(r, c) {
    return this.boardTarget.children[r * GRID_SIZE + c]
  }

  // ─── クリック処理 ────────────────────────────────────────
  _handleClick(r, c) {
    // ③ 入力を受け付けるのは idle のときだけ。
    //    以前は this.processing という真偽値ひとつで、
    //    「交換中」「連鎖中」「混ぜ直し中」の区別が無かった。
    if (!this.active || this.phase !== S.idle) return
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

  //  idle → swapping → (揃えば) resolving → idle
  //                    → (揃わなければ) 戻して idle
  async _trySwap(r1, c1, r2, c2) {
    this.phase      = S.swapping
    this.processing = true          // 既存コードとの互換のため残す
    this.selected   = null
    ;[this.grid[r1][c1], this.grid[r2][c2]] = [this.grid[r2][c2], this.grid[r1][c1]]
    this._renderBoard()
    await this._delay(T.swap)

    const matches = this._findMatches()
    if (matches.length === 0) {
      // 揃わなかった: 交換を見せてから戻す（先生も同じ。動かした結果を必ず見せる）
      ;[this.grid[r1][c1], this.grid[r2][c2]] = [this.grid[r2][c2], this.grid[r1][c1]]
      this._renderBoard()
      this._getTileEl(r1, c1)?.classList.add("mg-tile--shake")
      this._getTileEl(r2, c2)?.classList.add("mg-tile--shake")
      this.combo = 0
      if (this.hasComboDisplayTarget) this.comboDisplayTarget.textContent = "×0"
      await this._delay(T.revert)
    } else {
      this.phase = S.resolving
      await this._cascade()
    }

    this.processing = false
    this.phase      = S.idle
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

  // ─── 手詰まり対策 ────────────────────────────────────────
  //
  //  以前は「動かせる手があるか」を一度も見ていなかった。
  //  6×6・8種で初期盤面の 2.83%、補充後の 1.68% が手詰まりで、
  //  そうなるとプレイヤーはタイマーが減るのを見ているしかなかった。
  //  6種化で発生率は下がるが 0 にはならないので、検出して混ぜ直す。

  // 隣接1回の交換で3つ揃う手が、盤面のどこかに存在するか
  _hasValidMove() {
    const N = GRID_SIZE
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const r2 = r + dr, c2 = c + dc
          if (r2 >= N || c2 >= N) continue
          const tmp = this.grid[r][c]
          this.grid[r][c] = this.grid[r2][c2]
          this.grid[r2][c2] = tmp
          const ok = this._findMatches().length > 0
          const tmp2 = this.grid[r][c]
          this.grid[r][c] = this.grid[r2][c2]
          this.grid[r2][c2] = tmp2
          if (ok) return true
        }
      }
    }
    return false
  }

  // 盤面を混ぜ直す。
  // 駒の構成（どの種類が何個あるか）は変えない＝プレイヤーの不利益にならない。
  // 「揃った状態で始まらない」かつ「動かせる手がある」まで引き直す。
  _reshuffle() {
    const N = GRID_SIZE
    const flat = []
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) flat.push(this.grid[r][c])

    for (let attempt = 0; attempt < 80; attempt++) {
      for (let i = flat.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const t = flat[i]; flat[i] = flat[j]; flat[j] = t
      }
      let k = 0
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) this.grid[r][c] = flat[k++]
      if (this._findMatches().length === 0 && this._hasValidMove()) return true
    }
    // 並べ替えでは作れない構成だった場合だけ、盤面ごと引き直す
    for (let attempt = 0; attempt < 200; attempt++) {
      this._initBoard()
      if (this._hasValidMove()) return true
    }
    return false
  }

  // 手が無ければ混ぜ直して描画し直す。混ぜたことは黙らずに伝える。
  async _ensurePlayable() {
    if (this._hasValidMove()) return
    this._setRibbonMsg("そろえられる形がなくなったから、混ぜたよ！")
    this._reshuffle()
    this._renderBoard()
    await this._delay(T.settle)
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
      await this._delay(T.clear)
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
      await this._delay(T.fall)
    }
    this.combo = 0
    if (this.hasComboDisplayTarget) this.comboDisplayTarget.textContent = "×0"
    // 連鎖が落ち着いた時点で、次の一手があるか必ず確認する
    if (this.active) await this._ensurePlayable()
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
    // 盤面にヴェールを戻す。リボンマッチは1日1回なので、
    // 終わったあとは「もう1回」ではなく「また明日」。
    // ボタンを消した以上、終わったことは盤面で伝えないと探させてしまう。
    this._closeVeil()
    clearInterval(this.timerInterval)
    if (this._onDown) {
      this.boardTarget.removeEventListener("pointerdown", this._onDown)
      this.boardTarget.removeEventListener("pointermove", this._onMove)
      this.boardTarget.removeEventListener("pointerup", this._onUp)
      this.boardTarget.removeEventListener("pointercancel", this._onUp)
    }
    this.phase = S.idle
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

  // 終了後のヴェール。タップしても始まらない状態にして戻す。
  _closeVeil() {
    if (!this.hasBoardOverlayTarget) return
    const ov = this.boardOverlayTarget
    ov.removeAttribute("data-action")          // Stimulus の紐付けを外す
    ov.classList.add("mg-board-overlay--done")
    ov.classList.remove("mg-overlay-hidden")
    if (this.hasVeilLabelTarget) this.veilLabelTarget.textContent = "また明日あそべるよ"
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
