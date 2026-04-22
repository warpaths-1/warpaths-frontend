import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../test/renderWithProviders';

// Same JWT helper as LoginPage.test — base64 payload good enough for AuthContext's
// atob/JSON.parse. Fields populated per the scope we want the test to exercise.
function makeJwt({ sub = 'user-uuid', client_id = null, scope = 'user' } = {}) {
  const payload = { sub, client_id, scope };
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  return `header.${b64}.signature`;
}

vi.mock('../api/extraction', () => ({
  ingestReport: vi.fn(),
  getReportExtraction: vi.fn(),
  getClient: vi.fn(),
  getClientExtractions: vi.fn(),
  getClientExtraction: vi.fn(),
  patchClientExtraction: vi.fn(),
  deleteClientExtraction: vi.fn(),
  applyTag: vi.fn(),
  removeTag: vi.fn(),
  getClientTags: vi.fn(),
  createClientTag: vi.fn(),
}));

import {
  getReportExtraction,
  getClient,
  getClientExtractions,
} from '../api/extraction';
import ExtractionPage from './ExtractionPage';

function renderAt(route) {
  return renderWithProviders(
    <Routes>
      <Route path="/extract" element={<ExtractionPage />} />
      <Route path="/extract/:id" element={<ExtractionPage />} />
      <Route path="/leaderboard" element={<div>Leaderboard</div>} />
      <Route path="/login" element={<div>Login</div>} />
      <Route path="/join" element={<div>Join</div>} />
    </Routes>,
    { route }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe('ExtractionPage', () => {
  it('shows the auth gate CTA for an unauthenticated deep link', async () => {
    // No token in sessionStorage → unauthenticated single-column path.
    getReportExtraction.mockResolvedValue({
      id: 'abc-123',
      extraction_status: 'complete',
      report_brief: { report_title: 'Test Report' },
      scenario_suggestion: { scenario_narrative: 'A brewing crisis.' },
      actor_suggestions: [],
      inject_seeds: [],
    });

    renderAt('/extract/abc-123');

    expect(await screen.findByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('shows the empty list message for a ClientAdmin with no extractions', async () => {
    sessionStorage.setItem(
      'warpaths_token',
      makeJwt({ client_id: 'client-uuid', scope: 'client_admin' })
    );
    getClientExtractions.mockResolvedValue([]);
    getClient.mockResolvedValue({
      id: 'client-uuid',
      custom_reports_limit: null,
      reports_used_this_period: 0,
    });

    renderAt('/extract');

    expect(await screen.findByText(/no extractions yet/i)).toBeInTheDocument();
  });

  it('renders the UploadZone when "+ New" is clicked', async () => {
    sessionStorage.setItem(
      'warpaths_token',
      makeJwt({ client_id: 'client-uuid', scope: 'client_admin' })
    );
    getClientExtractions.mockResolvedValue([]);
    getClient.mockResolvedValue({
      id: 'client-uuid',
      custom_reports_limit: 10,
      reports_used_this_period: 0,
    });

    renderAt('/extract');

    // Wait for list to load so the "+ New" button in the left panel header is mounted.
    const newButton = await screen.findByRole('button', { name: /\+ new/i });
    fireEvent.click(newButton);

    await waitFor(() => {
      expect(screen.getByText(/drop a pdf here or click to browse/i)).toBeInTheDocument();
    });
  });
});
