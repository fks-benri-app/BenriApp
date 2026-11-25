// 在籍の授業を、GAS(本人の権限)で Classroom から記録し直す。アプリを開いた時に 1 回だけ行う。
import { gasJsonp } from '../material/gasFetch';

let done = null;

export function syncMyCourses() {
  if (!done) {
    done = gasJsonp({ action: 'courses' })
      .then((res) => { if (res?.error) console.warn('授業の同期に失敗:', res.error); })
      .catch((e) => console.warn('授業の同期に失敗:', e.message));
  }
  return done;
}
