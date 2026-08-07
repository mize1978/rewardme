class PagesController < ApplicationController
  layout "lp", only: [:lp]

  skip_before_action :require_login, only: [:lp]
  before_action :require_login, except: [:lp]

  def lp
    redirect_to dashboard_path if current_user
  end

  BADGES = [
    { ico: "🌱", name: "はじめの一歩",        desc: "最初のタスクを完了しよう",       threshold: 1   },
    { ico: "🏆", name: "継続は力なり",         desc: "10タスクを完了しよう",           threshold: 10  },
    { ico: "⭐", name: "30タスク達成",         desc: "30タスクを完了しよう",           threshold: 30  },
    { ico: "⏰", name: "時間マスター",         desc: "50タスクを完了しよう",           threshold: 50  },
    { ico: "👑", name: "タスクマスター",       desc: "100タスクを完了しよう",          threshold: 100 },
    { ico: "💯", name: "レジェンド",           desc: "200タスクを完了しよう",          threshold: 200 },
    { ico: "🎂", name: "パーフェクトウィーク", desc: "7日連続でタスクを完了しよう",    threshold: nil },
    { ico: "🐣", name: "たまごハッチ",         desc: "最初の進化を達成しよう",         threshold: nil },
  ].freeze

  def habits
  end

  def achievements
    @badges = BADGES
    @earned_count = @badges.count do |b|
      b[:threshold] && current_user.completed_count >= b[:threshold]
    end
  end

  def settings
  end

  def update_settings
    if current_user.update(nickname: params[:nickname])
      redirect_to settings_path, notice: "✨ ニックネームを変更したよ！"
    else
      render :settings, status: :unprocessable_entity
    end
  end
end
