# app/models/task.rb
class Task < ApplicationRecord
  belongs_to :user

  PRIORITIES = %w[high medium low].freeze
  CATEGORIES = %w[学習 健康 習慣 家事 仕事 その他].freeze

  validates :priority, inclusion: { in: PRIORITIES }, allow_nil: true

  def start_time
    date
  end
end