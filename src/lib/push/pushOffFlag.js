// この端末の通知を、利用者が自分でオフにしたかの印。
import { storage } from '../data/storage';

// この端末の通知を、利用者が自分でオフにしたかどうか(オフの間は、自動でオンに戻さない)。
// FCM と通知の設定の両方から読むので、ここに独立させている。画面からは lib/notifications.js 経由で使う。
const PUSH_OFF_KEY = 'pushOffByUser';
export function isPushOffByUser() {
  return storage.get(PUSH_OFF_KEY) === '1';
}
export function setPushOffByUser(off) {
  storage.set(PUSH_OFF_KEY, off ? '1' : '0');
}
