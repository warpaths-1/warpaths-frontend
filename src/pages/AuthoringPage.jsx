// TODO Session 2 defer: staff client picker
// Staff (scope === 'bubble') users have no client_id on their JWT. Until the
// client-picker flow is built, we fall back to a hardcoded test client so staff
// can exercise the extraction picker against a real dataset.
import { useState, useRef } from 'react';
import { useParams, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import StepIndicator from '../components/ui/StepIndicator';
import { useAuth } from '../hooks/useAuth';
import { getScenario } from '../api/scenario';
import StartingPointTiles from './authoring/StartingPointTiles';
import ExtractionPickerDrawer from './authoring/ExtractionPickerDrawer';
import ClientPickerDrawer from './authoring/ClientPickerDrawer';
import StepFooter from './authoring/StepFooter';
import Step1Framing from './authoring/steps/Step1Framing';
import Step2Actors from './authoring/steps/Step2Actors';
import Step3ConfigSetup from './authoring/steps/Step3ConfigSetup';
import Step4Tension from './authoring/steps/Step4Tension';
import Step5Dimensions from './authoring/steps/Step5Dimensions';
import Step6Scoring from './authoring/steps/Step6Scoring';
import Step7Perspective from './authoring/steps/Step7Perspective';
import Step8Advisors from './authoring/steps/Step8Advisors';
import Step9TurnQuestions from './authoring/steps/Step9TurnQuestions';
import Step10Turn1Template from './authoring/steps/Step10Turn1Template';
import Step11Review from './authoring/steps/Step11Review';

const STAFF_FALLBACK_CLIENT_ID = 'ad412b27-deca-425b-be66-86e4638fe6e9';

// Canonical step definitions. StepIndicator uses `stepLabel`; tab row uses `tabLabel`.
const STEPS = [
  { n: 1,  stepLabel: 'Scenario framing',   tabLabel: 'Framing',     Component: Step1Framing },
  { n: 2,  stepLabel: 'Actors',             tabLabel: 'Actors',      Component: Step2Actors },
  { n: 3,  stepLabel: 'Config setup',       tabLabel: 'Config',      Component: Step3ConfigSetup },
  { n: 4,  stepLabel: 'Tension',            tabLabel: 'Tension',     Component: Step4Tension },
  { n: 5,  stepLabel: 'Dimensions',         tabLabel: 'Dimensions',  Component: Step5Dimensions },
  { n: 6,  stepLabel: 'Scoring',            tabLabel: 'Scoring',     Component: Step6Scoring },
  { n: 7,  stepLabel: 'Player perspective', tabLabel: 'Perspective', Component: Step7Perspective },
  { n: 8,  stepLabel: 'Advisors',           tabLabel: 'Advisors',    Component: Step8Advisors },
  { n: 9,  stepLabel: 'Turn questions',     tabLabel: 'Questions',   Component: Step9TurnQuestions },
  { n: 10, stepLabel: 'Turn 1 template',    tabLabel: 'Turn 1',      Component: Step10Turn1Template },
  { n: 11, stepLabel: 'Publish & validate', tabLabel: 'Review',      Component: Step11Review },
];

export default function AuthoringPage() {
  const { user } = useAuth();
  const { scenario_id: scenarioId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isStaff = user?.scope === 'bubble';
  const isClientAdmin = user?.scope === 'client_admin';

  const [currentStep, setCurrentStep] = useState(1);
  const [mode, setMode] = useState('stepped');
  const [extractionDrawerOpen, setExtractionDrawerOpen] = useState(false);
  const [clientDrawerOpen, setClientDrawerOpen] = useState(false);

  // Effective client_id for extraction list scoping. ClientAdmins read from JWT;
  // staff fall back to the test client (see TODO at top of file).
  const clientId = user?.client_id ?? (isStaff ? STAFF_FALLBACK_CLIENT_ID : null);

  // Scope gate — non-admin, non-staff users belong on leaderboard.
  if (user && !isStaff && !isClientAdmin) {
    return <Navigate to="/leaderboard" replace />;
  }

  const isLanding = location.pathname === '/author';
  const isNewScenario = location.pathname === '/author/new';
  const isExistingScenario = Boolean(scenarioId);

  // POST happens on first save in creation mode. Pass a callback for the step
  // to invoke on successful create — here we seed cache + replace URL so the
  // transition from creation to edit mode is indistinguishable afterward.
  const handleCreated = (scenario) => {
    queryClient.setQueryData(['scenario', scenario.id], scenario);
    navigate(`/author/${scenario.id}`, { replace: true });
  };

  return (
    <PageShell sidebar={false} maxWidth="md">
      {isLanding && (
        <LandingView
          isStaff={isStaff}
          onBrowseExtractions={() => {
            if (isStaff) setClientDrawerOpen(true);
            else setExtractionDrawerOpen(true);
          }}
          onStartBlank={() => navigate('/author/new')}
        />
      )}

      {isNewScenario && (
        <AuthoringEditor
          isStaff={isStaff}
          currentStep={currentStep}
          // Force stepped mode in creation — tab navigation can't land on
          // Steps 2–11 before the record exists.
          mode="stepped"
          onStepChange={setCurrentStep}
          onModeToggle={() => setMode((m) => (m === 'stepped' ? 'tabs' : 'stepped'))}
          scenario={null}
          scenarioId={null}
          creationMode={true}
          onCreated={handleCreated}
        />
      )}

      {isExistingScenario && (
        <ExistingScenarioView
          scenarioId={scenarioId}
          isStaff={isStaff}
          currentStep={currentStep}
          mode={mode}
          onStepChange={setCurrentStep}
          onModeToggle={() => setMode((m) => (m === 'stepped' ? 'tabs' : 'stepped'))}
          onBackToLanding={() => navigate('/author')}
        />
      )}

      <ExtractionPickerDrawer
        open={extractionDrawerOpen}
        onClose={() => setExtractionDrawerOpen(false)}
        clientId={clientId}
      />
      <ClientPickerDrawer
        open={clientDrawerOpen}
        onClose={() => setClientDrawerOpen(false)}
      />
    </PageShell>
  );
}

// ── Landing ───────────────────────────────────────────────────────────────────

function LandingView({ isStaff, onBrowseExtractions, onStartBlank }) {
  return (
    <div>
      <h2
        style={{
          fontSize: 'var(--text-2xl)',
          color: 'var(--text-primary)',
          margin: 0,
          marginBottom: 'var(--space-2)',
        }}
      >
        Start a new scenario
      </h2>
      <p
        style={{
          fontSize: 'var(--text-base)',
          color: 'var(--text-secondary)',
          margin: 0,
          lineHeight: 1.55,
        }}
      >
        Pick a starting point. You can edit everything once the scenario is created.
      </p>
      <StartingPointTiles
        isStaff={isStaff}
        onBrowseExtractions={onBrowseExtractions}
        onStartBlank={onStartBlank}
      />
    </div>
  );
}

// ── Existing scenario: fetch + error state ────────────────────────────────────

function ExistingScenarioView({
  scenarioId,
  isStaff,
  currentStep,
  mode,
  onStepChange,
  onModeToggle,
  onBackToLanding,
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['scenario', scenarioId],
    queryFn: () => getScenario(scenarioId),
    retry: false,
  });

  if (isLoading) {
    return (
      <div>
        <Skeleton height={32} width="60%" />
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Skeleton height={20} width="100%" />
        </div>
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Skeleton height={120} width="100%" />
        </div>
      </div>
    );
  }

  if (isError) {
    const status = error?.response?.status;
    const isNotFoundOrForbidden = status === 404 || status === 403;
    return (
      <ScenarioErrorState
        onBackToLanding={onBackToLanding}
        variant={isNotFoundOrForbidden ? 'not-found' : 'generic'}
      />
    );
  }

  return (
    <AuthoringEditor
      isStaff={isStaff}
      currentStep={currentStep}
      mode={mode}
      onStepChange={onStepChange}
      onModeToggle={onModeToggle}
      scenario={data}
      scenarioId={scenarioId}
    />
  );
}

function ScenarioErrorState({ onBackToLanding, variant }) {
  const isNotFound = variant === 'not-found';
  const title = isNotFound ? 'Scenario not found' : 'Could not load scenario';
  const body = isNotFound
    ? 'Check the URL or go back to the authoring landing.'
    : 'Something went wrong while loading this scenario. Try again or return to the authoring landing.';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: 'var(--space-10) var(--space-4)',
        gap: 'var(--space-3)',
      }}
    >
      <AlertTriangle size={32} color="var(--accent-red)" />
      <h3
        style={{
          fontSize: 'var(--text-xl)',
          color: 'var(--text-primary)',
          margin: 0,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 'var(--text-base)',
          color: 'var(--text-secondary)',
          maxWidth: 480,
          lineHeight: 1.55,
          margin: 0,
        }}
      >
        {body}
      </p>
      <div style={{ marginTop: 'var(--space-3)' }}>
        <Button variant="primary" onClick={onBackToLanding}>
          Back to authoring
        </Button>
      </div>
    </div>
  );
}

