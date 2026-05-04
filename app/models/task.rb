# app/models/task.rb
class Task < ApplicationRecord
  belongs_to :user

  def start_time
    date
  end
end