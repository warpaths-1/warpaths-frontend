import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Upload, AlertTriangle, X, Trash2 } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Skeleton from '../components/ui/Skeleton';
import ProgressBar from '../components/ui/ProgressBar';
import Modal from '../components/ui/Modal';
import Drawer from '../components/ui/Drawer';
import { Table, TableHead, TableBody, TableRow, TableCell } from '../components/ui/Table';
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
        fontSize: variant === 'mono' ? 12 : 13,
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
      <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.6 }}>{body}</div>
      {supportingDetail && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 5 }}>{supportingDetail}</div>
      )}
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

function TabGameBrief({ re }) {
  const brief = re?.report_brief || {};
  const suggestion = re?.scenario_suggestion || {};
  const actors = re?.actor_suggestions || [];

  return (
    <div style={{ padding: '20px 20px' }}>
      <FieldBlock label="WHY THIS GAME">{brief.why_this_game || '—'}</FieldBlock>
      <FieldBlock label="SCENARIO NARRATIVE">{suggestion.scenario_narrative || '—'}</FieldBlock>
      <FieldBlock label="STRATEGIC DOMAIN TAGS">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {(suggestion.strategic_domain_tags || []).map((tag, i) => <DomainTagChip key={i} label={tag} />)}
          {!suggestion.strategic_domain_tags?.length && (
            <span style={{ fontSize: 12, color: 'var(--text-disabled)' }}>—</span>
          )}
        </div>
      </FieldBlock>
      <FieldBlock label="SUGGESTED TURN COUNT" variant="mono">
        {suggestion.suggested_turn_count ?? '—'}
      </FieldBlock>

      <SectionDivider />
      <SectionLabel>SUGGESTED ACTORS</SectionLabel>

      {actors.length > 0 ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell as="th">Name</TableCell>
              <TableCell as="th">Role</TableCell>
              <TableCell as="th">Stance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {actors.map((a, i) => (
              <TableRow key={i}>
                <TableCell variant="primary">{a.name}</TableCell>
                <TableCell variant="secondary">{a.role}</TableCell>
                <TableCell variant="secondary">{a.stance}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No actors suggested.</div>
      )}
    </div>
  );
}

function TabSourceReport({ re }) {
  const brief = re?.report_brief || {};
  const seeds = re?.inject_seeds || [];

  return (
    <div style={{ padding: '20px 20px' }}>
      <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
        {brief.report_title || '—'}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
        {brief.publication || ''}
      </div>
      <FieldBlock label="SUMMARY" variant="secondary">{brief.summary || '—'}</FieldBlock>

      <SectionDivider />
      <SectionLabel>INJECT SEEDS</SectionLabel>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>
        Story hooks drawn from the report
      </div>
      {seeds.length > 0
        ? seeds.map((seed, i) => (
            <SeedCard
              key={i}
              index={i}
              body={seed.seed_text}
              supportingDetail={seed.turn_suggestion != null ? `Suggested turn: ${seed.turn_suggestion}` : null}
            />
          ))
        : <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No seeds returned.</div>
      }
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

function TabExtractionDetails({ re, reportsUsed, effectiveLimit }) {
  const usedDisplay = reportsUsed != null && effectiveLimit != null
    ? `${reportsUsed} of ${effectiveLimit} this period`
    : '—';

  return (
    <div style={{ padding: '20px 20px' }}>
      <ConfidenceMeter label="CONFIDENCE SCORE" value={re?.confidence_score ?? 0} />
      <FieldBlock label="EXTRACTION NOTES" variant="secondary">
        {re?.extraction_notes || '—'}
      </FieldBlock>

      <SectionDivider />
      <StatGrid>
        <StatCell label="Source Document">{re?.source_filename || '—'}</StatCell>
        <StatCell label="Status"><Badge status={re?.extraction_status || 'draft'} /></StatCell>
        <StatCell label="SHA-256 Fingerprint">
          {re?.pdf_fingerprint ? `${re.pdf_fingerprint.slice(0, 16)}…` : '—'}
        </StatCell>
        <StatCell label="Extraction ID">
          {re?.id ? `${re.id.slice(0, 12)}…` : '—'}
        </StatCell>
        <StatCell label="Created">{formatDate(re?.created_at)}</StatCell>
        <StatCell label="Extractions Used" fullWidth>{usedDisplay}</StatCell>
      </StatGrid>
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

function TagDropdown({ clientId, extractionId, onClose, onApplied }) {
  const [query, setQuery] = useState('');
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    getClientTags(clientId).then(setTags).finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => {
    const onMD = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onMD);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onMD); document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const filtered = tags.filter(t => t.name.toLowerCase().includes(query.toLowerCase()));
  const showCreate = query.trim() && !filtered.some(t => t.name.toLowerCase() === query.trim().toLowerCase());

  const handleSelect = async (tag) => {
    await applyTag(clientId, extractionId, tag.id);
    onApplied(tag);
    onClose();
  };

  const handleCreate = async () => {
    const newTag = await createClientTag(clientId, { name: query.trim() });
    await applyTag(clientId, extractionId, newTag.id);
    onApplied(newTag);
    onClose();
  };

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
                <DropdownItem key={tag.id} onClick={() => handleSelect(tag)}>{tag.name}</DropdownItem>
              ))}
              {showCreate && (
                <DropdownItem onClick={handleCreate} teal>Create "{query.trim()}"</DropdownItem>
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
  { key: 'notes',   label: 'Admin Notes' },
  { key: 'details', label: 'Extraction Details' },
];
const TABS_USER = [
  { key: 'brief',   label: 'Game Brief' },
  { key: 'report',  label: 'Source Report' },
  { key: 'details', label: 'Extraction Details' },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function ExtractionPage() {
  const { id: urlId } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useContext(AuthContext);
  const { showToast } = useToast();

  const token = sessionStorage.getItem('warpaths_token');
  const isAuthenticated = !!token;

  const resolvedUser = user;
  const authLoading = isAuthenticated && !user;

  const isClientAdmin = !!(resolvedUser?.client_id);
  const clientId = resolvedUser?.client_id;

  // ── Left-panel state ───────────────────────────────────────────────────────
  const [clientExtractions, setClientExtractions] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [selectedCeId, setSelectedCeId] = useState(null);
  const [filterTags, setFilterTags] = useState([]);
  const [activeTagFilter, setActiveTagFilter] = useState(null);

  // ── Detail-panel state ─────────────────────────────────────────────────────
  const [panelState, setPanelState] = useState('empty');
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [reportExtraction, setReportExtraction] = useState(null);
  const [clientExtraction, setClientExtraction] = useState(null);
  const [activeTab, setActiveTab] = useState('brief');

  // ── Metadata bar state ─────────────────────────────────────────────────────
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [notesSavedVisible, setNotesSavedVisible] = useState(false);
  const notesSaveTimer = useRef(null);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const loadList = useCallback(async (tagId) => {
    if (!clientId) return [];
    setListLoading(true);
    try {
      const data = await getClientExtractions(clientId, tagId ? { tag_id: tagId } : {});
      setClientExtractions(data);
      return data;
    } catch (e) { console.error(e); return []; }
    finally { setListLoading(false); }
  }, [clientId]);

  const loadFilterTags = useCallback(async () => {
    if (!clientId) return;
    try { setFilterTags(await getClientTags(clientId)); } catch (e) { console.error(e); }
  }, [clientId]);

  const loadClientData = useCallback(async () => {
    if (!clientId) return;
    try { setClientData(await getClient(clientId)); } catch (e) { console.error(e); }
  }, [clientId]);

  const checkSeedWarning = useCallback((re) => {
    const n = re?.inject_seeds?.length ?? 0;
    if (n > 0 && n < 5) showToast(`Only ${n} seeds returned — minimum is 5. Consider re-extracting.`, 'warning');
  }, [showToast]);

  // ── Initial load: ClientAdmin ──────────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !isClientAdmin || !clientId) return;
    const init = async () => {
      const [list] = await Promise.all([loadList(null), loadFilterTags(), loadClientData()]);
      if (!urlId) return;
      const match = list.find(ce => ce.report_extraction_id === urlId);
      if (match) {
        setSelectedCeId(match.id);
        setPanelState('loading');
        try {
          const [ceData, reData] = await Promise.all([
            getClientExtraction(clientId, match.id),
            getReportExtraction(match.report_extraction_id),
          ]);
          setClientExtraction(ceData);
          setReportExtraction(reData);
          setNotesValue(ceData.notes || '');
          setActiveTab('brief');
          checkSeedWarning(reData);
          setPanelState('result');
        } catch (e) {
          setErrorMsg(e.response?.data?.detail || 'Failed to load extraction.');
          setPanelState('error');
        }
      } else {
        setPanelState('loading');
        try {
          const re = await getReportExtraction(urlId);
          setReportExtraction(re); setClientExtraction(null);
          setActiveTab('brief'); checkSeedWarning(re); setPanelState('result');
        } catch (e) {
          const s = e.response?.status;
          setErrorMsg(s === 404 ? 'This extraction could not be found.' : e.response?.data?.detail || 'Failed to load extraction.');
          setPanelState('error');
        }
      }
    };
    init();
  }, [authLoading, isClientAdmin, clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initial load: non-ClientAdmin ─────────────────────────────────────────
  useEffect(() => {
    if (authLoading || isClientAdmin || !urlId) return;
    const load = async () => {
      setPanelState('loading');
      try {
        const re = await getReportExtraction(urlId);
        setReportExtraction(re); setActiveTab('brief'); checkSeedWarning(re); setPanelState('result');
      } catch (e) {
        const s = e.response?.status;
        setErrorMsg(s === 404 ? 'This extraction could not be found.' : e.response?.data?.detail || 'Failed to load extraction.');
        setPanelState('error');
      }
    };
    load();
  }, [authLoading, isClientAdmin, urlId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── List interactions ──────────────────────────────────────────────────────
  const handleTagFilter = (tagId) => { setActiveTagFilter(tagId); loadList(tagId); };

  const handleSelectCe = async (ce) => {
    setSelectedCeId(ce.id); setPanelState('loading'); setIsExtracting(false);
    setErrorMsg(null); setEditingName(false); setShowTagDropdown(false); setShowNotesDrawer(false);
    try {
      const [ceData, reData] = await Promise.all([
        getClientExtraction(clientId, ce.id),
        getReportExtraction(ce.report_extraction_id),
      ]);
      setClientExtraction(ceData); setReportExtraction(reData);
      setNotesValue(ceData.notes || ''); setActiveTab('brief');
      checkSeedWarning(reData); setPanelState('result');
    } catch (e) {
      setErrorMsg(e.response?.data?.detail || 'Failed to load extraction.'); setPanelState('error');
    }
  };

  // ── Upload + extract ───────────────────────────────────────────────────────
  const handleExtract = async () => {
    if (!uploadFile) return;
    setPanelState('loading'); setIsExtracting(true);
    try {
      const re = await ingestReport(uploadFile);
      if (re.is_duplicate) showToast('This report was already extracted. Showing existing results.', 'info');
      setReportExtraction(re); setUploadFile(null);
      if (isClientAdmin && clientId) {
        const list = await loadList(activeTagFilter);
        const match = list.find(ce => ce.report_extraction_id === re.id);
        if (match) {
          const ceData = await getClientExtraction(clientId, match.id);
          setClientExtraction(ceData); setNotesValue(ceData.notes || ''); setSelectedCeId(match.id);
        }
        await loadClientData();
      }
      checkSeedWarning(re); setActiveTab('brief'); setIsExtracting(false);
      setEditingName(false); setShowTagDropdown(false); setPanelState('result');
    } catch (e) {
      const s = e.response?.status;
      if (s === 413) setErrorMsg('File exceeds the 20 MB limit.');
      else if (s === 422) setErrorMsg('The file could not be processed. Confirm it is a valid PDF.');
      else setErrorMsg(e.response?.data?.detail || 'Extraction failed. Please try again.');
      setIsExtracting(false); setPanelState('error');
    }
  };

  // ── Metadata bar actions ───────────────────────────────────────────────────
  const handleNameSave = async (val) => {
    setEditingName(false);
    if (!clientExtraction || val === (clientExtraction.display_name || '')) return;
    try {
      const updated = await patchClientExtraction(clientId, clientExtraction.id, { display_name: val });
      setClientExtraction(updated);
    } catch (e) { console.error(e); }
  };

  const handleTagApplied = (tag) => {
    setClientExtraction(prev => ({ ...prev, tags: [...(prev?.tags || []), tag] }));
  };

  const handleTagRemove = async (tagId) => {
    try {
      await removeTag(clientId, clientExtraction.id, tagId);
      setClientExtraction(prev => ({ ...prev, tags: prev.tags.filter(t => t.id !== tagId) }));
    } catch (e) { console.error(e); }
  };

  const handleNotesBlur = async () => {
    if (!clientExtraction || notesValue === (clientExtraction.notes || '')) return;
    try {
      await patchClientExtraction(clientId, clientExtraction.id, { notes: notesValue });
      setClientExtraction(prev => ({ ...prev, notes: notesValue }));
      setNotesSavedVisible(true);
      clearTimeout(notesSaveTimer.current);
      notesSaveTimer.current = setTimeout(() => setNotesSavedVisible(false), 2000);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async () => {
    try {
      await deleteClientExtraction(clientId, clientExtraction.id);
      setShowDeleteModal(false);
      setClientExtraction(null); setReportExtraction(null); setSelectedCeId(null);
      setPanelState('empty');
      await loadList(activeTagFilter);
    } catch (e) { console.error(e); }
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

  const renderResultContent = ({ inMasterDetail = false } = {}) => {
    const tabs = isClientAdmin ? TABS_ADMIN : TABS_USER;

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
                onClick={() => setShowTagDropdown(v => !v)}
                style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px 4px' }}
              >
                + Add tag
              </span>
              {showTagDropdown && (
                <TagDropdown
                  clientId={clientId}
                  extractionId={clientExtraction.id}
                  onClose={() => setShowTagDropdown(false)}
                  onApplied={handleTagApplied}
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

        {/* Unauthenticated: teaser content (no tabs) */}
        {!isAuthenticated && (
          <>
            <div style={{ position: 'relative', overflow: 'hidden', maxHeight: 200, marginTop: 16 }}>
              <div style={{ padding: '20px 20px' }}>
                <FieldBlock label="SCENARIO NARRATIVE">
                  {reportExtraction?.scenario_suggestion?.scenario_narrative || '—'}
                </FieldBlock>
              </div>
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 56,
                background: 'linear-gradient(transparent, var(--bg-primary))',
                pointerEvents: 'none',
              }} />
            </div>
            <div
              onClick={() => navigate(`/join?next=/extract/${urlId}`)}
              style={{
                fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent-teal-bright)',
                letterSpacing: '0.04em', padding: '8px 20px', cursor: 'pointer',
              }}
            >
              Create an account to see the full extraction →
            </div>
          </>
        )}

        {/* Authenticated: tab row + content */}
        {isAuthenticated && (
          <>
            <div style={{
              display: 'flex', borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-primary)', flexShrink: 0,
              marginTop: (!isClientAdmin) ? 16 : 0,
            }}>
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1, textAlign: 'center', fontSize: 10,
                    fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                    padding: '10px 4px', cursor: 'pointer', background: 'none', border: 'none',
                    borderBottom: activeTab === tab.key ? '2px solid var(--accent-red)' : '2px solid transparent',
                    marginBottom: -1, whiteSpace: 'nowrap',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {activeTab === 'brief' && <TabGameBrief re={reportExtraction} />}
              {activeTab === 'report' && <TabSourceReport re={reportExtraction} />}
              {activeTab === 'notes' && isClientAdmin && (
                <TabAdminNotes
                  value={notesValue}
                  onChange={e => setNotesValue(e.target.value)}
                  onBlur={handleNotesBlur}
                  savedVisible={notesSavedVisible}
                />
              )}
              {activeTab === 'details' && (
                <TabExtractionDetails
                  re={reportExtraction}
                  reportsUsed={reportsUsed}
                  effectiveLimit={effectiveLimit}
                />
              )}
            </div>
          </>
        )}

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
    <PageShell sidebar={false}>
      <div style={{
        display: 'flex',
        margin: 'calc(-1 * var(--space-10)) calc(-1 * var(--space-6))',
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
