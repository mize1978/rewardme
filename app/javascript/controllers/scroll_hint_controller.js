import { Controller } from "@hotwired/stimulus"

// 枠の中でスクロールする一覧に「まだ下に続きがある」ことを見せる。
// 下に隠れた中身がある間だけ要素に .has-more を付ける。
// タスクの追加・完了（turbo_stream）で中身が増減しても付け直す。
export default class extends Controller {
  static targets = ["hint"]

  connect() {
    this.update = this.update.bind(this)
    this.element.addEventListener("scroll", this.update, { passive: true })
    this.resizeObserver = new ResizeObserver(this.update)
    this.resizeObserver.observe(this.element)
    this.mutationObserver = new MutationObserver(this.update)
    this.mutationObserver.observe(this.element, { childList: true, subtree: true })
    this.update()
  }

  disconnect() {
    this.element.removeEventListener("scroll", this.update)
    this.resizeObserver?.disconnect()
    this.mutationObserver?.disconnect()
  }

  update() {
    const el = this.element
    const scrollable = getComputedStyle(el).overflowY !== "visible"
    const hiddenBelow = el.scrollHeight - el.clientHeight - el.scrollTop
    el.classList.toggle("has-more", scrollable && hiddenBelow > 8)
  }
}