// ── Editor shell (stepped or tabs) ────────────────────────────────────────────

function AuthoringEditor({
  isStaff,
  currentStep,
  mode,
  onStepChange,
  onModeToggle,
  scenario,
  scenarioId,
  creationMode = false,
  onCreated,
}) {
  const navigate = useNavigate();
  const stepSaveRef = useRef(null);
  const [savedAt, setSavedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const isValidation = currentStep === 'validation';
  const stepForIndicator = isValidation ? STEPS.length : currentStep;
  const activeStep = isValidation ? null : STEPS.find((s) => s.n === currentStep);

  // Step 2 advance gate — derived from cached scenario actors so it reacts
  // immediately to optimistic PATCH updates without extra state.
  const actorCount = scenario?.actors?.length ?? 0;
  const isArchived = scenario?.status === 'archived';
  const saveNextDisabled =
    isArchived || (currentStep === 2 && actorCount < 3);
  const saveNextTooltip = isArchived
    ? 'Scenario is archived'
    : saveNextDisabled
    ? 'Add at least 3 actors'
    : undefined;

  const handleBack = () => {
    if (saving) return;
    if (currentStep > 1) onStepChange(currentStep - 1);
  };

  const handleSaveNext = async () => {
    if (saving) return;
    if (stepSaveRef.current?.save) {
      setSaving(true);
      try {
        const ok = await stepSaveRef.current.save();
        if (!ok) return;
        setSavedAt(new Date());
      } finally {
        setSaving(false);
      }
    }
    // In creation mode the onCreated handler replaces the URL with the new
    // scenario id, which causes a remount at Step 1. Don't advance here —
    // the next render is already in edit mode at Step 1.
    if (creationMode) return;
    if (currentStep < STEPS.length) onStepChange(currentStep + 1);
  };

  // Draft exit — same save path as Save & next, but { draft: true } so Step 2
  // skips the implicit publish (it still PATCHes actors via its own mutations
  // at add/edit/remove time, so there is nothing for save() to do on Step 2
  // in draft mode). Step 1 in edit mode treats the flag as a no-op; in
  // creation mode it POSTs without running client-side required-field checks.
  const handleSaveExit = async () => {
    if (saving) return;
    if (stepSaveRef.current?.save) {
      setSaving(true);
      try {
        const ok = await stepSaveRef.current.save({ draft: true });
        if (!ok) return;
        setSavedAt(new Date());
      } finally {
        setSaving(false);
      }
    }
    onStepChange(1);
    navigate('/author');
  };

  // Cancel — "explicit discard-local intent." No server call under any branch.
  // If the current step reports itself clean, skip the modal.
  const handleCancel = () => {
    if (saving) return;
    const dirty = stepSaveRef.current?.isDirty?.() ?? false;
    if (!dirty) {
      onStepChange(1);
      navigate('/author');
      return;
    }
    setCancelModalOpen(true);
  };

  const confirmDiscard = () => {
    setCancelModalOpen(false);
    onStepChange(1);
    navigate('/author');
  };

  let stepContent;
  if (isValidation) {
    stepContent = (
      <Card>
        <div style={{ padding: 'var(--space-4)' }}>
          Validation — placeholder (staff only)
        </div>
      </Card>
    );
  } else if (currentStep === 1) {
    stepContent = (
      <Step1Framing
        saveRef={stepSaveRef}
        scenario={scenario}
        scenarioId={scenarioId}
        creationMode={creationMode}
        onCreated={onCreated}
      />
    );
  } else if (currentStep === 2) {
    stepContent = (
      <Step2Actors
        saveRef={stepSaveRef}
        scenario={scenario}
        scenarioId={scenarioId}
        onNavigateToStep1={() => onStepChange(1)}
      />
    );
  } else {
    const ActiveComponent = activeStep?.Component;
    stepContent = ActiveComponent ? <ActiveComponent /> : null;
  }

  return (
    <div>
      {mode === 'stepped' ? (
        <div
          title={creationMode ? 'Save Step 1 to unlock later steps' : undefined}
          style={{ opacity: creationMode ? 0.9 : 1 }}
        >
          <StepIndicator
            steps={STEPS.map((s) => ({
              label: s.stepLabel,
              status:
                s.n < stepForIndicator
                  ? 'complete'
                  : s.n === stepForIndicator
                  ? 'active'
                  : 'upcoming',
            }))}
          />
          {creationMode && (
            <div
              style={{
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                marginTop: 'var(--space-2)',
                textAlign: 'center',
              }}
            >
              Save Step 1 to unlock later steps.
            </div>
          )}
        </div>
      ) : (
        <TabRow
          currentStep={currentStep}
          isStaff={isStaff}
          onSelect={onStepChange}
        />
      )}

      {scenario && scenario.status !== 'archived' && (
        <div
          style={{
            textAlign: 'right',
            fontSize: 'var(--text-xs)',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-teal-bright)',
            marginTop: 'var(--space-2)',
            marginBottom: 'var(--space-2)',
          }}
        >
          ● Scenario in progress
        </div>
      )}

      {scenario?.status === 'archived' && (
        <div
          style={{
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-sans)',
            color: 'var(--text-secondary)',
            marginTop: 'var(--space-3)',
            marginBottom: 'var(--space-3)',
            padding: 'var(--space-3) var(--space-4)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius)',
          }}
        >
          This scenario is archived. Unarchive to edit.
        </div>
      )}

      <div style={{ marginTop: 'var(--space-4)' }}>{stepContent}</div>

      {!isValidation && (
        <StepFooter
          currentStep={currentStep}
          mode={mode}
          onBack={handleBack}
          onSaveNext={handleSaveNext}
          onSaveExit={handleSaveExit}
          onCancel={handleCancel}
          onToggleMode={onModeToggle}
          savedAt={savedAt}
          saving={saving}
          saveNextDisabled={saveNextDisabled}
          saveNextTooltip={saveNextTooltip}
          modeToggleDisabled={creationMode}
          modeToggleTooltip={
            creationMode ? 'Available after first save' : undefined
          }
        />
      )}

      <Modal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Discard changes and exit?"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button variant="ghost" onClick={() => setCancelModalOpen(false)}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={confirmDiscard}>
              Discard
            </Button>
          </div>
        }
      >
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-base)',
            color: 'var(--text-secondary)',
            lineHeight: 1.55,
          }}
        >
          Your in-progress changes will not be saved.
        </p>
      </Modal>
    </div>
  );
}

// ── Tab row (tabs mode) ───────────────────────────────────────────────────────

function TabRow({ currentStep, isStaff, onSelect }) {
  const tabs = [...STEPS.map((s) => ({ key: s.n, label: s.tabLabel }))];
  if (isStaff) tabs.push({ key: 'validation', label: 'Validation' });

  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-primary)',
      }}
    >
      {tabs.map((tab) => {
        const active = tab.key === currentStep;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(tab.key)}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              padding: '10px 4px',
              cursor: 'pointer',
              background: 'transparent',
              border: 'none',
              borderBottom: active ? '2px solid var(--accent-red)' : '2px solid transparent',
              marginBottom: -1,
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
