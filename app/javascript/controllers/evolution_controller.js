import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { stage: Number, firstTime: Boolean }

  connect() {
    if (!this.firstTimeValue) {
      setTimeout(() => this.element.classList.add("evo--phase-1"), 80)
      setTimeout(() => this.close(), 3200)
      return
    }
    this._runAnimation()
  }

  _runAnimation() {
    const stage = this.stageValue
    const add = (cls, ms) => setTimeout(() => this.element.classList.add(cls), ms)

    if (typeof window.launchConfetti === "function") window.launchConfetti()

    // Phase 1: overlay fades in, bg appears
    add("evo--phase-1", 80)

    if (stage === 2) {
      add("evo--phase-2", 600)   // egg floats, particles fly
      add("evo--phase-3", 1400)  // (reserved / extra sparkles)
      add("evo--phase-4", 2000)  // flash, egg gone, baby appears
      add("evo--phase-5", 2800)  // labels + OK button
    } else if (stage === 3) {
      add("evo--phase-2", 600)   // rays appear
      add("evo--phase-3", 1400)  // mystery label shows
      add("evo--phase-4", 2400)  // flash + reveal
      add("evo--phase-5", 3200)  // EVOLUTION text + name + message
      add("evo--phase-6", 3800)  // OK button (extra delay for drama)
    } else if (stage === 4) {
      add("evo--phase-2", 800)   // rays + particles
      add("evo--phase-3", 1800)  // particles wave 2
      add("evo--phase-4", 3000)  // flash + princess appears
      add("evo--phase-5", 4000)  // Congratulations + name + message
      add("evo--phase-6", 4800)  // OK button
    }
  }

  close() {
    this.element.classList.add("evo--closing")
    setTimeout(() => this.element.remove(), 500)
  }
}
