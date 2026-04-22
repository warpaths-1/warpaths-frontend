import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Upload, AlertTriangle, X, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Skeleton from '../components/ui/Skeleton';
import ProgressBar from '../components/ui/ProgressBar';
import Modal from '../components/ui/Modal';
import Drawer from '../components/ui/Drawer';
import Card from '../components/ui/Card';
import Toggle from '../components/ui/Toggle';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  ingestReport,
  getReportExtraction,
  getClient,
  getClientExtractions,
  getClientExtraction,
  patchClientExtraction,
  deleteClientExtraction,
  applyTag,
  removeTag,
  getClientTags,
  createClientTag,
} from '../api/extraction';

/*
 * Query keys used in this file:
 * ['extractions', clientId, tagId]   — extraction list
 * ['client', clientId]               — client/quota data
 * ['extraction', reId]               — report extraction by ID
 * ['clientExtraction', clientId, ceId] — client extraction record
 * ['tags', clientId]                 — tag library (lazy)
 */

// ── Utility ───────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${month} ${day}, ${year} · ${hh}:${mm} UTC`;
}

// ── Display primitives ────────────────────────────────────────────────────────

function FieldBlock({ label, children, variant = 'default' }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
        letterSpacing: '0.10em', color: 'var(--text-secondary)', marginBottom: 5,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: variant === 'mono' ? 'var(--text-sm)' : 'var(--text-base)',
        fontFamily: variant === 'mono' ? 'var(--font-mono)' : 'var(--font-sans)',
        color: variant === 'secondary' ? 'var(--text-secondary)' : 'var(--text-primary)',
        lineHeight: 1.65,
      }}>
        {children}
      </div>
    </div>
  );
}

function SectionDivider() {
  return <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '18px 0' }} />;
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
      letterSpacing: '0.10em', color: 'var(--text-secondary)', marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

function DomainTagChip({ label }) {
  return (
    <span style={{
      fontSize: 10, fontFamily: 'var(--font-mono)', padding: '3px 8px', borderRadius: 2,
      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
      color: 'var(--text-secondary)',
    }}>
      {label}
    </span>
  );
}

function SeedCard({ index, body, supportingDetail }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
      borderRadius: 3, padding: '12px 14px', marginBottom: 8,
    }}>
      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-disabled)', marginBottom: 5 }}>
        {String(index + 1).padStart(2, '0')}
      </div>
      <div style={{ fontSize: 'var(--text-base)', color: 'var(--text-primary)', lineHeight: 1.6 }}>{body}</div>
      {supportingDetail && (
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 5 }}>{supportingDetail}</div>
      )}
    </div>
  );
}

function formatPageRange(c) {
  if (c == null) return '';
  if (c.page_start != null && c.page_end != null && c.page_start !== c.page_end) return `pp. ${c.page_start}–${c.page_end}`;
  if (c.page_start != null) return `p. ${c.page_start}`;
  if (c.page_end != null) return `p. ${c.page_end}`;
  return '';
}

function CitationsBlock({ citations }) {
  const [open, setOpen] = useState(false);
  const list = citations || [];
  if (list.length === 0) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
          letterSpacing: '0.10em', color: 'var(--text-secondary)', cursor: 'pointer',
        }}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Supporting Citations ({list.length})
      </div>
      {open && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map((c, i) => (
            <div key={i} style={{
              background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)',
              borderRadius: 3, padding: '8px 10px',
            }}>
              <div style={{ fontSize: 'var(--text-base)', color: 'var(--text-primary)', lineHeight: 1.55, fontStyle: 'italic' }}>
                “{c.quote}”
              </div>
              <div style={{
                fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)',
                marginTop: 4,
              }}>
                {formatPageRange(c)}
              </div>
              {c.notes && (
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
                  {c.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClaimCard({ body, citations }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
      borderRadius: 3, padding: '12px 14px', marginBottom: 8,
    }}>
      <div style={{ fontSize: 'var(--text-base)', color: 'var(--text-primary)', lineHeight: 1.6 }}>{body}</div>
      <CitationsBlock citations={citations} />
    </div>
  );
}

function StatGrid({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>{children}</div>;
}

function StatCell({ label, children, fullWidth }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
      borderRadius: 3, padding: '10px 12px',
      gridColumn: fullWidth ? '1 / -1' : undefined,
    }}>
      <div style={{
        fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
        letterSpacing: '0.10em', color: 'var(--text-secondary)', marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
        {children}
      </div>
    </div>
  );
}

function ConfidenceMeter({ label, value }) {
  const pct = Math.round((value ?? 0) * 100);
  const fillColor = value >= 0.70 ? 'var(--accent-teal)' : value >= 0.50 ? 'var(--accent-amber)' : 'var(--accent-red)';
  const textColor = value >= 0.70 ? 'var(--accent-teal-bright)' : value >= 0.50 ? 'var(--accent-amber)' : 'var(--accent-red)';
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
        letterSpacing: '0.10em', color: 'var(--text-secondary)', marginBottom: 5,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 4, background: 'var(--bg-elevated)', borderRadius: 2 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: fillColor, borderRadius: 2 }} />
        </div>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: textColor, minWidth: 32, textAlign: 'right' }}>
          {pct}%
        </span>
      </div>
    </div>
  );
}

// ── Tab content ───────────────────────────────────────────────────────────────

function NumberedList({ items }) {
  const list = items || [];
  if (!list.length) return <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-disabled)' }}>—</span>;
  return (
    <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {list.map((item, i) => (
        <li key={i} style={{ fontSize: 'var(--text-base)', color: 'var(--text-primary)', lineHeight: 1.65 }}>{item}</li>
      ))}
    </ol>
  );
}

