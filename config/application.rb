require_relative "boot"

require "rails/all"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module App
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 7.0
    config.i18n.default_locale = :ja

    # sassc-rails は明示指定が無いと CSS 圧縮器に SassC を既定で差し込む。
    # libsass は modern CSS の hsl(var(--h) var(--s) calc(...) / .40) 記法を
    # 解釈できず、assets:precompile と ERB 描画の両方が落ちる
    # （SassC::SyntaxError: Function hsl is missing argument $saturation）。
    # 圧縮器を外して CSS を素通しにする。
    config.assets.css_compressor = nil

    # Configuration for the application, engines, and railties goes here.
    #
    # These settings can be overridden in specific environments using the files
    # in config/environments, which are processed later.
    #
    # config.time_zone = "Central Time (US & Canada)"
    # config.eager_load_paths << Rails.root.join("extras")
  end
end
