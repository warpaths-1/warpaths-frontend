import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, AlertTriangle } from 'lucide-react';
import Drawer from '../../components/ui/Drawer';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import { getClientExtractions, getClientTags, getReportExtraction } from '../../api/extraction';
import { createScenario, listScenarios } from '../../api/scenario';

function formatShortDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function rowTitle(row) {
  return row.display_name || row.report_title || 'Untitled extraction';
}

function buildScenarioBodyFromExtraction(re) {
  const ss = re?.scenario_suggestion ?? {};

  // Map actor_suggestions[] → actors[] per AuthoringPage spec mapping table.
  // capabilities_overview has no target field — surfaced via MappingCallout at edit time.
  // objectives[] strings each become a goal_item with priority 2 (medium default).
  const actors = (re?.actor_suggestions ?? []).map((as) => ({
    name: as.name ?? '',
    role: as.role ?? '',
    current_posture: 'observing', // extraction narrative preserved separately via MappingCallout
    relationships_overview: as.relationships_overview ?? '',
    is_visible_to_player: as.is_visible_to_player ?? false,
    goal_items: (as.objectives ?? []).map((obj) => ({ goal: obj, priority: 2 })),
    behavior: '',
    history: '',
    constraints: '',
  }));

  return {
    source_extraction_id: re.report_extraction_id,
    title: ss.title ?? '',
    category: ss.category ?? '',
    subcategory: ss.subcategory ?? '',
    scenario_narrative: ss.scenario_narrative ?? '',
    setting: ss.setting ?? null,
    // time_horizon shape matches between ReportExtraction and Scenario POST body
    // (planning_horizon | incident_horizon | notes) — verified against
    // docs/response-shapes.md and docs/api/02_scenario.md. Pass through as-is.
    time_horizon: ss.time_horizon ?? null,
    actors,
  };
}