function BulletedList({ items }) {
  const list = items || [];
  if (!list.length) return null;
  return (
    <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {list.map((item, i) => (
        <li key={i} style={{ fontSize: 'var(--text-base)', color: 'var(--text-primary)', lineHeight: 1.65 }}>{item}</li>
      ))}
    </ul>
  );
}

function TagChipList({ items }) {
  const list = items || [];
  if (!list.length) return <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-disabled)' }}>—</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {list.map((t, i) => <DomainTagChip key={i} label={t} />)}
    </div>
  );
}

function TabGameBrief({ re }) {
  const brief = re?.report_brief || {};
  const suggestion = re?.scenario_suggestion || {};
  const tension = re?.tension_suggestion || null;
  const timeHorizon = suggestion.time_horizon || {};

  return (
    <div style={{ padding: '20px 20px' }}>
      <FieldBlock label="WHY THIS GAME">{brief.why_this_game || '—'}</FieldBlock>
      <FieldBlock label="SCENARIO NARRATIVE">{suggestion.scenario_narrative || '—'}</FieldBlock>

      <FieldBlock label="SCENARIO TITLE">{suggestion.title || '—'}</FieldBlock>
      <FieldBlock label="SETTING">{suggestion.setting || '—'}</FieldBlock>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FieldBlock label="CATEGORY">{suggestion.category || '—'}</FieldBlock>
        <FieldBlock label="SUBCATEGORY">{suggestion.subcategory || '—'}</FieldBlock>
      </div>

      <FieldBlock label="CENTRAL CRISIS">{suggestion.central_crisis || '—'}</FieldBlock>
      <FieldBlock label="ESCALATION DYNAMICS">{suggestion.escalation_dynamics || '—'}</FieldBlock>

      <FieldBlock label="KEY ASSUMPTIONS">
        <NumberedList items={suggestion.key_assumptions} />
      </FieldBlock>

      <FieldBlock label="PRIMARY GEOGRAPHIES">
        <TagChipList items={suggestion.primary_geographies} />
      </FieldBlock>

      <FieldBlock label="STRATEGIC DOMAIN TAGS">
        <TagChipList items={brief.strategic_domain_tags} />
      </FieldBlock>

      <SectionDivider />
      <SectionLabel>TIME HORIZON</SectionLabel>
      <FieldBlock label="PLANNING HORIZON">{timeHorizon.planning_horizon || '—'}</FieldBlock>
      <FieldBlock label="INCIDENT HORIZON">{timeHorizon.incident_horizon || '—'}</FieldBlock>
      <FieldBlock label="NOTES" variant="secondary">{timeHorizon.notes || '—'}</FieldBlock>

      <SectionDivider />
      <SectionLabel>TENSION SUGGESTION</SectionLabel>
      <FieldBlock label="NAME">{tension?.name || '—'}</FieldBlock>
      <FieldBlock label="DEFINITION">{tension?.definition || '—'}</FieldBlock>
      <FieldBlock label="RATIONALE">{tension?.rationale || '—'}</FieldBlock>
      <FieldBlock label="SUGGESTED STARTING LEVEL" variant="mono">
        {tension?.suggested_starting_level != null ? tension.suggested_starting_level : '—'}
      </FieldBlock>

      <SectionDivider />
      <FieldBlock label="KICKOFF QUESTION">{re?.kickoff_question || '—'}</FieldBlock>
    </div>
  );
}

function TabSourceReport({ re }) {
  const brief = re?.report_brief || {};
  const keyClaims = brief.key_claims || [];
  const policyImplications = brief.policy_implications || [];
  const citedFragments = brief.cited_fragments || [];

  return (
    <div style={{ padding: '20px 20px' }}>
      <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
        {brief.report_title || '—'}
      </div>
      {brief.report_subtitle && (
        <div style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>
          {brief.report_subtitle}
        </div>
      )}
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 12 }}>
        {[
          brief.publisher,
          brief.report_authors?.length ? brief.report_authors.join(', ') : null,
          brief.publication_date,
        ].filter(Boolean).join(' · ') || ''}
      </div>
      <FieldBlock label="CORE THESIS" variant="secondary">{brief.core_thesis || '—'}</FieldBlock>

      <SectionDivider />
      <SectionLabel>KEY CLAIMS</SectionLabel>
      {keyClaims.length > 0
        ? keyClaims.map((k, i) => (
            <ClaimCard key={i} body={k.claim} citations={k.supporting_citations} />
          ))
        : <div style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)' }}>No key claims.</div>
      }

      <SectionDivider />
      <SectionLabel>POLICY IMPLICATIONS</SectionLabel>
      {policyImplications.length > 0
        ? policyImplications.map((p, i) => (
            <ClaimCard key={i} body={p.implication} citations={p.supporting_citations} />
          ))
        : <div style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)' }}>No policy implications.</div>
      }

      <SectionDivider />
      <SectionLabel>CITED FRAGMENTS</SectionLabel>
      {citedFragments.length > 0
        ? citedFragments.map((c, i) => (
            <div key={i} style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
              borderRadius: 3, padding: '12px 14px', marginBottom: 8,
            }}>
              <div style={{ fontSize: 'var(--text-base)', color: 'var(--text-primary)', lineHeight: 1.6, fontStyle: 'italic' }}>
                “{c.quote}”
              </div>
              <div style={{
                fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)',
                marginTop: 5,
              }}>
                {formatPageRange(c)}
              </div>
              {c.notes && (
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 5, lineHeight: 1.5 }}>
                  {c.notes}
                </div>
              )}
            </div>
          ))
        : <div style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)' }}>No cited fragments.</div>
      }
    </div>
  );
}

