import Drawer from '../../components/ui/Drawer';
import Button from '../../components/ui/Button';

const FAKE_CLIENTS = [
  { id: 'fake-client-001', name: 'Atlantic Strategy Review', tag: 'ORG' },
  { id: 'fake-client-002', name: 'Pacific Policy Institute', tag: 'ORG' },
  { id: 'fake-client-003', name: 'Platform / none', tag: 'PLATFORM' },
];

export default function ClientPickerDrawer({ open, onClose }) {
  return (
    <Drawer open={open} onClose={onClose} title="Pick a client" width={480} side="left">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {FAKE_CLIENTS.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => {
                // eslint-disable-next-line no-console
                console.log('[ClientPickerDrawer] picked client', row);
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border-subtle)',
                borderLeft: '3px solid transparent',
                padding: 'var(--space-3) var(--space-4)',
                cursor: 'pointer',
                color: 'inherit',
                fontFamily: 'inherit',
              }}
            >
              <div
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                  marginBottom: 4,
                }}
              >
                {row.name}
              </div>
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.08em',
                }}
              >
                {row.tag} · {row.id}
              </div>
            </button>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-start',
            padding: 'var(--space-4)',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
