# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.0].define(version: 2026_06_26_000002) do
  create_table "tasks", charset: "utf8mb4", force: :cascade do |t|
    t.string "title"
    t.boolean "done"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "priority"
    t.bigint "user_id"
    t.date "date"
    t.datetime "completed_at"
    t.string "category", default: "その他"
    t.integer "coin_reward", default: 10, null: false
    t.index ["user_id"], name: "index_tasks_on_user_id"
  end

  create_table "users", charset: "utf8mb4", force: :cascade do |t|
    t.string "email"
    t.string "password_digest"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "first_name"
    t.string "last_name"
    t.integer "completed_count", default: 0
    t.string "nickname"
    t.integer "coins", default: 0, null: false
    t.integer "lives", default: 5, null: false
    t.json "owned_furniture"
    t.json "placed_furniture"
    t.datetime "last_box_opened_at"
    t.json "last_box_prize"
    t.string "current_room_bg", default: "default"
    t.string "egg_color"
    t.json "read_letter_ids"
    t.datetime "tap_game_last_played_at"
    t.integer "tap_game_high_score", default: 0, null: false
    t.string "gacha_title"
  end

  add_foreign_key "tasks", "users"
end
