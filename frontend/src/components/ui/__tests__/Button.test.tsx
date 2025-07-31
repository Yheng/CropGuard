/**
 * Button Component Tests
 * Comprehensive test suite for the Button component and its variants
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { Camera, Save, Trash2 } from 'lucide-react';
import {
  Button,
  PrimaryButton,
  SecondaryButton,
  DangerButton,
  SuccessButton,
  FloatingActionButton,
  IconButton,
  ButtonGroup,
} from '../Button';

describe('Button Component', () => {
  describe('Basic Functionality', () => {
    it('renders with default props', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: 'Click me' });
      
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('bg-brand-500'); // primary variant
      expect(button).toHaveClass('h-10'); // md size
    });

    it('handles click events', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      
      render(<Button onClick={handleClick}>Click me</Button>);
      const button = screen.getByRole('button', { name: 'Click me' });
      
      await user.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('prevents click when disabled', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      
      render(<Button disabled onClick={handleClick}>Disabled</Button>);
      const button = screen.getByRole('button', { name: 'Disabled' });
      
      expect(button).toBeDisabled();
      await user.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('prevents click when loading', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      
      render(<Button loading onClick={handleClick}>Loading</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toBeDisabled();
      expect(screen.getByTestId('loader')).toBeInTheDocument();
      await user.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Variants', () => {
    it('renders primary variant correctly', () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-brand-500');
    });

    it('renders secondary variant correctly', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-white', 'dark:bg-dark-800');
    });

    it('renders outline variant correctly', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-transparent', 'border-brand-200');
    });

    it('renders ghost variant correctly', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-transparent', 'border-transparent');
    });

    it('renders danger variant correctly', () => {
      render(<Button variant="danger">Danger</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-error-500');
    });

    it('renders success variant correctly', () => {
      render(<Button variant="success">Success</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-success-500');
    });

    it('renders warning variant correctly', () => {
      render(<Button variant="warning">Warning</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-warning-500');
    });
  });

  describe('Sizes', () => {
    it('renders xs size correctly', () => {
      render(<Button size="xs">Extra Small</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-8', 'px-2.5', 'text-xs');
    });

    it('renders sm size correctly', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-9', 'px-3', 'text-sm');
    });

    it('renders md size correctly', () => {
      render(<Button size="md">Medium</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10', 'px-4', 'text-sm');
    });

    it('renders lg size correctly', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-11', 'px-6', 'text-base');
    });

    it('renders xl size correctly', () => {
      render(<Button size="xl">Extra Large</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-12', 'px-8', 'text-lg');
    });
  });

  describe('Icons', () => {
    it('renders left icon correctly', () => {
      render(<Button leftIcon={<Camera data-testid="camera-icon" />}>Take Photo</Button>);
      
      const button = screen.getByRole('button');
      const icon = screen.getByTestId('camera-icon');
      
      expect(button).toBeInTheDocument();
      expect(icon).toBeInTheDocument();
    });

    it('renders right icon correctly', () => {
      render(<Button rightIcon={<Save data-testid="save-icon" />}>Save</Button>);
      
      const button = screen.getByRole('button');
      const icon = screen.getByTestId('save-icon');
      
      expect(button).toBeInTheDocument();
      expect(icon).toBeInTheDocument();
    });

    it('renders both left and right icons', () => {
      render(
        <Button 
          leftIcon={<Camera data-testid="camera-icon" />}
          rightIcon={<Save data-testid="save-icon" />}
        >
          Process
        </Button>
      );
      
      expect(screen.getByTestId('camera-icon')).toBeInTheDocument();
      expect(screen.getByTestId('save-icon')).toBeInTheDocument();
    });

    it('hides icons when loading', () => {
      render(
        <Button loading leftIcon={<Camera data-testid="camera-icon" />}>
          Loading
        </Button>
      );
      
      const iconContainer = screen.getByTestId('camera-icon').parentElement;
      expect(iconContainer).toHaveClass('opacity-0');
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      render(<Button loading>Loading</Button>);
      
      const spinner = screen.getByTestId('loader');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
    });

    it('hides content when loading', () => {
      render(<Button loading>Loading Content</Button>);
      
      const contentWrapper = screen.getByText('Loading Content').parentElement;
      expect(contentWrapper).toHaveClass('opacity-0');
    });

    it('disables button when loading', () => {
      render(<Button loading>Loading</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Props and Styling', () => {
    it('applies fullWidth prop correctly', () => {
      render(<Button fullWidth>Full Width</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full');
    });

    it('applies rounded prop correctly', () => {
      render(<Button rounded>Rounded</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('rounded-full');
    });

    it('applies elevated prop correctly', () => {
      render(<Button elevated>Elevated</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('shadow-lg');
    });

    it('applies custom className', () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('forwards HTML button props', () => {
      render(<Button type="submit" data-testid="submit-btn">Submit</Button>);
      const button = screen.getByTestId('submit-btn');
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  describe('Animation', () => {
    it('applies animation classes when animated', () => {
      render(<Button animated>Animated</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:transform', 'hover:-translate-y-0.5');
    });

    it('does not apply animation when disabled', () => {
      render(<Button animated disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('hover:transform');
    });

    it('wraps with motion.div when animated and not disabled', () => {
      const { container } = render(<Button animated>Animated</Button>);
      const motionDiv = container.querySelector('div');
      expect(motionDiv).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper role', () => {
      render(<Button>Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      
      render(<Button onClick={handleClick}>Keyboard</Button>);
      const button = screen.getByRole('button');
      
      button.focus();
      expect(button).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('has proper focus styles', () => {
      render(<Button>Focus Test</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-2');
    });

    it('shows loading state to screen readers', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('disabled');
    });
  });
});

describe('Button Specialized Components', () => {
  describe('PrimaryButton', () => {
    it('renders with primary variant', () => {
      render(<PrimaryButton>Primary</PrimaryButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-brand-500');
    });
  });

  describe('SecondaryButton', () => {
    it('renders with secondary variant', () => {
      render(<SecondaryButton>Secondary</SecondaryButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-white', 'dark:bg-dark-800');
    });
  });

  describe('DangerButton', () => {
    it('renders with danger variant', () => {
      render(<DangerButton>Delete</DangerButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-error-500');
    });
  });

  describe('FloatingActionButton', () => {
    it('renders with fixed positioning', () => {
      render(<FloatingActionButton>FAB</FloatingActionButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('fixed', 'bottom-6', 'right-6', 'z-50');
    });

    it('is rounded and elevated', () => {
      render(<FloatingActionButton>FAB</FloatingActionButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('rounded-full', 'shadow-lg');
    });
  });

  describe('IconButton', () => {
    it('renders as square aspect ratio', () => {
      render(<IconButton><Camera /></IconButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('aspect-square', 'p-0');
    });

    it('renders icon correctly', () => {
      render(<IconButton><Camera data-testid="icon" /></IconButton>);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });
  });

  describe('ButtonGroup', () => {
    it('renders button group with proper role', () => {
      render(
        <ButtonGroup>
          <Button>First</Button>
          <Button>Second</Button>
          <Button>Third</Button>
        </ButtonGroup>
      );
      
      const group = screen.getByRole('group');
      expect(group).toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(3);
    });

    it('applies group styling to buttons', () => {
      render(
        <ButtonGroup>
          <Button>First</Button>
          <Button>Second</Button>
        </ButtonGroup>
      );
      
      const group = screen.getByRole('group');
      expect(group).toHaveClass('[&>button]:rounded-none');
      expect(group).toHaveClass('[&>button:first-child]:rounded-l-lg');
      expect(group).toHaveClass('[&>button:last-child]:rounded-r-lg');
    });

    it('supports vertical orientation', () => {
      render(
        <ButtonGroup orientation="vertical">
          <Button>Top</Button>
          <Button>Bottom</Button>
        </ButtonGroup>
      );
      
      const group = screen.getByRole('group');
      expect(group).toHaveClass('flex-col');
    });

    it('passes size and variant to child buttons', () => {
      render(
        <ButtonGroup size="lg" variant="primary">
          <Button>Button</Button>
        </ButtonGroup>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-11'); // lg size
      expect(button).toHaveClass('bg-brand-500'); // primary variant
    });
  });
});

describe('Button Integration Tests', () => {
  describe('Agricultural Domain Usage', () => {
    it('works as crop analysis trigger', async () => {
      const handleAnalyze = vi.fn();
      const user = userEvent.setup();
      
      render(
        <Button 
          leftIcon={<Camera />}
          onClick={handleAnalyze}
          size="lg"
        >
          Analyze Crop
        </Button>
      );
      
      const button = screen.getByRole('button', { name: /analyze crop/i });
      await user.click(button);
      
      expect(handleAnalyze).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button')).toHaveClass('h-11'); // lg size
    });

    it('shows loading state during analysis', () => {
      render(
        <Button loading leftIcon={<Camera />}>
          Analyzing...
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByTestId('loader')).toBeInTheDocument();
    });

    it('handles treatment application', async () => {
      const handleApply = vi.fn();
      const user = userEvent.setup();
      
      render(
        <SuccessButton 
          rightIcon={<Save />}
          onClick={handleApply}
        >
          Apply Treatment
        </SuccessButton>
      );
      
      const button = screen.getByRole('button', { name: /apply treatment/i });
      await user.click(button);
      
      expect(handleApply).toHaveBeenCalledTimes(1);
      expect(button).toHaveClass('bg-success-500');
    });

    it('handles dangerous actions like deletion', async () => {
      const handleDelete = vi.fn();
      const user = userEvent.setup();
      
      render(
        <DangerButton 
          leftIcon={<Trash2 />}
          onClick={handleDelete}
        >
          Delete Analysis
        </DangerButton>
      );
      
      const button = screen.getByRole('button', { name: /delete analysis/i });
      await user.click(button);
      
      expect(handleDelete).toHaveBeenCalledTimes(1);
      expect(button).toHaveClass('bg-error-500');
    });
  });

  describe('Mobile Field Mode', () => {
    it('renders large buttons for field mode', () => {
      render(<Button size="xl">Field Mode Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-12', 'touch-target');
    });

    it('has proper touch targets', () => {
      render(<Button size="lg">Touch Target</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('touch-target');
    });
  });

  describe('Responsive Behavior', () => {
    it('adapts to mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query.includes('max-width: 768px'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<FloatingActionButton>Mobile FAB</FloatingActionButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('sm:bottom-8', 'sm:right-8');
    });
  });

  describe('Error Handling', () => {
    it('handles async click errors gracefully', async () => {
      const handleAsyncClick = vi.fn().mockRejectedValue(new Error('Async error'));
      const user = userEvent.setup();
      
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<Button onClick={handleAsyncClick}>Async Button</Button>);
      const button = screen.getByRole('button');
      
      await user.click(button);
      
      expect(handleAsyncClick).toHaveBeenCalledTimes(1);
      
      consoleSpy.mockRestore();
    });
  });
});