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

  def self.all  = CATALOG
  def self.find(id) = CATALOG.find { |b| b[:id] == id }

  def self.available_now?(bg)
    return true unless bg[:event_months]
    bg[:event_months].include?(Date.today.month)
  end
end
