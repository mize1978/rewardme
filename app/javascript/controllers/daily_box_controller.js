import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "wrap", "egg", "result", "prizeCard", "prizeIco", "prizeLabel", "prizeRarity",
    "timer", "done", "todayPrizePanel", "todayPrizeEmpty"
  ]

  connect() {
    if (this.hasTimerTarget) this.startTimer()
  }

  disconnect() {
    clearInterval(this._timerInterval)
  }

  startTimer() {
    this.updateTimer()
    this._timerInterval = setInterval(() => this.updateTimer(), 1000)
  }

  updateTimer() {
    const now      = new Date()
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const diff     = midnight - now
    const h = String(Math.floor(diff / 3_600_000)).padStart(2, "0")
    const m = String(Math.floor((diff % 3_600_000) / 60_000)).padStart(2, "0")
    const s = String(Math.floor((diff % 60_000) / 1_000)).padStart(2, "0")
    this.timerTarget.textContent = `${h}:${m}:${s} でリセット`
  }

  async open() {
    if (this._opening) return
    this._opening = true
    this.wrapTarget.style.pointerEvents = "none"

    const egg = this.eggTarget

    // Phase 1: 振動
    egg.classList.add("egg-shake")
    await this.wait(700)

    // Phase 2: 光り
    egg.classList.replace("egg-shake", "egg-glow")
    await this.wait(500)

    // AJAX
    const promise = this.fetchPrize()

    // Phase 3: 爆発 + パーティクル
    egg.classList.replace("egg-glow", "egg-burst")
    this.spawnParticles()
    await this.wait(350)

    const prize = await promise
    if (!prize) { this._opening = false; return }

    // Phase 4: 卵非表示 → 景品リビール
    this.wrapTarget.hidden = true
    this.showPrize(prize)
    this.updateTodayPrize(prize)
  }

  async fetchPrize() {
    try {
      const res = await fetch("/daily_box", {
        method: "POST",
        headers: {
          "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content,
          "Accept": "application/json"
        }
      })
      if (!res.ok) return null
      return (await res.json()).prize
    } catch {
      return null
    }
  }

  showPrize(prize) {
    const coinUrl = document.body.dataset.coinUrl
    const icons   = { coins: `<img src="${coinUrl}" class="coin-img coin-img--lg" alt="コイン">`, exp: "⭐" }
    const rarityNames = { normal: "NORMAL", good: "GOOD", rare: "RARE", epic: "EPIC", super: "LEGEND" }

    this.prizeIcoTarget.innerHTML      = icons[prize.type] || "🎁"
    this.prizeLabelTarget.textContent  = prize.label
    this.prizeRarityTarget.textContent = rarityNames[prize.rarity] || prize.rarity
    this.prizeRarityTarget.dataset.rarity = prize.rarity

    this.resultTarget.hidden = false
    this.resultTarget.classList.add("prize-reveal")

    if (prize.rarity === "super") {
      document.body.classList.add("flash-super")
      setTimeout(() => document.body.classList.remove("flash-super"), 1200)
    }
  }

  updateTodayPrize(prize) {
    if (!this.hasTodayPrizePanelTarget) return
    const coinUrl = document.body.dataset.coinUrl
    const icons = { coins: `<img src="${coinUrl}" class="coin-img coin-img--md" alt="コイン">`, exp: "⭐" }

    if (this.hasTodayPrizeEmptyTarget) this.todayPrizeEmptyTarget.remove()

    const content = document.createElement("div")
    content.className = "today-prize-content"
    const rarityNames = { normal: "NORMAL", good: "GOOD", rare: "RARE", epic: "EPIC", super: "LEGEND" }
    content.innerHTML = `
      <span class="today-prize-new">NEW</span>
      <span class="today-prize-ico">${icons[prize.type] || "🎁"}</span>
      <div class="today-prize-info">
        <span class="today-prize-label">${prize.label}</span>
        <span class="today-prize-rarity" data-rarity="${prize.rarity}">${rarityNames[prize.rarity] || prize.rarity}</span>
        <span class="today-prize-got">今日GET！</span>
      </div>
    `
    this.todayPrizePanelTarget.appendChild(content)
  }

  spawnParticles() {
    const wrap   = this.wrapTarget
    const colors = ["#ff8fac", "#ffd060", "#c96fff", "#6edda0", "#fff", "#ffb3d9"]
    for (let i = 0; i < 16; i++) {
      const p     = document.createElement("span")
      const angle = Math.random() * Math.PI * 2
      const dist  = 50 + Math.random() * 60
      p.className = "box-particle"
      p.style.cssText = `
        --dx: ${Math.cos(angle) * dist}px;
        --dy: ${Math.sin(angle) * dist - 40}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        width: ${4 + Math.random() * 6}px;
        height: ${4 + Math.random() * 6}px;
        left: 50%; top: 40%;
      `
      wrap.appendChild(p)
      setTimeout(() => p.remove(), 900)
    }
  }

  wait(ms) { return new Promise(r => setTimeout(r, ms)) }
}
