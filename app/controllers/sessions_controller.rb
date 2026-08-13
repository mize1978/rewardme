class SessionsController < ApplicationController
  skip_before_action :require_login, only: %i[new create guest]

  def new
  end

  # ゲストログイン（Issue #15）: 登録なしでゲストを自動生成して即ログイン。
  # egg_color は未設定なので、この後 require_egg_color により卵選びへ進む。
  def guest
    User.cleanup_guests! # 生成のたびに古い放置ゲストを日和見的に掃除
    guest_user = User.create_guest!
    session[:user_id] = guest_user.id
    redirect_to dashboard_path, notice: "ゲストで始めます。まずは卵の色を選んでね🥚"
  end

def create
  user = User.find_by(email: params[:email])

  if user&.authenticate(params[:password])
    session[:user_id] = user.id
    redirect_to dashboard_path, notice: "ログインしました"
  else
    flash.now[:alert] = "ログイン失敗"
    render :new, status: :unprocessable_entity
  end
end

  def destroy
    reset_session
    redirect_to login_path, notice: "ログアウトしました"
  end
end