# ユーザー操作による画面遷移・状態変更フロー

## 概要

ポイ活ウォーズにおけるユーザー操作は、大きく以下の4つのカテゴリに分類されます：

1. **直接的な画面遷移操作**: アプリアイコンクリックなど
2. **タスク実行による画面遷移**: タスクボタンクリックによるモーダル表示・機能解禁
3. **特殊な条件付き遷移**: 機能未解禁時の連携要求
4. **バナー広告による遷移**: 広告クリックによる画面遷移・タスク実行

## 画面遷移状態図

```plantuml
@startuml
!define RECTANGLE class

state Home {
  state TaskList
  state Timeline
  state AdBanner
  state AppList
  state ItemList
}

state ProfileEditor {
  state ProfileForm
  state SNSConnectionButton
  state ShoppingConnectionButton
}

state Shop {
  state ProductList
  state ShareButton
  state BackButton
}

state Settlement {
  state ResultAnimation
  state PointConversion
}

[*] --> Home : ゲーム開始

Home --> ProfileEditor : プロフィールアプリクリック\nプロフィールタスク実行
ProfileEditor --> Home : 設定完了

Home --> Shop : 通販アプリクリック\n通販タスク完了後自動遷移\nセール通知バナークリック
Shop --> Home : 戻るボタンクリック

Home --> Settlement : 時間切れ時のみ\n（自動遷移）
Settlement --> [*] : ランキング画面へ

note right of Settlement
  **重要な制約**
  - 時間切れ前の解禁は厳禁
  - ユーザー操作による手動起動は厳禁
  - Home → Settlement → Ranking の一方向フローのみ
end note

@enduml
```

## タスク実行フロー図

```plantuml
@startuml
!theme plain

participant User
participant TaskListE
participant TaskManager
participant ModalE
participant HomeE
participant AppListE

== プロフィールタスク実行 ==
User -> TaskListE : プロフィールタスクボタンクリック
TaskListE -> TaskManager : executeTask("profile")
TaskManager -> HomeE : onProfileSwitch()
HomeE -> HomeE : switchToProfileEditor()
note right : Profile画面に遷移

== SNSタスク実行 ==
User -> TaskListE : SNSタスクボタンクリック
TaskListE -> TaskManager : executeTask("sns")
TaskManager -> ModalE : showTimelineUnlockModal()
User -> ModalE : OKボタンクリック
ModalE -> TaskManager : completeSnsTask()
TaskManager -> HomeE : onTimelineReveal()
HomeE -> HomeE : revealTimeline()
note right : タイムライン機能解禁

== 通販タスク実行 ==
User -> TaskListE : 通販タスクボタンクリック
TaskListE -> TaskManager : executeTask("shopping")
TaskManager -> ModalE : showShoppingUnlockModal()
User -> ModalE : OKボタンクリック
ModalE -> TaskManager : completeShoppingTask()
TaskManager -> AppListE : onShopAppReveal()
AppListE -> AppListE : revealShopApp(autoOpen: true)
note right : 50ms後にアプリ解禁
AppListE -> AppListE : highlightShopApp()
note right : 600ms後にハイライト
AppListE -> HomeE : onShopClick()
note right : 1000ms後に自動遷移
HomeE -> HomeE : switchToShop()

@enduml
```

## 特殊な条件付き遷移フロー

```plantuml
@startuml
!theme plain

participant User
participant ShopE
participant HomeE
participant TaskManager
participant ProfileEditorE

== シェアボタン（タイムライン未解禁時） ==
User -> ShopE : シェアボタンクリック
ShopE -> HomeE : handleSnsConnectionRequest(fromProfile: false)
HomeE -> HomeE : switchBackFromShop()
note right : Shop → Home 遷移（500ms）
HomeE -> HomeE : executeSnsTask()
note right : 550ms後にSNSタスク実行
HomeE -> TaskManager : executeTask("sns")
note right : 以降はSNSタスク実行フローと同じ

== プロフィール画面からの連携要求 ==
User -> ProfileEditorE : SNS連携ボタンクリック
ProfileEditorE -> HomeE : handleSnsConnectionRequest(fromProfile: true)
HomeE -> HomeE : executeSnsTask()
note right : 画面遷移なしでタスク実行

User -> ProfileEditorE : 通販連携ボタンクリック
ProfileEditorE -> HomeE : handleShoppingConnectionRequest(fromProfile: true)
HomeE -> HomeE : executeShoppingTaskFromProfile()
note right : 通販アプリ解禁のみ（自動遷移なし）

@enduml
```

## バナー広告による遷移フロー

