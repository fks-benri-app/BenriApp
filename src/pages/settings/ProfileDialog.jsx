// 名前のカードを押したときの設定(アイコン画像・講座・選択教科)。ダイアログは共通の見た目。
import React, { useRef, useState } from 'react';
import ModalDialog, { DialogButton } from '../../components/ModalDialog';
import { OPTIONS, canChooseCourse, clearAvatar, imageToAvatar, saveAvatar, saveProfile } from '../../lib/profile/profile';

const chip = (on) => ({
  padding: '0.5em 0.9em', borderRadius: '999px', border: on ? 'none' : '1px solid var(--line)', fontFamily: 'inherit',
  fontSize: '0.95em', fontWeight: 600, cursor: 'pointer', background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--on-ink)' : 'var(--text-strong)',
});

export default function ProfileDialog({ studentId, profile, avatar, onAvatarChange, onClose }) {
  const [draftCourse, setDraftCourse] = useState(profile.courseLetter || '');
  const [draftSubjects, setDraftSubjects] = useState(profile.electiveSubjects || []);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const fileRef = useRef(null);
  const showCourse = canChooseCourse(studentId);

  async function pickImage(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await imageToAvatar(file);
      saveAvatar(studentId, dataUrl);
      onAvatarChange(dataUrl);
      setNote('');
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
    setBusy(true);
    setNote('');
    try {
      await saveProfile(studentId, { courseLetter: showCourse ? draftCourse : undefined, electiveSubjects: draftSubjects });
      onClose();
    } catch {
      setNote('保存できませんでした。通信を確かめてもう一度お試しください。');
      setBusy(false);
    }
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
              <button type="button" onClick={() => setDraftCourse('')} style={chip(draftCourse === '')}>なし</button>
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
