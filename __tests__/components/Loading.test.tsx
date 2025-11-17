import { render, screen } from '@testing-library/react';
import { Loading } from '@/components/ui/Loading';

describe('Loading Component', () => {
  describe('rendering', () => {
    it('should render loading spinner', () => {
      const { container } = render(<Loading />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should render with optional text', () => {
      render(<Loading text="Loading data..." />);

      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('should render without text by default', () => {
      const { container } = render(<Loading />);

      const text = container.querySelector('p');
      expect(text).not.toBeInTheDocument();
    });
  });

  describe('size variants', () => {
    it('should render small size', () => {
      const { container } = render(<Loading size="sm" />);

      const spinner = container.querySelector('.h-6.w-6');
      expect(spinner).toBeInTheDocument();
    });

    it('should render medium size (default)', () => {
      const { container } = render(<Loading />);

      const spinner = container.querySelector('.h-12.w-12');
      expect(spinner).toBeInTheDocument();
    });

    it('should render large size', () => {
      const { container } = render(<Loading size="lg" />);

      const spinner = container.querySelector('.h-16.w-16');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('fullScreen mode', () => {
    it('should render fullscreen layout when enabled', () => {
      const { container } = render(<Loading fullScreen />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('min-h-screen');
      expect(wrapper.className).toContain('flex');
      expect(wrapper.className).toContain('items-center');
      expect(wrapper.className).toContain('justify-center');
    });

    it('should not render fullscreen layout by default', () => {
      const { container } = render(<Loading />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).not.toContain('min-h-screen');
    });

    it('should apply background color in fullscreen mode', () => {
      const { container } = render(<Loading fullScreen />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('bg-gray-50');
    });
  });

  describe('text styling', () => {
    it('should render text with proper styling', () => {
      const { container } = render(<Loading text="Loading..." />);

      const text = container.querySelector('p');
      expect(text?.className).toContain('text-sm');
      expect(text?.className).toContain('text-gray-600');
    });
  });

  describe('animation', () => {
    it('should have spin animation on SVG', () => {
      const { container } = render(<Loading />);

      const svg = container.querySelector('svg');
      expect(svg?.className).toContain('animate-spin');
    });

    it('should have gray color', () => {
      const { container } = render(<Loading />);

      const svg = container.querySelector('svg');
      expect(svg?.className).toContain('text-gray-900');
    });
  });

  describe('layout', () => {
    it('should center content', () => {
      const { container } = render(<Loading />);

      // The spinner and text should be in a flex column
      const wrapper = container.querySelector('.flex.flex-col');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper?.className).toContain('items-center');
      expect(wrapper?.className).toContain('justify-center');
    });

    it('should have gap between spinner and text', () => {
      const { container } = render(<Loading text="Loading..." />);

      const wrapper = container.querySelector('.flex.flex-col');
      expect(wrapper?.className).toContain('gap-4');
    });
  });

  describe('accessibility', () => {
    it('should have proper SVG structure', () => {
      const { container } = render(<Loading />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      expect(svg).toHaveAttribute('fill', 'none');
    });

    it('should render circle and path in SVG', () => {
      const { container } = render(<Loading />);

      const circle = container.querySelector('circle');
      const path = container.querySelector('path');

      expect(circle).toBeInTheDocument();
      expect(path).toBeInTheDocument();
    });
  });

  describe('combinations', () => {
    it('should render large fullscreen with text', () => {
      const { container } = render(
        <Loading size="lg" fullScreen text="Please wait..." />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('min-h-screen');

      const spinner = container.querySelector('.h-16.w-16');
      expect(spinner).toBeInTheDocument();

      expect(screen.getByText('Please wait...')).toBeInTheDocument();
    });

    it('should render small inline with text', () => {
      const { container } = render(<Loading size="sm" text="Loading..." />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).not.toContain('min-h-screen');

      const spinner = container.querySelector('.h-6.w-6');
      expect(spinner).toBeInTheDocument();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});
