'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/Badge';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  joinedAt: string;
}

// Mock data for team members
const initialMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Brian Muffley',
    email: 'brian@avennorth.com',
    role: 'admin',
    joinedAt: '2026-01-15',
  },
  {
    id: '2',
    name: 'Sarah Chen',
    email: 'sarah@avennorth.com',
    role: 'member',
    joinedAt: '2026-02-03',
  },
  {
    id: '3',
    name: 'Marcus Webb',
    email: 'marcus@avennorth.com',
    role: 'member',
    joinedAt: '2026-02-20',
  },
  {
    id: '4',
    name: 'Jennifer Ortiz',
    email: 'jennifer@avennorth.com',
    role: 'viewer',
    joinedAt: '2026-03-10',
  },
];

const roleVariant: Record<string, 'info' | 'low' | 'default'> = {
  admin: 'info',
  member: 'low',
  viewer: 'default',
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  // TODO: Wire up to Supabase users table and invite flow

  const handleRoleChange = (id: string, newRole: TeamMember['role']) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, role: newRole } : m))
    );
  };

  const handleRemove = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setConfirmRemoveId(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-white">
            Team Members
          </h1>
          <p className="text-medium-gray mt-2">
            Manage who has access to your organization.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-lime px-4 py-2.5 text-sm font-semibold text-obsidian hover:bg-lime/90 transition-colors"
          // TODO: Wire up invite modal
          onClick={() => alert('Invite flow coming soon')}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Invite Member
        </button>
      </div>

      {/* Team table */}
      <div className="bg-dark-gray rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-obsidian">
              <th className="text-left px-6 py-4 text-xs font-medium text-medium-gray uppercase tracking-wider">
                Name
              </th>
              <th className="text-left px-6 py-4 text-xs font-medium text-medium-gray uppercase tracking-wider">
                Email
              </th>
              <th className="text-left px-6 py-4 text-xs font-medium text-medium-gray uppercase tracking-wider">
                Role
              </th>
              <th className="text-left px-6 py-4 text-xs font-medium text-medium-gray uppercase tracking-wider">
                Joined
              </th>
              <th className="text-right px-6 py-4 text-xs font-medium text-medium-gray uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-obsidian">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-obsidian/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-obsidian text-medium-gray text-sm font-medium">
                      {member.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <span className="text-sm font-medium text-white">
                      {member.name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-medium-gray">{member.email}</span>
                </td>
                <td className="px-6 py-4">
                  <select
                    value={member.role}
                    onChange={(e) =>
                      handleRoleChange(member.id, e.target.value as TeamMember['role'])
                    }
                    className="rounded-md bg-obsidian border border-dark-gray px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-lime appearance-none cursor-pointer"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-medium-gray">
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {confirmRemoveId === member.id ? (
                    <div className="inline-flex items-center gap-2">
                      <span className="text-xs text-red-400">Remove?</span>
                      <button
                        onClick={() => handleRemove(member.id)}
                        className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmRemoveId(null)}
                        className="text-xs text-medium-gray hover:text-white transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRemoveId(member.id)}
                      className="text-medium-gray hover:text-red-400 transition-colors"
                      aria-label={`Remove ${member.name}`}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
