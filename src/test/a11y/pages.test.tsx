/**
 * Axe Integration Tests for Main Pages
 * 
 * These tests run axe-core accessibility audits on the main pages
 * to catch accessibility regressions.
 */
import { describe, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expectNoA11yViolations } from '@/lib/a11y/test/a11y-utils';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

// Mock contexts
vi.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    profile: { 
      id: 'test-user',
      organization_id: 'test-org',
      role: 'admin',
      name: 'Test User',
    },
    session: { access_token: 'test-token' },
    loading: false,
    organizationId: 'test-org',
    signOut: vi.fn(),
  }),
}));

vi.mock('@/context/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

vi.mock('@/context/ToastContext', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
  useToast: () => ({ addToast: vi.fn(), toasts: [] }),
}));

// Test wrapper with providers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
};

describe('Login Page Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have no accessibility violations', async () => {
    // Dynamic import to avoid issues with mocked modules
    const { default: Login } = await import('@/pages/Login');
    
    const { container } = render(<Login />, { wrapper: createWrapper() });
    
    // Wait for page to render
    await screen.findByRole('button', { name: /entrar/i });
    
    await expectNoA11yViolations(container);
  });
});

describe('Modal Component Accessibility', () => {
  it('should have no accessibility violations when open', async () => {
    const { Modal } = await import('@/components/ui/Modal');
    
    const { container } = render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
        <p>Modal content</p>
      </Modal>,
      { wrapper: createWrapper() }
    );
    
    await expectNoA11yViolations(container);
  });
});

describe('ConfirmModal Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { default: ConfirmModal } = await import('@/components/ConfirmModal');
    
    const { container } = render(
      <ConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirm Action"
        message="Are you sure?"
      />,
      { wrapper: createWrapper() }
    );
    
    await expectNoA11yViolations(container);
  });
});

describe('FormField Component Accessibility', () => {
  it('should have no accessibility violations with all props', async () => {
    const { FormField } = await import('@/components/ui/FormField');
    
    const { container } = render(
      <FormField
        label="Email"
        required
        error={{ type: 'validate', message: 'Invalid email' }}
        hint="Enter your email address"
      >
        <input type="email" />
      </FormField>,
      { wrapper: createWrapper() }
    );
    
    await expectNoA11yViolations(container);
  });
});