function TabActors({ re }) {
  const actors = re?.actor_suggestions || [];
  if (!actors.length) {
    return (
      <div style={{ padding: '20px 20px' }}>
        <div style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)' }}>No actors suggested.</div>
      </div>
    );
  }
  return (
    <div style={{ padding: '20px 20px' }}>
      {actors.map((a, i) => (
        <div key={i}>
          <Card variant="default">
            <div style={{ padding: '14px 16px' }}>
              <h4 style={{
                fontSize: 15, fontWeight: 600, color: 'var(--text-primary)',
                margin: '0 0 4px',
              }}>
                {a.name}
              </h4>
              <div style={{
                fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14,
              }}>
                {[a.role, a.type].filter(Boolean).join(' · ')}
              </div>
              <FieldBlock label="CURRENT POSTURE">{a.current_posture || '—'}</FieldBlock>
              <FieldBlock label="CAPABILITIES">{a.capabilities_overview || '—'}</FieldBlock>
              <FieldBlock label="RELATIONSHIPS">{a.relationships_overview || '—'}</FieldBlock>
              <FieldBlock label="OBJECTIVES">
                <NumberedList items={a.objectives} />
              </FieldBlock>
              <FieldBlock label="VISIBLE TO PLAYER">
                <Toggle checked={!!a.is_visible_to_player} disabled onChange={() => {}} />
              </FieldBlock>
              <CitationsBlock citations={a.supporting_citations} />
            </div>
          </Card>
          {i < actors.length - 1 && <SectionDivider />}
        </div>
      ))}
    </div>
  );
}

function TabInjectSeeds({ re }) {
  const seeds = re?.inject_seeds || [];
  if (!seeds.length) {
    return (
      <div style={{ padding: '20px 20px' }}>
        <div style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)' }}>No seeds returned.</div>
      </div>
    );
  }
  return (
    <div style={{ padding: '20px 20px' }}>
      {seeds.map((s, i) => (
        <div key={i} style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
          borderRadius: 3, padding: '14px 16px', marginBottom: 10,
        }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-disabled)', marginBottom: 6 }}>
            {String(i + 1).padStart(2, '0')}
          </div>
          {s.title && (
            <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
              {s.title}
            </div>
          )}
          <div style={{ fontSize: 'var(--text-base)', color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {s.seed_text || '—'}
          </div>
          {s.suggested_types?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{
                fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                letterSpacing: '0.10em', color: 'var(--text-secondary)', marginBottom: 5,
              }}>
                SUGGESTED TYPES
              </div>
              <TagChipList items={s.suggested_types} />
            </div>
          )}
          {s.aggravating_factors?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{
                fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                letterSpacing: '0.10em', color: 'var(--text-secondary)', marginBottom: 5,
              }}>
                AGGRAVATING FACTORS
              </div>
              <BulletedList items={s.aggravating_factors} />
            </div>
          )}
          <CitationsBlock citations={s.supporting_citations} />
        </div>
      ))}
    </div>
  );
}

function TabAdminNotes({ value, onChange, onBlur, savedVisible }) {
  return (
    <div style={{ padding: '20px 20px' }}>
      <SectionLabel>ADMIN NOTES</SectionLabel>
      <Textarea
        placeholder="Add notes — authoring decisions, quality observations, follow-up items…"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        rows={6}
      />
      {savedVisible && (
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-disabled)', marginTop: 4 }}>
          Saved
        </div>
      )}
    </div>
  );
}

