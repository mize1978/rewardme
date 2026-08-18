require "rails_helper"

# 2026-08-18 に本番で見つかった2件の回帰防止。
#
# どちらも「POST → バリデーション/認証に失敗 → render :new」という
# 失敗経路の中だけで起きていた。当時のテストは GET しか踏んでおらず素通りした。
#
#   1. ja.yml に日付の訳しか無く、default_locale = :ja のため
#      画面に「Translation missing. Options considered were: ...」が出ていた
#   2. レイアウトのヘッダー非表示条件が action_name == 'new' だけを見ており、
#      render :new でも action_name は "create" のままなので、
#      ログイン後用のヘッダーが認証カードに重なって表示されていた
RSpec.describe "認証画面", type: :request do
  # ログイン後ヘッダーの目印。認証画面には出てはいけない。
  let(:logged_in_header) { 'class="header header--desktop"' }

  describe "POST /signup（新規登録）" do
    context "失敗したとき" do
      before do
        post signup_path, params: { user: { nickname: "", email: "", password: "" } }
      end

      it "日本語のバリデーションメッセージを表示する" do
        expect(response).to have_http_status(:unprocessable_entity)
        expect(response.body).to include("ニックネームを入力してください")
        expect(response.body).to include("メールアドレスを入力してください")
        expect(response.body).to include("パスワードを入力してください")
      end

      it "i18n の未翻訳キーを画面に露出しない" do
        expect(response.body).not_to include("Translation missing")
        expect(response.body).not_to include("activerecord.errors")
        expect(response.body).not_to include("ja.errors.messages")
      end

      it "ログイン後ヘッダーを表示しない" do
        expect(response.body).not_to include(logged_in_header)
      end
    end

    it "メール形式が不正なときも日本語で知らせる" do
      post signup_path, params: { user: { nickname: "テスト", email: "badmail", password: "password" } }

      expect(response.body).to include("メールアドレスの形式が正しくありません")
      expect(response.body).not_to include("Translation missing")
      expect(response.body).not_to include(logged_in_header)
    end

    it "メールが重複したときも日本語で知らせる" do
      existing = create(:user)
      post signup_path, params: { user: { nickname: "テスト", email: existing.email, password: "password" } }

      expect(response.body).to include("メールアドレスはすでに使用されています")
      expect(response.body).not_to include("Translation missing")
    end

    context "成功したとき" do
      it "ユーザーを作成してダッシュボードへ送る" do
        expect do
          post signup_path, params: { user: { nickname: "みぜ", email: "new@example.com", password: "password" } }
        end.to change(User, :count).by(1)

        expect(response).to redirect_to(dashboard_path)
      end

      it "遷移先ではログイン後ヘッダーが表示される" do
        post signup_path, params: { user: { nickname: "みぜ", email: "new@example.com", password: "password" } }

        # 登録直後は egg_color 未設定のため require_egg_color が働き、
        # dashboard からさらに choose_egg へ送られる（RewardMe の最初の体験）。
        follow_redirect!
        expect(response).to redirect_to(choose_egg_path)
        follow_redirect!

        expect(response).to have_http_status(:ok)
        expect(response.body).to include(logged_in_header)
      end
    end
  end

  describe "POST /login（ログイン）" do
    let!(:user) { create(:user, email: "member@example.com", password: "password") }

    context "失敗したとき" do
      before do
        post login_path, params: { email: user.email, password: "wrong-password" }
      end

      it "失敗した旨を表示する" do
        expect(response).to have_http_status(:unprocessable_entity)
        expect(response.body).to include("ログイン失敗")
      end

      it "i18n の未翻訳キーを画面に露出しない" do
        expect(response.body).not_to include("Translation missing")
      end

      it "ログイン後ヘッダーを表示しない" do
        expect(response.body).not_to include(logged_in_header)
      end
    end

    it "存在しないメールアドレスでもログイン後ヘッダーを表示しない" do
      post login_path, params: { email: "nosuch@example.invalid", password: "whatever" }

      expect(response.body).to include("ログイン失敗")
      expect(response.body).not_to include(logged_in_header)
    end

    context "成功したとき" do
      it "ダッシュボードへ送る" do
        post login_path, params: { email: user.email, password: "password" }

        expect(response).to redirect_to(dashboard_path)
      end

      it "遷移先ではログイン後ヘッダーが表示される" do
        post login_path, params: { email: user.email, password: "password" }
        follow_redirect!

        expect(response.body).to include(logged_in_header)
      end
    end
  end

  describe "GET（従来どおり出ないこと）" do
    it "ログイン画面・新規登録画面にログイン後ヘッダーは無い" do
      get login_path
      expect(response).to have_http_status(:ok)
      expect(response.body).not_to include(logged_in_header)

      get signup_path
      expect(response).to have_http_status(:ok)
      expect(response.body).not_to include(logged_in_header)
    end
  end
end
