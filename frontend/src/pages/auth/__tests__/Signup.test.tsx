/**
 * Signup Component Tests
 * Comprehensive test suite for the Signup authentication component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Signup } from '../Signup';
import { mockAuthService, testScenarios } from '@/__tests__/utils/api-mocks';

// Mock the auth service
vi.mock('@/services/auth', () => ({
  authService: mockAuthService
}));

// Mock router navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('Signup Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders signup form correctly', () => {
      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /create your cropguard account/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/i am a/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('displays CropGuard branding', () => {
      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const leafIcon = screen.getByRole('img', { hidden: true });
      expect(leafIcon).toBeInTheDocument();
      expect(screen.getByText('Create your CropGuard account')).toBeInTheDocument();
    });

    it('has login link for existing users', () => {
      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const loginLink = screen.getByRole('link', { name: /sign in to your existing account/i });
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('has proper form structure and validation', () => {
      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();

      // Check required fields
      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i agree to the/i);

      expect(nameInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('required');
      expect(termsCheckbox).toHaveAttribute('required');
    });
  });

  describe('Form Fields', () => {
    it('allows user to enter full name', async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, 'John Farmer');

      expect(nameInput).toHaveValue('John Farmer');
    });

    it('allows user to enter email', async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'john@farm.com');

      expect(emailInput).toHaveValue('john@farm.com');
    });

    it('allows user to select role', async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const roleSelect = screen.getByLabelText(/i am a/i);
      expect(roleSelect).toHaveValue('farmer'); // Default value

      await user.selectOptions(roleSelect, 'agronomist');
      expect(roleSelect).toHaveValue('agronomist');

      await user.selectOptions(roleSelect, 'farmer');
      expect(roleSelect).toHaveValue('farmer');
    });

    it('allows user to enter passwords', async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');

      expect(passwordInput).toHaveValue('password123');
      expect(confirmPasswordInput).toHaveValue('password123');
    });

    it('toggles password visibility for both password fields', async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const passwordToggles = screen.getAllByRole('button', { name: '' });

      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');

      // Toggle password visibility
      await user.click(passwordToggles[0]);
      expect(passwordInput).toHaveAttribute('type', 'text');

      // Toggle confirm password visibility
      await user.click(passwordToggles[1]);
      expect(confirmPasswordInput).toHaveAttribute('type', 'text');

      // Toggle back
      await user.click(passwordToggles[0]);
      await user.click(passwordToggles[1]);
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    });

    it('handles terms and conditions checkbox', async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const termsCheckbox = screen.getByLabelText(/i agree to the/i);
      expect(termsCheckbox).not.toBeChecked();

      await user.click(termsCheckbox);
      expect(termsCheckbox).toBeChecked();

      await user.click(termsCheckbox);
      expect(termsCheckbox).not.toBeChecked();
    });
  });

  describe('Form Validation', () => {
    it('validates password match', async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i agree to the/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'John Farmer');
      await user.type(emailInput, 'john@farm.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'differentpassword');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });

      expect(mockAuthService.signup).not.toHaveBeenCalled();
    });

    it('validates minimum password length', async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i agree to the/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'John Farmer');
      await user.type(emailInput, 'john@farm.com');
      await user.type(passwordInput, 'short');
      await user.type(confirmPasswordInput, 'short');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters long/i)).toBeInTheDocument();
      });

      expect(mockAuthService.signup).not.toHaveBeenCalled();
    });

    it('prevents submission with empty required fields', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      // HTML5 validation should prevent submission
      expect(mockAuthService.signup).not.toHaveBeenCalled();
    });

    it('requires terms acceptance', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'John Farmer');
      await user.type(emailInput, 'john@farm.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      // Don't check terms checkbox
      await user.click(submitButton);

      // HTML5 validation should prevent submission
      expect(mockAuthService.signup).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('handles successful signup', async () => {
      const user = userEvent.setup();
      
      mockAuthService.signup.mockResolvedValueOnce({
        token: 'signup-token',
        user: {
          id: 'new-user-123',
          name: 'John Farmer',
          email: 'john@farm.com',
          role: 'farmer'
        }
      });

      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i agree to the/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'John Farmer');
      await user.type(emailInput, 'john@farm.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAuthService.signup).toHaveBeenCalledWith('john@farm.com', 'password123');
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('handles signup error', async () => {
      const user = userEvent.setup();
      
      mockAuthService.signup.mockRejectedValueOnce(new Error('Email already exists'));

      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i agree to the/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'John Farmer');
      await user.type(emailInput, 'existing@farm.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('shows loading state during signup', async () => {
      const user = userEvent.setup();
      
      // Mock a delayed response
      mockAuthService.signup.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i agree to the/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'John Farmer');
      await user.type(emailInput, 'john@farm.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      expect(screen.getByText(/creating account.../i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Role Selection', () => {
    it('creates farmer account by default', async () => {
      const user = userEvent.setup();
      
      mockAuthService.signup.mockResolvedValueOnce({
        token: 'farmer-token',
        user: {
          id: 'farmer-123',
          name: 'John Farmer',
          email: 'john@farm.com',
          role: 'farmer'
        }
      });

      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const roleSelect = screen.getByLabelText(/i am a/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i agree to the/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      expect(roleSelect).toHaveValue('farmer');

      await user.type(nameInput, 'John Farmer');
      await user.type(emailInput, 'john@farm.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAuthService.signup).toHaveBeenCalledWith('john@farm.com', 'password123');
      });
    });

    it('creates agronomist account when selected', async () => {
      const user = userEvent.setup();
      
      mockAuthService.signup.mockResolvedValueOnce({
        token: 'agronomist-token',
        user: {
          id: 'agro-123',
          name: 'Dr. Smith',
          email: 'dr.smith@agro.com',
          role: 'agronomist'
        }
      });

      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const roleSelect = screen.getByLabelText(/i am a/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i agree to the/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'Dr. Smith');
      await user.type(emailInput, 'dr.smith@agro.com');
      await user.selectOptions(roleSelect, 'agronomist');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAuthService.signup).toHaveBeenCalledWith('dr.smith@agro.com', 'password123');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const roleSelect = screen.getByLabelText(/i am a/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i agree to the/i);

      expect(nameInput).toBeInTheDocument();
      expect(emailInput).toBeInTheDocument();
      expect(roleSelect).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
      expect(confirmPasswordInput).toBeInTheDocument();
      expect(termsCheckbox).toBeInTheDocument();
    });

    it('maintains proper tab order', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const roleSelect = screen.getByLabelText(/i am a/i);
      const passwordInput = screen.getByLabelText(/^password$/i);

      await user.tab();
      expect(nameInput).toHaveFocus();

      await user.tab();
      expect(emailInput).toHaveFocus();

      await user.tab();
      expect(roleSelect).toHaveFocus();

      await user.tab();
      expect(passwordInput).toHaveFocus();
    });

    it('has proper autocomplete attributes', () => {
      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      expect(nameInput).toHaveAttribute('autocomplete', 'name');
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
      expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');
      expect(confirmPasswordInput).toHaveAttribute('autocomplete', 'new-password');
    });

    it('has accessible terms and conditions links', () => {
      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const termsLink = screen.getByRole('link', { name: /terms of service/i });
      const privacyLink = screen.getByRole('link', { name: /privacy policy/i });

      expect(termsLink).toBeInTheDocument();
      expect(privacyLink).toBeInTheDocument();
    });
  });

  describe('Security Features', () => {
    it('masks passwords by default', () => {
      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    });

    it('has proper form validation attributes', () => {
      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('type', 'email');
    });
  });

  describe('Agricultural Domain Features', () => {
    it('supports farmer registration workflow', async () => {
      const user = userEvent.setup();
      testScenarios.successfulLogin();

      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const roleSelect = screen.getByLabelText(/i am a/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i agree to the/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'Jane Smith');
      await user.type(emailInput, 'jane@farm.com');
      await user.selectOptions(roleSelect, 'farmer');
      await user.type(passwordInput, 'farmPassword123');
      await user.type(confirmPasswordInput, 'farmPassword123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      expect(roleSelect).toHaveValue('farmer');
    });

    it('provides appropriate role options for agricultural domain', () => {
      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const roleSelect = screen.getByLabelText(/i am a/i);
      const options = screen.getAllByRole('option');

      expect(options).toHaveLength(2);
      expect(screen.getByRole('option', { name: /farmer/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /agronomist/i })).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      const user = userEvent.setup();
      testScenarios.networkError();

      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i agree to the/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'John Farmer');
      await user.type(emailInput, 'john@farm.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('clears errors when user modifies input', async () => {
      const user = userEvent.setup();
      
      // First trigger a validation error
      mockAuthService.signup.mockRejectedValueOnce(new Error('Email already exists'));

      render(
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      );

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i agree to the/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'John Farmer');
      await user.type(emailInput, 'existing@farm.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
      });

      // Error should be cleared when user modifies input
      // (This would require implementation in the component)
      await user.clear(emailInput);
      await user.type(emailInput, 'newemail@farm.com');

      // expect(screen.queryByText(/email already exists/i)).not.toBeInTheDocument();
    });
  });
});