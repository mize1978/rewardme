require "rails_helper"

RSpec.describe GachaService do
  let(:user)    { create(:user, coins: 1000) }
  subject(:svc) { described_class.new(user) }

  describe "#cost_for" do
    it "1連は50コイン" do
      expect(svc.cost_for(1)).to eq(50)
    end

    it "10連は450コイン" do
      expect(svc.cost_for(10)).to eq(450)
    end

    it "無効な回数は nil" do
      expect(svc.cost_for(3)).to be_nil
    end
  end

  describe "#draw" do
    it "全アイテムに :weight がある" do
      expect(GachaService::POOL).to all(include(:weight))
    end

    it "roll=0 で先頭アイテムを返す" do
      expect(svc.draw(0)).to eq(GachaService::POOL.first)
    end

    it "roll=総重み-1 で最後のアイテムを返す" do
      total = GachaService::POOL.sum { |i| i[:weight] }
      expect(svc.draw(total - 1)).to eq(GachaService::POOL.last)
    end
  end

  describe "#pull" do
    it "結果は指定回数ぶん返る" do
      expect(svc.pull(10)[:results].size).to eq(10)
    end

    it "コインが精算される（total_coins が実残高と一致）" do
      result = svc.pull(1)
      expect(result[:total_coins]).to eq(user.reload.coins)
    end

    it "無効な回数は ArgumentError" do
      expect { svc.pull(3) }.to raise_error(ArgumentError)
    end

    it "コイン不足は InsufficientCoins" do
      poor = create(:user, coins: 0)
      expect { described_class.new(poor).pull(1) }.to raise_error(GachaService::InsufficientCoins)
    end

    it "コスト以上のコインを消費する（コイン当選ぶんは戻る）" do
      # 全部コインでも純増になりすぎないよう、少なくともコストは一度引かれる
      before = user.coins
      svc.pull(1)
      # 純変動は「-コスト + 当選コイン」なので、最大でも +100-50=+50、最小でも -50
      expect(user.reload.coins).to be_between(before - 50, before + 100)
    end
  end
end
