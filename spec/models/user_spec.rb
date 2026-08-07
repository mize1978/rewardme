require "rails_helper"

RSpec.describe User, type: :model do
  subject(:user) { build(:user) }

  # ===== バリデーション =====
  describe "validations" do
    it { is_expected.to be_valid }

    it "emailがないと無効" do
      user.email = nil
      expect(user).not_to be_valid
    end

    it "emailが重複すると無効" do
      create(:user, email: "dup@example.com")
      user.email = "dup@example.com"
      expect(user).not_to be_valid
    end

    it "nicknameがないと無効" do
      user.nickname = nil
      expect(user).not_to be_valid
    end
  end

  # ===== ribbon_stage =====
  describe "#ribbon_stage" do
    {
      0 => 1,
      9 => 1,
      10 => 2,
      19 => 2,
      20 => 3,
      39 => 3,
      40 => 4,
      99 => 4
    }.each do |count, expected_stage|
      it "completed_count #{count} でステージ#{expected_stage}" do
        user.completed_count = count
        expect(user.ribbon_stage).to eq(expected_stage)
      end
    end
  end

  # ===== ribbon_exp =====
  describe "#ribbon_exp" do
    it "ステージ1は completed_count そのまま" do
      user.completed_count = 7
      expect(user.ribbon_exp).to eq(7)
    end

    it "ステージ2は completed_count - 10" do
      user.completed_count = 15
      expect(user.ribbon_exp).to eq(5)
    end

    it "ステージ3は completed_count - 20" do
      user.completed_count = 25
      expect(user.ribbon_exp).to eq(5)
    end

    it "ステージ4は completed_count - 40" do
      user.completed_count = 50
      expect(user.ribbon_exp).to eq(10)
    end
  end

  # ===== ribbon_exp_max =====
  describe "#ribbon_exp_max" do
    it "ステージ1は10" do
      user.completed_count = 0
      expect(user.ribbon_exp_max).to eq(10)
    end

    it "ステージ2は10" do
      user.completed_count = 10
      expect(user.ribbon_exp_max).to eq(10)
    end

    it "ステージ3は20" do
      user.completed_count = 20
      expect(user.ribbon_exp_max).to eq(20)
    end

    it "ステージ4はnil（上限なし）" do
      user.completed_count = 40
      expect(user.ribbon_exp_max).to be_nil
    end
  end

  # ===== ribbon_exp_percent =====
  describe "#ribbon_exp_percent" do
    it "ステージ1 count=5 は 50%" do
      user.completed_count = 5
      expect(user.ribbon_exp_percent).to eq(50)
    end

    it "ステージ2 count=15 は 50%（(15-10)*10）" do
      user.completed_count = 15
      expect(user.ribbon_exp_percent).to eq(50)
    end

    it "ステージ4は常に100%" do
      user.completed_count = 40
      expect(user.ribbon_exp_percent).to eq(100)
    end
  end

  # ===== badge =====
  describe "#badge" do
    it "completed_count 0 で「まだないよ」" do
      user.completed_count = 0
      expect(user.badge).to eq("まだないよ🥺")
    end

    it "completed_count 1-4 で「はじめの一歩」" do
      user.completed_count = 3
      expect(user.badge).to eq("🌱 はじめの一歩")
    end

    it "completed_count 5-9 で「ごほうび上手」" do
      user.completed_count = 7
      expect(user.badge).to eq("🍰 ごほうび上手")
    end

    it "completed_count 10以上で「がんばり屋さん」" do
      user.completed_count = 10
      expect(user.badge).to eq("💖 がんばり屋さん")
    end
  end

  # ===== box_available? =====
  describe "#box_available?" do
    it "一度も開けていないと利用可能" do
      user.last_box_opened_at = nil
      expect(user.box_available?).to be true
    end

    it "今日開けた場合は利用不可" do
      user.last_box_opened_at = Time.current
      expect(user.box_available?).to be false
    end

    it "昨日開けた場合は利用可能" do
      user.last_box_opened_at = 1.day.ago
      expect(user.box_available?).to be true
    end
  end

  # ===== open_box! =====
  describe "#open_box!" do
    let(:user) { create(:user, coins: 0, completed_count: 0) }

    it "利用可能な場合にPrizeを返す" do
      prize = user.open_box!
      expect(prize).to be_a(Hash)
      expect(prize[:type]).to be_in([:coins, :exp])
    end

    it "コイン系Prizeではcoinsが増える" do
      allow(user).to receive(:rand).and_return(0)
      prize = user.open_box!
      expect(user.reload.coins).to be_positive if prize[:type] == :coins
    end

    it "今日すでに開けていると nil を返す" do
      user.update!(last_box_opened_at: Time.current)
      expect(user.open_box!).to be_nil
    end

    it "開封後は box_available? が false になる" do
      user.open_box!
      expect(user.box_available?).to be false
    end
  end

  # ===== puzzle_plays_remaining =====
  describe "#puzzle_plays_remaining" do
    it "未プレイは3回残っている" do
      user.puzzle_last_played_at = nil
      expect(user.puzzle_plays_remaining).to eq(3)
    end

    it "今日1回プレイ済みは2回残り" do
      user.puzzle_last_played_at = Time.current
      user.puzzle_plays_today = 1
      expect(user.puzzle_plays_remaining).to eq(2)
    end

    it "今日3回プレイ済みは0回残り" do
      user.puzzle_last_played_at = Time.current
      user.puzzle_plays_today = 3
      expect(user.puzzle_plays_remaining).to eq(0)
    end

    it "昨日プレイしていれば3回にリセット" do
      user.puzzle_last_played_at = 1.day.ago
      user.puzzle_plays_today = 3
      expect(user.puzzle_plays_remaining).to eq(3)
    end
  end

  # ===== record_puzzle_play! =====
  describe "#record_puzzle_play!" do
    let(:user) { create(:user) }

    it "初回プレイでpuzzle_plays_todayが1になる" do
      user.record_puzzle_play!
      expect(user.reload.puzzle_plays_today).to eq(1)
    end

    it "同日2回目はpuzzle_plays_todayが2になる" do
      user.update!(puzzle_last_played_at: Time.current, puzzle_plays_today: 1)
      user.record_puzzle_play!
      expect(user.reload.puzzle_plays_today).to eq(2)
    end

    it "翌日プレイするとpuzzle_plays_todayが1にリセット" do
      user.update!(puzzle_last_played_at: 1.day.ago, puzzle_plays_today: 3)
      user.record_puzzle_play!
      expect(user.reload.puzzle_plays_today).to eq(1)
    end
  end

  # ===== newly_unlocked_puzzles =====
  describe "#newly_unlocked_puzzles" do
    it "新たにアンロックされたパズルを返す" do
      user.puzzle_clears_count = 10
      newly = user.newly_unlocked_puzzles(4)
      expect(newly.pluck(:unlock_at)).to all(be_between(5, 10))
    end

    it "以前からアンロック済みは返さない" do
      user.puzzle_clears_count = 10
      newly = user.newly_unlocked_puzzles(10)
      expect(newly).to be_empty
    end
  end

  # ===== ribbon_stage_image =====
  describe "#ribbon_stage_image" do
    it "ステージ1・pinkで正しいファイル名" do
      user.completed_count = 0
      expect(user.ribbon_stage_image("pink")).to eq("stage1_pink.png")
    end

    it "yellowはpurpleに変換される" do
      user.completed_count = 0
      expect(user.ribbon_stage_image("yellow")).to eq("stage1_purple.png")
    end

    it "colorがnilのときはegg_colorを使う" do
      user.egg_color = "pink"
      user.completed_count = 0
      expect(user.ribbon_stage_image).to eq("stage1_pink.png")
    end
  end
end
