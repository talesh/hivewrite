import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Notification } from '@/components/ui/Notification';

describe('Notification Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('should render success notification', () => {
      render(
        <Notification type="success" message="Success message" onClose={mockOnClose} />
      );

      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    it('should render error notification', () => {
      render(
        <Notification type="error" message="Error message" onClose={mockOnClose} />
      );

      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('should render warning notification', () => {
      render(
        <Notification type="warning" message="Warning message" onClose={mockOnClose} />
      );

      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });

    it('should render info notification', () => {
      render(
        <Notification type="info" message="Info message" onClose={mockOnClose} />
      );

      expect(screen.getByText('Info message')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply success styles', () => {
      const { container } = render(
        <Notification type="success" message="Test" onClose={mockOnClose} />
      );

      const notification = container.firstChild as HTMLElement;
      expect(notification.className).toContain('bg-green-50');
      expect(notification.className).toContain('text-green-800');
    });

    it('should apply error styles', () => {
      const { container } = render(
        <Notification type="error" message="Test" onClose={mockOnClose} />
      );

      const notification = container.firstChild as HTMLElement;
      expect(notification.className).toContain('bg-red-50');
      expect(notification.className).toContain('text-red-800');
    });

    it('should apply warning styles', () => {
      const { container } = render(
        <Notification type="warning" message="Test" onClose={mockOnClose} />
      );

      const notification = container.firstChild as HTMLElement;
      expect(notification.className).toContain('bg-yellow-50');
      expect(notification.className).toContain('text-yellow-800');
    });

    it('should apply info styles', () => {
      const { container } = render(
        <Notification type="info" message="Test" onClose={mockOnClose} />
      );

      const notification = container.firstChild as HTMLElement;
      expect(notification.className).toContain('bg-blue-50');
      expect(notification.className).toContain('text-blue-800');
    });
  });

  describe('auto-close behavior', () => {
    it('should auto-close after default duration (5000ms)', () => {
      render(
        <Notification type="success" message="Test" onClose={mockOnClose} />
      );

      expect(mockOnClose).not.toHaveBeenCalled();

      jest.advanceTimersByTime(5000);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should auto-close after custom duration', () => {
      render(
        <Notification
          type="success"
          message="Test"
          duration={3000}
          onClose={mockOnClose}
        />
      );

      jest.advanceTimersByTime(2999);
      expect(mockOnClose).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not auto-close when duration is 0', () => {
      render(
        <Notification
          type="success"
          message="Test"
          duration={0}
          onClose={mockOnClose}
        />
      );

      jest.advanceTimersByTime(10000);
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should not auto-close when duration is negative', () => {
      render(
        <Notification
          type="success"
          message="Test"
          duration={-1}
          onClose={mockOnClose}
        />
      );

      jest.advanceTimersByTime(10000);
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('manual close', () => {
    it('should call onClose when close button clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <Notification type="success" message="Test" onClose={mockOnClose} />
      );

      const closeButton = screen.getByRole('button');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should have accessible close button', () => {
      render(
        <Notification type="success" message="Test" onClose={mockOnClose} />
      );

      const closeButton = screen.getByRole('button');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('icons', () => {
    it('should render success icon', () => {
      const { container } = render(
        <Notification type="success" message="Test" onClose={mockOnClose} />
      );

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render different icons for each type', () => {
      const types = ['success', 'error', 'warning', 'info'] as const;

      types.forEach((type) => {
        const { container } = render(
          <Notification type={type} message="Test" onClose={mockOnClose} />
        );

        const icon = container.querySelector('svg');
        expect(icon).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should be positioned in top-right corner', () => {
      const { container } = render(
        <Notification type="success" message="Test" onClose={mockOnClose} />
      );

      const notification = container.firstChild as HTMLElement;
      expect(notification.className).toContain('fixed');
      expect(notification.className).toContain('top-4');
      expect(notification.className).toContain('right-4');
    });

    it('should have high z-index', () => {
      const { container } = render(
        <Notification type="success" message="Test" onClose={mockOnClose} />
      );

      const notification = container.firstChild as HTMLElement;
      expect(notification.className).toContain('z-50');
    });
  });
});
