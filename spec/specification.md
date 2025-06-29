# ポイ活ウォーズ 仕様書 テストケース

このドキュメントは `specification/index.md` の仕様に基づくテストケース集です。

---

## 1. ゲームの流れ

### 1.1 タイトル画面表示
- [ ] ゲーム起動時にタイトル画面が表示される

### 1.2 最初のタスク：同意してサービスの利用を開始する
- [ ] 最初のタスクとして「同意してサービスの利用を開始する」が表示される
- [ ] タスククリア時に演出が表示され、最初のポイントを獲得できる
- [ ] ホーム画面に遷移する

### 1.3 基本タスクの解禁
- [ ] プロフィール設定タスクが表示される（ユーザー名・アバター画像選択）
- [ ] 外部サービス連携タスクが表示される（SNS・通販サービス）
- [ ] 広告タップタスクが表示される

### 1.4 基本機能の利用
- [ ] タイムラインでフォロー・いいねができる
- [ ] セールやポイント還元投稿の通知が定期的に届く
- [ ] 通販で商品を購入できる
- [ ] ソシャゲでログインボーナス・ガチャが利用できる

### 1.5 発展タスクの解禁
- [ ] アフィリエイト・フリマの発展タスクが表示される

### 1.6 発展機能の利用
- [ ] アフィリエイトで商品紹介・クリックによるポイント獲得ができる
- [ ] フリマで商品出展・売却によるポイント獲得ができる

### 1.7 精算
- [ ] 手持ちの商品が精算され、ポイントに変換される
- [ ] セットで持っている商品は高値で精算される

### 1.8 結果発表
- [ ] 最終ポイント数とランキングが表示される

---

## 2. 商品仕様

### 2.1 小説
- [ ] 通販で「上巻」「下巻」をそれぞれ200ptで購入できる
- [ ] 精算時、単品は150pt、セットは1,000ptで換金される

### 2.2 マンガ
- [ ] 通販で1巻〜5巻をそれぞれ100ptで購入できる
- [ ] 精算時、単品は50pt、セットは2,500ptで換金される

---

## 3. 画面仕様

### 3.1 ホーム画面
- [ ] タスク一覧、アプリ一覧、広告、タイムライン、所持ポイント数、所持アイテム一覧が表示される

### 3.2 プロフィール画面
- [ ] ユーザー名、アバター画像、外部サービス連携状況が表示される

### 3.3 通販画面
- [ ] 商品一覧・商品詳細（モーダル）・アフィリエイトシェア・購入ボタンが表示される

### 3.4 ソシャゲ画面
- [ ] ホーム・ガチャ（モーダル）が表示される

### 3.5 フリマ画面
- [ ] 商品一覧・商品詳細（モーダル）が表示される

### 3.6 通知
- [ ] ポップアップで通知が表示される

### 3.7 精算画面
- [ ] 精算結果が表示される

### 3.8 ランキング画面
- [ ] プレイヤー名・最終ポイント数・詳細（各収入・購入/売却商品）が表示される

---

## 4. 攻略のコツ（ヒント表示）

- [ ] セール時に商品購入を推奨するヒントが表示される
- [ ] セットで商品を揃えることを推奨するヒントが表示される
- [ ] 余った商品はフリマで売ることを推奨するヒントが表示される
