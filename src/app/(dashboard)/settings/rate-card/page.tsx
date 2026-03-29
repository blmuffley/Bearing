'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';

interface Role {
  name: string;
  hourlyRate: number;
}

interface RateCardConfig {
  blendedRate: number;
  engagementType: 'time_and_materials' | 'fixed_fee' | 'blended';
  marginTarget: number;
  roles: Role[];
}

const STORAGE_KEY = 'bearing_rate_card';

const defaultConfig: RateCardConfig = {
  blendedRate: 200,
  engagementType: 'time_and_materials',
  marginTarget: 35,
  roles: [
    { name: 'Architect', hourlyRate: 275 },
    { name: 'Developer', hourlyRate: 200 },
    { name: 'Admin', hourlyRate: 175 },
  ],
};

export default function RateCardPage() {
  const [config, setConfig] = useState<RateCardConfig>(defaultConfig);
  const [saved, setSaved] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setConfig(JSON.parse(stored));
      } catch {
        // Ignore corrupt data, use defaults
      }
    }
  }, []);

  // TODO: Persist to Supabase organizations.rate_card JSONB column instead of localStorage

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateRole = (index: number, field: keyof Role, value: string | number) => {
    const updated = [...config.roles];
    updated[index] = { ...updated[index], [field]: value };
    setConfig({ ...config, roles: updated });
  };

  const addRole = () => {
    setConfig({
      ...config,
      roles: [...config.roles, { name: '', hourlyRate: 0 }],
    });
  };

  const removeRole = (index: number) => {
    setConfig({
      ...config,
      roles: config.roles.filter((_, i) => i !== index),
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-white">
          Rate Card Configuration
        </h1>
        <p className="text-medium-gray mt-2">
          Configure hourly rates and engagement defaults for SOW generation.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* General settings */}
        <Card title="General">
          <div className="space-y-4">
            {/* Blended hourly rate */}
            <div>
              <label className="block text-sm font-medium text-medium-gray mb-1">
                Blended Hourly Rate
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-medium-gray text-sm">
                  $
                </span>
                <input
                  type="number"
                  value={config.blendedRate}
                  onChange={(e) =>
                    setConfig({ ...config, blendedRate: Number(e.target.value) })
                  }
                  className="w-full rounded-lg bg-obsidian border border-dark-gray pl-7 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-lime"
                />
              </div>
            </div>

            {/* Default engagement type */}
            <div>
              <label className="block text-sm font-medium text-medium-gray mb-1">
                Default Engagement Type
              </label>
              <select
                value={config.engagementType}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    engagementType: e.target.value as RateCardConfig['engagementType'],
                  })
                }
                className="w-full rounded-lg bg-obsidian border border-dark-gray px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-lime appearance-none"
              >
                <option value="time_and_materials">Time &amp; Materials</option>
                <option value="fixed_fee">Fixed Fee</option>
                <option value="blended">Blended</option>
              </select>
            </div>

            {/* Margin target */}
            <div>
              <label className="block text-sm font-medium text-medium-gray mb-1">
                Margin Target
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={config.marginTarget}
                  onChange={(e) =>
                    setConfig({ ...config, marginTarget: Number(e.target.value) })
                  }
                  className="w-full rounded-lg bg-obsidian border border-dark-gray pl-4 pr-8 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-lime"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-medium-gray text-sm">
                  %
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Roles */}
        <Card title="Roles">
          <div className="space-y-3">
            {config.roles.map((role, index) => (
              <div key={index} className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Role name"
                  value={role.name}
                  onChange={(e) => updateRole(index, 'name', e.target.value)}
                  className="flex-1 rounded-lg bg-obsidian border border-dark-gray px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-lime placeholder:text-medium-gray/50"
                />
                <div className="relative w-36">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-medium-gray text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    placeholder="Rate"
                    value={role.hourlyRate || ''}
                    onChange={(e) =>
                      updateRole(index, 'hourlyRate', Number(e.target.value))
                    }
                    className="w-full rounded-lg bg-obsidian border border-dark-gray pl-7 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-lime placeholder:text-medium-gray/50"
                  />
                </div>
                <span className="text-xs text-medium-gray whitespace-nowrap">/hr</span>
                <button
                  onClick={() => removeRole(index)}
                  className="text-medium-gray hover:text-red-400 transition-colors p-1"
                  aria-label="Remove role"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            <button
              onClick={addRole}
              className="flex items-center gap-2 text-sm text-lime hover:text-lime/80 transition-colors mt-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Role
            </button>
          </div>
        </Card>

        {/* Save button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg bg-lime px-6 py-2.5 text-sm font-semibold text-obsidian hover:bg-lime/90 transition-colors"
          >
            Save
          </button>
          {saved && (
            <span className="text-sm text-green-400">Saved successfully</span>
          )}
        </div>
      </div>
    </div>
  );
}
