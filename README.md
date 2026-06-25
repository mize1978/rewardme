<div align="center">
  <img src="app/assets/images/rewardme_logo.png" alt="RewardMe" width="260">
  <br><br>
  <img src="docs/screenshots/lp.jpg" alt="ランディングページ" width="100%">
  <br><br>
  <h3>リボンちゃんと暮らす、ごほうびタスク管理アプリ</h3>
  <br>
  <img src="docs/screenshots/dashboard.jpg" alt="ダッシュボード" width="48%">
  &nbsp;
  <img src="docs/screenshots/myroom_sunny.jpg" alt="マイルーム" width="48%">
</div>

---

**「タスク管理は続けることが一番難しい」** という課題を、「育成」「コレクション」「マイルーム」というゲーム体験で解決することを目指して開発しました。

**GitHub**：https://github.com/mize1978/reward_task_app

---

## 目次

- [機能一覧](#機能一覧)
- [技術スタック](#技術スタック)
- [技術的なこだわり](#技術的なこだわり)
- [画面構成](#画面構成)
- [セットアップ](#セットアップ)
- [データベース設計](#データベース設計)
- [今後の実装予定](#今後の実装予定)

---

## 機能一覧

### タスク管理
- タスクの作成 / 編集 / 削除 / 完了
- 期日設定 ＋ カレンダーで達成日を可視化（simple_calendar）
- 期限切れ・当日期限のリマインダー通知（ヘッダードロップダウン）

### ゲーミフィケーション
- タスク完了でコイン・EXP を獲得
- 経験値バーによるレベル表示（ヘッダー常時表示）
- ライフシステム（5 ライフ / 期限切れタスクで消費）

### キャラクター育成（リボンちゃん）
- 完了タスク数に応じた 5 段階の進化（たまご → プリンセスリボン）
- 卵の色を 3 種類から選択（ピンク・青・黄色）
- 部屋や卵色の組み合わせで変化するセリフシステム
- 進化直前の専用アニメーション

### マイルーム
- 12 種類の背景テーマ（FREE / NORMAL / RARE / SUPER / EVENT）
- コインで新しい部屋を解放
- 卵の色と部屋テーマによる「おすすめコンボ」セリフ
- 部屋テーマに連動して UI 全体のアクセントカラーが変化

### デイリー BOX
- 毎日 1 回開封可能なランダム報酬ガチャ
- コイン / EXP ボーナス（レアリティ別重み付き抽選）

### お手紙（インゲームメール）
- リボンちゃんや運営からの手紙が届くシステム（14 通）
- トリガー：初回ログイン / 卵選択 / タスク達成 / レベル到達（Lv10・20・40）/ 部屋変更
- 未読数をヘッダーにゲームっぽく表示（📮 未読 N）

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| バックエンド | Ruby on Rails 7.0 |
| フロントエンド | Stimulus JS / importmap / Hotwire（Turbo） |
| スタイリング | CSS（カスタムプロパティ / アニメーション）/ SCSS |
| データベース | MySQL（開発）/ PostgreSQL（本番） |
| 認証 | bcrypt（has_secure_password） |
| デプロイ | Render |
| その他 | simple_calendar / sprockets |

---

## 技術的なこだわり

### ■ CSS カスタムプロパティによる動的テーマ

背景を追加する際に既存の CSS を書き換えずテーマを増やせる設計にするため、CSS カスタムプロパティを採用しました。`body` の `data-room-theme` 属性を切り替えるだけで、ボタン・EXP バー・進捗リング・カレンダーなど全要素に反映されます。

<details>
<summary>▼ 詳細コード</summary>

```css
body[data-room-theme="star"] {
  --accent-1:    #818cf8;
  --accent-2:    #a78bfa;
  --accent-glow: rgba(129, 140, 248, 0.5);
}

/* テーマを意識した要素はすべて変数を参照するだけ */
.tasks-add-btn {
  background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
  box-shadow: 0 4px 20px var(--accent-glow);
}
```

</details>

---

### ■ 1 枚の画像から 3 色を生成する CSS フィルター

キャラクター画像を色ごとに複数用意するとアセット管理が煩雑になるため、CSS の `hue-rotate()` フィルターで 1 枚の画像から 3 色を生成する設計を選びました。元画像の主色（ピンク / 色相 330°）から目標色の色相を逆算してフィルター値を決定しています。

<details>
<summary>▼ 詳細コード</summary>

```
ピンク（330°）+ hue-rotate(260°) = 230°（青）
ピンク（330°）+ hue-rotate( 80°) =  50°（黄色）
```

```ruby
EGG_COLOR_FILTERS = {
  "pink"   => "",
  "blue"   => "hue-rotate(260deg) saturate(1.2) brightness(1.0)",
  "yellow" => "hue-rotate(80deg)  saturate(1.5) brightness(1.1)"
}.freeze
```

</details>

---

### ■ CSS アニメーションと inline スタイルの優先度競合への対応

キャラクターのキラキラアニメーション（`@keyframes`）が `filter` プロパティを上書きするため、inline スタイルで卵色フィルターを指定しても適用されないという問題が発生しました。CSS のレンダリングモデルを調べた結果、**親要素のフィルターは子の合成済み出力に後から適用される**という仕様を利用し、フィルターをアニメーションのない親要素に移動することで解決しました。

<details>
<summary>▼ 詳細コード</summary>

```erb
<%# NG: img に直接指定するとアニメーションに上書きされる %>
<img class="room-chara-img" style="<%= ribbon_color_style %>">

<%# OK: 親 div に移動することで競合を回避 %>
<div class="room-chara-shake" style="<%= ribbon_color_style %>">
  <img class="room-chara-img">  <%# ← アニメーションはここ %>
</div>
```

</details>

---

### ■ Stimulus JS による部屋 × 卵色のセリフシステム

部屋と卵色の組み合わせによって変わるセリフシステムを、サーバーへのリクエストなしで動作させるため Stimulus コントローラーで完結させました。全パターンを JS 定数として管理し、優先度付きで抽選します。

<details>
<summary>▼ 発動ロジック</summary>

```
優先度：
  ① 5%  → レアリアクション（8 パターン）
  ② 30% → おすすめコンボセリフ（部屋 × 卵色 / 13 パターン）
  ③ 残り → 部屋別セリフ（12 部屋 × 各 4〜5 パターン）
```

</details>

---

### ■ DB テーブルを増やさない手紙システム

手紙の内容が増えても DB マイグレーションが不要な設計にするため、手紙本文は Ruby 定数で管理し、「既読かどうか」だけを JSON カラム 1 列で保持する設計を選びました。

<details>
<summary>▼ 詳細コード</summary>

```ruby
# 手紙の内容は Ruby 定数（DB テーブル不要）
CATALOG = [
  { id: "level_10", from: "リボンちゃん", trigger: :level_10, body: "..." },
  { id: "room_letter_star", trigger: :room_star, body: "..." },
]

# 既読 ID だけ DB に保存
# users.read_letter_ids :json → ["welcome", "level_10"]
```

</details>

---

### ■ 外部 gem を使わないゲームシステム

ゲームロジックへの依存を最小限にするため、EXP・レベル・ライフ・抽選などすべてを `User` モデルのメソッドで自前実装しました。完了タスク数を唯一の入力値として全ステータスを算出しているため、専用の DB カラムを増やさずにゲーム全体を管理しています。

<details>
<summary>▼ 設計概要</summary>

- **EXP・レベル**：`completed_count` から全ステータスを動的に計算
- **進化ステージ**：5 段階、各ステージで画像・名前・セリフが変化
- **デイリー BOX**：`weight` 値による重み付き抽選を自前で実装
- **ライフシステム**：期限切れタスクで消費、一定期間経過で自動回復

</details>

---

## 画面構成

```
/ ...................... ランディングページ
├── /signup ............. ユーザー登録
├── /login .............. ログイン
├── /choose_egg ......... パートナー選択（初回のみ）
├── /dashboard .......... マイルーム（メイン画面）
├── /my_tasks ........... タスク一覧
├── /tasks/new .......... タスク作成
├── /shop ............... 部屋ショップ
├── /letters ............ お手紙一覧
├── /letters/:id ........ お手紙詳細
└── /settings ........... 設定
```

---

## スクリーンショット

<!-- デモ URL は後日追記 -->

<div align="center">
  <img src="docs/screenshots/choose_egg.jpg" alt="パートナー選択" width="48%">
  &nbsp;
  <img src="docs/screenshots/dashboard_blue.jpg" alt="青たまご × 星の部屋" width="48%">
  <br><br>
  <img src="docs/screenshots/shop.jpg" alt="部屋ショップ" width="80%">
</div>

---

## セットアップ

```bash
git clone https://github.com/mize1978/reward_task_app.git
cd reward_task_app

bundle install

# データベース設定
cp config/database.yml.example config/database.yml
# database.yml を編集してください

bin/rails db:create db:migrate

bin/rails server
# → http://localhost:3000
```

---

## データベース設計

### users テーブル（主要カラム）

| カラム | 型 | 説明 |
|-------|----|------|
| nickname | string | 表示名 |
| email | string | ログイン用 |
| password_digest | string | bcrypt ハッシュ |
| coins | integer | 所持コイン |
| lives | integer | ライフ（最大 5） |
| completed_count | integer | 累計完了タスク数（EXP の基準値） |
| egg_color | string | pink / blue / yellow |
| current_room_bg | string | 現在の部屋 ID |
| read_letter_ids | json | 既読手紙 ID の配列 |
| last_box_opened_at | datetime | BOX 最終開封日時 |

### tasks テーブル（主要カラム）

| カラム | 型 | 説明 |
|-------|----|------|
| title | string | タスク名 |
| date | date | 期日 |
| done | boolean | 完了フラグ |
| coin_reward | integer | 完了時に得るコイン |
| user_id | integer | 外部キー |

---

## 今後の実装予定

- 家具システム（部屋に好きな家具を配置）
- イベント背景・季節限定のお手紙
- パートナー衣装のカスタマイズ
- マイルームの細かいカスタマイズ機能
- フレンド・ランキング機能

---

*個人開発 / Ruby on Rails 7*
