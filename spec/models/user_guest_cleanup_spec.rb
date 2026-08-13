require "rails_helper"

# Issue #15 Guest Login: ゲストデータの定期削除。
# 新 gem / 新インフラを足さず、User.cleanup_guests! で古いゲストだけを掃除する。
# 対象は is_guest: true のみ＝通常ユーザーには影響させない。
RSpec.describe User, type: :model do
  describe ".cleanup_guests!" do
    it "古いゲストだけ削除し、通常ユーザーと新しいゲストは残す" do
      old_guest   = create(:user, is_guest: true,  created_at: 2.days.ago)
      fresh_guest = create(:user, is_guest: true,  created_at: 1.hour.ago)
      normal_old  = create(:user, is_guest: false, created_at: 2.days.ago)

      expect do
        User.cleanup_guests!(older_than: 1.day)
      end.to change(User, :count).by(-1)

      expect(User.exists?(old_guest.id)).to be(false)
      expect(User.exists?(fresh_guest.id)).to be(true)
      expect(User.exists?(normal_old.id)).to be(true)
    end
  end
end
