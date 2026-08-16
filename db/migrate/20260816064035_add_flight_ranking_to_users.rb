class AddFlightRankingToUsers < ActiveRecord::Migration[7.0]
  def change
    # ランキング専用の表示名（本体 nickname とは分離）。未設定=ランキング未参加。
    add_column :users, :flight_rank_name, :string, limit: 12

    # 全期間BESTでの並び替え用インデックス。
    add_index :users, :flight_game_high_score
  end
end
