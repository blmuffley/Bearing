'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/Card';

interface BrandingConfig {
  logoDataUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  legalText: string;
}

const STORAGE_KEY = 'bearing_branding';

const defaultConfig: BrandingConfig = {
  logoDataUrl: null,
  primaryColor: '#CCFF00',
  secondaryColor: '#1A1A2E',
  legalText: '',
};

export default function BrandingPage() {
  const [config, setConfig] = useState<BrandingConfig>(defaultConfig);
  const [saved, setSaved] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setConfig(JSON.parse(stored));
      } catch {
        // Ignore corrupt data
      }
    }
  }, []);

  // TODO: Persist to Supabase organizations.brand_config JSONB column instead of localStorage

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setConfig((prev) => ({ ...prev, logoDataUrl: e.target?.result as string }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files?.[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-white">
          Branding Configuration
        </h1>
        <p className="text-medium-gray mt-2">
          Customize the look and feel of customer-facing reports and SOWs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration column */}
        <div className="space-y-6">
          {/* Logo upload */}
          <Card title="Logo">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors ${
                dragActive
                  ? 'border-lime bg-lime/5'
                  : 'border-dark-gray hover:border-medium-gray'
              }`}
            >
              {config.logoDataUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={config.logoDataUrl}
                    alt="Logo preview"
                    className="max-h-20 max-w-full object-contain"
                  />
                  <p className="text-xs text-medium-gray">
                    Click or drag to replace
                  </p>
                </div>
              ) : (
                <>
                  <svg
                    className="h-10 w-10 text-medium-gray mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
                  </svg>
                  <p className="text-sm text-medium-gray">
                    Drag and drop your logo, or click to browse
                  </p>
                  <p className="text-xs text-medium-gray/60 mt-1">
                    PNG, JPG, or SVG recommended
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFile(e.target.files[0]);
                }}
              />
            </div>
            {config.logoDataUrl && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfig((prev) => ({ ...prev, logoDataUrl: null }));
                }}
                className="mt-3 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Remove logo
              </button>
            )}
          </Card>

          {/* Colors */}
          <Card title="Colors">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-medium-gray mb-1">
                  Primary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) =>
                      setConfig({ ...config, primaryColor: e.target.value })
                    }
                    className="h-10 w-10 rounded border border-dark-gray bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.primaryColor}
                    onChange={(e) =>
                      setConfig({ ...config, primaryColor: e.target.value })
                    }
                    className="flex-1 rounded-lg bg-obsidian border border-dark-gray px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-lime"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-medium-gray mb-1">
                  Secondary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config.secondaryColor}
                    onChange={(e) =>
                      setConfig({ ...config, secondaryColor: e.target.value })
                    }
                    className="h-10 w-10 rounded border border-dark-gray bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.secondaryColor}
                    onChange={(e) =>
                      setConfig({ ...config, secondaryColor: e.target.value })
                    }
                    className="flex-1 rounded-lg bg-obsidian border border-dark-gray px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-lime"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Legal text */}
          <Card title="Legal Footer Text">
            <textarea
              value={config.legalText}
              onChange={(e) =>
                setConfig({ ...config, legalText: e.target.value })
              }
              placeholder="Enter legal text to appear in SOW and report footers..."
              rows={4}
              className="w-full rounded-lg bg-obsidian border border-dark-gray px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-lime placeholder:text-medium-gray/50 resize-none"
            />
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

        {/* Preview column */}
        <div>
          <Card title="Report Header Preview">
            <div
              className="rounded-lg overflow-hidden border border-dark-gray"
              style={{ backgroundColor: config.secondaryColor }}
            >
              {/* Sample report header */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  {config.logoDataUrl ? (
                    <img
                      src={config.logoDataUrl}
                      alt="Logo"
                      className="max-h-10 max-w-[160px] object-contain"
                    />
                  ) : (
                    <span
                      className="font-heading text-xl font-bold"
                      style={{ color: config.primaryColor }}
                    >
                      Your Logo
                    </span>
                  )}
                  <span
                    className="text-xs font-mono"
                    style={{ color: config.primaryColor, opacity: 0.6 }}
                  >
                    ASSESSMENT REPORT
                  </span>
                </div>

                <div
                  className="h-px w-full mb-4"
                  style={{ backgroundColor: config.primaryColor, opacity: 0.3 }}
                />

                <h2
                  className="font-heading text-lg font-bold mb-1"
                  style={{ color: config.primaryColor }}
                >
                  ServiceNow Health Assessment
                </h2>
                <p className="text-sm" style={{ color: '#9CA3AF' }}>
                  Prepared for Acme Corp | March 2026
                </p>
              </div>

              {/* Sample footer */}
              {config.legalText && (
                <div
                  className="px-6 py-3 border-t"
                  style={{ borderColor: `${config.primaryColor}20` }}
                >
                  <p className="text-xs" style={{ color: '#6B7280' }}>
                    {config.legalText}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
