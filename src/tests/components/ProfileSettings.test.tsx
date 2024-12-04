import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, mockUserProfile } from '../utils';
import userEvent from '@testing-library/user-event';
import ProfileSettings from '../../components/profile/ProfileSettings';

describe('ProfileSettings Component', () => {
  it('renders profile information correctly', () => {
    const mockProfile = mockUserProfile();
    const onSave = vi.fn();
    
    render(<ProfileSettings initialProfile={mockProfile} onSave={onSave} />);

    // Check if basic information is displayed
    expect(screen.getByLabelText(/name/i)).toHaveValue(mockProfile.name);
    expect(screen.getByLabelText(/email/i)).toHaveValue(mockProfile.email);
    expect(screen.getByLabelText(/email/i)).toBeDisabled();

    // Check theme selection
    expect(screen.getByLabelText(/theme/i)).toHaveValue(mockProfile.settings.theme);

    // Check notifications checkbox
    expect(screen.getByLabelText(/enable notifications/i)).toBeChecked();

    // Check language selection
    expect(screen.getByLabelText(/language/i)).toHaveValue(mockProfile.settings.language);
  });

  it('handles form submission correctly', async () => {
    const mockProfile = mockUserProfile();
    const onSave = vi.fn();
    const { user } = render(<ProfileSettings initialProfile={mockProfile} onSave={onSave} />);

    // Update name
    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Name');

    // Change theme
    const themeSelect = screen.getByLabelText(/theme/i);
    await user.selectOptions(themeSelect, 'dark');

    // Toggle notifications
    const notificationsCheckbox = screen.getByLabelText(/enable notifications/i);
    await user.click(notificationsCheckbox);

    // Submit form
    const submitButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(submitButton);

    // Verify onSave was called with correct data
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        name: 'Updated Name',
        settings: {
          ...mockProfile.settings,
          theme: 'dark',
          notifications: false,
        },
      });
    });
  });

  it('displays error message on invalid input', async () => {
    const mockProfile = mockUserProfile();
    const onSave = vi.fn();
    const user = userEvent.setup();

    render(<ProfileSettings initialProfile={mockProfile} onSave={onSave} />);

    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);

    // Submit form
    const submitButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(submitButton);

    // Wait for and verify error message in the error div
    await waitFor(() => {
      const errorDiv = screen.getByRole('alert');
      expect(errorDiv).toHaveTextContent(/name is required/i);
    });

    // Verify onSave was not called
    expect(onSave).not.toHaveBeenCalled();
  });

  it('handles save failure gracefully', async () => {
    const mockProfile = mockUserProfile();
    const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));
    const { user } = render(<ProfileSettings initialProfile={mockProfile} onSave={onSave} />);

    // Update name
    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Name');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(submitButton);

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/failed to update profile/i)).toBeInTheDocument();
    });
  });

  it('disables form submission while saving', async () => {
    const mockProfile = mockUserProfile();
    const onSave = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    const { user } = render(<ProfileSettings initialProfile={mockProfile} onSave={onSave} />);

    // Submit form
    const submitButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(submitButton);

    // Verify button is disabled and shows loading state
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent(/saving/i);

    // Wait for save to complete
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
      expect(submitButton).toHaveTextContent(/save changes/i);
    });
  });

  it('preserves unmodified settings', async () => {
    const mockProfile = mockUserProfile();
    const onSave = vi.fn();
    const { user } = render(<ProfileSettings initialProfile={mockProfile} onSave={onSave} />);

    // Only update name
    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Name');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(submitButton);

    // Verify other settings remain unchanged
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        name: 'Updated Name',
        settings: mockProfile.settings,
      });
    });
  });

  it('should show validation error for empty name', async () => {
    const user = userEvent.setup();
    const mockOnSave = vi.fn();
    const mockInitialProfile = {
      id: 'test-user-id',
      name: '',
      email: 'test@example.com',
      role: 'participant' as const,
      settings: {
        theme: 'light' as const,
        notifications: true,
        language: 'en',
      },
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    render(
      <ProfileSettings 
        initialProfile={mockInitialProfile}
        onSave={mockOnSave}
      />
    );

    // Find the submit button and click it without entering a name
    const submitButton = screen.getByRole('button', { name: /save/i });
    await user.click(submitButton);

    // Wait for error message to appear
    const errorDiv = await screen.findByRole('alert');
    expect(errorDiv).toHaveTextContent(/name is required/i);
    expect(mockOnSave).not.toHaveBeenCalled();
  });
});
