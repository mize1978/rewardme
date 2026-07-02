class AddCurrentRoomBgToUsers < ActiveRecord::Migration[7.0]
  def change
    add_column :users, :current_room_bg, :string, default: "default" unless column_exists?(:users, :current_room_bg)
  end
end
