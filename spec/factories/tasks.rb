FactoryBot.define do
  factory :task do
    association :user
    title { "テストタスク" }
    done { false }
    coin_reward { 10 }
    category { "その他" }
    date { Date.current }
  end
end
