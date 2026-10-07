import React from 'react';
import { useIdentity } from '../auth/identity';

// ★ ここに FlutterFlow で作っていたページの React コードを移植する。
//   ログイン中の生徒IDが必要なときは useIdentity() から取る。
export default function HomePage() {
  const { identity, signOut } = useIdentity();

  return (
    <div style={{
      width: '100%',
      maxWidth: 480,
      minHeight: '100vh',
      margin: '0 auto',
      background: 'white',
      overflow: 'hidden',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      display: 'flex',
      boxSizing: 'border-box'
    }}>
      <div style={{ alignSelf: 'stretch', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', gap: 12, display: 'flex' }}>
        <div style={{ alignSelf: 'stretch', height: 44, paddingLeft: 24, paddingRight: 24, justifyContent: 'space-between', alignItems: 'center', display: 'inline-flex' }}>
          <div style={{ color: '#111827', fontSize: 14, fontFamily: 'Inter', fontWeight: '600', wordWrap: 'break-word' }}>8:15</div>
          <div style={{ justifyContent: 'flex-start', alignItems: 'center', gap: 6, display: 'flex' }}>
            <img style={{ width: 18, height: 12, position: 'relative' }} src="https://placehold.co/18x12" alt="status" />
            <img style={{ width: 16, height: 12, position: 'relative' }} src="https://placehold.co/16x12" alt="wifi" />
            <img style={{ width: 24, height: 12, position: 'relative' }} src="https://placehold.co/24x12" alt="battery" />
          </div>
        </div>
        <div style={{ alignSelf: 'stretch', paddingLeft: 24, paddingRight: 24, justifyContent: 'space-between', alignItems: 'center', display: 'inline-flex' }}>
          <div style={{ color: '#111827', fontSize: 22, fontFamily: 'Inter', fontWeight: '800', wordWrap: 'break-word' }}>クラスルームからのお知らせ</div>
          <img style={{ width: 22, height: 22, position: 'relative' }} src="https://placehold.co/22x22" alt="bell" />
        </div>
        <div style={{ alignSelf: 'stretch', paddingLeft: 24, paddingRight: 24, paddingTop: 8, paddingBottom: 8, justifyContent: 'flex-start', alignItems: 'flex-start', gap: 8, display: 'inline-flex', overflowX: 'auto' }}>
          <div style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 8, paddingBottom: 8, background: 'linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%)', borderRadius: 12, justifyContent: 'flex-start', alignItems: 'flex-start', display: 'flex' }}>
            <div style={{ color: 'white', fontSize: 14, fontFamily: 'Inter', fontWeight: '700', wordWrap: 'break-word' }}>すべて</div>
          </div>
          <div style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 8, paddingBottom: 8, background: 'white', borderRadius: 12, outline: '1px #E5E7EB solid', outlineOffset: '-1px', justifyContent: 'flex-start', alignItems: 'flex-start', display: 'flex' }}>
            <div style={{ color: '#6B7280', fontSize: 14, fontFamily: 'Inter', fontWeight: '400', wordWrap: 'break-word' }}>未読</div>
          </div>
          <div style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 8, paddingBottom: 8, background: 'white', borderRadius: 12, outline: '1px #E5E7EB solid', outlineOffset: '-1px', justifyContent: 'flex-start', alignItems: 'flex-start', display: 'flex' }}>
            <div style={{ color: '#6B7280', fontSize: 14, fontFamily: 'Inter', fontWeight: '400', wordWrap: 'break-word' }}>テスト関連</div>
          </div>
        </div>
      </div>

      <div style={{ alignSelf: 'stretch', paddingLeft: 24, paddingRight: 24, paddingTop: 12, paddingBottom: 12, flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', gap: 12, display: 'flex', flex: 1 }}>
        <div style={{ alignSelf: 'stretch', padding: 16, background: 'white', borderRadius: 24, outline: '1.50px #FF4D4D solid', outlineOffset: '-1.50px', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', gap: 12, display: 'flex' }}>
          <div style={{ alignSelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', display: 'inline-flex' }}>
            <div style={{ justifyContent: 'flex-start', alignItems: 'center', gap: 8, display: 'flex' }}>
              <div style={{ paddingLeft: 8, paddingRight: 8, paddingTop: 4, paddingBottom: 4, background: '#F3F4F6', borderRadius: 6, justifyContent: 'flex-start', alignItems: 'flex-start', display: 'flex' }}>
                <div style={{ color: '#111827', fontSize: 11, fontFamily: 'Inter', fontWeight: '700', wordWrap: 'break-word' }}>数学A</div>
              </div>
              <div style={{ color: '#6B7280', fontSize: 12, fontFamily: 'Inter', fontWeight: '600', wordWrap: 'break-word' }}>佐藤先生</div>
            </div>
            <div style={{ justifyContent: 'flex-start', alignItems: 'center', gap: 6, display: 'flex' }}>
              <div style={{ color: '#6B7280', fontSize: 12, fontFamily: 'Inter', fontWeight: '400', wordWrap: 'break-word' }}>今日 08:30</div>
              <div style={{ width: 8, height: 8, background: 'linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%)', borderRadius: 9999 }} />
            </div>
          </div>
          <div style={{ alignSelf: 'stretch', color: '#111827', fontSize: 14, fontFamily: 'Inter', fontWeight: '400', lineHeight: '20px', wordWrap: 'break-word' }}>今日の宿題提出について、授業開始前に提出用ロッカーに入れておいてください。忘れた場合は減点対象となります。</div>
        </div>

        <div style={{ alignSelf: 'stretch', padding: 16, background: 'white', borderRadius: 24, outline: '1px #E5E7EB solid', outlineOffset: '-1px', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', gap: 12, display: 'flex' }}>
          <div style={{ alignSelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', display: 'inline-flex' }}>
            <div style={{ justifyContent: 'flex-start', alignItems: 'center', gap: 8, display: 'flex' }}>
              <div style={{ paddingLeft: 8, paddingRight: 8, paddingTop: 4, paddingBottom: 4, background: '#F3F4F6', borderRadius: 6, justifyContent: 'flex-start', alignItems: 'flex-start', display: 'flex' }}>
                <div style={{ color: '#111827', fontSize: 11, fontFamily: 'Inter', fontWeight: '700', wordWrap: 'break-word' }}>英語II</div>
              </div>
              <div style={{ color: '#6B7280', fontSize: 12, fontFamily: 'Inter', fontWeight: '600', wordWrap: 'break-word' }}>鈴木先生</div>
            </div>
            <div style={{ justifyContent: 'flex-start', alignItems: 'center', gap: 6, display: 'flex' }}>
              <div style={{ color: '#6B7280', fontSize: 12, fontFamily: 'Inter', fontWeight: '400', wordWrap: 'break-word' }}>昨日 16:15</div>
            </div>
          </div>
          <div style={{ alignSelf: 'stretch', color: '#111827', fontSize: 14, fontFamily: 'Inter', fontWeight: '400', lineHeight: '20px', wordWrap: 'break-word' }}>暗唱課題の提出締め切りを、明日の17:00まで延長します。まだ録音データを送信していない人は必ず提出してください。</div>
        </div>

        <div style={{ alignSelf: 'stretch', padding: 16, background: 'white', borderRadius: 24, outline: '1.50px #FF4D4D solid', outlineOffset: '-1.50px', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', gap: 12, display: 'flex' }}>
          <div style={{ alignSelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', display: 'inline-flex' }}>
            <div style={{ justifyContent: 'flex-start', alignItems: 'center', gap: 8, display: 'flex' }}>
              <div style={{ paddingLeft: 8, paddingRight: 8, paddingTop: 4, paddingBottom: 4, background: '#F3F4F6', borderRadius: 6, justifyContent: 'flex-start', alignItems: 'flex-start', display: 'flex' }}>
                <div style={{ color: '#111827', fontSize: 11, fontFamily: 'Inter', fontWeight: '700', wordWrap: 'break-word' }}>物理</div>
              </div>
              <div style={{ color: '#6B7280', fontSize: 12, fontFamily: 'Inter', fontWeight: '600', wordWrap: 'break-word' }}>田中先生</div>
            </div>
            <div style={{ justifyContent: 'flex-start', alignItems: 'center', gap: 6, display: 'flex' }}>
              <div style={{ color: '#6B7280', fontSize: 12, fontFamily: 'Inter', fontWeight: '400', wordWrap: 'break-word' }}>10月22日</div>
              <div style={{ width: 8, height: 8, background: 'linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%)', borderRadius: 9999 }} />
            </div>
          </div>
          <div style={{ alignSelf: 'stretch', color: '#111827', fontSize: 14, fontFamily: 'Inter', fontWeight: '400', lineHeight: '20px', wordWrap: 'break-word' }}>実験レポートの書き方に関する手引き資料をアップロードしました。各自ダウンロードして目を通しておくようにしてください。</div>
        </div>
      </div>

      <div style={{ alignSelf: 'stretch', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', display: 'flex', position: 'sticky', bottom: 0, background: 'white' }}>
        <div style={{ alignSelf: 'stretch', height: 84, paddingLeft: 16, paddingRight: 16, background: 'white', borderTop: '1px #E5E7EB solid', justifyContent: 'space-between', alignItems: 'center', display: 'inline-flex' }}>
          <div style={{ width: 80, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 4, display: 'inline-flex' }}>
            <img style={{ width: 22, height: 22, position: 'relative' }} src="https://placehold.co/22x22" alt="home" />
            <div style={{ color: '#6B7280', fontSize: 11, fontFamily: 'Inter', fontWeight: '600', wordWrap: 'break-word' }}>ホーム</div>
          </div>
          <div style={{ width: 80, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 4, display: 'inline-flex' }}>
            <img style={{ width: 22, height: 22, position: 'relative' }} src="https://placehold.co/22x22" alt="calendar" />
            <div style={{ color: '#6B7280', fontSize: 11, fontFamily: 'Inter', fontWeight: '600', wordWrap: 'break-word' }}>カレンダー</div>
          </div>
          <div style={{ width: 80, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 4, display: 'inline-flex' }}>
            <img style={{ width: 22, height: 22, position: 'relative' }} src="https://placehold.co/22x22" alt="class" />
            <div style={{ color: '#111827', fontSize: 11, fontFamily: 'Inter', fontWeight: '600', wordWrap: 'break-word' }}>クラス</div>
          </div>
          <div style={{ width: 80, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 4, display: 'inline-flex' }}>
            <img style={{ width: 22, height: 22, position: 'relative' }} src="https://placehold.co/22x22" alt="settings" />
            <div style={{ color: '#6B7280', fontSize: 11, fontFamily: 'Inter', fontWeight: '600', wordWrap: 'break-word' }}>設定</div>
          </div>
        </div>
        <div style={{ alignSelf: 'stretch', paddingBottom: 8, flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', display: 'flex' }}>
          <div style={{ width: 134, height: 5, opacity: 0.30, background: '#111827', borderRadius: 100 }} />
        </div>
      </div>
    </div>
  );
}
