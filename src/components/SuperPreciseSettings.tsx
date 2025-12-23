/**
 * =============================================================================
 * SUPER PRECISE MODE SETTINGS COMPONENT
 * =============================================================================
 * 
 * Settings toggle and modal for configuring Super Precise Mode.
 * Users can enable the mode and paste their Google Geolocation API key.
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import { Settings, AlertTriangle, Key, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  saveGoogleApiKey,
  getGoogleApiKey,
  clearGoogleApiKey,
  hasGoogleApiKey,
  setSuperPreciseMode,
  getSuperPreciseMode,
} from '@/utils/googleGeolocation';

interface SuperPreciseSettingsProps {
  onModeChange?: (enabled: boolean) => void;
}

export function SuperPreciseSettings({ onModeChange }: SuperPreciseSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  // Load saved state on mount
  useEffect(() => {
    setIsEnabled(getSuperPreciseMode());
    setHasKey(hasGoogleApiKey());
    const savedKey = getGoogleApiKey();
    if (savedKey) {
      // Show masked key
      setApiKey('••••••••' + savedKey.slice(-8));
    }
  }, []);

  const handleToggle = (checked: boolean) => {
    if (checked && !hasKey) {
      // Need to set up API key first
      setShowApiKeyInput(true);
    } else {
      setIsEnabled(checked);
      setSuperPreciseMode(checked);
      onModeChange?.(checked);
      
      if (checked) {
        toast.success('Super Precise Mode enabled', {
          description: 'Using Google Geolocation API for enhanced accuracy.',
        });
      } else {
        toast.info('Super Precise Mode disabled', {
          description: 'Using standard GPS.',
        });
      }
    }
  };

  const handleSaveApiKey = () => {
    const trimmedKey = apiKey.trim();
    
    if (!trimmedKey || trimmedKey.startsWith('••••')) {
      toast.error('Please enter a valid API key');
      return;
    }

    if (saveGoogleApiKey(trimmedKey)) {
      setHasKey(true);
      setIsEnabled(true);
      setSuperPreciseMode(true);
      onModeChange?.(true);
      setShowApiKeyInput(false);
      setApiKey('••••••••' + trimmedKey.slice(-8));
      
      toast.success('API key saved!', {
        description: 'Super Precise Mode is now active.',
      });
    } else {
      toast.error('Failed to save API key');
    }
  };

  const handleClearApiKey = () => {
    clearGoogleApiKey();
    setHasKey(false);
    setIsEnabled(false);
    setSuperPreciseMode(false);
    onModeChange?.(false);
    setApiKey('');
    setShowApiKeyInput(false);
    
    toast.success('API key removed');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure location precision and preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Super Precise Mode Toggle */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                <span className="font-medium">Super Precise Mode</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                <AlertTriangle className="w-3 h-3 inline mr-1 text-warning" />
                Warning: By activating this mode, you agree to use your own Google API key.
              </p>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggle}
            />
          </div>

          {/* API Key Status / Input */}
          {showApiKeyInput ? (
            <div className="space-y-4 p-4 rounded-lg bg-muted/50 border border-border animate-fade-in">
              <div className="space-y-2">
                <p className="text-sm font-medium">Enter your Google Geolocation API Key</p>
                <p className="text-xs text-muted-foreground">
                  Your key is stored locally on your device. Nothing is collected or sent to our servers.
                </p>
              </div>
              
              <Input
                type="password"
                placeholder="Paste your API key here..."
                value={apiKey.startsWith('••••') ? '' : apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono text-sm"
              />

              <div className="flex gap-2">
                <Button
                  onClick={handleSaveApiKey}
                  className="flex-1"
                  disabled={!apiKey || apiKey.startsWith('••••')}
                >
                  Save & Enable
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowApiKeyInput(false)}
                >
                  Cancel
                </Button>
              </div>

              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Get an API key from Google Cloud Console
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : hasKey ? (
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary">API Key Configured</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    {apiKey}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearApiKey}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
