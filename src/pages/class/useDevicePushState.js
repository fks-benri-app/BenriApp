// お知らせ画面が使う、通知の状態(届いていない可能性・端末のオン/オフ)。
import { useEffect, useState } from 'react';
import { ensureSubscription } from '../../lib/push/onesignal';
import { getDevicePushEnabled } from '../../lib/push/notifications';
import { usePushBroken, usePushKey, usePushSubs, useDeviceSubscriptionId, judgeDeviceBroken, markPushFixed } from '../../lib/push/pushStatus';

// お知らせ画面が使う、通知の状態。
// ・pushBroken: 通知が、この端末に届いていない可能性(GAS が確認した購読の一覧と、この端末の購読で判断する)
// ・devicePushOn: この端末の通知がオンか(オフなら、ベルに斜線を付ける)
// 開くたびに、この端末の購読が正しい状態か確認し(ずれていれば付け直す)、FCM の登録トークンの更新時刻も新しくする。
export function useDevicePushState(studentId) {
  const pushBrokenSend = usePushBroken(studentId);
  const pushSubs = usePushSubs(studentId);
  const ownSubId = useDeviceSubscriptionId(pushSubs);
  const pushBroken = judgeDeviceBroken(pushSubs, ownSubId, pushBrokenSend);
  const pushKey = usePushKey(studentId);

  useEffect(() => {
    if (!pushKey) return;
    ensureSubscription(pushKey).then((r) => { if (r && r.changed) markPushFixed(); }).catch(() => {});
  }, [pushKey]);

  // 通知が許可済みの端末は、登録トークンの更新時刻を新しくする(古い端末の掃除の対象にしないため)。
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
