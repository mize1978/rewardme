class GamesController < ApplicationController
  before_action :require_login

  # ===================== ゲームロビー =====================

  def index
  end

  # ===================== タップゲーム =====================

  def tap_game
    @already_played = current_user.tap_game_played_today?
    @high_score     = current_user.tap_game_high_score
  end

  def tap_game_result
    result = current_user.with_lock do
      next { error: "already_played", status: :unprocessable_entity } if current_user.tap_game_played_today?

      score = params[:score].to_i.clamp(0, 999)
      coins = coins_for(score)
      current_user.update!(
        coins:                   current_user.coins + coins,
        tap_game_last_played_at: Time.current,
        tap_game_high_score:     [current_user.tap_game_high_score, score].max
      )
      { coins: coins, total_coins: current_user.coins }
    end

    render_game_result(result)
  end

  # ===================== ガチャ =====================
  # 排出プール・重み付き抽選・コイン精算は GachaService に分離。
  # コントローラは入力の受け取りとレスポンス整形だけを担う。

  def gacha
    @coins      = current_user.coins
    @gacha_title = current_user.gacha_title
  end

  def gacha_pull
    result = GachaService.new(current_user).pull(params[:count].to_i)
    render json: result
  rescue ArgumentError
    render json: { error: "invalid_count" }, status: :unprocessable_entity
  rescue GachaService::InsufficientCoins
    render json: { error: "coins_insufficient" }, status: :unprocessable_entity
  end

  # ===================== リボンパズル =====================

  PUZZLE_COINS = 100

  def puzzle
    @plays_remaining  = current_user.puzzle_plays_remaining
    @played_out       = current_user.puzzle_played_out?
    @puzzle_images    = User::PUZZLE_IMAGES
    @clears_count     = current_user.puzzle_clears_count
    @selected_id      = current_user.selected_puzzle_id
    @selected_file    = current_user.selected_puzzle_image_file
  end

  def puzzle_result
    result = current_user.with_lock do
      next { error: "played_out", status: :unprocessable_entity } if current_user.puzzle_played_out?

      prev_clears = current_user.puzzle_clears_count
      current_user.record_puzzle_play!
      # 付与額はサーバ側で決定する。クライアント送信の coins は信頼しない。
      current_user.update!(
        coins:               current_user.coins + PUZZLE_COINS,
        puzzle_clears_count: current_user.puzzle_clears_count + 1
      )
      {
        coins:          PUZZLE_COINS,
        total_coins:    current_user.coins,
        plays_left:     current_user.puzzle_plays_remaining,
        clears:         current_user.puzzle_clears_count,
        newly_unlocked: current_user.newly_unlocked_puzzles(prev_clears).map { |p| p.except(:file) }
      }
    end

    render_game_result(result)
  end

  def puzzle_select
    puzzle_id = params[:puzzle_id].to_i
    if current_user.owned_puzzle_ids.include?(puzzle_id)
      current_user.update!(selected_puzzle_id: puzzle_id)
      puzzle = User::PUZZLE_IMAGES.find { |p| p[:id] == puzzle_id }
      render json: { ok: true, file: puzzle[:file], image_url: helpers.asset_path(puzzle[:file]) }
    else
      render json: { error: "not_owned" }, status: :unprocessable_entity
    end
  end

  # ===================== リボンマッチ =====================

  def match_game
    @already_played  = current_user.match_game_played_today?
    @high_score      = current_user.match_game_high_score
  end

  def potion_game
    @already_played = current_user.potion_game_played_today?
    @high_stage     = current_user.potion_game_high_stage.to_i
  end

  def potion_game_result
    result = current_user.with_lock do
      stage    = params[:stage].to_i.clamp(1, 10)
      high     = [current_user.potion_game_high_stage.to_i, stage].max
      already  = current_user.potion_game_played_today?
      coins    = already ? 0 : potion_coins_for(stage)

      if already
        current_user.update!(potion_game_high_stage: high)
      else
        current_user.update!(
          coins:                      current_user.coins + coins,
          potion_game_last_played_at: Time.current,
          potion_game_high_stage:     high
        )
      end
      { coins: coins, total_coins: current_user.coins, stage: stage, already_played: already }
    end

    render_game_result(result)
  end

  def match_game_result
    result = current_user.with_lock do
      next { error: "already_played", status: :unprocessable_entity } if current_user.match_game_played_today?

      score = params[:score].to_i.clamp(0, 9999)
      coins = match_coins_for(score)
      current_user.update!(
        coins:                     current_user.coins + coins,
        match_game_last_played_at: Time.current,
        match_game_high_score:     [current_user.match_game_high_score, score].max
      )
      { coins: coins, total_coins: current_user.coins }
    end

    render_game_result(result)
  end

  private

  # with_lock ブロックが返した結果を描画する。
  # :error を含むときだけエラーレスポンス、それ以外は結果をそのまま JSON で返す。
  def render_game_result(result)
    if result[:error]
      render json: { error: result[:error] }, status: result[:status]
    else
      render json: result
    end
  end

  def potion_coins_for(stage)
    return 200 if stage >= 6
    return 150 if stage >= 5
    return 100 if stage >= 3
    50
  end

  def match_coins_for(score)
    return 100 if score >= 60
    return 60  if score >= 30
    return 30  if score >= 10
    10
  end

  def coins_for(score)
    return 100 if score >= 100
    return 50  if score >= 50
    20
  end
end