```plantuml
@startuml
!theme plain

participant User
participant AdBannerE
participant TaskManager
participant HomeE

== 通販推奨バナークリック ==
User -> AdBannerE : shopping_recommend バナークリック
AdBannerE -> TaskManager : executeTask("shopping")
note right : 以降は通販タスク実行フローと同じ

== セール通知バナークリック ==
User -> AdBannerE : sale_notification バナークリック
AdBannerE -> HomeE : switchToShop()
note right : 直接Shop画面に遷移

== SNS推奨バナークリック ==
User -> AdBannerE : sns_recommend バナークリック
AdBannerE -> TaskManager : executeTask("sns")
note right : 以降はSNSタスク実行フローと同じ

== ウェルカム広告クリック ==
User -> AdBannerE : welcome_ad バナークリック
AdBannerE -> HomeE : addScore(points)
note right : ポイント付与のみ（画面遷移なし）

@enduml
```

## 時間切れ時の自動処理フロー

```plantuml
@startuml
!theme plain

participant GameContext
participant MainScene
participant HomeE
participant AppListE
participant SettlementE

== 時間切れ検知 ==
GameContext -> MainScene : timeEnded event
MainScene -> MainScene : blockAllInteractions()
MainScene -> MainScene : triggerAutomaticSettlement()

== モーダル強制クローズ ==
MainScene -> HomeE : forceCloseAllModals()
HomeE -> HomeE : closeModal()
HomeE -> ShopE : forceCloseAllModals()
HomeE -> SettlementE : forceCloseAllModals()

== Home画面への復帰 ==
MainScene -> HomeE : returnToHomeIfNeeded()
alt Shop画面表示中
  HomeE -> HomeE : switchBackFromShop()
else Profile画面表示中  
  HomeE -> HomeE : switchBackToHome()
end

== 精算アプリ解禁・遷移 ==
MainScene -> HomeE : triggerAutomaticSettlement()
HomeE -> AppListE : revealSettlementApp(isAutomatic: true)
AppListE -> AppListE : highlightSettlementApp()
AppListE -> HomeE : onAutomaticSettlementClick()
HomeE -> HomeE : switchToSettlement()

== 固定タイマーでランキング遷移 ==
MainScene -> MainScene : setTimeout(12000ms)
note right : Settlement画面での処理と並行
MainScene -> MainScene : transitionToRanking()

@enduml
```

## ユーザー操作制御が必要な箇所

### 🔒 ロック対象操作一覧

#### 1. 直接的な画面遷移操作
- **プロフィールアプリクリック**: `AppListE.onProfileClick` → `HomeE.switchToProfileEditor()`
- **通販アプリクリック**: `AppListE.onShopClick` → `HomeE.switchToShop()`
- **戻るボタン（Shop）**: `ShopE.backButton` → `HomeE.switchBackFromShop()`
- **戻るボタン（Profile）**: `ProfileEditorE.submitButton` → `HomeE.switchBackToHome()`

#### 2. タスク実行による画面遷移
- **プロフィールタスク**: `TaskListE.executeButton("profile")` → Profile画面遷移
- **SNSタスク**: `TaskListE.executeButton("sns")` → モーダル → タイムライン解禁
- **通販タスク**: `TaskListE.executeButton("shopping")` → モーダル → Shop自動遷移
- **コレクションタスク**: `TaskListE.executeButton("*_collection")` → モーダル表示

#### 3. 特殊な条件付き遷移
- **シェアボタン（未解禁時）**: `ShopE.shareButton` → Shop→Home→SNSタスク実行
- **Profile内SNS連携**: `ProfileEditorE.connectSNSButton` → SNSタスク実行
- **Profile内通販連携**: `ProfileEditorE.connectShoppingButton` → 通販タスク実行

#### 4. バナー広告による遷移
- **通販推奨バナー**: `AdBannerE.shopping_recommend` → 通販タスク実行 → Shop自動遷移
- **セール通知バナー**: `AdBannerE.sale_notification` → Shop画面遷移
- **SNS推奨バナー**: `AdBannerE.sns_recommend` → SNSタスク実行 → タイムライン解禁

### ⚠️ 複数トリガーを持つタスクの課題

**SNSタスク**と**通販タスク**は複数のトリガーポイントを持つため、ロック解除時に実行元を特定する必要があります：

```typescript
// SNSタスクの複数トリガー
1. TaskListE → SNSタスク実行
2. ProfileEditorE → SNS連携  
3. ShopE → シェアボタン（未解禁時）

// 通販タスクの複数トリガー
1. TaskListE → 通販タスク実行
2. ProfileEditorE → 通販連携
3. AdBannerE → 通販推奨バナー
```

**解決策**: defer処理のコールバック関数を引数として渡し、呼び出し元がロック解除の責任を持つ設計に変更する。

### 📋 時間切れ時の処理要件

1. **全操作をロック**
2. **他のロックがすべて解除されるまで待機**（polling ではなく listener による通知）
3. **全モーダルを強制クローズ**（Home, Shop, Settlement のモーダル含む）
4. **現在の画面をHome画面に戻す**（Shop/Profile → Home）
5. **精算アプリ解禁 → Settlement画面遷移**

この仕様により、不測のユーザー操作による画面遷移やアニメーション競合を防ぐことができます。