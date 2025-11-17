import { render, screen } from '@testing-library/react';
import { ProgressBar } from '@/components/ui/ProgressBar';

describe('ProgressBar Component', () => {
  describe('rendering', () => {
    it('should render progress bar with percentage', () => {
      render(<ProgressBar percentage={50} />);

      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should render progress bar without percentage when disabled', () => {
      render(<ProgressBar percentage={50} showPercentage={false} />);

      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });

    it('should render label when provided', () => {
      render(<ProgressBar percentage={50} label="Loading..." />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render both label and percentage', () => {
      render(<ProgressBar percentage={75} label="Progress" />);

      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  describe('percentage display', () => {
    it('should display 0%', () => {
      render(<ProgressBar percentage={0} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should display 100%', () => {
      render(<ProgressBar percentage={100} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should round decimal percentages', () => {
      render(<ProgressBar percentage={33.7} />);
      expect(screen.getByText('34%')).toBeInTheDocument();
    });

    it('should handle percentage over 100', () => {
      render(<ProgressBar percentage={150} />);
      // Should clamp to 100% in width but display actual value
      expect(screen.getByText('150%')).toBeInTheDocument();
    });

    it('should handle negative percentage', () => {
      render(<ProgressBar percentage={-10} />);
      // Should clamp to 0% in width but display actual value
      expect(screen.getByText('-10%')).toBeInTheDocument();
    });
  });

  describe('size variants', () => {
    it('should render small size', () => {
      const { container } = render(<ProgressBar percentage={50} size="sm" />);

      const progressBg = container.querySelector('.h-2');
      expect(progressBg).toBeInTheDocument();
    });

    it('should render medium size (default)', () => {
      const { container } = render(<ProgressBar percentage={50} />);

      const progressBg = container.querySelector('.h-3');
      expect(progressBg).toBeInTheDocument();
    });

    it('should render large size', () => {
      const { container } = render(<ProgressBar percentage={50} size="lg" />);

      const progressBg = container.querySelector('.h-4');
      expect(progressBg).toBeInTheDocument();
    });
  });

  describe('color variants', () => {
    it('should render blue color (default)', () => {
      const { container } = render(<ProgressBar percentage={50} />);

      const progressBar = container.querySelector('.bg-blue-600');
      const progressBg = container.querySelector('.bg-blue-100');

      expect(progressBar).toBeInTheDocument();
      expect(progressBg).toBeInTheDocument();
    });

    it('should render green color', () => {
      const { container } = render(<ProgressBar percentage={50} color="green" />);

      const progressBar = container.querySelector('.bg-green-600');
      const progressBg = container.querySelector('.bg-green-100');

      expect(progressBar).toBeInTheDocument();
      expect(progressBg).toBeInTheDocument();
    });

    it('should render yellow color', () => {
      const { container } = render(<ProgressBar percentage={50} color="yellow" />);

      const progressBar = container.querySelector('.bg-yellow-500');
      const progressBg = container.querySelector('.bg-yellow-100');

      expect(progressBar).toBeInTheDocument();
      expect(progressBg).toBeInTheDocument();
    });

    it('should render red color', () => {
      const { container } = render(<ProgressBar percentage={50} color="red" />);

      const progressBar = container.querySelector('.bg-red-600');
      const progressBg = container.querySelector('.bg-red-100');

      expect(progressBar).toBeInTheDocument();
      expect(progressBg).toBeInTheDocument();
    });
  });

  describe('progress bar width', () => {
    it('should set width to percentage value', () => {
      const { container } = render(<ProgressBar percentage={50} />);

      const progressBar = container.querySelector('.bg-blue-600') as HTMLElement;
      expect(progressBar.style.width).toBe('50%');
    });

    it('should clamp width at 100%', () => {
      const { container } = render(<ProgressBar percentage={150} />);

      const progressBar = container.querySelector('.bg-blue-600') as HTMLElement;
      expect(progressBar.style.width).toBe('100%');
    });

    it('should clamp width at 0%', () => {
      const { container } = render(<ProgressBar percentage={-10} />);

      const progressBar = container.querySelector('.bg-blue-600') as HTMLElement;
      expect(progressBar.style.width).toBe('0%');
    });
  });

  describe('styling', () => {
    it('should have rounded corners', () => {
      const { container } = render(<ProgressBar percentage={50} />);

      const progressBg = container.querySelector('.rounded-full');
      expect(progressBg).toBeInTheDocument();
    });

    it('should have transition animation', () => {
      const { container } = render(<ProgressBar percentage={50} />);

      const progressBar = container.querySelector('.transition-all');
      expect(progressBar).toBeInTheDocument();
    });

    it('should be full width', () => {
      const { container } = render(<ProgressBar percentage={50} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('w-full');
    });
  });
});
