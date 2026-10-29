// 設定画面と通知の詳細画面で使う、オン/オフのスイッチ
export default function Switch({ on, disabled }) {
  return (
    <span
      style={{
        width: '3.429em',
        height: '2em',
        padding: '0.143em',
        background: on ? 'var(--text-strong)' : 'var(--switch-off)',
        borderRadius: '1em',
        display: 'flex',
        justifyContent: on ? 'flex-end' : 'flex-start',
        alignItems: 'center',
        boxSizing: 'border-box',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.15s',
      }}
    >
      <span style={{ width: '1.714em', height: '1.714em', background: 'var(--surface)', borderRadius: '50%', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }} />
    </span>
  );
}
