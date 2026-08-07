require "rails_helper"

RSpec.describe Task, type: :model do
  subject(:task) { build(:task) }

  # ===== 定数 =====
  describe "PRIORITIES" do
    it "high / medium / low の3種類" do
      expect(Task::PRIORITIES).to eq(%w[high medium low])
    end
  end

  describe "CATEGORIES" do
    it "6カテゴリを含む" do
      expect(Task::CATEGORIES).to include("学習", "健康", "習慣", "家事", "仕事", "その他")
    end
  end

  # ===== アソシエーション =====
  describe "associations" do
    it "Userに属する" do
      expect(task.user).to be_a(User)
    end
  end

  # ===== バリデーション =====
  describe "validations" do
    it "有効なタスクはvalidである" do
      expect(task).to be_valid
    end

    it "priorityがPRIORITIES外の値だと無効" do
      task.priority = "invalid"
      expect(task).not_to be_valid
    end

    it "priorityがnilは許可される" do
      task.priority = nil
      expect(task).to be_valid
    end

    Task::PRIORITIES.each do |p|
      it "priority '#{p}' は有効" do
        task.priority = p
        expect(task).to be_valid
      end
    end
  end

  # ===== #start_time =====
  describe "#start_time" do
    it "dateと同じ値を返す" do
      task.date = Date.new(2026, 7, 20)
      expect(task.start_time).to eq(Date.new(2026, 7, 20))
    end
  end
end
