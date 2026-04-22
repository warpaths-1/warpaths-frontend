/**
 * TypeScript interfaces for API response shapes.
 * Source of truth: docs/response-shapes.md (captured from live API 2026-04-22).
 *
 * Convention: `null` is used for nullable fields, never `undefined`. Fields
 * documented as non-null in docs/response-shapes.md are required here.
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export type UUID = string;
export type ISODateTime = string;

// ---------------------------------------------------------------------------
// ReportExtraction — GET /v1/report-extractions/:id
// ---------------------------------------------------------------------------

export type ExtractionStatus = "complete" | "pending" | "failed";

export interface Citation {
  quote: string;
  notes: string;
  page_start: number;
  page_end: number;
}

export interface SourcePdfRef {
  sha256: string;
  source_id: string;
  source_type: string;
}

export interface KeyClaim {
  claim: string;
  supporting_citations: Citation[];
}

export interface PolicyImplication {
  implication: string;
  supporting_citations: Citation[];
}

export interface ReportBrief {
  publisher: string;
  report_title: string;
  report_subtitle: string;
  report_authors: string[];
  publication_date: string;
  core_thesis: string;
  why_this_game: string;
  key_claims: KeyClaim[];
  cited_fragments: Citation[];
  policy_implications: PolicyImplication[];
  strategic_domain_tags: string[];
}

export interface TimeHorizon {
  incident_horizon: string;
  planning_horizon: string;
  notes: string;
}

export interface ScenarioSuggestion {
  title: string;
  setting: string;
  category: string;
  subcategory: string;
  central_crisis: string;
  scenario_narrative: string;
  escalation_dynamics: string;
  key_assumptions: string[];
  primary_geographies: string[];
  time_horizon: TimeHorizon;
}

export interface ActorSuggestion {
  name: string;
  role: string;
  type: string;
  objectives: string[];
  current_posture: string;
  is_visible_to_player: boolean;
  capabilities_overview: string;
  relationships_overview: string;
  supporting_citations: Citation[];
}

export interface InjectSeed {
  title: string;
  seed_text: string;
  suggested_types: string[];
  aggravating_factors: string[];
  supporting_citations: Citation[];
}

export interface TensionSuggestion {
  name: string;
  definition: string;
  rationale: string;
  suggested_starting_level: number;
}

export interface GenerationNotes {
  limits: string;
  known_gaps: string;
}

export interface ReportExtraction {
  report_extraction_id: UUID;
  schema_version: string;
  extraction_status: ExtractionStatus;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  extracted_at: ISODateTime;
  source_pdf_ref: SourcePdfRef;
  report_brief: ReportBrief;
  scenario_suggestion: ScenarioSuggestion;
  actor_suggestions: ActorSuggestion[];
  inject_seeds: InjectSeed[];
  tension_suggestion: TensionSuggestion;
  generation_notes: GenerationNotes;
  kickoff_question: string;
  suggested_framework_tier: string;
}

// ---------------------------------------------------------------------------
// Client — GET /v1/clients/:id
// ---------------------------------------------------------------------------

export interface Client {
  id: UUID;
  name: string;
  type: string;
  billing_plan_id: UUID;
  billing_tier: string;
  is_trial: boolean;
  billing_email: string;
  contact_source: string;
  research_billing_tier: string;
  research_agreement_ref: string | null;
  research_access_expires_at: ISODateTime | null;
  research_seats_purchased: number;
  seats_purchased: number;
  reports_used_this_period: number;
  seats_used_this_period: number;
  invites_used_this_period: number;
  custom_reports_limit: number | null;
  custom_seats_limit: number | null;
  custom_invites_limit: number | null;
  period_start: ISODateTime;
  period_end: ISODateTime;
  periods_remaining: number | null;
  bubble_client_id: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

// ---------------------------------------------------------------------------
// ClientExtraction list — GET /v1/clients/:clientId/extractions
// ---------------------------------------------------------------------------

export interface ClientTagRef {
  id: UUID;
  name: string;
}

export interface ClientExtractionSummary {
  id: UUID;
  client_id: UUID;
  report_extraction_id: UUID;
  display_name: string | null;
  notes: string | null;
  scenario_ids: UUID[];
  tags: ClientTagRef[];
  report_title: string | null;
  extraction_status: ExtractionStatus;
  extracted_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface ClientExtractionList {
  items: ClientExtractionSummary[];
}
