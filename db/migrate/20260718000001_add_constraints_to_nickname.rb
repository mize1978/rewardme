class AddConstraintsToNickname < ActiveRecord::Migration[7.0]
  def up
    change_column :users, :nickname, :string, limit: 50, null: false, default: ""
  end

  def down
    change_column :users, :nickname, :string, limit: nil, null: true, default: nil
  end
end
