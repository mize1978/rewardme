import { Controller } from "@hotwired/stimulus"

// Manual galleries: no timers, no motion required to read the page.
export default class extends Controller {
  static targets = ["colorButton", "evolution", "roomStages", "screenButton", "screen", "dialog", "dialogImage", "dialogLabel"]

  connect() {
    this.dialogTarget.setAttribute("aria-labelledby", "rm-dialog-label")
    this.onDialogClose = () => {
      document.documentElement.classList.remove("rm-no-scroll")
      this.imageTrigger?.focus()
    }
    this.onBeforeCache = () => this.closeImage()
    this.dialogTarget.addEventListener("close", this.onDialogClose)
    document.addEventListener("turbo:before-cache", this.onBeforeCache)
  }

  disconnect() {
    this.dialogTarget.removeEventListener("close", this.onDialogClose)
    document.removeEventListener("turbo:before-cache", this.onBeforeCache)
    if (this.dialogTarget.open) this.dialogTarget.close()
    document.documentElement.classList.remove("rm-no-scroll")
  }

  chooseColor(event) {
    const color = event.currentTarget.dataset.color
    this.colorButtonTargets.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.color === color)))
    this.evolutionTargets.forEach(panel => { panel.hidden = panel.dataset.color !== color })
    this.roomStagesTargets.forEach(list => { list.hidden = list.dataset.color !== color })
  }

  chooseScreen(event) {
    const screen = event.currentTarget.dataset.screen
    this.screenButtonTargets.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.screen === screen)))
    this.screenTargets.forEach(panel => { panel.hidden = panel.dataset.screen !== screen })
  }

  openImage(event) {
    const image = event.currentTarget.querySelector("img")
    this.imageTrigger = event.currentTarget
    this.dialogImageTarget.src = image.currentSrc || image.src
    this.dialogImageTarget.alt = image.alt
    this.dialogLabelTarget.textContent = image.alt
    this.dialogTarget.showModal()
    document.documentElement.classList.add("rm-no-scroll")
  }

  closeImage() {
    document.documentElement.classList.remove("rm-no-scroll")
    if (this.dialogTarget.open) this.dialogTarget.close()
  }

  closeOnBackdrop(event) {
    if (event.target !== this.dialogTarget) return
    const bounds = this.dialogTarget.getBoundingClientRect()
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) this.closeImage()
  }
}
