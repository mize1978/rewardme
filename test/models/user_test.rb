require "test_helper"

class UserTest < ActiveSupport::TestCase
  setup do
    @user = users(:one)
  end

  # ribbon_stage: completed_count に応じたステージ判定
  test "completed_count 0 でステージ1" do
    @user.completed_count = 0
    assert_equal 1, @user.ribbon_stage
  end

  test "completed_count 10 でステージ2" do
    @user.completed_count = 10
    assert_equal 2, @user.ribbon_stage
  end

  test "completed_count 20 でステージ3" do
    @user.completed_count = 20
    assert_equal 3, @user.ribbon_stage
  end

  test "completed_count 40 でステージ4" do
    @user.completed_count = 40
    assert_equal 4, @user.ribbon_stage
  end

  # badge: 達成数に応じたバッジ文言
  test "completed_count 0 でバッジなし" do
    @user.completed_count = 0
    assert_equal "まだないよ🥺", @user.badge
  end

  test "completed_count 5 でごほうび上手バッジ" do
    @user.completed_count = 5
    assert_equal "🍰 ごほうび上手", @user.badge
  end

  test "completed_count 10 以上でがんばり屋さんバッジ" do
    @user.completed_count = 10
    assert_equal "💖 がんばり屋さん", @user.badge
  end

  # バリデーション
  test "email が空だと無効" do
    @user.email = nil
    assert_not @user.valid?
  end

  test "nickname が空だと無効" do
    @user.nickname = nil
    assert_not @user.valid?
  end
end