function TabExtractionDetails({ re, reportsUsed, effectiveLimit, isStaff }) {
  const usedDisplay = reportsUsed != null && effectiveLimit != null
    ? `${reportsUsed} of ${effectiveLimit} this period`
    : '—';
  const notes = re?.generation_notes || {};
  const hasNotes = !!(notes.limits || notes.known_gaps);
  const pdfRef = re?.source_pdf_ref || {};

  return (
    <div style={{ padding: '20px 20px' }}>
      {hasNotes && (
        <div style={{ marginBottom: 18 }}>
          <Card variant="warning">
            <div style={{ padding: '14px 16px' }}>
              {notes.limits && (
                <FieldBlock label="EXTRACTION LIMITS" variant="secondary">{notes.limits}</FieldBlock>
              )}
              {notes.known_gaps && (
                <div style={{ marginBottom: 0 }}>
                  <div style={{
                    fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                    letterSpacing: '0.10em', color: 'var(--text-secondary)', marginBottom: 5,
                  }}>
                    KNOWN GAPS
                  </div>
                  <div style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                    {notes.known_gaps}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      <SectionDivider />
      <StatGrid>
        <StatCell label="Status"><Badge status={re?.extraction_status || 'draft'} /></StatCell>
        <StatCell label="Extraction ID">
          {re?.report_extraction_id ? `${re.report_extraction_id.slice(0, 12)}…` : '—'}
        </StatCell>
        <StatCell label="Source Type">{pdfRef.source_type || '—'}</StatCell>
        <StatCell label="SHA-256 Fingerprint">
          {pdfRef.sha256 ? `${pdfRef.sha256.slice(0, 16)}…` : '—'}
        </StatCell>
        <StatCell label="Extractions Used" fullWidth>{usedDisplay}</StatCell>
      </StatGrid>

      <div style={{ height: 12 }} />
      <FieldBlock label="EXTRACTED AT" variant="mono">{formatDate(re?.extracted_at)}</FieldBlock>
      <FieldBlock label="FRAMEWORK TIER" variant="mono">{re?.suggested_framework_tier || '—'}</FieldBlock>

      {isStaff && (
        <>
          <SectionDivider />
          <SectionLabel>STAFF</SectionLabel>
          <FieldBlock label="RECORD CREATED" variant="mono">{formatDate(re?.created_at)}</FieldBlock>
          <FieldBlock label="SCHEMA VERSION" variant="mono">{re?.schema_version || '—'}</FieldBlock>
        </>
      )}
    </div>
  );
}

// ── Interaction sub-components ────────────────────────────────────────────────

function FilterChip({ label, active, onClick }) {
  return (
    <span
      onClick={onClick}
      style={{
        fontSize: 10, fontFamily: 'var(--font-mono)', padding: '3px 8px', borderRadius: 2,
        background: 'var(--bg-elevated)',
        border: active ? '1px solid var(--accent-teal)' : '1px solid var(--border-subtle)',
        color: active ? 'var(--accent-teal-bright)' : 'var(--text-secondary)',
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

function ListItemTagChip({ label }) {
  return (
    <span style={{
      fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 6px', borderRadius: 2,
      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
      color: 'var(--text-disabled)',
    }}>
      {label}
    </span>
  );
}

function ListItem({ ce, selected, onClick }) {
  const title = ce.display_name || ce.report_title || 'Untitled';
  const date = ce.extracted_at
    ? new Date(ce.extracted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
  const showBadge = ce.extraction_status === 'failed' || ce.extraction_status === 'pending';
  const hasScenarios = !!(ce.scenario_ids?.length);
  const tags = ce.tags || [];

  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 14px 10px 11px',
        borderBottom: '1px solid var(--border-subtle)',
        borderLeft: selected ? '3px solid var(--accent-red)' : '3px solid transparent',
        background: selected ? 'var(--bg-elevated)' : 'transparent',
        cursor: 'pointer',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{
        fontSize: 13, color: 'var(--text-primary)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3,
      }}>
        {title}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: tags.length ? 5 : 0,
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{date}</span>
        {showBadge && <Badge status={ce.extraction_status} />}
      </div>
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: hasScenarios ? 5 : 0 }}>
          {tags.map(t => <ListItemTagChip key={t.id} label={t.name} />)}
        </div>
      )}
      {hasScenarios && (
        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--accent-teal-bright)' }}>
          ● Scenario created
        </div>
      )}
    </div>
  );
}

function AppliedTagChip({ label, onRemove }) {
  return (
    <span style={{
      fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 7px', borderRadius: 2,
      background: 'var(--bg-elevated)', border: '1px solid var(--border-active)',
      color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      {label}
      <span
        onClick={onRemove}
        style={{ fontSize: 9, color: 'var(--text-disabled)', cursor: 'pointer', lineHeight: 1 }}
      >
        ×
      </span>
    </span>
  );
}

function DropdownItem({ children, onClick, teal }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 36, display: 'flex', alignItems: 'center', padding: '0 10px',
        fontSize: 12, fontFamily: 'var(--font-mono)',
        color: teal ? 'var(--accent-teal-bright)' : 'var(--text-primary)',
        cursor: 'pointer', background: hover ? 'var(--bg-elevated)' : 'transparent',
      }}
    >
      {children}
    </div>
  );
}

function TagDropdown({ tags, loading, onSelectExisting, onCreateNew, onClose }) {
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const onMD = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onMD);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onMD); document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const filtered = tags.filter(t => t.name.toLowerCase().includes(query.toLowerCase()));
  const showCreate = query.trim() && !filtered.some(t => t.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', left: 0, zIndex: 100, marginTop: 4,
      width: 220, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
      borderRadius: 3, display: 'flex', flexDirection: 'column', maxHeight: 240, overflow: 'hidden',
    }}>
      <input
        autoFocus
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Filter or create…"
        style={{
          fontSize: 12, background: 'var(--bg-secondary)', border: 'none',
          borderBottom: '1px solid var(--border-subtle)', padding: '8px 10px',
          color: 'var(--text-primary)', outline: 'none', width: '100%',
          boxSizing: 'border-box', fontFamily: 'var(--font-sans)',
        }}
      />
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading
          ? <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-secondary)' }}>Loading…</div>
          : <>
              {filtered.map(tag => (
                <DropdownItem key={tag.id} onClick={() => onSelectExisting(tag)}>{tag.name}</DropdownItem>
              ))}
              {showCreate && (
                <DropdownItem onClick={() => onCreateNew(query.trim())} teal>Create "{query.trim()}"</DropdownItem>
              )}
              {!loading && filtered.length === 0 && !showCreate && (
                <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-secondary)' }}>No tags found.</div>
              )}
            </>
        }
      </div>
    </div>
  );
}

function UploadZone({ file, onFile, onClear, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const f = e.dataTransfer.files[0];
    if (f?.type === 'application/pdf') onFile(f);
  };

  return (
    <div>
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        style={{
          border: `1px dashed ${dragging ? 'var(--accent-teal)' : 'var(--border-active)'}`,
          borderRadius: 3, width: '100%', height: 160,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, gap: 8,
        }}
      >
        <Upload size={32} style={{ color: 'var(--text-secondary)' }} />
        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>Drop a PDF here or click to browse</div>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          PDF only · Max 20 MB
        </div>
      </div>
      <input
        ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files[0]; if (f) onFile(f); e.target.value = ''; }}
      />
      {file && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
          fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)',
        }}>
          <span>{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</span>
          <X size={14} style={{ cursor: 'pointer', color: 'var(--text-disabled)' }} onClick={onClear} />
        </div>
      )}
    </div>
  );
}

// ── Tab constants ─────────────────────────────────────────────────────────────

