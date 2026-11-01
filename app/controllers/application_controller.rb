class ApplicationController < ActionController::Base
  before_action :require_login
  before_action :require_egg_color

  # 古い画面（「戻る」で出した画面・別タブに残った画面）からの送信は、
  # フォームのCSRFトークンがセッションと合わずに弾かれる。CSRFの確認は外さず、
  # Rails 標準の英語の 422 画面の代わりに、状況に合った画面へ戻す。
  rescue_from ActionController::InvalidAuthenticityToken, with: :handle_stale_form

  helper_method :current_user

  def current_user
    @current_user ||= User.find_by(id: session[:user_id])
  end

  private

  def require_login
    return if session[:user_id]
    redirect_to login_path, alert: "ログインしてください"
  end

  def handle_stale_form
    # すでにログアウト済みの人が古い画面でログアウトを押した → 目的は達成済み
    if controller_name == "sessions" && action_name == "destroy" && session[:user_id].blank?
      redirect_to login_path, notice: "ログアウトしました"
      return
    end

    # それ以外（ログイン中のログアウトを含む）は実行しない。
    # トークンが通らない送信で状態を変えると、偽のリクエストでも操作できてしまうため。
    redirect_back_or_to (session[:user_id] ? dashboard_path : login_path),
                        alert: "画面が古くなっていました。もう一度操作してください"
  end

  def require_egg_color
    return unless current_user
    return if current_user.egg_color.present?
    return if controller_name == "egg_colors"
    return if controller_name == "sessions"
    redirect_to choose_egg_path
  end
end