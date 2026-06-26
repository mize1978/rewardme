import { Controller } from "@hotwired/stimulus"

const ROOM_BGM = {
  login:         "bgm_login.mp3",
  default:       "bgm_pink.mp3",
  pink:          "bgm_pink.mp3",
  pink_royal:    "bgm_pink.mp3",
  sweets:        "bgm_pink.mp3",
  tearoom:       "bgm_pink.mp3",
  sakura:        "bgm_pink.mp3",
  christmas:     "bgm_pink.mp3",
  princess:      "bgm_pink.mp3",
  ribbon:        "bgm_purple.mp3",
  halloween:     "bgm_purple.mp3",
  purple:        "bgm_purple.mp3",
  purple_royal:  "bgm_purple.mp3",
  blue:          "bgm_blue.mp3",
  blue_royal:    "bgm_blue.mp3",
  night_simple:  "bgm_blue.mp3",
  star:          "bgm_blue.mp3",
  winter:        "bgm_blue.mp3",
  sunny:         "bgm_blue.mp3",
}

export default class extends Controller {
  static targets = ["btn", "popover", "slider", "muteBtn", "wrap"]

  connect() {
    this._muted  = localStorage.getItem("bgm_muted") === "true"
    this._volume = parseFloat(localStorage.getItem("bgm_volume") ?? "0.30")

    let audio = document.getElementById("bgm-audio")
    if (!audio) {
      audio = document.createElement("audio")
      audio.id   = "bgm-audio"
      audio.loop = true
      document.documentElement.appendChild(audio)
    }
    this._audio        = audio
    this._audio.volume = this._volume

    const room  = this.element.dataset.bgmRoom || "default"
    const track = ROOM_BGM[room] || "bgm_pink.mp3"
    const src   = `/sounds/${track}`
    const full  = location.origin + src

    if (this._audio.src !== full) {
      const wasPlaying = !this._audio.paused
      this._audio.src  = src
      if (!this._muted && wasPlaying) this._play()
    }

    if (this._audio.paused && !this._muted) {
      const startOnce = () => { this._play() }
      document.addEventListener("click",   startOnce, { once: true })
      document.addEventListener("keydown", startOnce, { once: true })
    }

    if (this.hasSliderTarget) {
      this.sliderTarget.value = Math.round(this._volume * 100)
    }
    this._updateBtn()
    this._updateMuteBtn()
  }

  openPopover(e) {
    e.stopPropagation()
    if (!this.hasPopoverTarget) return
    const popover = this.popoverTarget
    const btn     = this.btnTarget
    if (popover.classList.contains("bgm-popover--open")) {
      popover.classList.remove("bgm-popover--open")
      return
    }
    const rect = btn.getBoundingClientRect()
    popover.style.right = (window.innerWidth - rect.right) + "px"
    popover.classList.add("bgm-popover--open")

    const close = (ev) => {
      if (!popover.contains(ev.target) && !btn.contains(ev.target)) {
        popover.classList.remove("bgm-popover--open")
        document.removeEventListener("pointerdown", close, true)
      }
    }
    document.addEventListener("pointerdown", close, true)
  }

  setVolume(e) {
    const vol = parseInt(e.target.value) / 100
    this._volume = vol
    this._audio.volume = vol
    localStorage.setItem("bgm_volume", vol)
    if (vol === 0) {
      this._muted = true
      localStorage.setItem("bgm_muted", true)
      this._audio.pause()
    } else if (this._muted) {
      this._muted = false
      localStorage.setItem("bgm_muted", false)
      this._play()
    }
    this._updateBtn()
    this._updateMuteBtn()
  }

  toggle() {
    this._muted = !this._muted
    localStorage.setItem("bgm_muted", this._muted)
    this._muted ? this._audio.pause() : this._play()
    this._updateBtn()
    this._updateMuteBtn()
  }

  _play() { this._audio.play().catch(() => {}) }

  _updateBtn() {
    if (!this.hasBtnTarget) return
    this.btnTarget.textContent = this._muted ? "🔇" : "🎵"
    this.btnTarget.title       = "BGM設定"
  }

  _updateMuteBtn() {
    if (!this.hasMuteBtnTarget) return
    this.muteBtnTarget.textContent = this._muted ? "🔈 ミュート解除" : "🔇 ミュート"
  }
}
