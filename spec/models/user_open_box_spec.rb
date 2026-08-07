require "rails_helper"

# User#open_box! の Race Condition（Issue #11）。
# box_available? チェックと報酬付与が非アトミックだと、並列リクエストで
# BOX が複数回開封されコインが二重取得される。
#
# 実DB上の並列挙動を検証するため、この例では transactional fixtures を無効化する
# （各スレッドが別コネクションからコミット済みデータを見えるようにするため）。
# 作成したデータは after で明示的に削除する。
RSpec.describe "User#open_box! concurrency", type: :model do
  self.use_transactional_tests = false

  after do
    User.delete_all
  end

  def build_user
    User.create!(
      email: "box@example.com",
      password: "password",
      nickname: "box",
      egg_color: "pink",
      coins: 0,
      last_box_opened_at: nil
    )
  end

  # 4スレッドを揃えて一斉に open_box! させ、開封・付与が1回だけであることを検証する。
  it "並列に複数回呼んでも BOX 開封・付与は1回だけ（二重取得しない）" do
    user    = build_user
    threads = 4
    barrier = Queue.new

    workers = Array.new(threads) do
      Thread.new do
        ActiveRecord::Base.connection_pool.with_connection do
          u = User.find(user.id)
          barrier.pop # 全スレッドが揃うまで待ち、一斉に発火する
          u.open_box!
        end
      end
    end

    sleep 0.05
    threads.times { barrier << :go }
    winners = workers.filter_map(&:value)

    # 修正前は複数スレッドが成立して RED（got 4）。原子化後は 1。
    expect(winners.size).to eq(1)

    winner         = winners.first
    expected_coins = winner[:type] == :coins ? winner[:amount] : 0
    expect(user.reload.coins).to eq(expected_coins)
    expect(User.find(user.id).box_available?).to be(false)
  end
end
