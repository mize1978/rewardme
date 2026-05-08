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

  validates :email, presence: true, uniqueness: true
  validates :nickname, presence: true
end