# poi-katsu

> [!IMPORTANT]
> このゲームは現在開発中です。動きますが完成はしてません。

ニコ生ゲーム「ポイ活ウォーズ」のソースコードです \
ライセンスの関係から一部の画像と音声が投稿されたゲームと異なります

→ [仕様書](specification/index.md)、[モジュール構成](specification/plan.md)

ご自身のゲーム開発時の参考になれば幸いです。 \
改造、改造ゲームの投稿はご自由にどうぞ！報告やクレジット表示は不要ですが、もししていただける場合は下記の通りお願いします。

連絡先: [@yasshi2525](https://x.com/yasshi2525) \
クレジット表示: やっしー (yasshi2525)

本ソースリポジトリを複製・改造したものはGitHub等に自由に公開してもらって構いません。 \
一応ライセンスを定義していますが、特に制限[^1]はしていません。

[^1]: 制限しない理由は少しでも多くのゲーム制作者のために、敷居を設けずに役立てばと思っているからです。意図的な悪用はご遠慮ください。

## インストール方法

本リポジトリをクローンした後、`akashic-cli`などの必要なツールを使えるようにするため、以下のコマンドを実行してください。

```sh
npm install
```

### ビルド方法

本ソースコードはTypescripで書かれているため、コードを書き換えた後に以下のコマンドを実行してください。実行しないとゲームに反映されません。

```sh
npm run build
```

画像や音声ファイルを追加・変更・削除した場合は以下のコマンドを実行してください。

```sh
npm run update
```

### 動作確認方法

* ランキングモード版

以下を実行後、ブラウザで `http://localhost:3000` にアクセスすることでゲームを実行できます。

```sh
npm run start
```

* マルチプレイモード版

以下を実行後、ブラウザで `http://localhost:3300` にアクセスすることでゲームを実行できます。

```sh
npm run start:multi
```

## エクスポート方法

ニコ生ゲーム投稿用ファイルを出力するときは以下のコマンドを実行してください。`game.zip` という名前のファイルが出力されます。

```sh
npm run export-zip
```

`npm run export-html` コマンドを実行すると`game`ディレクトリに単体実行可能なHTMLファイルが出力されます。
`game/index.html` をブラウザで開くと単体動作させることができます。

## テスト方法

```sh
npm test
```

## Author

yasshi2525 ([X](https://x.com/yasshi2525))

## License

- Source code: [MIT License](./LICENSE)
- Rendered images and audio: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
