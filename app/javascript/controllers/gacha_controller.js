import { Controller } from "@hotwired/stimulus"

const RARITY_ORDER = { SSR: 4, SR: 3, R: 2, N: 1 }

export default class extends Controller {
  static targets = [
    "mainScreen", "overlay", "capsule",
    "cardsArea", "resultScreen",
    "coinDisplay", "pullBtn", "summary"
  ]

  pull(e) {
    const count = parseInt(e.params.count)
    this._setButtons(true)
    this._showOverlay()

    fetch(this.element.dataset.gachaPullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content,
      },
      body: JSON.stringify({ count }),
    })
    .then(r => r.json())
    .then(data => {
      if (data.error) {
        alert(data.error === "coins_insufficient" ? "コインが足りないよ！" : "エラーが発生したよ")
        this._hideOverlay()
        this._setButtons(false)
        return
      }
      // カプセルアニメが終わったらカード表示
      setTimeout(() => this._revealCards(data.results, data.total_coins), 2000)
    })
    .catch(() => {
      this._hideOverlay()
      this._setButtons(false)
    })
  }

  again() {
    this.resultScreenTarget.hidden = true
    this.cardsAreaTarget.innerHTML = ""
    if (this.hasSummaryTarget) this.summaryTarget.innerHTML = ""
    this._setButtons(false)
    this._checkButtons()
  }

  // ── プライベート ──────────────────────────────

  _showOverlay() {
    this.overlayTarget.hidden = false
    this.capsuleTarget.classList.remove("gacha-capsule--pop")
    void this.capsuleTarget.offsetWidth // reflow to restart animation
    this.capsuleTarget.classList.add("gacha-capsule--spin")

    // スピン終了時にポップ演出
    setTimeout(() => {
      this.capsuleTarget.classList.remove("gacha-capsule--spin")
      this.capsuleTarget.classList.add("gacha-capsule--pop")
    }, 1500)
  }

  _hideOverlay() {
    this.overlayTarget.hidden = true
    this.capsuleTarget.classList.remove("gacha-capsule--spin", "gacha-capsule--pop")
  }

  _revealCards(results, totalCoins) {
    this._hideOverlay()
    this.resultScreenTarget.hidden = false
    this.cardsAreaTarget.innerHTML = ""

    // 最高レアリティを先に確認（演出用）
    const best = results.reduce((a, b) =>
      (RARITY_ORDER[b.rarity] || 0) > (RARITY_ORDER[a.rarity] || 0) ? b : a
    )

    results.forEach((item, i) => {
      setTimeout(() => {
        const card = this._buildCard(item)
        this.cardsAreaTarget.appendChild(card)
        // 少し遅らせてフリップ（マウント後に class 付与）
        requestAnimationFrame(() => {
          requestAnimationFrame(() => card.classList.add("gacha-card--flipped"))
        })
        // SSR はフリップ後に追加輝き
        if (item.rarity === "SSR") {
          setTimeout(() => card.classList.add("gacha-card--shine"), 400)
        }
      }, i * 180)
    })

    // サマリー（コイン更新 + 最高レアの報告）
    const delay = results.length * 180 + 500
    setTimeout(() => {
      this.coinDisplayTarget.textContent = totalCoins
      if (this.hasSummaryTarget) {
        this.summaryTarget.innerHTML = this._buildSummary(best, totalCoins)
      }
      this._setButtons(false)
      this._checkButtons()
    }, delay)
  }

  _buildCard(item) {
    const card = document.createElement("div")
    card.className = `gacha-card gacha-card--${item.rarity.toLowerCase()}`

    card.innerHTML = `
      <div class="gacha-card-inner">
        <div class="gacha-card-back">🎀</div>
        <div class="gacha-card-front">
          <span class="gacha-card-rarity">${item.rarity}</span>
          <span class="gacha-card-emoji">${item.emoji}</span>
          <span class="gacha-card-label">${item.label}</span>
          ${item.type === "coin" ? `<span class="gacha-card-amount">+${item.amount}</span>` : ""}
        </div>
      </div>
    `
    return card
  }

  _buildSummary(best, totalCoins) {
    const msg = best.rarity === "SSR" ? "✨ SSR 出たーーー！！！おめでとう♡"
              : best.rarity === "SR"  ? "🎉 SR ゲット！すごい！"
              : best.rarity === "R"   ? "👏 R 出たよ！"
              : "また引いてみてね♪"
    return `<p class="gacha-summary-msg">${msg}</p>
            <p class="gacha-summary-coins">残りコイン: 🪙 ${totalCoins}</p>`
  }

  _setButtons(disabled) {
    this.pullBtnTargets.forEach(btn => btn.disabled = disabled)
  }

  _checkButtons() {
    const coins = parseInt(this.coinDisplayTarget.textContent) || 0
    this.pullBtnTargets.forEach(btn => {
      const cost = btn.dataset.gachaCostParam ? parseInt(btn.dataset.gachaCostParam) : 50
      btn.disabled = coins < cost
    })
  }
}
