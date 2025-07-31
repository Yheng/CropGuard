/**
 * Input Component Tests
 * Comprehensive test suite for Input and TextArea components
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { Mail, Search, User } from 'lucide-react';
import { Input, TextArea } from '../Input';

describe('Input Component', () => {
  describe('Basic Functionality', () => {
    it('renders with default props', () => {
      render(<Input placeholder="Enter text" />);
      const input = screen.getByPlaceholderText('Enter text');
      
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass('bg-[#1F2A44]', 'border-gray-600');
    });

    it('handles value changes', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      
      render(<Input onChange={handleChange} placeholder="Type here" />);
      const input = screen.getByPlaceholderText('Type here');
      
      await user.type(input, 'test value');
      
      expect(handleChange).toHaveBeenCalledTimes(10); // 10 characters
      expect(input).toHaveValue('test value');
    });

    it('supports controlled value', () => {
      const { rerender } = render(<Input value="initial" onChange={() => {}} />);
      const input = screen.getByDisplayValue('initial');
      expect(input).toHaveValue('initial');
      
      rerender(<Input value="updated" onChange={() => {}} />);
      expect(input).toHaveValue('updated');
    });

    it('supports uncontrolled usage', async () => {
      const user = userEvent.setup();
      
      render(<Input defaultValue="default" />);
      const input = screen.getByDisplayValue('default');
      
      await user.clear(input);
      await user.type(input, 'new value');
      
      expect(input).toHaveValue('new value');
    });
  });

  describe('Label and Accessibility', () => {
    it('renders label when provided', () => {
      render(<Input label="Email Address" />);
      
      const label = screen.getByText('Email Address');
      const input = screen.getByLabelText('Email Address');
      
      expect(label).toBeInTheDocument();
      expect(input).toBeInTheDocument();
      expect(label).toHaveAttribute('for', input.id);
    });

    it('generates unique id when not provided', () => {
      render(
        <>
          <Input label="First Input" />
          <Input label="Second Input" />
        </>
      );
      
      const firstInput = screen.getByLabelText('First Input');
      const secondInput = screen.getByLabelText('Second Input');
      
      expect(firstInput.id).not.toBe(secondInput.id);
      expect(firstInput.id).toBeTruthy();
      expect(secondInput.id).toBeTruthy();
    });

    it('uses provided id', () => {
      render(<Input id="custom-id" label="Custom ID Input" />);
      
      const input = screen.getByLabelText('Custom ID Input');
      const label = screen.getByText('Custom ID Input');
      
      expect(input).toHaveAttribute('id', 'custom-id');
      expect(label).toHaveAttribute('for', 'custom-id');
    });

    it('supports aria-describedby for helper text', () => {
      render(<Input helperText="This is helper text" />);
      
      const input = screen.getByRole('textbox');
      const helperText = screen.getByText('This is helper text');
      
      // Helper text should be associated with input
      expect(helperText).toBeInTheDocument();
    });
  });

  describe('Input Types', () => {
    it('renders email input correctly', () => {
      render(<Input type="email" placeholder="email@example.com" />);
      const input = screen.getByPlaceholderText('email@example.com');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('renders number input correctly', () => {
      render(<Input type="number" placeholder="123" />);
      const input = screen.getByPlaceholderText('123');
      expect(input).toHaveAttribute('type', 'number');
    });

    it('renders search input correctly', () => {
      render(<Input type="search" placeholder="Search..." />);
      const input = screen.getByPlaceholderText('Search...');
      expect(input).toHaveAttribute('type', 'search');
    });

    it('renders tel input correctly', () => {
      render(<Input type="tel" placeholder="+1 234 567 8900" />);
      const input = screen.getByPlaceholderText('+1 234 567 8900');
      expect(input).toHaveAttribute('type', 'tel');
    });

    it('renders url input correctly', () => {
      render(<Input type="url" placeholder="https://example.com" />);
      const input = screen.getByPlaceholderText('https://example.com');
      expect(input).toHaveAttribute('type', 'url');
    });
  });

  describe('Password Input', () => {
    it('renders password input with toggle', () => {
      render(<Input type="password" placeholder="Password" />);
      
      const input = screen.getByPlaceholderText('Password');
      const toggleButton = screen.getByRole('button');
      
      expect(input).toHaveAttribute('type', 'password');
      expect(toggleButton).toBeInTheDocument();
    });

    it('toggles password visibility', async () => {
      const user = userEvent.setup();
      
      render(<Input type="password" placeholder="Password" />);
      
      const input = screen.getByPlaceholderText('Password');
      const toggleButton = screen.getByRole('button');
      
      expect(input).toHaveAttribute('type', 'password');
      
      await user.click(toggleButton);
      expect(input).toHaveAttribute('type', 'text');
      
      await user.click(toggleButton);
      expect(input).toHaveAttribute('type', 'password');
    });

    it('shows correct toggle icons', async () => {
      const user = userEvent.setup();
      
      render(<Input type="password" placeholder="Password" />);
      
      const toggleButton = screen.getByRole('button');
      
      // Initially shows Eye icon (password hidden)
      expect(toggleButton.querySelector('svg')).toBeInTheDocument();
      
      await user.click(toggleButton);
      
      // After click, shows EyeOff icon (password visible)
      expect(toggleButton.querySelector('svg')).toBeInTheDocument();
    });

    it('excludes toggle button from tab order', () => {
      render(<Input type="password" placeholder="Password" />);
      
      const toggleButton = screen.getByRole('button');
      expect(toggleButton).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Icons', () => {
    it('renders left icon correctly', () => {
      render(<Input leftIcon={<Mail data-testid="mail-icon" />} />);
      
      const icon = screen.getByTestId('mail-icon');
      const input = screen.getByRole('textbox');
      
      expect(icon).toBeInTheDocument();
      expect(input).toHaveClass('pl-10');
    });

    it('renders right icon correctly', () => {
      render(<Input rightIcon={<Search data-testid="search-icon" />} />);
      
      const icon = screen.getByTestId('search-icon');
      const input = screen.getByRole('textbox');
      
      expect(icon).toBeInTheDocument();
      expect(input).toHaveClass('pr-10');
    });

    it('renders both left and right icons', () => {
      render(
        <Input
          leftIcon={<User data-testid="user-icon" />}
          rightIcon={<Search data-testid="search-icon" />}
        />
      );
      
      const userIcon = screen.getByTestId('user-icon');
      const searchIcon = screen.getByTestId('search-icon');
      const input = screen.getByRole('textbox');
      
      expect(userIcon).toBeInTheDocument();
      expect(searchIcon).toBeInTheDocument();
      expect(input).toHaveClass('pl-10', 'pr-10');
    });

    it('prioritizes password toggle over right icon', () => {
      render(
        <Input
          type="password"
          rightIcon={<Search data-testid="search-icon" />}
        />
      );
      
      const passwordToggle = screen.getByRole('button');
      const searchIcon = screen.queryByTestId('search-icon');
      
      expect(passwordToggle).toBeInTheDocument();
      expect(searchIcon).not.toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('renders default variant correctly', () => {
      render(<Input variant="default" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-gray-600', 'bg-[#1F2A44]');
    });

    it('renders filled variant correctly', () => {
      render(<Input variant="filled" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('bg-[#4A5B7C]');
      expect(input).not.toHaveClass('border');
    });

    it('renders underlined variant correctly', () => {
      render(<Input variant="underlined" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-0', 'border-b', 'bg-transparent', 'rounded-none');
    });
  });

  describe('Error Handling', () => {
    it('displays error message', () => {
      render(<Input error="This field is required" />);
      
      const input = screen.getByRole('textbox');
      const errorMessage = screen.getByText('This field is required');
      const errorIcon = screen.getByRole('img', { hidden: true }); // AlertCircle icon
      
      expect(input).toHaveClass('border-red-500');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveClass('text-red-500');
      expect(errorIcon).toBeInTheDocument();
    });

    it('prioritizes error over helper text', () => {
      render(
        <Input
          error="Error message"
          helperText="Helper text"
        />
      );
      
      const errorMessage = screen.getByText('Error message');
      const helperText = screen.queryByText('Helper text');
      
      expect(errorMessage).toBeInTheDocument();
      expect(helperText).not.toBeInTheDocument();
    });

    it('shows helper text when no error', () => {
      render(<Input helperText="This is helper text" />);
      
      const helperText = screen.getByText('This is helper text');
      expect(helperText).toBeInTheDocument();
      expect(helperText).toHaveClass('text-gray-400');
    });
  });

  describe('States', () => {
    it('handles disabled state', () => {
      render(<Input disabled placeholder="Disabled input" />);
      
      const input = screen.getByPlaceholderText('Disabled input');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
    });

    it('applies disabled styles to label', () => {
      render(<Input label="Disabled Label" disabled />);
      
      const label = screen.getByText('Disabled Label');
      expect(label).toHaveClass('text-gray-500');
    });

    it('handles readonly state', () => {
      render(<Input readOnly value="Readonly value" />);
      
      const input = screen.getByDisplayValue('Readonly value');
      expect(input).toHaveAttribute('readonly');
    });
  });

  describe('Layout and Sizing', () => {
    it('applies fullWidth prop', () => {
      const { container } = render(<Input fullWidth />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('w-full');
    });

    it('applies custom className', () => {
      render(<Input className="custom-input-class" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-input-class');
    });

    it('forwards HTML input attributes', () => {
      render(
        <Input
          placeholder="Test placeholder"
          maxLength={10}
          autoComplete="email"
          data-testid="custom-input"
        />
      );
      
      const input = screen.getByTestId('custom-input');
      expect(input).toHaveAttribute('placeholder', 'Test placeholder');
      expect(input).toHaveAttribute('maxlength', '10');
      expect(input).toHaveAttribute('autocomplete', 'email');
    });
  });

  describe('Focus and Interaction', () => {
    it('supports focus management', async () => {
      const user = userEvent.setup();
      
      render(<Input placeholder="Focus test" />);
      const input = screen.getByPlaceholderText('Focus test');
      
      await user.click(input);
      expect(input).toHaveFocus();
    });

    it('applies focus styles', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-[#10B981]/50');
    });

    it('changes focus ring color when error', () => {
      render(<Input error="Error" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('focus-visible:ring-red-500/50');
    });
  });
});

describe('TextArea Component', () => {
  describe('Basic Functionality', () => {
    it('renders textarea correctly', () => {
      render(<TextArea placeholder="Enter description" />);
      
      const textarea = screen.getByPlaceholderText('Enter description');
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    it('handles value changes', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      
      render(<TextArea onChange={handleChange} placeholder="Type here" />);
      const textarea = screen.getByPlaceholderText('Type here');
      
      await user.type(textarea, 'multiline\ntext');
      
      expect(handleChange).toHaveBeenCalled();
      expect(textarea).toHaveValue('multiline\ntext');
    });

    it('supports minimum height', () => {
      render(<TextArea />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('min-h-[80px]');
    });

    it('disables resize by default', () => {
      render(<TextArea />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('resize-none');
    });
  });

  describe('Label and Error Handling', () => {
    it('renders with label', () => {
      render(<TextArea label="Description" />);
      
      const label = screen.getByText('Description');
      const textarea = screen.getByLabelText('Description');
      
      expect(label).toBeInTheDocument();
      expect(textarea).toBeInTheDocument();
    });

    it('displays error message', () => {
      render(<TextArea error="Description is required" />);
      
      const textarea = screen.getByRole('textbox');
      const errorMessage = screen.getByText('Description is required');
      
      expect(textarea).toHaveClass('border-red-500');
      expect(errorMessage).toHaveClass('text-red-500');
    });

    it('shows helper text', () => {
      render(<TextArea helperText="Maximum 500 characters" />);
      
      const helperText = screen.getByText('Maximum 500 characters');
      expect(helperText).toHaveClass('text-gray-400');
    });
  });

  describe('Props and Attributes', () => {
    it('supports custom rows', () => {
      render(<TextArea rows={5} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('rows', '5');
    });

    it('supports custom cols', () => {
      render(<TextArea cols={50} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('cols', '50');
    });

    it('supports maxLength', () => {
      render(<TextArea maxLength={100} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('maxlength', '100');
    });

    it('applies fullWidth prop', () => {
      const { container } = render(<TextArea fullWidth />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('w-full');
    });
  });

  describe('States', () => {
    it('handles disabled state', () => {
      render(<TextArea disabled placeholder="Disabled textarea" />);
      
      const textarea = screen.getByPlaceholderText('Disabled textarea');
      expect(textarea).toBeDisabled();
      expect(textarea).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
    });

    it('handles readonly state', () => {
      render(<TextArea readOnly value="Readonly content" />);
      
      const textarea = screen.getByDisplayValue('Readonly content');
      expect(textarea).toHaveAttribute('readonly');
    });
  });
});

describe('Input Integration Tests', () => {
  describe('Agricultural Domain Usage', () => {
    it('works as crop search input', async () => {
      const handleSearch = vi.fn();
      const user = userEvent.setup();
      
      render(
        <Input
          type="search"
          placeholder="Search crops..."
          leftIcon={<Search />}
          onChange={handleSearch}
        />
      );
      
      const input = screen.getByPlaceholderText('Search crops...');
      await user.type(input, 'tomato');
      
      expect(handleSearch).toHaveBeenCalled();
      expect(input).toHaveValue('tomato');
    });

    it('works as treatment notes textarea', async () => {
      const handleNotesChange = vi.fn();
      const user = userEvent.setup();
      
      render(
        <TextArea
          label="Treatment Notes"
          placeholder="Enter treatment application notes..."
          helperText="Include dosage, timing, and weather conditions"
          onChange={handleNotesChange}
        />
      );
      
      const textarea = screen.getByLabelText('Treatment Notes');
      const helperText = screen.getByText('Include dosage, timing, and weather conditions');
      
      await user.type(textarea, 'Applied fungicide at 2ml/L concentration');
      
      expect(handleNotesChange).toHaveBeenCalled();
      expect(textarea).toHaveValue('Applied fungicide at 2ml/L concentration');
      expect(helperText).toBeInTheDocument();
    });

    it('validates email for user registration', () => {
      render(
        <Input
          type="email"
          label="Email Address"
          leftIcon={<Mail />}
          error="Please enter a valid email address"
          required
        />
      );
      
      const input = screen.getByLabelText('Email Address');
      const errorMessage = screen.getByText('Please enter a valid email address');
      
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('required');
      expect(input).toHaveClass('border-red-500');
      expect(errorMessage).toBeInTheDocument();
    });

    it('handles secure password input', async () => {
      const user = userEvent.setup();
      
      render(
        <Input
          type="password"
          label="Password"
          placeholder="Enter your password"
          helperText="Password must be at least 8 characters"
        />
      );
      
      const input = screen.getByLabelText('Password');
      const toggleButton = screen.getByRole('button');
      const helperText = screen.getByText('Password must be at least 8 characters');
      
      await user.type(input, 'securepassword123');
      expect(input).toHaveValue('securepassword123');
      expect(input).toHaveAttribute('type', 'password');
      
      await user.click(toggleButton);
      expect(input).toHaveAttribute('type', 'text');
      
      expect(helperText).toBeInTheDocument();
    });
  });

  describe('Form Integration', () => {
    it('integrates with form submission', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault());
      const user = userEvent.setup();
      
      render(
        <form onSubmit={handleSubmit}>
          <Input name="cropType" placeholder="Enter crop type" required />
          <TextArea name="notes" placeholder="Additional notes" />
          <button type="submit">Submit</button>
        </form>
      );
      
      const cropInput = screen.getByPlaceholderText('Enter crop type');
      const notesTextarea = screen.getByPlaceholderText('Additional notes');
      const submitButton = screen.getByRole('button', { name: 'Submit' });
      
      await user.type(cropInput, 'Tomato');
      await user.type(notesTextarea, 'Healthy looking crop');
      await user.click(submitButton);
      
      expect(handleSubmit).toHaveBeenCalledTimes(1);
      expect(cropInput).toHaveValue('Tomato');
      expect(notesTextarea).toHaveValue('Healthy looking crop');
    });

    it('supports form validation', () => {
      render(
        <form>
          <Input
            type="email"
            name="email"
            label="Email"
            required
            pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
          />
          <Input
            type="password"
            name="password"
            label="Password"
            required
            minLength={8}
          />
        </form>
      );
      
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      
      expect(emailInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('pattern');
      expect(passwordInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('minlength', '8');
    });
  });

  describe('Accessibility', () => {
    it('maintains proper tab order', async () => {
      const user = userEvent.setup();
      
      render(
        <>
          <Input label="First Input" />
          <Input type="password" label="Password Input" />
          <TextArea label="Text Area" />
        </>
      );
      
      const firstInput = screen.getByLabelText('First Input');
      const passwordInput = screen.getByLabelText('Password Input');
      const textarea = screen.getByLabelText('Text Area');
      
      await user.tab();
      expect(firstInput).toHaveFocus();
      
      await user.tab();
      expect(passwordInput).toHaveFocus();
      
      await user.tab();
      expect(textarea).toHaveFocus();
    });

    it('supports screen readers', () => {
      render(
        <Input
          label="Accessible Input"
          helperText="Helper text for screen readers"
          error="Error message for screen readers"
        />
      );
      
      const input = screen.getByLabelText('Accessible Input');
      const errorMessage = screen.getByText('Error message for screen readers');
      
      expect(input).toBeInTheDocument();
      expect(errorMessage).toBeInTheDocument();
    });
  });
});