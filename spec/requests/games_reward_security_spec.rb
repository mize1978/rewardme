require "rails_helper"

# ゲーム結果エンドポイントのサーバ側整合性（Issue #9 / partial of #1）。
# - puzzle: クライアント送信の coins を信頼せず、サーバ定数 PUZZLE_COINS のみ付与する
# - 4結果エンドポイント: 日次判定と報酬付与が原子的で、二重送信で多重付与されない
RSpec.describe "Game reward endpoints (server-side integrity)", type: :request do
  let(:user) { create(:user, coins: 0, egg_color: "pink") }

  before do
    post login_path, params: { email: user.email, password: "password" }
  end

  describe "POST /games/puzzle/result" do
    it "正常系: サーバ定数 PUZZLE_COINS を付与する" do
      expect do
        post puzzle_game_result_path, params: { coins: GamesController::PUZZLE_COINS }
      end.to change { user.reload.coins }.by(GamesController::PUZZLE_COINS)

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["coins"]).to eq(GamesController::PUZZLE_COINS)
    end

    it "改ざん: coins=200 を送っても付与は PUZZLE_COINS のまま（クライアント値を信頼しない）" do
      expect do
        post puzzle_game_result_path, params: { coins: 200 }
      end.to change { user.reload.coins }.by(GamesController::PUZZLE_COINS)
    end

    it "改ざん: 応答の coins と実際の付与額が一致する" do
      before_coins = user.reload.coins
      post puzzle_game_result_path, params: { coins: 200 }
      awarded = user.reload.coins - before_coins
      expect(response.parsed_body["coins"]).to eq(awarded)
    end

    it "日次上限: 3回で打ち止め、4回目は played_out（多重付与しない）" do
      3.times { post puzzle_game_result_path, params: { coins: 200 } }
      expect(user.reload.coins).to eq(GamesController::PUZZLE_COINS * 3)

      post puzzle_game_result_path, params: { coins: 200 }
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to eq("played_out")
      expect(user.reload.coins).to eq(GamesController::PUZZLE_COINS * 3)
    end
  end

  describe "POST /games/tap/result" do
    it "正常系: スコアに応じたサーバ側報酬を付与する" do
      expect do
        post tap_game_result_path, params: { score: 100 }
      end.to change { user.reload.coins }.by(100) # coins_for(100) => 100
    end

    it "二重送信: 同日2回目は already_played で多重付与しない" do
      post tap_game_result_path, params: { score: 100 }
      after_first = user.reload.coins

      post tap_game_result_path, params: { score: 100 }
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to eq("already_played")
      expect(user.reload.coins).to eq(after_first)
    end
  end

  describe "POST /games/match/result" do
    it "正常系: スコアに応じたサーバ側報酬を付与する" do
      expect do
        post match_game_result_path, params: { score: 60 }
      end.to change { user.reload.coins }.by(100) # match_coins_for(60) => 100
    end

    it "二重送信: 同日2回目は already_played で多重付与しない" do
      post match_game_result_path, params: { score: 60 }
      after_first = user.reload.coins

      post match_game_result_path, params: { score: 60 }
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to eq("already_played")
      expect(user.reload.coins).to eq(after_first)
    end
  end

  describe "POST /games/potion/result" do
    it "正常系: ステージに応じたサーバ側報酬を付与する" do
      expect do
        post potion_game_result_path, params: { stage: 6 }
      end.to change { user.reload.coins }.by(200) # potion_coins_for(6) => 200
    end

    it "二重送信: 同日2回目は付与0（already_played）で多重付与しない" do
      post potion_game_result_path, params: { stage: 6 }
      after_first = user.reload.coins

      post potion_game_result_path, params: { stage: 6 }
      expect(response.parsed_body["already_played"]).to be(true)
      expect(response.parsed_body["coins"]).to eq(0)
      expect(user.reload.coins).to eq(after_first)
    end
  end
end
