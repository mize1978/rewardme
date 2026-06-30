class User < ApplicationRecord
  has_secure_password

  has_many :tasks, dependent: :destroy

def badge
  count = completed_count || 0

  case count
  when 0
    "まだないよ🥺"
  when 1..4
    "🌱 はじめの一歩"
  when 5..9
    "🍰 ごほうび上手"
  else
    "💖 がんばり屋さん"
  end
end

def ribbon_level
  completed_count || 0
end

def ribbon_title
  case ribbon_stage
  when 1 then "たまごのリボン族"
  when 2 then "ベビーリボン族"
  when 3 then "リボン族"
  when 4 then "プリンセスリボン族"
  end
end

def ribbon_stage
  count = completed_count || 0
  if    count >= 40 then 4
  elsif count >= 20 then 3
  elsif count >= 10 then 2
  else                   1
  end
end

def ribbon_stage_name
  %w[たまごのリボンちゃん ベビーリボン リボンちゃん プリンセスリボン][ribbon_stage - 1]
end

def ribbon_exp
  count = completed_count || 0
  case ribbon_stage
  when 1 then count
  when 2 then count - 10
  when 3 then count - 20
  when 4 then count - 40
  end
end

def ribbon_exp_max
  [10, 10, 20, nil][ribbon_stage - 1]
end

def ribbon_exp_percent
  count = completed_count || 0
  case ribbon_stage
  when 1 then (count * 10).clamp(0, 100)
  when 2 then ((count - 10) * 10).clamp(0, 100)
  when 3 then ((count - 20) * 5).clamp(0, 100)
  when 4 then 100
  end
end

def next_stage_tasks
  count = completed_count || 0
  case ribbon_stage
  when 1 then 10 - count
  when 2 then 20 - count
  when 3 then 40 - count
  when 4 then 0
  end
end


def ribbon_message
  case ribbon_stage
  when 1 then "今日も進んでるね♪"
  when 2 then "がんばりが見えてきたよ！"
  when 3 then "ごほうび上手になってきたね🍰"
  when 4 then "もう習慣化マスターだね👑"
  end
end

def ribbon_stage_image(color = nil)
  c = (color || egg_color.presence || "pink").to_s
  c = "purple" if c == "yellow"
  "stage#{ribbon_stage}_#{c}.png"
end

def benny_image
  c = (egg_color.presence || "pink").to_s
  c = "purple" if c == "yellow"
  "benny_#{c}.png"
end

def ribbon_stage_gold_bg?
  false
