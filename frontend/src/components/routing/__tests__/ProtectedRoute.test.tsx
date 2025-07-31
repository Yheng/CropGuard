/**
 * ProtectedRoute Component Tests
 * Comprehensive test suite for role-based access control and route protection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/__tests__/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { ProtectedRoute, usePermissions, withRoleProtection, type User } from '../ProtectedRoute';

// Mock window.history.back
const mockHistoryBack = vi.fn();
Object.defineProperty(window, 'history', {
  value: { back: mockHistoryBack },
  writable: true
});

describe('ProtectedRoute Component', () => {
  const mockUser: User = {
    id: 'user-123',
    name: 'John Farmer',
    email: 'john@farm.com',
    role: 'farmer',
    permissions: ['read_crops', 'write_analysis'],
    subscriptionPlan: 'premium',
    isActive: true,
    assignedRegions: ['north-region']
  };

  const TestComponent = () => <div>Protected Content</div>;
  const CustomFallback = () => <div>Custom Fallback</div>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication Checks', () => {
    it('renders protected content for authenticated user', () => {
      render(
        <ProtectedRoute user={mockUser}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('shows authentication required for unauthenticated user', () => {
      render(
        <ProtectedRoute user={null}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByText('You need to sign in to access this page.')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('uses custom fallback component when provided', () => {
      render(
        <ProtectedRoute user={null} fallbackComponent={CustomFallback}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
    });

    it('calls onUnauthorized callback for unauthenticated user', () => {
      const onUnauthorized = vi.fn();

      render(
        <ProtectedRoute user={null} onUnauthorized={onUnauthorized}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });
  });

  describe('Role-based Access Control', () => {
    it('allows access when user has required role', () => {
      render(
        <ProtectedRoute user={mockUser} requiredRoles={['farmer']}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('denies access when user lacks required role', () => {
      render(
        <ProtectedRoute user={mockUser} requiredRoles={['admin']}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('This page is restricted to admin users only.')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('allows access when user has one of multiple required roles', () => {
      render(
        <ProtectedRoute user={mockUser} requiredRoles={['farmer', 'agronomist']}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('denies access when user has none of the required roles', () => {
      render(
        <ProtectedRoute user={mockUser} requiredRoles={['admin', 'supervisor']}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('This page is restricted to admin, supervisor users only.')).toBeInTheDocument();
    });

    it('displays required roles in access denied message', () => {
      render(
        <ProtectedRoute user={mockUser} requiredRoles={['admin', 'supervisor']}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('supervisor')).toBeInTheDocument();
    });
  });

  describe('Permission-based Access Control', () => {
    it('allows access when user has all required permissions', () => {
      render(
        <ProtectedRoute user={mockUser} requiredPermissions={['read_crops']}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('allows access when user has multiple required permissions', () => {
      render(
        <ProtectedRoute user={mockUser} requiredPermissions={['read_crops', 'write_analysis']}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('denies access when user lacks required permissions', () => {
      render(
        <ProtectedRoute user={mockUser} requiredPermissions={['admin_access']}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument();
      expect(screen.getByText('You need the following permissions: admin_access.')).toBeInTheDocument();
    });

    it('denies access when user lacks some required permissions', () => {
      render(
        <ProtectedRoute user={mockUser} requiredPermissions={['read_crops', 'admin_access']}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument();
      expect(screen.getByText('You need the following permissions: read_crops, admin_access.')).toBeInTheDocument();
    });

    it('handles user with no permissions', () => {
      const userWithoutPermissions = { ...mockUser, permissions: undefined };

      render(
        <ProtectedRoute user={userWithoutPermissions} requiredPermissions={['read_crops']}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument();
    });

    it('displays required permissions list in error message', () => {
      render(
        <ProtectedRoute user={mockUser} requiredPermissions={['admin_access', 'super_user']}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('• admin_access')).toBeInTheDocument();
      expect(screen.getByText('• super_user')).toBeInTheDocument();
    });
  });

  describe('Account Status Checks', () => {
    it('allows access for active user', () => {
      const activeUser = { ...mockUser, isActive: true };

      render(
        <ProtectedRoute user={activeUser}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('denies access for inactive user', () => {
      const inactiveUser = { ...mockUser, isActive: false };

      render(
        <ProtectedRoute user={inactiveUser}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    it('allows access when isActive is undefined', () => {
      const userWithUndefinedStatus = { ...mockUser };
      delete userWithUndefinedStatus.isActive;

      render(
        <ProtectedRoute user={userWithUndefinedStatus}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Subscription Checks', () => {
    it('allows access when subscription not required', () => {
      render(
        <ProtectedRoute user={mockUser} requiresActiveSubscription={false}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('allows access with active subscription', () => {
      const subscribedUser = { ...mockUser, subscriptionPlan: 'premium' };

      render(
        <ProtectedRoute user={subscribedUser} requiresActiveSubscription={true}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('denies access for free plan when subscription required', () => {
      const freeUser = { ...mockUser, subscriptionPlan: 'free' };

      render(
        <ProtectedRoute user={freeUser} requiresActiveSubscription={true}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Subscription Required')).toBeInTheDocument();
      expect(screen.getByText('This feature requires an active subscription plan.')).toBeInTheDocument();
    });

    it('denies access for expired subscription', () => {
      const expiredUser = { ...mockUser, subscriptionPlan: 'expired' };

      render(
        <ProtectedRoute user={expiredUser} requiresActiveSubscription={true}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Subscription Required')).toBeInTheDocument();
    });

    it('denies access when no subscription plan', () => {
      const userWithoutPlan = { ...mockUser };
      delete userWithoutPlan.subscriptionPlan;

      render(
        <ProtectedRoute user={userWithoutPlan} requiresActiveSubscription={true}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Subscription Required')).toBeInTheDocument();
    });
  });

  describe('User Information Display', () => {
    it('displays user information in access denied screen', () => {
      render(
        <ProtectedRoute user={mockUser} requiredRoles={['admin']}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('John Farmer')).toBeInTheDocument();
      expect(screen.getByText('john@farm.com')).toBeInTheDocument();
      expect(screen.getByText('farmer')).toBeInTheDocument();
    });

    it('does not display user info when not authenticated', () => {
      render(
        <ProtectedRoute user={null}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.queryByText('Signed in as:')).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons and Navigation', () => {
    it('provides sign in button for unauthenticated users', async () => {
      const onRedirect = vi.fn();
      const user = userEvent.setup();

      render(
        <ProtectedRoute user={null} onRedirect={onRedirect}>
          <TestComponent />
        </ProtectedRoute>
      );

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      expect(onRedirect).toHaveBeenCalledWith('/login');
    });

    it('provides upgrade button for subscription required', async () => {
      const onRedirect = vi.fn();
      const user = userEvent.setup();
      const freeUser = { ...mockUser, subscriptionPlan: 'free' };

      render(
        <ProtectedRoute user={freeUser} requiresActiveSubscription={true} onRedirect={onRedirect}>
          <TestComponent />
        </ProtectedRoute>
      );

      const upgradeButton = screen.getByRole('button', { name: /upgrade plan/i });
      await user.click(upgradeButton);

      expect(onRedirect).toHaveBeenCalledWith('/pricing');
    });

    it('provides contact support button for access denied', async () => {
      const onRedirect = vi.fn();
      const user = userEvent.setup();

      render(
        <ProtectedRoute user={mockUser} requiredRoles={['admin']} onRedirect={onRedirect}>
          <TestComponent />
        </ProtectedRoute>
      );

      const contactButton = screen.getByRole('button', { name: /contact support/i });
      await user.click(contactButton);

      expect(onRedirect).toHaveBeenCalledWith('/support');
    });

    it('provides go back button', async () => {
      const user = userEvent.setup();

      render(
        <ProtectedRoute user={null}>
          <TestComponent />
        </ProtectedRoute>
      );

      const goBackButton = screen.getByRole('button', { name: /go back/i });
      await user.click(goBackButton);

      expect(mockHistoryBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Combined Access Checks', () => {
    it('enforces both role and permission requirements', () => {
      render(
        <ProtectedRoute
          user={mockUser}
          requiredRoles={['farmer']}
          requiredPermissions={['read_crops']}
        >
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('denies access when role matches but permissions are insufficient', () => {
      render(
        <ProtectedRoute
          user={mockUser}
          requiredRoles={['farmer']}
          requiredPermissions={['admin_access']}
        >
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument();
    });

    it('denies access when permissions match but role is insufficient', () => {
      render(
        <ProtectedRoute
          user={mockUser}
          requiredRoles={['admin']}
          requiredPermissions={['read_crops']}
        >
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    it('enforces all requirements: role, permissions, and subscription', () => {
      render(
        <ProtectedRoute
          user={mockUser}
          requiredRoles={['farmer']}
          requiredPermissions={['read_crops']}
          requiresActiveSubscription={true}
        >
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className to wrapper', () => {
      const { container } = render(
        <ProtectedRoute user={mockUser} className="custom-class">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});

describe('usePermissions Hook', () => {
  const TestHookComponent = ({ user }: { user?: User | null }) => {
    const permissions = usePermissions(user);
    
    return (
      <div>
        <div>Authenticated: {permissions.isAuthenticated.toString()}</div>
        <div>Role: {permissions.userRole || 'none'}</div>
        <div>Has Farmer Role: {permissions.hasRole('farmer').toString()}</div>
        <div>Has Read Permission: {permissions.hasPermission('read_crops').toString()}</div>
        <div>Can Access Admin: {permissions.canAccess(['admin'], ['admin_access']).toString()}</div>
      </div>
    );
  };

  it('returns correct values for authenticated user', () => {
    render(<TestHookComponent user={mockUser} />);

    expect(screen.getByText('Authenticated: true')).toBeInTheDocument();
    expect(screen.getByText('Role: farmer')).toBeInTheDocument();
    expect(screen.getByText('Has Farmer Role: true')).toBeInTheDocument();
    expect(screen.getByText('Has Read Permission: true')).toBeInTheDocument();
    expect(screen.getByText('Can Access Admin: false')).toBeInTheDocument();
  });

  it('returns correct values for unauthenticated user', () => {
    render(<TestHookComponent user={null} />);

    expect(screen.getByText('Authenticated: false')).toBeInTheDocument();
    expect(screen.getByText('Role: none')).toBeInTheDocument();
    expect(screen.getByText('Has Farmer Role: false')).toBeInTheDocument();
    expect(screen.getByText('Has Read Permission: false')).toBeInTheDocument();
    expect(screen.getByText('Can Access Admin: false')).toBeInTheDocument();
  });

  it('handles user without permissions array', () => {
    const userWithoutPermissions = { ...mockUser, permissions: undefined };
    render(<TestHookComponent user={userWithoutPermissions} />);

    expect(screen.getByText('Has Read Permission: false')).toBeInTheDocument();
  });
});

describe('withRoleProtection HOC', () => {
  const TestComponent = ({ message }: { message: string }) => <div>{message}</div>;
  const ProtectedComponent = withRoleProtection(TestComponent, ['farmer'], ['read_crops']);

  it('renders component when user has required access', () => {
    render(<ProtectedComponent user={mockUser} message="Hello Protected World" />);

    expect(screen.getByText('Hello Protected World')).toBeInTheDocument();
  });

  it('shows access denied when user lacks required role', () => {
    const adminUser = { ...mockUser, role: 'admin' as const };
    render(<ProtectedComponent user={adminUser} message="Hello Protected World" />);

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Hello Protected World')).not.toBeInTheDocument();
  });

  it('shows access denied when user lacks required permissions', () => {
    const userWithoutPermissions = { ...mockUser, permissions: ['other_permission'] };
    render(<ProtectedComponent user={userWithoutPermissions} message="Hello Protected World" />);

    expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument();
    expect(screen.queryByText('Hello Protected World')).not.toBeInTheDocument();
  });
});

describe('Agricultural Domain Scenarios', () => {
  const farmerUser: User = {
    id: 'farmer-123',
    name: 'John Farmer',
    email: 'john@farm.com',
    role: 'farmer',
    permissions: ['view_crops', 'create_analysis', 'apply_treatments'],
    subscriptionPlan: 'basic'
  };

  const agronomistUser: User = {
    id: 'agro-123',
    name: 'Dr. Smith',
    email: 'dr.smith@agro.com',
    role: 'agronomist',
    permissions: ['view_crops', 'create_analysis', 'review_treatments', 'access_advanced_analytics'],
    subscriptionPlan: 'professional'
  };

  // adminUser variable removed as it was unused

  it('allows farmer to access crop analysis', () => {
    render(
      <ProtectedRoute user={farmerUser} requiredRoles={['farmer']} requiredPermissions={['create_analysis']}>
        <div>Crop Analysis Dashboard</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Crop Analysis Dashboard')).toBeInTheDocument();
  });

  it('allows agronomist to access advanced analytics', () => {
    render(
      <ProtectedRoute
        user={agronomistUser}
        requiredRoles={['agronomist']}
        requiredPermissions={['access_advanced_analytics']}
      >
        <div>Advanced Analytics Dashboard</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Advanced Analytics Dashboard')).toBeInTheDocument();
  });

  it('denies farmer access to admin features', () => {
    render(
      <ProtectedRoute user={farmerUser} requiredRoles={['admin']} requiredPermissions={['manage_users']}>
        <div>Admin Panel</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
  });

  it('enforces subscription requirements for premium features', () => {
    const basicFarmer = { ...farmerUser, subscriptionPlan: 'free' };

    render(
      <ProtectedRoute user={basicFarmer} requiresActiveSubscription={true}>
        <div>Premium AI Analysis</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Subscription Required')).toBeInTheDocument();
    expect(screen.queryByText('Premium AI Analysis')).not.toBeInTheDocument();
  });

  it('allows multi-role access for shared features', () => {
    render(
      <ProtectedRoute
        user={farmerUser}
        requiredRoles={['farmer', 'agronomist']}
        requiredPermissions={['view_crops']}
      >
        <div>Crop Database</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Crop Database')).toBeInTheDocument();
  });
});