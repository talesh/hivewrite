import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/Button';

describe('Button Component', () => {
  describe('rendering', () => {
    it('should render button with text', () => {
      render(<Button>Click me</Button>);

      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('should render button with children', () => {
      render(
        <Button>
          <span>Icon</span>
          <span>Text</span>
        </Button>
      );

      expect(screen.getByText('Icon')).toBeInTheDocument();
      expect(screen.getByText('Text')).toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it('should render primary variant (default)', () => {
      const { container } = render(<Button>Primary</Button>);

      const button = container.querySelector('button');
      expect(button?.className).toContain('bg-gray-900');
      expect(button?.className).toContain('text-white');
    });

    it('should render secondary variant', () => {
      const { container } = render(<Button variant="secondary">Secondary</Button>);

      const button = container.querySelector('button');
      expect(button?.className).toContain('bg-gray-100');
      expect(button?.className).toContain('text-gray-900');
    });

    it('should render danger variant', () => {
      const { container } = render(<Button variant="danger">Danger</Button>);

      const button = container.querySelector('button');
      expect(button?.className).toContain('bg-red-600');
      expect(button?.className).toContain('text-white');
    });

    it('should render ghost variant', () => {
      const { container } = render(<Button variant="ghost">Ghost</Button>);

      const button = container.querySelector('button');
      expect(button?.className).toContain('bg-transparent');
      expect(button?.className).toContain('text-gray-700');
    });
  });

  describe('sizes', () => {
    it('should render small size', () => {
      const { container } = render(<Button size="sm">Small</Button>);

      const button = container.querySelector('button');
      expect(button?.className).toContain('px-3');
      expect(button?.className).toContain('py-1.5');
      expect(button?.className).toContain('text-sm');
    });

    it('should render medium size (default)', () => {
      const { container } = render(<Button>Medium</Button>);

      const button = container.querySelector('button');
      expect(button?.className).toContain('px-4');
      expect(button?.className).toContain('py-2');
      expect(button?.className).toContain('text-base');
    });

    it('should render large size', () => {
      const { container } = render(<Button size="lg">Large</Button>);

      const button = container.querySelector('button');
      expect(button?.className).toContain('px-6');
      expect(button?.className).toContain('py-3');
      expect(button?.className).toContain('text-lg');
    });
  });

  describe('loading state', () => {
    it('should show loading spinner when loading', () => {
      const { container } = render(<Button loading>Loading</Button>);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should disable button when loading', () => {
      render(<Button loading>Loading</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should not show spinner when not loading', () => {
      const { container } = render(<Button>Not Loading</Button>);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should have disabled styles', () => {
      const { container } = render(<Button disabled>Disabled</Button>);

      const button = container.querySelector('button');
      expect(button?.className).toContain('disabled:opacity-50');
      expect(button?.className).toContain('disabled:cursor-not-allowed');
    });

    it('should be disabled when loading even if disabled is false', () => {
      render(<Button loading disabled={false}>Loading</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('interactions', () => {
    it('should call onClick when clicked', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Click me</Button>);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick} disabled>Click me</Button>);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when loading', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick} loading>Click me</Button>);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('custom className', () => {
    it('should merge custom className with default classes', () => {
      const { container } = render(<Button className="custom-class">Button</Button>);

      const button = container.querySelector('button');
      expect(button?.className).toContain('custom-class');
      expect(button?.className).toContain('bg-gray-900'); // Default primary style
    });
  });

  describe('HTML button attributes', () => {
    it('should pass through type attribute', () => {
      render(<Button type="submit">Submit</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should pass through aria-label', () => {
      render(<Button aria-label="Custom label">Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom label');
    });

    it('should pass through data attributes', () => {
      render(<Button data-testid="my-button">Button</Button>);

      const button = screen.getByTestId('my-button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have focus styles', () => {
      const { container } = render(<Button>Button</Button>);

      const button = container.querySelector('button');
      expect(button?.className).toContain('focus:outline-none');
      expect(button?.className).toContain('focus:ring-2');
    });

    it('should have transition effects', () => {
      const { container } = render(<Button>Button</Button>);

      const button = container.querySelector('button');
      expect(button?.className).toContain('transition-colors');
    });

    it('should be keyboard accessible', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Button</Button>);

      const button = screen.getByRole('button');
      button.focus();

      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalled();
    });
  });
});