const TABS_ADMIN = [
  { key: 'brief',   label: 'Game Brief' },
  { key: 'report',  label: 'Source Report' },
  { key: 'actors',  label: 'Actors' },
  { key: 'seeds',   label: 'Inject Seeds' },
  { key: 'notes',   label: 'Admin Notes' },
  { key: 'details', label: 'Extraction Details' },
];
const TABS_USER = [
  { key: 'brief',   label: 'Game Brief' },
  { key: 'report',  label: 'Source Report' },
  { key: 'actors',  label: 'Actors' },
  { key: 'seeds',   label: 'Inject Seeds' },
  { key: 'details', label: 'Extraction Details' },
];
const TABS_PUBLIC = [
  { key: 'brief',   label: 'Game Brief' },
  { key: 'report',  label: 'Source Report', disabled: true },
  { key: 'actors',  label: 'Actors',        disabled: true },
  { key: 'seeds',   label: 'Inject Seeds',  disabled: true },
  { key: 'details', label: 'Extraction Details', disabled: true },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function ExtractionPage() {
  const { id: urlId } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useContext(AuthContext);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const token = sessionStorage.getItem('warpaths_token');
  const isAuthenticated = !!token;

  const resolvedUser = user;
  const authLoading = isAuthenticated && !user;

  const isClientAdmin = !!(resolvedUser?.client_id);
  const clientId = resolvedUser?.client_id;

  // ── UI state ───────────────────────────────────────────────────────────────
  const [panelState, setPanelState] = useState('empty');
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('brief');
  const [selectedCeId, setSelectedCeId] = useState(null);
  const [activeTagFilter, setActiveTagFilter] = useState(null);
  const [currentReId, setCurrentReId] = useState(urlId ?? null);
  const [tagsEnabled, setTagsEnabled] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [notesSavedVisible, setNotesSavedVisible] = useState(false);
  const notesSaveTimer = useRef(null);

  const checkSeedWarning = useCallback((re) => {
    const n = re?.inject_seeds?.length ?? 0;
    if (n > 0 && n < 5) showToast(`Only ${n} seeds returned — minimum is 5. Consider re-extracting.`, 'warning');
  }, [showToast]);

  // ── Queries ────────────────────────────────────────────────────────────────
  const listQuery = useQuery({
    queryKey: ['extractions', clientId, activeTagFilter],
    queryFn: () => getClientExtractions(clientId, activeTagFilter ? { tag_id: activeTagFilter } : {}),
    enabled: !authLoading && isClientAdmin && !!clientId,
  });

  const clientQuery = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => getClient(clientId),
    enabled: !authLoading && isClientAdmin && !!clientId,
  });

  const reQuery = useQuery({
    queryKey: ['extraction', currentReId],
    queryFn: () => getReportExtraction(currentReId),
    enabled: !!currentReId,
  });

  const ceQuery = useQuery({
    queryKey: ['clientExtraction', clientId, selectedCeId],
    queryFn: () => getClientExtraction(clientId, selectedCeId),
    enabled: !!(isClientAdmin && clientId && selectedCeId),
  });

  const tagsQuery = useQuery({
    queryKey: ['tags', clientId],
    queryFn: () => getClientTags(clientId),
    enabled: !!(isClientAdmin && clientId && tagsEnabled),
  });

  // ── Derived query data ─────────────────────────────────────────────────────
  const clientExtractions = listQuery.data ?? [];
  const listLoading = listQuery.isLoading;
  const clientData = clientQuery.data ?? null;
  const reportExtraction = reQuery.data ?? null;
  const clientExtraction = ceQuery.data ?? null;
  const filterTags = tagsQuery.data ?? [];

  // ── Mutations ──────────────────────────────────────────────────────────────
  const uploadMutation = useMutation({
    mutationFn: ingestReport,
    onSuccess: (re) => {
      if (re.is_duplicate) showToast('This report was already extracted. Showing existing results.', 'info');
      queryClient.setQueryData(['extraction', re.id], re);
      setSelectedCeId(null);
      setCurrentReId(re.id);
      setUploadFile(null);
      if (isClientAdmin && clientId) {
        queryClient.invalidateQueries({ queryKey: ['extractions', clientId] });
        queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      }
      setActiveTab('brief');
      setIsExtracting(false);
      setEditingName(false);
      setShowTagDropdown(false);
      setPanelState('result');
    },
    onError: (e) => {
      const s = e.response?.status;
      if (s === 413) setErrorMsg('File exceeds the 20 MB limit.');
      else if (s === 422) setErrorMsg('The file could not be processed. Confirm it is a valid PDF.');
      else setErrorMsg(e.response?.data?.detail || 'Extraction failed. Please try again.');
      setIsExtracting(false);
      setPanelState('error');
    },
  });

  const nameMutation = useMutation({
    mutationFn: ({ id, display_name }) => patchClientExtraction(clientId, id, { display_name }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['clientExtraction', clientId, updated.id], updated);
      queryClient.invalidateQueries({ queryKey: ['extractions', clientId] });
    },
  });

  const notesMutation = useMutation({
    mutationFn: ({ id, notes }) => patchClientExtraction(clientId, id, { notes }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['clientExtraction', clientId, updated.id], updated);
      setNotesSavedVisible(true);
      clearTimeout(notesSaveTimer.current);
      notesSaveTimer.current = setTimeout(() => setNotesSavedVisible(false), 2000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (ceId) => deleteClientExtraction(clientId, ceId),
    onSuccess: () => {
      setShowDeleteModal(false);
      setSelectedCeId(null);
      setCurrentReId(null);
      setPanelState('empty');
      queryClient.invalidateQueries({ queryKey: ['extractions', clientId] });
    },
  });

  const applyTagMutation = useMutation({
    mutationFn: ({ ceId, tagId }) => applyTag(clientId, ceId, tagId),
    onSuccess: (_data, { ceId }) => {
      queryClient.invalidateQueries({ queryKey: ['clientExtraction', clientId, ceId] });
      queryClient.invalidateQueries({ queryKey: ['extractions', clientId] });
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: ({ ceId, tagId }) => removeTag(clientId, ceId, tagId),
    onSuccess: (_data, { ceId }) => {
      queryClient.invalidateQueries({ queryKey: ['clientExtraction', clientId, ceId] });
      queryClient.invalidateQueries({ queryKey: ['extractions', clientId] });
    },
  });

  const createTagMutation = useMutation({
    mutationFn: (name) => createClientTag(clientId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', clientId] });
    },
  });

  // ── Effects ────────────────────────────────────────────────────────────────

  // Auto-select matching CE when list resolves and currentReId matches a row
  useEffect(() => {
    if (!isClientAdmin || !currentReId || !listQuery.data || selectedCeId) return;
    const match = listQuery.data.find(ce => ce.report_extraction_id === currentReId);
    if (match) setSelectedCeId(match.id);
  }, [isClientAdmin, currentReId, listQuery.data, selectedCeId]);

  // Drive panelState from reQuery status
  useEffect(() => {
    if (!currentReId || uploadMutation.isPending) return;
    if (reQuery.isLoading || reQuery.isFetching) {
      setPanelState('loading');
    } else if (reQuery.isSuccess) {
      setPanelState('result');
    } else if (reQuery.isError) {
      const s = reQuery.error?.response?.status;
      setErrorMsg(s === 404 ? 'This extraction could not be found.' : reQuery.error?.response?.data?.detail || 'Failed to load extraction.');
      setPanelState('error');
    }
  }, [currentReId, reQuery.isLoading, reQuery.isFetching, reQuery.isSuccess, reQuery.isError, reQuery.error, uploadMutation.isPending]);

  // Fire seed-count toast + reset tab when a new RE loads
  const lastCheckedReIdRef = useRef(null);
  useEffect(() => {
    if (reQuery.data && reQuery.data.id !== lastCheckedReIdRef.current) {
      lastCheckedReIdRef.current = reQuery.data.id;
      checkSeedWarning(reQuery.data);
      setActiveTab('brief');
    }
  }, [reQuery.data, checkSeedWarning]);

  // Sync notesValue when a new CE loads
  const lastSyncedCeIdRef = useRef(null);
  useEffect(() => {
    if (ceQuery.data && ceQuery.data.id !== lastSyncedCeIdRef.current) {
      lastSyncedCeIdRef.current = ceQuery.data.id;
      setNotesValue(ceQuery.data.notes || '');
    }
  }, [ceQuery.data]);

  // Non-admin without deep link → leaderboard
  useEffect(() => {
    if (!authLoading && isAuthenticated && !isClientAdmin && !urlId) {
      navigate('/leaderboard');
    }
  }, [authLoading, isAuthenticated, isClientAdmin, urlId, navigate]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleTagFilter = (tagId) => setActiveTagFilter(tagId);

  const handleSelectCe = (ce) => {
    setSelectedCeId(ce.id);
    setCurrentReId(ce.report_extraction_id);
    setIsExtracting(false);
    setErrorMsg(null);
    setEditingName(false);
    setShowTagDropdown(false);
    setShowNotesDrawer(false);
  };

  const handleExtract = () => {
    if (!uploadFile) return;
    setErrorMsg(null);
    setPanelState('loading');
    setIsExtracting(true);
    uploadMutation.mutate(uploadFile);
  };

  const handleNameSave = (val) => {
    setEditingName(false);
    if (!clientExtraction || val === (clientExtraction.display_name || '')) return;
    nameMutation.mutate({ id: clientExtraction.id, display_name: val });
  };

  const handleTagSelectExisting = (tag) => {
    if (!clientExtraction) return;
    applyTagMutation.mutate({ ceId: clientExtraction.id, tagId: tag.id });
    setShowTagDropdown(false);
  };

  const handleTagCreateNew = async (name) => {
    if (!clientExtraction) return;
    try {
      const newTag = await createTagMutation.mutateAsync(name);
      await applyTagMutation.mutateAsync({ ceId: clientExtraction.id, tagId: newTag.id });
    } finally {
      setShowTagDropdown(false);
    }
  };

  const handleTagRemove = (tagId) => {
    if (!clientExtraction) return;
    removeTagMutation.mutate({ ceId: clientExtraction.id, tagId });
  };

  const handleNotesBlur = () => {
    if (!clientExtraction || notesValue === (clientExtraction.notes || '')) return;
    notesMutation.mutate({ id: clientExtraction.id, notes: notesValue });
  };

  const handleDelete = () => {
    if (!clientExtraction) return;
    deleteMutation.mutate(clientExtraction.id);
  };

  // ── Quota ──────────────────────────────────────────────────────────────────
  const effectiveLimit = clientData?.custom_reports_limit ?? clientData?.plan_reports_limit ?? null;
  const reportsUsed = clientData?.reports_used_this_period ?? 0;
  const remaining = effectiveLimit != null ? effectiveLimit - reportsUsed : null;
  const quotaExhausted = remaining !== null && remaining <= 0;

  // ── Derived ────────────────────────────────────────────────────────────────
  const displayName = clientExtraction?.display_name || reportExtraction?.report_brief?.report_title || 'Untitled';
  const appliedTags = clientExtraction?.tags || [];
  const hasScenarios = !!(clientExtraction?.scenario_ids?.length);
  const canDelete = !hasScenarios;

  // ── Panel renderers ────────────────────────────────────────────────────────
  const renderEmpty = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <FileText size={40} style={{ color: 'var(--text-secondary)', marginBottom: 16 }} />
      <h3 style={{ fontSize: 18, color: 'var(--text-primary)', margin: '0 0 8px' }}>Select an extraction to view</h3>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 20px', textAlign: 'center' }}>
        Or upload a new report to extract a scenario.
      </p>
      <Button variant="secondary" onClick={() => { setPanelState('upload'); setUploadFile(null); }}>
        Upload Report
      </Button>
    </div>
  );

  const renderUpload = () => (
    <div style={{ padding: '24px 24px', maxWidth: 560 }}>
      <div style={{ textAlign: 'right', marginBottom: 8 }}>
        {remaining === null ? null : quotaExhausted ? (
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)' }}>
            Extraction limit reached for this period
          </span>
        ) : (
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
            {remaining} extraction{remaining !== 1 ? 's' : ''} remaining this period
          </span>
        )}
      </div>
      <UploadZone file={uploadFile} onFile={setUploadFile} onClear={() => setUploadFile(null)} disabled={quotaExhausted} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
        {!urlId && (
          <Button variant="ghost" onClick={() => { setPanelState(reportExtraction ? 'result' : 'empty'); setUploadFile(null); }}>
            Cancel
          </Button>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <Button variant="primary" disabled={!uploadFile || quotaExhausted} onClick={handleExtract}>Extract</Button>
        </div>
      </div>
    </div>
  );

  const renderLoading = () => isExtracting ? (
    <div style={{ padding: '32px 24px' }}>
      <ProgressBar active={true} label="Running extraction — this takes 30–60 seconds" />
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 12 }}>Do not close this tab.</div>
    </div>
  ) : (
    <div style={{ padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Skeleton variant="rect" height={28} width="55%" />
      <Skeleton variant="rect" height={16} width="35%" />
      <div style={{ marginTop: 8 }}><Skeleton variant="rect" height={80} /></div>
      <Skeleton variant="rect" height={80} />
      <Skeleton variant="rect" height={80} />
    </div>
  );

  const renderError = (isDirectLink = false) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 40px', textAlign: 'center' }}>
      <AlertTriangle size={32} style={{ color: 'var(--accent-red)', marginBottom: 12 }} />
      <h3 style={{ fontSize: 18, color: 'var(--text-primary)', margin: '0 0 8px' }}>Extraction failed</h3>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, maxWidth: 400 }}>
        {errorMsg || 'An error occurred. Please try again.'}
      </div>
      <Button variant="primary" onClick={() => {
        setErrorMsg(null);
        if (isDirectLink) { window.location.reload(); } else { setPanelState('upload'); setUploadFile(null); }
      }}>
        Try Again
      </Button>
    </div>
  );

  const isStaff = resolvedUser?.scope === 'bubble' || resolvedUser?.role === 'warpaths_staff';

  const renderResultContent = ({ inMasterDetail = false } = {}) => {
    const tabs = !isAuthenticated
      ? TABS_PUBLIC
      : isClientAdmin
        ? TABS_ADMIN
        : TABS_USER;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

        {/* Metadata bar — ClientAdmin only, CE loaded */}
        {inMasterDetail && clientExtraction && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '9px 20px',
            background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap',
          }}>
            {/* Inline-editable display name */}
            <div>
              {editingName ? (
                <Input
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  autoFocus
                  onBlur={() => handleNameSave(nameValue)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleNameSave(nameValue);
                    if (e.key === 'Escape') { setEditingName(false); setNameValue(displayName); }
                  }}
                />
              ) : (
                <span
                  onClick={() => { setEditingName(true); setNameValue(displayName); }}
                  style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', borderBottom: '1px dashed var(--border-active)', cursor: 'text' }}
                >
                  {displayName}
                </span>
              )}
            </div>

            {/* Applied tags + add */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', position: 'relative' }}>
              {appliedTags.map(tag => (
                <AppliedTagChip key={tag.id} label={tag.name} onRemove={() => handleTagRemove(tag.id)} />
              ))}
              <span
                onClick={() => { setTagsEnabled(true); setShowTagDropdown(v => !v); }}
                style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px 4px' }}
              >
                + Add tag
              </span>
              {showTagDropdown && (
                <TagDropdown
                  tags={filterTags}
                  loading={tagsQuery.isLoading}
                  onSelectExisting={handleTagSelectExisting}
                  onCreateNew={handleTagCreateNew}
                  onClose={() => setShowTagDropdown(false)}
                />
              )}
            </div>

            {/* Notes shortcut */}
            <span
              onClick={() => setShowNotesDrawer(true)}
              style={{
                fontSize: 13, color: 'var(--text-secondary)', borderBottom: '1px dashed var(--border-active)',
                cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200,
              }}
            >
              {notesValue
                ? notesValue.slice(0, 40) + (notesValue.length > 40 ? '…' : '')
                : 'Add note'}
            </span>

            {/* Scenario link + delete */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              {hasScenarios && (
                <a href="#" style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--accent-teal-bright)', textDecoration: 'none' }}>
                  ● Scenario created
                </a>
              )}
              <button
                onClick={() => canDelete && setShowDeleteModal(true)}
                title={canDelete ? 'Delete extraction' : 'Cannot delete — scenarios exist'}
                style={{
                  background: 'none', border: 'none', padding: 4, display: 'flex', alignItems: 'center',
                  cursor: canDelete ? 'pointer' : 'not-allowed',
                  color: canDelete ? 'var(--accent-red)' : 'var(--text-disabled)',
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', height: 44, borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-primary)', flexShrink: 0,
          ...(inMasterDetail ? { position: 'sticky', top: 0, zIndex: 2 } : {}),
        }}>
          <Badge status={reportExtraction?.extraction_status || 'draft'} />
          {inMasterDetail && (
            <Button variant="ghost" size="sm" onClick={() => { setSelectedCeId(null); setUploadFile(null); setPanelState('upload'); }}>
              New Extraction
            </Button>
          )}
        </div>

        {/* Auth gate — unauthenticated */}
        {!isAuthenticated && (
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-active)',
            borderRadius: 3, padding: '20px 22px', margin: '20px 20px 0',
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 7 }}>
              You're viewing a WarPaths scenario extraction
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
              Create a free account to see the full scenario brief, actor analysis, and story seeds extracted from this report.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="primary" onClick={() => navigate(`/join?next=/extract/${urlId}`)}>Create account</Button>
              <Button variant="secondary" onClick={() => navigate(`/login?next=/extract/${urlId}`)}>Log in</Button>
            </div>
          </div>
        )}

        {/* Org CTA — authenticated user, no org, not staff */}
        {isAuthenticated && !isClientAdmin && resolvedUser?.role !== 'warpaths_staff' && (
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
            borderLeft: '3px solid var(--accent-amber)', borderRadius: 3,
            padding: '13px 18px', margin: '20px 20px 0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Want to run this as a live wargame for your org? Create an org account to configure and invite participants.
            </div>
            <Button variant="primary" size="sm" onClick={() => navigate('#')}>Create org account</Button>
          </div>
        )}

        {/* Tab row + content (all user types) */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-primary)', flexShrink: 0,
          marginTop: (!isAuthenticated || !isClientAdmin) ? 16 : 0,
        }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.key;
            const isDisabled = !!tab.disabled;
            return (
              <button
                key={tab.key}
                onClick={() => { if (!isDisabled) setActiveTab(tab.key); }}
                disabled={isDisabled}
                style={{
                  flex: 1, textAlign: 'center', fontSize: 10,
                  fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: isDisabled
                    ? 'var(--text-disabled)'
                    : isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  padding: '10px 4px',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  background: 'none', border: 'none',
                  borderBottom: isActive ? '2px solid var(--accent-red)' : '2px solid transparent',
                  marginBottom: -1, whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'brief' && <TabGameBrief re={reportExtraction} />}
          {activeTab === 'report' && isAuthenticated && <TabSourceReport re={reportExtraction} />}
          {activeTab === 'actors' && isAuthenticated && <TabActors re={reportExtraction} />}
          {activeTab === 'seeds' && isAuthenticated && <TabInjectSeeds re={reportExtraction} />}
          {activeTab === 'notes' && isClientAdmin && (
            <TabAdminNotes
              value={notesValue}
              onChange={e => setNotesValue(e.target.value)}
              onBlur={handleNotesBlur}
              savedVisible={notesSavedVisible}
            />
          )}
          {activeTab === 'details' && isAuthenticated && (
            <TabExtractionDetails
              re={reportExtraction}
              reportsUsed={reportsUsed}
              effectiveLimit={effectiveLimit}
              isStaff={isStaff}
            />
          )}
        </div>

      </div>
    );
  };

  // ── Auth loading ───────────────────────────────────────────────────────────
  if (authLoading) {
    return <PageShell sidebar={false}><Skeleton variant="rect" height={200} /></PageShell>;
  }

  // ── Single-column layout ───────────────────────────────────────────────────
  if (!isClientAdmin) {
    return (
      <PageShell sidebar={false}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          {panelState === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
              <Skeleton variant="rect" height={28} width="55%" />
              <Skeleton variant="rect" height={16} width="35%" />
              <div style={{ marginTop: 8 }}><Skeleton variant="rect" height={80} /></div>
              <Skeleton variant="rect" height={80} />
              <Skeleton variant="rect" height={80} />
            </div>
          )}
          {panelState === 'error' && renderError(true)}
          {panelState === 'result' && reportExtraction && renderResultContent({ inMasterDetail: false })}
        </div>
      </PageShell>
    );
  }

  // ── Master-detail layout ───────────────────────────────────────────────────
  return (
    <PageShell sidebar={false} maxWidth="full">
      <div style={{
        display: 'flex',
        height: 'calc(100vh - 56px)',
        overflow: 'hidden',
      }}>

        {/* Left panel */}
        <div style={{
          width: 260, flexShrink: 0, borderRight: '1px solid var(--border-subtle)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--text-secondary)' }}>
                EXTRACTIONS
              </span>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedCeId(null); setUploadFile(null); setPanelState('upload'); }}>
                + New
              </Button>
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              <FilterChip label="All" active={activeTagFilter === null} onClick={() => handleTagFilter(null)} />
              {filterTags.map(tag => (
                <FilterChip key={tag.id} label={tag.name} active={activeTagFilter === tag.id} onClick={() => handleTagFilter(tag.id)} />
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {listLoading ? (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Skeleton variant="rect" height={62} />
                <Skeleton variant="rect" height={62} />
                <Skeleton variant="rect" height={62} />
              </div>
            ) : clientExtractions.length === 0 ? (
              <div style={{ padding: '24px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  {activeTagFilter ? 'No extractions match this filter.' : 'No extractions yet.'}
                </div>
                {!activeTagFilter && (
                  <Button variant="secondary" size="sm" onClick={() => { setUploadFile(null); setPanelState('upload'); }}>
                    Upload Report
                  </Button>
                )}
              </div>
            ) : (
              clientExtractions.map(ce => (
                <ListItem key={ce.id} ce={ce} selected={selectedCeId === ce.id} onClick={() => handleSelectCe(ce)} />
              ))
            )}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {panelState === 'empty' && renderEmpty()}
          {panelState === 'upload' && renderUpload()}
          {panelState === 'loading' && <div style={{ flex: 1 }}>{renderLoading()}</div>}
          {panelState === 'error' && renderError(false)}
          {panelState === 'result' && reportExtraction && renderResultContent({ inMasterDetail: true })}
        </div>

      </div>

      {/* Notes drawer */}
      <Drawer open={showNotesDrawer} onClose={() => setShowNotesDrawer(false)} title="Notes" width={480}>
        <div style={{ padding: '4px 0' }}>
          <TabAdminNotes
            value={notesValue}
            onChange={e => setNotesValue(e.target.value)}
            onBlur={handleNotesBlur}
            savedVisible={notesSavedVisible}
          />
        </div>
      </Drawer>

      {/* Delete modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete extraction record"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        }
      >
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          This removes it from your org history. The underlying extraction is not deleted.
        </p>
      </Modal>

    </PageShell>
  );
}
