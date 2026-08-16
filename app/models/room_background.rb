class RoomBackground
  CATALOG = [
    {
      id:     "default",
      name:   "はじめのお部屋",
      image:  "room_stage_1.png",
      price:  0,
      rarity: "FREE",
      desc:   "最初からもらえるお部屋"
    },
    {
      id:     "pink",
      name:   "ピンクリボンの部屋",
      image:  "room_pink.png",
      price:  0,
      rarity: "FREE",
      desc:   "満月と桜が見える、ふわふわピンクのお部屋"
    },
    {
      id:     "pink_royal",
      name:   "ピンクロイヤルの部屋",
      image:  "room_pink_royal.png",
      price:  1200,
      rarity: "SUPER",
      desc:   "きらきらガーランドとリボンが輝く、究極のピンクのお城"
    },
    {
      id:     "sweets",
      name:   "スイーツの部屋",
      image:  "room_sweets.png",
      price:  300,
      rarity: "NORMAL",
      desc:   "お菓子の城が見える、あまあまな部屋"
    },
    {
      id:     "ribbon",
      name:   "リボンの部屋",
      image:  "room_ribbon.png",
      price:  500,
      rarity: "RARE",
      desc:   "夜空にリボン星座が輝く、とっておきの部屋"
    },
    {
      id:     "sakura",
      name:   "夜桜の部屋",
      image:  "room_sakura.png",
      price:  500,
      rarity: "RARE",
      desc:   "満月の夜、桜が舞うロマンチックな部屋"
    },
    {
      id:     "night_simple",
      name:   "星のちいさなお部屋",
      image:  "room_night_simple.png",
      price:  0,
      rarity: "FREE",
      desc:   "三日月が見える、星好きの子の部屋"
    },
    {
      id:     "blue",
      name:   "星空リボンの部屋",
      image:  "room_blue.png",
      price:  0,
      rarity: "FREE",
      desc:   "流れ星と三日月が見える、星好きのお部屋"
    },
    {
      id:     "blue_royal",
      name:   "ブルーロイヤルの部屋",
      image:  "room_blue_royal.png",
      price:  1200,
      rarity: "SUPER",
      desc:   "星のガーランドが輝く、究極の星空のお城"
    },
    {
      id:     "star",
      name:   "星空の部屋",
      image:  "room_star.png",
      price:  600,
      rarity: "RARE",
      desc:   "天の川が広がる、神秘的な深夜の部屋"
    },
    {
      id:     "sunny",
      name:   "ひだまりの部屋",
      image:  "room_sunny.png",
      price:  0,
      rarity: "FREE",
      desc:   "青空とひまわりが見える、あたたかなお部屋"
    },
    {
      id:     "tearoom",
      name:   "リボンのティールーム",
      image:  "room_tearoom.png",
      price:  600,
      rarity: "RARE",
      desc:   "紅茶とスイーツが並ぶ、午後のティータイム"
    },
    {
      id:     "winter",
      name:   "冬の部屋",
      image:  "room_winter.png",
      price:  500,
      rarity: "RARE",
      desc:   "雪がふわふわ降り積もる、ふゆのおへや"
    },
    {
      id:     "halloween",
      name:   "ハロウィンの部屋",
      image:  "room_halloween.png",
      price:  500,
      rarity: "EVENT",
      desc:   "🎃 おばけとかぼちゃがいっぱいの不思議な夜",
      event_months: [10],
      event_label:  "10月限定"
    },
    {
      id:     "christmas",
      name:   "クリスマスの部屋",
      image:  "room_christmas.png",
      price:  500,
      rarity: "EVENT",
      desc:   "🎄 雪景色とツリーに囲まれた特別な夜",
      event_months: [12],
      event_label:  "12月限定"
    },
    {
      id:     "princess",
      name:   "プリンセスの部屋",
      image:  "room_princess.png",
      price:  900,
      rarity: "SUPER",
      desc:   "お城が見えるシャンデリアの豪華なお部屋"
    },
    {
      id:     "purple",
      name:   "紫の月夜の部屋",
      image:  "room_purple.png",
      price:  0,
      rarity: "FREE",
      desc:   "満月の夜、星屑が輝く神秘的な紫のお部屋"
    },
    {
      id:     "purple_royal",
      name:   "パープルロイヤルの部屋",
      image:  "room_purple_royal.png",
      price:  1200,
      rarity: "SUPER",
      desc:   "紫水晶と満月が輝く、究極の月夜のお城部屋"
    },
  ].freeze

  # ===== 成長ルーム =====
  # タスクの累計完了数に応じて、部屋の絵そのものが変わる部屋。
  # 画像にリボンちゃんが描き込まれているため、表示側ではキャラの透過PNG
  # レイヤーを重ねない（重ねるとキャラが2人になる）。
  #
  # 【6段構成の意図】
  # 「次に育つのは自分か、部屋か」を交互に見せるための並び。
  # キャラ（User#ribbon_stage）が育つ境界は completed_count 10 / 20 / 40 で、
  # 部屋が育つ段はその中間（15 / 30）に置く。結果として：
  #
  #    0  BASE   ＋ たまご         はじまり
  #   10  BASE   ＋ ベビー         → キャラが育つ
  #   15  COZY   ＋ ベビー         → 部屋が育つ
  #   20  COZY   ＋ リボンちゃん    → キャラが育つ
  #   30  DELUXE ＋ リボンちゃん    → 部屋が育つ
  #   40  DELUXE ＋ プリンセス      → キャラが育つ
  #
  # このため部屋の段階を ribbon_stage（1〜4しか返さない）から算出してはいけない。
  # 必ず User#room_growth_stage / .growth_stage_for を通すこと。
  #
  # 現在は PURPLE のみ。実機確認後に PINK / BLUE へ同じ構造をコピーする。
  GROWTH_ROOMS = {
    "purple" => {
      prefix: "room_purple_s",
      stages: [
        { stage: 1, tier: "BASE",   label: "たまご",       from: 0  },
        { stage: 2, tier: "BASE",   label: "ベビー",       from: 10 },
        { stage: 3, tier: "COZY",   label: "ベビー",       from: 15 },
        { stage: 4, tier: "COZY",   label: "リボンちゃん", from: 20 },
        { stage: 5, tier: "DELUXE", label: "リボンちゃん", from: 30 },
        { stage: 6, tier: "DELUXE", label: "プリンセス",   from: 40 },
      ]
    }
  }.freeze

  # 差し替え待ちの仮画像。PURPLE は全6段そろったため現在は空。
  # 新しい色を追加して絵が未完成の段があるときだけ、ここに段番号を入れる。
  PLACEHOLDER_STAGES = {}.freeze

  def self.all  = CATALOG
  def self.find(id) = CATALOG.find { |b| b[:id] == id }

  # 成長ルームかどうか
  def self.growth?(id) = GROWTH_ROOMS.key?(id.to_s)

  # 累計完了タスク数 → その部屋の成長段階（1〜6）。
  # ribbon_stage とは独立。しきい値は stages の :from を唯一の情報源とする。
  def self.growth_stage_for(id, completed_count)
    stages = growth_stages(id)
    return 1 if stages.empty?
    count = completed_count.to_i
    stages.reverse.find { |s| count >= s[:from] }&.dig(:stage) || stages.first[:stage]
  end

  # 成長ルームの、その段階の画像名
  def self.growth_image(id, stage)
    conf = GROWTH_ROOMS[id.to_s]
    return nil unless conf
    "#{conf[:prefix]}#{stage.to_i.clamp(1, conf[:stages].size)}.png"
  end

  # 成長ルームの全段階（成長ストリップ用）
  def self.growth_stages(id)
    GROWTH_ROOMS.dig(id.to_s, :stages) || []
  end

  # その段階の絵がまだ仮画像か
  def self.placeholder_stage?(id, stage)
    (PLACEHOLDER_STAGES[id.to_s] || []).include?(stage.to_i)
  end

  def self.available_now?(bg)
    return true unless bg[:event_months]
    bg[:event_months].include?(Date.today.month)
  end
end
