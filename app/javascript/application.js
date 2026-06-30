// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo-rails"
import "controllers"

document.addEventListener("turbo:load", () => {
  console.log(
    "%c 🎀 RewardMe %c built by mize ",
    "background:#d946a8;color:#fff;font-size:13px;font-weight:bold;padding:5px 10px;border-radius:6px 0 0 6px;",
    "background:#1a1a2e;color:#f0abdc;font-size:13px;font-weight:bold;padding:5px 10px;border-radius:0 6px 6px 0;"
  );
  console.log(
    "%c ✦ github.com/mize1978/rewardme",
    "color:#d946a8;font-size:11px;padding-left:2px;"
  );
});