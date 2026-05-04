class ApplicationController < ActionController::Base
  before_action :require_login

  helper_method :current_user

def current_user
  @current_user ||= User.find_by(id: session[:user_id])
end

  private

  def require_login
    return if session[:user_id]

    redirect_to login_path, alert: "ログインしてください"
  end
end