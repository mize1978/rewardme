require "rails_helper"

# email の整合性（Issue #13）。
# - format validation（URI::MailTo::EMAIL_REGEXP）
# - DB unique index（model-level uniqueness だけでは並列 INSERT を防げないため、
#   DB 制約が独立して重複を拒否することを検証する）
RSpec.describe "User email integrity", type: :model do
  describe "format validation" do
    it "不正な形式のemailは無効" do
      user = build(:user, email: "not-an-email")
      expect(user).to be_invalid
      expect(user.errors[:email]).to be_present
    end

    it "正しい形式のemailは有効" do
      expect(build(:user, email: "valid@example.com")).to be_valid
    end
  end

  describe "DB unique index" do
    # モデル検証を迂回して直接 INSERT しても、DB が重複 email を拒否することを検証する。
    # これは「並列 INSERT で 2 リクエストが uniqueness validation をすり抜けて両方 INSERT」
    # という race を、DB 制約が最終的に防ぐことを担保する（決定的に再現できる形で確認）。
    it "モデル検証を迂回してもDBが重複emailを拒否する" do
      create(:user, email: "dupe@example.com")
      duplicate = build(:user, email: "dupe@example.com")

      expect { duplicate.save(validate: false) }.to raise_error(ActiveRecord::RecordNotUnique)
    end
  end
end
