import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { userProfileSchema } from '../../lib/user-profile';
import type { UserProfile } from '../../lib/user-profile';

interface ProfileSettingsProps {
  initialProfile: UserProfile;
  onSave: (updates: Partial<UserProfile>) => Promise<void>;
}

const themeOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
];

export default function ProfileSettings({ initialProfile, onSave }: ProfileSettingsProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (
    field: keyof UserProfile,
    value: string | boolean | Record<string, unknown>
  ) => {
    setProfile(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSettingChange = (
    setting: keyof UserProfile['settings'],
    value: string | boolean
  ) => {
    setProfile(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [setting]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Validate each field individually first
      if (!profile.name?.trim()) {
        setError('Name is required');
        return;
      }

      // Validate entire profile
      const validatedProfile = userProfileSchema.parse(profile);
      
      // Save changes
      await onSave({
        name: validatedProfile.name,
        settings: validatedProfile.settings,
      });

      setSuccessMessage('Profile updated successfully');
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors = err.errors.map(e => e.message);
        setError(fieldErrors.join(', '));
      } else {
        setError('Failed to update profile');
      }
      console.error('Profile update error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto p-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Profile Settings</h2>
        
        {error && (
          <div role="alert" className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {successMessage}
          </div>
        )}
        
        {/* Basic Information */}
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={profile.name}
              onChange={e => handleChange('name', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              required
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={profile.email}
              disabled
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50"
            />
          </div>
        </div>

        {/* Appearance */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Appearance</h3>
          
          <div>
            <label htmlFor="theme" className="block text-sm font-medium">
              Theme
            </label>
            <select
              id="theme"
              value={profile.settings.theme}
              onChange={e => handleSettingChange('theme', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            >
              {themeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="language" className="block text-sm font-medium">
              Language
            </label>
            <select
              id="language"
              value={profile.settings.language}
              onChange={e => handleSettingChange('language', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            >
              {languageOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notifications */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Notifications</h3>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="notifications"
              checked={profile.settings.notifications}
              onChange={e => handleSettingChange('notifications', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="notifications" className="ml-2 block text-sm">
              Enable notifications
            </label>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className={`
            px-4 py-2 rounded-md text-white
            ${isSaving
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'}
          `}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
