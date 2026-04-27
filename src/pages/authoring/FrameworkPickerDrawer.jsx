import Drawer from '../../components/ui/Drawer';
import Button from '../../components/ui/Button';

function partition(items, currentClientId) {
  const platform = [];
  const ours = [];
  const others = [];
  for (const f of items) {
    if (f.client_id === null || f.client_id === undefined) platform.push(f);
    else if (f.client_id === currentClientId) ours.push(f);
    else others.push(f);
  }
  return { platform, ours, others };
}

function GroupHeader({ children }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.10em',
        color: 'var(--text-secondary)',
        padding: 'var(--space-3) var(--space-4) var(--space-2)',
      }}
    >
      {children}
    </div>
  );
}

function TierPill({ tier }) {
  if (!tier) return null;
  return (
    <span
      style={{
        fontSize: 11,
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        padding: '2px 6px',
        borderRadius: 2,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        color: 'var(--text-secondary)',
        whiteSpace: 'nowrap',
      }}
    >
      {tier}
    </span>
  );
}

function FrameworkRow({ framework, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(framework.id)}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: 'transparent',
        border: 'none',
        borderBottom: '1px solid var(--border-subtle)',
        borderLeft: selected ? '2px solid var(--accent-red)' : '2px solid transparent',
        padding: 'var(--space-3) var(--space-4)',
        cursor: 'pointer',
        color: 'inherit',
        fontFamily: 'inherit',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          marginBottom: 4,
        }}
      >
        <div
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--text-primary)',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {framework.name}
        </div>
        <TierPill tier={framework.tier} />
      </div>
      {framework.framework_description && (
        <div
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.4,
          }}
        >
          {framework.framework_description}
        </div>
      )}
    </button>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        padding: 'var(--space-8) var(--space-4)',
        textAlign: 'center',
        color: 'var(--text-secondary)',
        fontSize: 'var(--text-sm)',
        lineHeight: 1.55,
      }}
    >
      No frameworks available. Contact staff.
    </div>
  );
}

export default function FrameworkPickerDrawer({
  open,
  onClose,
  frameworks = [],
  currentClientId,
  selectedId,
  isStaff = false,
  onSelect,
}) {
  const { platform, ours, others } = partition(frameworks, currentClientId);
  const total = platform.length + ours.length + others.length;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Pick an analytical framework"
      width={480}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {total === 0 && <EmptyState />}

          {platform.length > 0 && (
            <>
              <GroupHeader>Platform frameworks</GroupHeader>
              {platform.map((f) => (
                <FrameworkRow
                  key={f.id}
                  framework={f}
                  selected={f.id === selectedId}
                  onSelect={onSelect}
                />
              ))}
            </>
          )}

          {ours.length > 0 && (
            <>
              <GroupHeader>Your org's frameworks</GroupHeader>
              {ours.map((f) => (
                <FrameworkRow
                  key={f.id}
                  framework={f}
                  selected={f.id === selectedId}
                  onSelect={onSelect}
                />
              ))}
            </>
          )}

          {others.length > 0 && (
            <>
              <GroupHeader>Other organizations</GroupHeader>
              {others.map((f) => (
                <FrameworkRow
                  key={f.id}
                  framework={f}
                  selected={f.id === selectedId}
                  onSelect={onSelect}
                />
              ))}
            </>
          )}

          {/* Staff-only "+ Create framework" — disabled (Phase 2). */}
          {isStaff && total > 0 && (
            <div
              style={{
                padding: 'var(--space-4)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
              }}
            >
              <Button variant="ghost" disabled>
                + Create framework
              </Button>
              <span
                title="Coming soon"
                style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--accent-amber)',
                  padding: '2px 6px',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 2,
                }}
              >
                Coming soon
              </span>
            </div>
          )}
        </div>

        <div
          style={{
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
