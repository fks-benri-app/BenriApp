import { useEffect, useState } from 'react';
import { watchUser } from '../../lib/data/liveStore';

// 学校のメールアドレス(Classroom を学校アカウントで開くために使う)と、Classroom を開く処理
// Classroom の投稿ページを開くURL。
// 学校アカウントで開くため、?authuser=学校のアドレス を付ける。アドレスは画面には出さず、この端末の localStorage にだけ置く。
// 連携ページ(GAS)から戻ってきたとき、アプリのURLの ?school=... で受け取って保存する

const SCHOOL_KEY = 'schoolEmail';
const CLASSROOM_HOME = 'https://classroom.google.com/';

function loadSchoolEmail() {
  try {
    const p = new URLSearchParams(window.location.search).get('school');
    if (p && /^[^\s@]+@[^\s@]+$/.test(p)) {
      localStorage.setItem(SCHOOL_KEY, p);
      // アドレスをURLに残さない
      const u = new URL(window.location.href);
      u.searchParams.delete('school');
      window.history.replaceState(null, '', u.toString());
    }
    return localStorage.getItem(SCHOOL_KEY) || '';
  } catch {
    return '';
  }
}

export function classroomUrl(link, email) {
  let target = String(link || '').replace(/&amp;/g, '&').trim();
  try {
    const u = new URL(target);
    // Google の転送URL(google.com/url?q=...)に包まれていたら、中身を取り出す
    if (u.hostname.endsWith('google.com') && u.pathname === '/url') {
      target = u.searchParams.get('q') || u.searchParams.get('url') || '';
    }
    if (new URL(target).hostname !== 'classroom.google.com') target = CLASSROOM_HOME;
  } catch {
    target = CLASSROOM_HOME;
  }
  // 課題(a)・資料(m)・お知らせ(p)の投稿ページは、末尾に /details がないと一覧になるので付ける
  try {
    const t = new URL(target);
    t.pathname = t.pathname.replace(/\/+$/, '').replace(/^(\/c\/[^/]+\/(?:a\vert{}m\vert{}p)\/[^/]+)$/, '$1/details');
    target = t.toString();
  } catch {
    // そのまま
  }
  if (!email) return target; // アドレスが分からないときは、そのまま開く
  // 投稿ページの末尾(/details)はそのままに、?authuser=学校のアドレス を付けて開く
  const u = new URL(target);
  u.search = '';
  u.hash = '';
  u.searchParams.set('authuser', email);
  return u.toString();
}

// Classroom の投稿ページを、今のアプリの画面からそのまま開く(新しいタブは作らない)。
// 戻る操作は、ブラウザ(端末)の戻るで、アプリに戻る想定
// 学校のアドレスを、生徒の情報(users/{studentId} の schoolEmail)から読む(短期の仕組み)。
// 読めないときは、この端末に保存された値を使う
export function useSchoolEmail(studentId) {
  const [email, setEmail] = useState('');
  useEffect(() => {
    if (!studentId) return undefined;
    return watchUser(studentId,
      (snap) => {
        const v = snap.exists() ? snap.data().schoolEmail : '';
        setEmail(typeof v === 'string' && v ? v : loadSchoolEmail());
      },
      () => setEmail(loadSchoolEmail())
    );
  }, [studentId]);
  return email || loadSchoolEmail();
}

// Classroom の投稿ページを開く。新しいタブは作らず、今の画面から移動する。
// (Android のホーム画面アプリでは、アプリ内の表示(閉じるとアプリに戻る)で開く。タブが増えない)
export function openExternal(url) {
  window.location.href = url;
}

export function withAuthuser(url, email) {
  try {
    const u = new URL(url);
    if (email && /(^|\.)google\.com$/.test(u.hostname) && !u.searchParams.has('authuser')) u.searchParams.set('authuser', email);
    return u.toString();
  } catch { return url; }
}
