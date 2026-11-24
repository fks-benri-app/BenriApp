// 名前のカードを押したときの設定(アイコン画像・講座・選択教科)。ダイアログは共通の見た目。
import React, { useEffect, useRef, useState } from 'react';
import ModalDialog, { DialogButton } from '../../components/ModalDialog';
import { OPTIONS, canChooseCourse, clearAvatar, cropToAvatar, saveAvatar, saveProfile } from '../../lib/profile/profile';
import AvatarCropper from './AvatarCropper';

const chip = (on) => ({
  padding: '0.5em 0.9em', borderRadius: '999px', border: on ? 'none' : '1px solid var(--line)', fontFamily: 'inherit',
  fontSize: '0.95em', fontWeight: 600, cursor: 'pointer', background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--on-ink)' : 'var(--text-strong)',
});

export default function ProfileDialog({ studentId, profile, avatar, onAvatarChange, onClose }) {
  const [draftCourse, setDraftCourse] = useState(profile.courseLetter || '');
  const [draftSubjects, setDraftSubjects] = useState(profile.electiveSubjects || []);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  // 切り抜き中の写真(選んだ直後から、決定か戻るまで)
  const [crop, setCrop] = useState(null); // { src, zoom, area }
  const fileRef = useRef(null);
  const showCourse = canChooseCourse(studentId);

  // 写真の一時のURL。使い終わったら(次に選んだとき・閉じたとき)解放する
  const srcRef = useRef(null);
  const releaseSrc = () => {
    if (srcRef.current) URL.revokeObjectURL(srcRef.current);
    srcRef.current = null;
  };
  useEffect(() => releaseSrc, []);

  function pickImage(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setNote('');
    releaseSrc();
    srcRef.current = URL.createObjectURL(file);
    setCrop({ src: srcRef.current, zoom: 1, area: null });
  }

  function cancelCrop() {
    releaseSrc();
    setCrop(null);
  }

  async function applyCrop() {
    if (!crop || !crop.area) return;
    try {
      const dataUrl = await cropToAvatar(crop.src, crop.area);
      saveAvatar(studentId, dataUrl);
      onAvatarChange(dataUrl);
      cancelCrop();
    } catch {
      setNote('画像を使えませんでした。別の画像を選んでください。');
    }
  }

  function removeImage() {
    clearAvatar(studentId);
    onAvatarChange('');
  }

  function toggleSubject(name) {
    setDraftSubjects((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));
  }

  async function save() {
    // 変わった項目だけ書く(変わっていなければ、書かずに閉じる)
    const course = showCourse && draftCourse !== (profile.courseLetter || '') ? draftCourse : undefined;
    const subjectsChanged = draftSubjects.length !== profile.electiveSubjects.length
      || draftSubjects.some((x) => !profile.electiveSubjects.includes(x));
    if (course === undefined && !subjectsChanged) { onClose(); return; }
    setBusy(true);
    setNote('');
    try {
      await saveProfile(studentId, { courseLetter: course, electiveSubjects: subjectsChanged ? draftSubjects : undefined });
      onClose();
    } catch (e) {
      console.error(e);
      setNote(e && e.code === 'permission-denied'
        ? '保存が許可されていません。管理者の設定(ルール)を確かめてください。'
        : '保存できませんでした。通信を確かめてもう一度お試しください。');
      setBusy(false);
    }
  }

  // 切り抜き中は、切り抜きの画面だけを出す
  if (crop) {
    return (
      <ModalDialog
        onClose={cancelCrop}
        title="写真の位置"
        description="円の中に入る部分が、アイコンになります。"
        actions={(
          <>
            <DialogButton onClick={cancelCrop}>戻る</DialogButton>
            <DialogButton primary onClick={applyCrop} disabled={!crop.area}>決定</DialogButton>
          </>
        )}
      >
        <AvatarCropper
          src={crop.src}
          zoom={crop.zoom}
          setZoom={(zoom) => setCrop((c) => ({ ...c, zoom }))}
          onAreaChange={(area) => setCrop((c) => ({ ...c, area }))}
        />
        {note && <div style={{ fontSize: '0.857em', color: 'var(--warn-fg)', marginTop: '0.6em' }}>{note}</div>}
      </ModalDialog>
    );
  }

  return (
    <ModalDialog
      onClose={busy ? () => {} : onClose}
      title="設定"
      actions={(
        <>
          <DialogButton onClick={onClose} disabled={busy}>キャンセル</DialogButton>
          <DialogButton primary onClick={save} disabled={busy}>保存</DialogButton>
        </>
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.43em' }}>
        <section style={{ display: 'flex', alignItems: 'center', gap: '0.9em' }}>
          <div style={{ width: '4em', height: '4em', borderRadius: '50%', overflow: 'hidden', background: 'var(--surface-2)', flexShrink: 0 }}>
            {avatar && <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4em', alignItems: 'flex-start' }}>
            <button type="button" onClick={() => fileRef.current && fileRef.current.click()} style={{ ...chip(false), padding: '0.4em 0.8em' }}>画像を選ぶ</button>
            {avatar && <button type="button" onClick={removeImage} style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', padding: 0, fontFamily: 'inherit', cursor: 'pointer' }}>画像を消す</button>}
            <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} style={{ display: 'none' }} />
          </div>
        </section>

        {showCourse && (
          <section>
            <div style={{ fontSize: '0.857em', color: 'var(--text-muted)', marginBottom: '0.5em' }}>講座</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5em' }}>
              {OPTIONS.courseLetters.map((l) => (
                <button key={l} type="button" onClick={() => setDraftCourse(l)} style={chip(draftCourse === l)}>{l}</button>
              ))}
            </div>
          </section>
        )}

        <section>
          <div style={{ fontSize: '0.857em', color: 'var(--text-muted)', marginBottom: '0.5em' }}>選択教科</div>
          {OPTIONS.electiveSubjects.length === 0 ? (
            <div style={{ fontSize: '0.929em', color: 'var(--text-muted)' }}>教科の一覧は準備中です。</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6em' }}>
              {OPTIONS.electiveSubjects.map((name) => (
                <label key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.6em', color: 'var(--text-strong)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={draftSubjects.includes(name)} onChange={() => toggleSubject(name)} style={{ width: '1.357em', height: '1.357em', margin: 0, accentColor: 'var(--ink)' }} />
                  {name}
                </label>
              ))}
            </div>
          )}
        </section>

        {note && <div style={{ fontSize: '0.857em', color: 'var(--warn-fg)' }}>{note}</div>}
      </div>
    </ModalDialog>
  );
}
