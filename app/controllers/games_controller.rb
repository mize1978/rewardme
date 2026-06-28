class GamesController < ApplicationController
  before_action :require_login

  # ===================== タップゲーム =====================

  def tap_game
    @already_played = current_user.tap_game_played_today?
    @high_score     = current_user.tap_game_high_score
  end

  def tap_game_result
    if current_user.tap_game_played_today?
      render json: { error: "already_played" }, status: :unprocessable_entity
      return
    end

    score = params[:score].to_i.clamp(0, 999)
    coins = coins_for(score)

    current_user.update!(
      coins:                   current_user.coins + coins,
      tap_game_last_played_at: Time.current,
      tap_game_high_score:     [current_user.tap_game_high_score, score].max
    )

    render json: { coins: coins, total_coins: current_user.coins }
  end

  # ===================== ガチャ =====================

  GACHA_POOL = [
    # N レアリティ（コインボーナス）
    { id: "coin_30",      type: "coin",  amount: 30,  rarity: "N",   emoji: "🪙", label: "コイン×30",            weight: 20 },
    { id: "coin_50",      type: "coin",  amount: 50,  rarity: "N",   emoji: "🪙", label: "コイン×50",            weight: 15 },
    { id: "coin_100",     type: "coin",  amount: 100, rarity: "N",   emoji: "🪙", label: "コイン×100",           weight: 10 },
    # R レアリティ（部屋背景）
    { id: "sweets",       type: "bg",    bg_id: "sweets",       rarity: "R",   emoji: "🍰", label: "スイーツルーム",    weight: 9 },
    { id: "sakura",       type: "bg",    bg_id: "sakura",       rarity: "R",   emoji: "🌸", label: "桜ルーム",          weight: 8 },
    { id: "sunny",        type: "bg",    bg_id: "sunny",        rarity: "R",   emoji: "🌻", label: "ひまわりルーム",    weight: 7 },
    { id: "tearoom",      type: "bg",    bg_id: "tearoom",      rarity: "R",   emoji: "🍵", label: "ティールーム",      weight: 7 },
    # SR レアリティ（部屋背景）
    { id: "ribbon",       type: "bg",    bg_id: "ribbon",       rarity: "SR",  emoji: "🎀", label: "リボンルーム",      weight: 5 },
    { id: "star",         type: "bg",    bg_id: "star",         rarity: "SR",  emoji: "⭐", label: "星空ルーム",        weight: 4 },
    { id: "winter",       type: "bg",    bg_id: "winter",       rarity: "SR",  emoji: "❄️", label: "冬ルーム",          weight: 4 },
    { id: "halloween",    type: "bg",    bg_id: "halloween",    rarity: "SR",  emoji: "🎃", label: "ハロウィンルーム",  weight: 3 },
    { id: "christmas",    type: "bg",    bg_id: "christmas",    rarity: "SR",  emoji: "🎄", label: "クリスマスルーム",  weight: 3 },
    # SSR レアリティ（レア背景・称号）
    { id: "princess",     type: "bg",    bg_id: "princess",     rarity: "SSR", emoji: "👑", label: "プリンセスルーム",  weight: 2 },
    { id: "night_simple", type: "bg",    bg_id: "night_simple", rarity: "SSR", emoji: "🌙", label: "月夜ルーム",        weight: 1 },
    { id: "title_ribbon", type: "title", gacha_title: "リボンの申し子", rarity: "SSR", emoji: "🎀", label: "称号: リボンの申し子", weight: 1 },
    { id: "title_star",   type: "title", gacha_title: "星詠みの民",     rarity: "SSR", emoji: "✨", label: "称号: 星詠みの民",     weight: 1 },
  ].freeze

  GACHA_COST = { 1 => 50, 10 => 450 }.freeze

  def gacha
    @coins      = current_user.coins
    @gacha_title = current_user.gacha_title
  end

  def gacha_pull
    count = params[:count].to_i
    cost  = GACHA_COST[count]

    unless cost
      render json: { error: "invalid_count" }, status: :unprocessable_entity
      return
    end

    if current_user.coins < cost
      render json: { error: "coins_insufficient" }, status: :unprocessable_entity
      return
    end

    results    = Array.new(count) { weighted_pull }
    coin_delta = -cost

    results.each do |item|
      case item[:type]
      when "coin"
        coin_delta += item[:amount]
      when "bg"
        current_user.update_column(:current_room_bg, item[:bg_id])
      when "title"
        current_user.update_column(:gacha_title, item[:gacha_title])
      end
    end

    current_user.update_column(:coins, current_user.coins + coin_delta)

    render json: {
      results:     results.map { |i| i.except(:weight) },
      total_coins: current_user.reload.coins
    }
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
    if current_user.puzzle_played_out?
      render json: { error: "played_out" }, status: :unprocessable_entity
      return
    end

    coins = params[:coins].to_i.clamp(50, 200)
    prev_clears = current_user.puzzle_clears_count
    current_user.record_puzzle_play!
    current_user.update!(
      coins:               current_user.coins + coins,
      puzzle_clears_count: current_user.puzzle_clears_count + 1
    )

    newly_unlocked = current_user.newly_unlocked_puzzles(prev_clears)

    render json: {
      coins:          PUZZLE_COINS,
      total_coins:    current_user.coins,
      plays_left:     current_user.puzzle_plays_remaining,
      clears:         current_user.puzzle_clears_count,
      newly_unlocked: newly_unlocked.map { |p| p.except(:file) }
    }
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

  private

  def coins_for(score)
    return 100 if score >= 100
    return 50  if score >= 50
    20
  end

  def weighted_pull
    total      = GACHA_POOL.sum { |i| i[:weight] }
    rand_point = rand(total)
    cumulative = 0
    GACHA_POOL.each do |item|
      cumulative += item[:weight]
      return item if rand_point < cumulative
    end
    GACHA_POOL.last
  end
end
