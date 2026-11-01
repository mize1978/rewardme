require "rails_helper"

# 2026-11-02 に本番で見つかった回帰の防止。
#
# ログアウトすると reset_session でセッション（＝CSRFトークンの元）が作り直される。
# そのあと「戻る」で出した古い画面や、別タブに残っていた古い画面からボタンを押すと、
# フォームに埋め込まれた古いトークンが通らず、Rails 標準の英語の 422 画面
# 「The change you wanted was rejected.」が出ていた。
#
# CSRF の確認そのものは外さない。古い画面から来たときの受け止め方だけを決める。
#   - すでにログアウト済みの人が古い画面でログアウトを押した → ログイン画面へ（ログアウト済み）
#   - それ以外で古い画面から送信した → 元の画面へ戻し、やり直しを案内する
RSpec.describe "古い画面からの送信（CSRFトークンの期限切れ）", type: :request do
  around do |example|
    original = ActionController::Base.allow_forgery_protection
    ActionController::Base.allow_forgery_protection = true
    example.run
  ensure
    ActionController::Base.allow_forgery_protection = original
  end

  # いま表示した画面の、指定したフォーム（送信先）に埋め込まれているトークンを取り出す。
  # Rails 7 はフォームごとに別のトークンを使う（per_form_csrf_tokens）ので、送信先ごとに取る。
  def form_token_from(path, action:)
    get path
    form = response.body[%r{<form[^>]*action="#{Regexp.escape(action)}"[^>]*>.*?</form>}m]
    raise "#{path} に #{action} へのフォームが見つからない" unless form

    form[/name="authenticity_token" value="([^"]+)"/, 1]
  end

  def guest_login!
    token = form_token_from(login_path, action: guest_login_path)
    post guest_login_path, params: { authenticity_token: token }
    expect(response).to redirect_to(dashboard_path)
  end

  it "ログアウト後に「戻る」で出した古い画面からもう一度ログアウトしても、エラーにならずログイン画面へ戻る" do
    guest_login!
    stale_token = form_token_from(choose_egg_path, action: logout_path) # ログイン中の画面のログアウトボタン

    delete logout_path, params: { authenticity_token: stale_token }
    expect(response).to redirect_to(login_path)

    # 「戻る」で出した古い画面のボタンを押した＝古いトークンでもう一度ログアウト
    delete logout_path, params: { authenticity_token: stale_token }

    expect(response).to redirect_to(login_path)
    follow_redirect!
    expect(response.body).not_to include("The change you wanted was rejected")
  end

  it "ログイン中に古い画面のトークンでログアウトを送られても、勝手にはログアウトさせず元の画面でやり直しを案内する" do
    guest_login!

    delete logout_path,
           params: { authenticity_token: "stale-or-forged-token" },
           headers: { "HTTP_REFERER" => "http://www.example.com#{choose_egg_path}" }

    expect(response).to redirect_to(choose_egg_path)
    expect(flash[:alert]).to include("もう一度")

    # ログイン状態は保たれている（偽のリクエストではログアウトできない）
    get dashboard_path
    expect(response).to redirect_to(choose_egg_path)
  end

  it "ログアウト済みの古いログイン画面からゲストログインを押しても、英語のエラー画面ではなくログイン画面でやり直しを案内する" do
    stale_token = form_token_from(login_path, action: guest_login_path)
    guest_login! # 別タブでログインした扱い（セッションが作り直される）
    delete logout_path, params: { authenticity_token: form_token_from(choose_egg_path, action: logout_path) }

    post guest_login_path,
         params: { authenticity_token: stale_token },
         headers: { "HTTP_REFERER" => "http://www.example.com#{login_path}" }

    expect(response).to redirect_to(login_path)
    expect(flash[:alert]).to include("もう一度")
  end
end
