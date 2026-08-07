# app/services/gacha_service.rb
#
# ガチャのビジネスロジック（プール定義・重み付き抽選・コイン精算）を
# GamesController から分離した Service。コントローラは薄く保ち、
# ガチャの確率・付与ロジックはここに集約してテスト可能にする。
class GachaService
  class InsufficientCoins < StandardError; end

  # 排出プール（重み付き）
  POOL = [
    # N（コインボーナス）
    { id: "coin_30",      type: "coin",  amount: 30,  rarity: "N",   emoji: "🪙", label: "コイン×30",
      weight: 20 },
    { id: "coin_50",      type: "coin",  amount: 50,  rarity: "N",   emoji: "🪙", label: "コイン×50",
      weight: 15 },
    { id: "coin_100",     type: "coin",  amount: 100, rarity: "N",   emoji: "🪙", label: "コイン×100",
      weight: 10 },
    # R（部屋背景）
    { id: "sweets",       type: "bg",    bg_id: "sweets",       rarity: "R",   emoji: "🍰", label: "スイーツルーム",
      weight: 9 },
    { id: "sakura",       type: "bg",    bg_id: "sakura",       rarity: "R",   emoji: "🌸", label: "桜ルーム",
      weight: 8 },
    { id: "sunny",        type: "bg",    bg_id: "sunny",        rarity: "R",   emoji: "🌻", label: "ひまわりルーム",
      weight: 7 },
    { id: "tearoom",      type: "bg",    bg_id: "tearoom",      rarity: "R",   emoji: "🍵", label: "ティールーム",
      weight: 7 },
    # SR（部屋背景）
    { id: "ribbon",       type: "bg",    bg_id: "ribbon",       rarity: "SR",  emoji: "🎀", label: "リボンルーム",
      weight: 5 },
    { id: "star",         type: "bg",    bg_id: "star",         rarity: "SR",  emoji: "⭐", label: "星空ルーム",
      weight: 4 },
    { id: "winter",       type: "bg",    bg_id: "winter",       rarity: "SR",  emoji: "❄️", label: "冬ルーム",
      weight: 4 },
    { id: "halloween",    type: "bg",    bg_id: "halloween",    rarity: "SR",  emoji: "🎃", label: "ハロウィンルーム",
      weight: 3 },
    { id: "christmas",    type: "bg",    bg_id: "christmas",    rarity: "SR",  emoji: "🎄", label: "クリスマスルーム",
      weight: 3 },
    # SSR（レア背景・称号）
    { id: "princess",     type: "bg",    bg_id: "princess",     rarity: "SSR", emoji: "👑", label: "プリンセスルーム",
      weight: 2 },
    { id: "night_simple", type: "bg",    bg_id: "night_simple", rarity: "SSR", emoji: "🌙", label: "月夜ルーム",
      weight: 1 },
    { id: "title_ribbon", type: "title", gacha_title: "リボンの申し子", rarity: "SSR", emoji: "🎀", label: "称号: リボンの申し子",
      weight: 1 },
    { id: "title_star",   type: "title", gacha_title: "星詠みの民", rarity: "SSR", emoji: "✨", label: "称号: 星詠みの民",
      weight: 1 }
  ].freeze

  COST = { 1 => 50, 10 => 450 }.freeze

  def initialize(user)
    @user = user
  end

  # 有効な回数ならコストを返す（無効なら nil）
  def cost_for(count)
    COST[count]
  end

  # count 連ガチャを実行し、結果とコイン残高を返す。
  # クライアントからは count だけを受け取り、コスト・当選・付与はすべてサーバー側で決定する。
  def pull(count)
    cost = COST[count]
    raise ArgumentError, "invalid_count" unless cost
    raise InsufficientCoins if @user.coins < cost

    results = Array.new(count) { draw }
    ActiveRecord::Base.transaction { settle!(results, cost) }

    { results: results.map { |i| i.except(:weight) }, total_coins: @user.reload.coins }
  end

  # 重み付き抽選。roll を渡せばテストで決定的に検証できる（未指定なら乱数）。
  def draw(roll = nil)
    total      = POOL.sum { |i| i[:weight] }
    point      = roll || rand(total)
    cumulative = 0
    POOL.each do |item|
      cumulative += item[:weight]
      return item if point < cumulative
    end
    POOL.last
  end

  private

  # 当選結果を反映し、コインを精算する。
  # ガチャ報酬は信頼済みのサーバー側書き込みなので、バリデーション/コールバックを
  # 意図的にスキップする（報酬カラムに検証は不要・付与を確実にするため）。
  # rubocop:disable Rails/SkipsModelValidations
  def settle!(results, cost)
    coin_delta = -cost
    results.each do |item|
      case item[:type]
      when "coin"  then coin_delta += item[:amount]
      when "bg"    then @user.update_column(:current_room_bg, item[:bg_id])
      when "title" then @user.update_column(:gacha_title, item[:gacha_title])
      end
    end
    @user.update_column(:coins, @user.coins + coin_delta)
  end
  # rubocop:enable Rails/SkipsModelValidations
end
