class AddFlightGameToUsers < ActiveRecord::Migration[7.0]
  def change
    add_column :users, :flight_game_last_played_at, :datetime
    add_column :users, :flight_game_high_score, :integer, default: 0, null: false
  end
end