end

  # ===== お部屋の背景 =====
  def room_bg_image
    bg = RoomBackground.find(current_room_bg || "default")
    bg ? bg[:image] : "room_stage_1.png"
  end

  def set_bg!(bg_id)
    bg = RoomBackground.find(bg_id)
    return false unless bg
    cost = current_room_bg == bg_id ? 0 : bg[:price]
    return false if coins < cost
    update!(coins: coins - cost, current_room_bg: bg_id)
    true
  end

  # ===== デイリーBOX =====
  BOX_PRIZES = [
    { type: :coins, amount: 10,  label: "コイン 10",     rarity: "normal", weight: 35 },
    { type: :coins, amount: 30,  label: "コイン 30",     rarity: "normal", weight: 25 },
    { type: :coins, amount: 50,  label: "コイン 50",     rarity: "good",   weight: 20 },
    { type: :coins, amount: 100, label: "コイン 100",    rarity: "good",   weight: 12 },
    { type: :exp,   amount: 3,   label: "EXP ボーナス",  rarity: "rare",   weight: 6  },
    { type: :coins, amount: 350, label: "コイン 350!!!",  rarity: "super",  weight: 2  },
  ].freeze

  def box_available?
    last_box_opened_at.nil? || last_box_opened_at.to_date < Date.today
  end

  def open_box!
    return nil unless box_available?
    total  = BOX_PRIZES.sum { |p| p[:weight] }
    roll   = rand(total)
    cumul  = 0
    prize  = BOX_PRIZES.find { |p| (cumul += p[:weight]) > roll }
    case prize[:type]
    when :coins then increment!(:coins, prize[:amount])
    when :exp   then increment!(:completed_count, prize[:amount])
    end
    update!(
      last_box_opened_at: Time.current,
      last_box_prize: { type: prize[:type].to_s, label: prize[:label], rarity: prize[:rarity] }
    )
    prize
  end

  def today_prize
    return nil unless last_box_opened_at&.to_date == Date.today
    last_box_prize
  end

  # ===== お手紙 =====
  def available_letters
    Letter.all_for(self)
  end

  def letter_read?(id)
    Array(read_letter_ids).include?(id)
  end

  def read_letter!(id)
    return if letter_read?(id)
    update!(read_letter_ids: Array(read_letter_ids) + [id])
  end

  def unread_letter_count
    available_letters.count { |l| !letter_read?(l[:id]) }
  end

  def tap_game_played_today?
    return false if Rails.env.development?
    tap_game_last_played_at&.to_date == Date.current
  end

  def match_game_played_today?
    return false if Rails.env.development?
    match_game_last_played_at&.to_date == Date.current
  end

  def potion_game_played_today?
    return false if Rails.env.development?
    potion_game_last_played_at&.to_date == Date.current
  end

  PUZZLE_MAX_PLAYS = 3

  def puzzle_plays_remaining
    if puzzle_last_played_at&.to_date == Date.current
      [PUZZLE_MAX_PLAYS - (puzzle_plays_today || 0), 0].max
    else
      PUZZLE_MAX_PLAYS
    end
  end

  def puzzle_played_out?
    puzzle_plays_remaining <= 0
  end

  def record_puzzle_play!
    if puzzle_last_played_at&.to_date == Date.current
      update!(
        puzzle_last_played_at: Time.current,
        puzzle_plays_today:    (puzzle_plays_today || 0) + 1
      )
    else
      update!(
        puzzle_last_played_at: Time.current,
        puzzle_plays_today:    1
      )
    end
  end

  PUZZLE_IMAGES = [
    { id: 12, name: "たまごだっこ",        file: "puzzle_12.png", unlock_at: 0  },
    { id: 9,  name: "お花見",             file: "puzzle_9.png",  unlock_at: 5  },
    { id: 2,  name: "サマービーチ",       file: "puzzle_2.png",  unlock_at: 10 },
    { id: 6,  name: "バーベキュー",       file: "puzzle_6.png",  unlock_at: 15 },
    { id: 7,  name: "花火大会",           file: "puzzle_7.png",  unlock_at: 20 },
    { id: 3,  name: "ハロウィンナイト",   file: "puzzle_3.png",  unlock_at: 30 },
    { id: 10, name: "バースデーパーティー", file: "puzzle_10.png", unlock_at: 40 },
    { id: 4,  name: "クリスマスナイト",   file: "puzzle_4.png",  unlock_at: 50 },
    { id: 8,  name: "パジャマパーティー", file: "puzzle_8.png",  unlock_at: 60 },
    { id: 11, name: "今日も全部終わったね", file: "puzzle_11.png", unlock_at: 70 },
    { id: 13, name: "遊園地",             file: "puzzle_13.png", unlock_at: 75 },
    { id: 5,  name: "3プリンセス",       file: "puzzle_5.png",  unlock_at: 80 },
  ].freeze

  def owned_puzzle_images
    PUZZLE_IMAGES.select { |p| puzzle_clears_count >= p[:unlock_at] }
  end

  def owned_puzzle_ids
    owned_puzzle_images.map { |p| p[:id] }
  end

  def selected_puzzle_image_file
    puzzle = PUZZLE_IMAGES.find { |p| p[:id] == selected_puzzle_id } ||
             PUZZLE_IMAGES.first
    puzzle[:file]
  end

  def newly_unlocked_puzzles(prev_clears)
    PUZZLE_IMAGES.select { |p| p[:unlock_at] > prev_clears && p[:unlock_at] <= puzzle_clears_count }
  end

  validates :email, presence: true, uniqueness: true
  validates :nickname, presence: true
end