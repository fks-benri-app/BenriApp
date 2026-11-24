// 一斉既読の確認ダイアログ。
import React from 'react';
import ModalDialog, { DialogButton } from '../../components/ModalDialog';

// 一斉既読の確認(ブラウザの確認ダイアログは、タイトルがサイトのURLになって変えられないため、アプリ内の画面で出す)
export default function ReadAllDialog({ unreadCount, onCancel, onConfirm }) {
  return (
    <ModalDialog
      onClose={onCancel}
      title="すべて既読にしますか?"
      description={`表示中の未読 ${unreadCount} 件を既読にします。`}
      actions={(
        <>
          <DialogButton onClick={onCancel}>キャンセル</DialogButton>
          <DialogButton primary onClick={onConfirm}>既読にする</DialogButton>
        </>
      )}
    />
  );
}
