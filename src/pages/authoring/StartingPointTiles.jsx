import { FileText, FilePlus, Copy, Sparkles } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function StartingPointTiles({ isStaff, onBrowseExtractions, onStartBlank }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 'var(--space-4)',
        marginTop: 'var(--space-6)',
      }}
    >
      <Tile
        icon={<FileText size={24} color="var(--text-secondary)" />}
        title="From an extraction"
        body="Build a scenario from a report you've already extracted."
        action={
          <Button variant="primary" onClick={onBrowseExtractions}>
            Browse extractions
          </Button>
        }
      />

      <Tile
        icon={<FilePlus size={24} color="var(--text-secondary)" />}
        title="Blank scenario"
        body="Start from scratch. Use this when you have a scenario in mind but no source report."
        action={
          <Button variant="primary" onClick={onStartBlank}>
            Start blank
          </Button>
        }
      />

      {isStaff && (
        <Tile
          icon={<Sparkles size={24} color="var(--text-secondary)" />}
          title="AI Suggestion"
          body="Have an AI agent draft a scenario for you to refine."
          disabled
          badge="Coming soon"
          tooltip="AI agent integration is being designed. Check back soon."
          action={
            <Button variant="primary" disabled>
              Draft with AI
            </Button>
          }
        />
      )}

      {isStaff && (
        <Tile
          icon={<Copy size={24} color="var(--text-disabled)" />}
          title="Clone existing scenario"
          body="Duplicate an existing scenario as a new starting point."
          disabled
          badge="Coming soon"
          tooltip="Scenario clone endpoint is planned — not yet built. Use 'From an extraction' or 'Blank' for now."
          action={
            <Button variant="primary" disabled>
              Clone
            </Button>
          }
        />
      )}
    </div>
  );
}

function Tile({ icon, title, body, action, disabled, badge, tooltip }) {
  return (
    <div title={tooltip} style={{ opacity: disabled ? 0.55 : 1, position: 'relative' }}>
      <Card>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            padding: 'var(--space-4)',
            minHeight: 180,
          }}
        >
          {badge && (
            <span
              style={{
                position: 'absolute',
                top: 'var(--space-3)',
                right: 'var(--space-3)',
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--accent-amber)',
                border: '1px solid var(--accent-amber)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 6px',
              }}
            >
              {badge}
            </span>
          )}
          <div>{icon}</div>
          <h4
            style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            {title}
          </h4>
          <p
            style={{
              fontSize: 'var(--text-base)',
              color: 'var(--text-secondary)',
              lineHeight: 1.55,
              margin: 0,
              flex: 1,
            }}
          >
            {body}
          </p>
          <div>{action}</div>
        </div>
      </Card>
    </div>
  );
}
