namespace :guests do
  desc "放置ゲスト（既定: 1日以上前に作成された is_guest ユーザー）を削除する（Issue #15）"
  task cleanup: :environment do
    deleted = User.cleanup_guests!
    puts "Deleted #{deleted.size} guest user(s)."
  end
end
