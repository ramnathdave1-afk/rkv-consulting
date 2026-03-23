'use client';

import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import { Input, SelectField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface ConnectIntegrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: string;
  platformLabel: string;
  onSuccess: () => void;
}

export function ConnectIntegrationModal({ open, onOpenChange, platform, platformLabel, onSuccess }: ConnectIntegrationModalProps) {
  const [authType, setAuthType] = useState<'api_key' | 'oauth2'>('api_key');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast.error('API Key is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          auth_type: authType,
          credentials: {
            api_key: apiKey.trim(),
            api_secret: apiSecret.trim() || undefined,
            base_url: baseUrl.trim() || undefined,
          },
        }),
      });

      if (!res.ok) throw new Error((await res.json()).error || 'Failed to connect');
      toast.success(`${platformLabel} connected successfully`);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidth="md">
        <ModalHeader
          title={`Connect ${platformLabel}`}
          description="Enter your API credentials to connect. Your credentials are encrypted at rest."
        />
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            <SelectField
              label="Auth Type"
              value={authType}
              onChange={(e) => setAuthType(e.target.value as 'api_key' | 'oauth2')}
              options={[
                { value: 'api_key', label: 'API Key' },
                { value: 'oauth2', label: 'OAuth 2.0' },
              ]}
            />
            <Input
              label="API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              type="password"
              required
            />
            <Input
              label="API Secret (optional)"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Enter API secret if required"
              type="password"
            />
            <Input
              label="Base URL (optional)"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={`e.g. https://yourcompany.${platform}.com`}
            />
            <div className="rounded-lg bg-accent/5 border border-accent/20 p-3">
              <p className="text-xs text-text-secondary">
                Your credentials are encrypted using AES-256 before storage. We never store plaintext credentials.
              </p>
            </div>
          </div>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Connect {platformLabel}</Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