export default function ExtractionPickerDrawer({ open, onClose, clientId }) {
  const [search, setSearch] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState(() => new Set());
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: listData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['extractions', clientId],
    queryFn: () => getClientExtractions(clientId),
    enabled: Boolean(clientId) && open,
    staleTime: 30_000,
  });

  // Tag library for the filter bar. Same key as ExtractionPage — cache shared.
  const tagsQuery = useQuery({
    queryKey: ['tags', clientId],
    queryFn: () => getClientTags(clientId),
    enabled: Boolean(clientId) && open,
    staleTime: 30_000,
  });

  const tags = tagsQuery.data ?? [];
  const rows = listData ?? [];

  const toggleTag = (tagId) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...rows].sort((a, b) => {
      const at = a.extracted_at || a.created_at || '';
      const bt = b.extracted_at || b.created_at || '';
      return bt.localeCompare(at);
    });
    // Tag filter first (AND across selected tags), then search narrows within.
    const afterTags = selectedTagIds.size === 0
      ? sorted
      : sorted.filter((r) => {
          const extTagIds = new Set((r.tags ?? []).map((t) => t.id));
          for (const id of selectedTagIds) {
            if (!extTagIds.has(id)) return false;
          }
          return true;
        });
    if (!q) return afterTags;
    // ClientExtractionSummary does not include publisher — filter on title only.
    return afterTags.filter((r) => rowTitle(r).toLowerCase().includes(q));
  }, [rows, search, selectedTagIds]);

  // Resume-or-create: product rule is that a ReportExtraction maps to at most
  // one Scenario. Check first; only POST when none exists.
  const createMutation = useMutation({
    mutationFn: async (row) => {
      const existing = await listScenarios({
        source_extraction_id: row.report_extraction_id,
      });

      if (existing.length > 0) {
        // Resume — cache-seed and navigate. No POST.
        const resume = existing[0];
        queryClient.setQueryData(['scenario', resume.id], resume);
        return { scenario: resume, resumed: true };
      }

      // Create — two-step fetch: pull the full ReportExtraction, then build
      // the scenario body from its own primary-key UUID.
      const re = await getReportExtraction(row.report_extraction_id);
      queryClient.setQueryData(['extraction', re.report_extraction_id], re);
      const body = buildScenarioBodyFromExtraction(re);
      const scenario = await createScenario(body);
      return { scenario, resumed: false };
    },
    onSuccess: ({ scenario }) => {
      queryClient.setQueryData(['scenario', scenario.id], scenario);
      setSearch('');
      onClose();
      navigate(`/author/${scenario.id}`, { replace: true });
    },
  });

  const busy = createMutation.isPending;

  const handleClose = () => {
    if (busy) return;
    setSearch('');
    setSelectedTagIds(new Set());
    onClose();
  };

  return (
    <Drawer open={open} onClose={handleClose} title="Pick an extraction" width={480} side="left">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div
          style={{
            padding: 'var(--space-4)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <Input
            placeholder="Search by title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={busy}
          />
        </div>

        {tags.length > 0 && (
          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.10em',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-2)',
              }}
            >
              Filter by tag
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--space-2)',
              }}
            >
              {tags.map((t) => {
                const active = selectedTagIds.has(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={busy}
                    onClick={() => !busy && toggleTag(t.id)}
                    style={{
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                      padding: '3px 8px',
                      borderRadius: 2,
                      background: active ? 'var(--accent-red)' : 'var(--bg-elevated)',
                      border: active
                        ? '1px solid var(--accent-red)'
                        : '1px solid var(--border-subtle)',
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      cursor: busy ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                      fontWeight: active ? 500 : 400,
                    }}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading && (
            <div style={{ padding: 'var(--space-4)' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ marginBottom: 'var(--space-4)' }}>
                  <Skeleton height={16} width="75%" />
                  <div style={{ marginTop: 6 }}>
                    <Skeleton height={12} width="40%" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {isError && (
            <EmptyCenter
              icon={<AlertTriangle size={32} color="var(--accent-red)" />}
              title="Could not load extractions"
              subtitle="Check your connection or try again."
            />
          )}

          {!isLoading && !isError && filtered.length === 0 && (() => {
            const hasTagFilter = selectedTagIds.size > 0;
            const hasSearch = Boolean(search.trim());
            let title;
            let subtitle;
            if (hasTagFilter && !hasSearch) {
              title = 'No extractions match selected tags';
              subtitle = 'Click a selected tag to deselect it.';
            } else if (hasTagFilter || hasSearch) {
              title = 'No results';
              subtitle = 'Try a different search or tag filter.';
            } else {
              title = 'No extractions yet';
              subtitle = 'Upload a report from the Extraction page to start.';
            }
            return (
              <EmptyCenter
                icon={<FileText size={40} color="var(--text-secondary)" />}
                title={title}
                subtitle={subtitle}
              />
            );
          })()}

          {!isLoading && !isError && filtered.length > 0 && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {filtered.map((row) => {
                const isComplete = row.extraction_status === 'complete';
                const clickable = isComplete && !busy;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      disabled={!clickable}
                      onClick={() => clickable && createMutation.mutate(row)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid var(--border-subtle)',
                        borderLeft: '3px solid transparent',
                        padding: 'var(--space-3) var(--space-4)',
                        cursor: clickable ? 'pointer' : 'not-allowed',
                        color: 'inherit',
                        fontFamily: 'inherit',
                        opacity: isComplete ? 1 : 0.7,
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
                          {rowTitle(row)}
                        </div>
                        {!isComplete && row.extraction_status && (
                          <Badge status={row.extraction_status} />
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 'var(--text-xs)',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--text-secondary)',
                          marginBottom: row.tags?.length ? 5 : 0,
                        }}
                      >
                        {formatShortDate(row.created_at)}
                      </div>
                      {row.tags?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {row.tags.map((t) => (
                            <span
                              key={t.id}
                              style={{
                                fontSize: 10,
                                fontFamily: 'var(--font-mono)',
                                padding: '2px 6px',
                                borderRadius: 2,
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-disabled)',
                              }}
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-start',
            padding: 'var(--space-4)',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <Button variant="ghost" onClick={handleClose} disabled={busy}>
            Cancel
          </Button>
          {busy && (
            <div
              style={{
                marginLeft: 'var(--space-3)',
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                alignSelf: 'center',
              }}
            >
              Opening scenario…
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

function EmptyCenter({ icon, title, subtitle }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'var(--space-8) var(--space-4)',
        gap: 'var(--space-3)',
      }}
    >
      {icon}
      <div
        style={{
          fontSize: 'var(--text-md)',
          color: 'var(--text-primary)',
          fontWeight: 500,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
        {subtitle}
      </div>
    </div>
  );
}
