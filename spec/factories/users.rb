FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "user#{n}@example.com" }
    password { "password" }
    nickname { "テストユーザー" }
    coins { 0 }
    completed_count { 0 }
    egg_color { "pink" }
    current_room_bg { "default" }
    puzzle_clears_count { 0 }
    puzzle_plays_today { 0 }
    selected_puzzle_id { 1 }
    tap_game_high_score { 0 }
    match_game_high_score { 0 }
  end
end
