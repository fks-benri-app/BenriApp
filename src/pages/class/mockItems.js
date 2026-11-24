// 開発用のダミーのお知らせ。DEV_MOCK を true にすると、お知らせの先頭に加わる(本番は false)。
// 開発用モック(コード上のスイッチ。false なら一切表示されず、本番に影響しない)
export const DEV_MOCK = false;
export const MOCK_ITEMS = [
  {
    id: '__mock_list', subject: '倫理', teacher: '秋本裕子', courseKey: '倫理', courseLabel: '倫理',
    courseFull: '倫理_２Ｆ', kind: 'announcement', time: '10月15日', isUnread: true, tag: 'general',
    content: '【モック】一問一答の箇条書き', body: '', due: '', link: 'https://classroom.google.com/c/AAA/p/DDD', attachments: [],
    rawBody: 'プリント１２一問一答解答\n1.     \n功利主義\n\n\n2.     \n功利性の原理\n\n\n3.     \n最大多数の最大幸福\n\n\n10.   \n他者危害の原則\n\nプリント１３一問一答解答\n1.     \nヘーゲル\n2.     \n絶対精神\n3.     \n「世界史は自由の意識の進歩」\n9.     \n欲望の体系\n10.   \n人倫の喪失態\n\n\n\n\n\n\n11.   \n人倫の完成態\n\nプリントNo13の一問一答答えです\n\n1ヘーゲル\n2絶対精神\n3「世界史は自由の意識の進歩」\n4弁証法\n5反，ジンテーゼ\n\n来週は10月25日に実施します。',
  },
  {
    id: '__mock_attach', subject: '古典', teacher: '召田義一', courseKey: '古典', courseLabel: '古典',
    courseFull: '古典＿２Ｆ', kind: 'announcement', time: '10月16日', isUnread: true, tag: 'general',
    content: '【モック】添付つきのお知らせ', body: '', due: '', link: 'https://classroom.google.com/c/AAA/p/BBB',
    rawBody: 'https://forms.gle/xZbA5yp8aYTGonGG8\n来年度科目選択のフォーム入力が未入力の人に送信しています。\n\nこちらへ入力をお願いします。\n    (空白と改行はそのまま表示されます)\n\n【持ち物】\n1. 筆記用具\n2. 問題集(p.40-45を解いておく。長い説明が折り返されても番号の下にそろいます)\n3. 体育館シューズ\n\n①集合は8時30分 ②解散は15時',
    attachments: [
      { type: 'drive', title: '2026w_poster.pdf', url: 'https://drive.google.com/file/d/xxx/view' },
      { type: 'drive', title: '2026年7月9日（8:39）.jpg', url: 'https://drive.google.com/file/d/yyy/view' },
      { type: 'drive', title: '読み込めない画像.png', url: 'https://drive.google.com/file/d/zzz/view', thumb: 'https://invalid.example/none.png' },
      { type: 'link', title: 'https://example.com/info', url: 'https://example.com/info' },
      { type: 'youtube', title: '解説動画', url: 'https://www.youtube.com/watch?v=xxx' },
    ],
  },
  {
    id: '__mock_assign', subject: '数学', teacher: 'テスト先生', courseKey: '数学', courseLabel: '数学',
    courseFull: '数学_２Ｆ', kind: 'assignment', time: '昨日 18:30', isUnread: true, tag: 'general',
    content: '【モック】期限つきの課題\n期限: 10月31日', body: '',
    due: '10月31日', link: 'https://classroom.google.com/c/AAA/a/CCC', attachments: [],
    postTitle: '問題集 p.40-45', rawBody: '解いて提出してください。\n分からない所は質問すること。',
  },
];
