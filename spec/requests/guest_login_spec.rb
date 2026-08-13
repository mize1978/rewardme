require "rails_helper"

# Issue #15 Guest Login:
# 採用担当がアカウント登録なしで RewardMe を試せるようにする。
# ただし RewardMe らしい最初の体験（卵の色選び）は残す＝egg_color は事前セットしない。
RSpec.describe "Guest login", type: :request do
  describe "POST /guest_login" do
    it "登録なしでゲスト User を自動生成して即ログインする" do
      expect { post guest_login_path }.to change(User, :count).by(1)

      guest = User.order(:created_at).last
      expect(guest.is_guest).to be(true)
      expect(guest.email).to be_present
    end

    it "ログイン後は卵未選択なので egg color 選択へ進む（＝ログイン済み・卵選び体験を残す）" do
      post guest_login_path

      # ゲストは egg_color 未設定 → 既存の require_egg_color ゲートで choose_egg へ。
      # login_path には飛ばされない＝セッションは確立している。
      get dashboard_path
      expect(response).to redirect_to(choose_egg_path)
    end
  end

  it "LP とログイン画面がゲストボタン追加後も表示できる（erb描画の回帰防止）" do
    get root_path
    expect(response).to have_http_status(:ok)

    get login_path
    expect(response).to have_http_status(:ok)
    # ログイン画面のゲスト導線（ログイン → または → ゲストで試す → 新規登録）
    expect(response.body).to include("ゲストで試す")
    expect(response.body).to include("または")

    # 新規登録画面にも同じ逃げ道（登録する → または → ゲストで試す → ログイン）
    get signup_path
    expect(response).to have_http_status(:ok)
    expect(response.body).to include("ゲストで試す")
    expect(response.body).to include("または")
  end
end
