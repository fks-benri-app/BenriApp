// お知らせ画面が使う、通知の状態(届いていない可能性・端末のオン/オフ)。
import { useEffect, useState } from 'react';
import { getDevicePushEnabled } from '../../lib/push/notifications';
import { usePushBroken } from '../../lib/push/pushStatus';

// お知らせ画面が使う、通知の状態。
// ・pushBroken: 通知が、端末に届いていない可能性(GAS が送れなかったことを記録している)
// ・devicePushOn: この端末の通知がオンか(オフなら、ベルに斜線を付ける)
// 開くたびに、許可済みの端末は FCM の登録トークンの更新時刻も新しくする(古い端末の掃除の対象にしないため)。
export function useDevicePushState(studentId) {
  const pushBroken = usePushBroken(studentId);

  // fcm の読み込みは、ここで必要になったときだけ行う(起動時の JS を増やさない)
  useEffect(() => {
    if (!studentId) return;
    import('../../lib/push/fcm').then((m) => m.refreshFcmTokenIfGranted(studentId)).catch(() => {});
  }, [studentId]);

  const [devicePushOn, setDevicePushOn] = useState(true);
  useEffect(() => {
    let alive = true;
    getDevicePushEnabled().then((v) => alive && setDevicePushOn(v)).catch(() => {});
    return () => { alive = false; };
  }, []);

  return { pushBroken, devicePushOn };
}
