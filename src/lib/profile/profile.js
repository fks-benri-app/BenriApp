// 生徒の設定(講座・選択教科は Firestore に保存、アイコン画像は端末だけに保存)。
import { useEffect, useState } from 'react';
import settingsOptions from '../../data/settingsOptions.json';
import { updateUserDoc, userDoc } from '../data/firestoreLazy';
import { peekLive, watchLive } from '../data/liveStore';
import { storage } from '../data/storage';

export const OPTIONS = settingsOptions;

// 学籍番号の先頭2桁から学年(1〜3)を出す。範囲外や形式が違うときは null(Settings の classOf と同じ基準)
export function gradeOf(id) {
  if (!/^\d{6}$/.test(id)) return null;
  const entry = 2000 + Number(id.slice(0, 2));
  const now = new Date();
  const year = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  const grade = year - entry + 1;
  return grade >= 1 && grade <= 3 ? grade : null;
}

export const canChooseCourse = (id) => OPTIONS.courseGrades.includes(gradeOf(id));

const EMPTY = { courseLetter: '', electiveSubjects: [] };
const profileKey = (id) => 'profile:' + id;

// users/{id} の設定(講座・選択教科)を購読する。端末に覚えておき、次回もすぐ出す
export function useProfile(studentId) {
  const [profile, setProfile] = useState(() => (studentId && peekLive(profileKey(studentId))) || EMPTY);
  useEffect(() => {
    if (!studentId) return undefined;
    return watchLive(
      profileKey(studentId),
      userDoc(studentId),
      { onValue: setProfile },
      {
        derive: (snap) => {
          const d = (snap.exists() && snap.data()) || {};
          return {
            courseLetter: typeof d.courseLetter === 'string' ? d.courseLetter : '',
            electiveSubjects: Array.isArray(d.electiveSubjects) ? d.electiveSubjects.filter((x) => typeof x === 'string') : [],
          };
        },
        toStored: (v) => v,
      }
    );
  }, [studentId]);
  return profile;
}

// 講座と選択教科を保存する(本人だけが書けるよう、ルールで2つの項目に限っている)
export async function saveProfile(studentId, { courseLetter, electiveSubjects }) {
  const data = { electiveSubjects };
  if (courseLetter !== undefined) data.courseLetter = courseLetter;
  await updateUserDoc(studentId, data);
}

// アイコン画像(端末だけに保存。サーバーには送らない。端末を変えると消える)
const avatarKey = (id) => 'avatar:' + id;
export const loadAvatar = (id) => {
  try { return storage.get(avatarKey(id)) || ''; } catch { return ''; }
};
export const saveAvatar = (id, dataUrl) => {
  try { storage.set(avatarKey(id), dataUrl); } catch { /* 保存できなくても、この画面の表示は続ける */ }
};
export const clearAvatar = (id) => {
  try { storage.remove(avatarKey(id)); } catch { /* 無視 */ }
};

// 選んだ画像を、正方形の小さな JPEG にする(端末の保存を小さく保つため)
export function imageToAvatar(file, size = 160) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('画像を読み込めませんでした')); };
    img.src = url;
  });
}
