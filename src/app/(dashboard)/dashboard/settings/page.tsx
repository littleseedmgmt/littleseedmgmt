'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect, useCallback } from 'react'
import { EnvSwitcher } from '@/components/EnvBanner'

const isTestMode = process.env.NEXT_PUBLIC_ENV_MODE === 'test'

interface RatioSettings {
  [key: string]: number
  infant: number
  toddler: number
  twos: number
  threes: number
  preschool: number
  pre_k: number
}

interface BreakSettings {
  [key: string]: number | string
  break_duration_minutes: number
  breaks_per_shift: number
  break1_window: string
  break2_window: string
}

interface SchoolSetting {
  id: string
  school_id: string | null
  setting_key: string
  setting_value: RatioSettings | BreakSettings | Record<string, unknown>
  description: string | null
}

const AGE_GROUP_LABELS: Record<string, string> = {
  infant: 'Infant',
  toddler: 'Toddler',
  twos: '2-Year-Olds',
  threes: '3-Year-Olds',
  preschool: 'Preschool',
  pre_k: 'Pre-K'
}

export default function SettingsPage() {
  const { user, userRole, isOwner } = useAuth()
  const [seeding, setSeeding] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // School rules state
  const [settings, setSettings] = useState<SchoolSetting[]>([])
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [editingRatios, setEditingRatios] = useState(false)
  const [editingNapRatios, setEditingNapRatios] = useState(false)
  const [editingBreaks, setEditingBreaks] = useState(false)

  // Editable values
  const [normalRatios, setNormalRatios] = useState<RatioSettings | null>(null)
  const [napRatios, setNapRatios] = useState<RatioSettings | null>(null)
  const [breakSettings, setBreakSettings] = useState<BreakSettings | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data)

        // Extract specific settings
        const normal = data.find((s: SchoolSetting) => s.setting_key === 'ratio_normal')
        const nap = data.find((s: SchoolSetting) => s.setting_key === 'ratio_naptime')
        const breaks = data.find((s: SchoolSetting) => s.setting_key === 'break_settings')

        if (normal) setNormalRatios(normal.setting_value as RatioSettings)
        if (nap) setNapRatios(nap.setting_value as RatioSettings)
        if (breaks) setBreakSettings(breaks.setting_value as BreakSettings)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoadingSettings(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const saveSettings = async (key: string, value: Record<string, unknown>, description: string) => {
    setSavingSettings(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setting_key: key, setting_value: value, description })
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully' })
        fetchSettings()
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSavingSettings(false)
      setEditingRatios(false)
      setEditingNapRatios(false)
      setEditingBreaks(false)
    }
  }

  const handleSeedData = async () => {
    setSeeding(true)
    setMessage(null)
    try {
      const res = await fetch('/api/dev/seed', { method: 'POST' })
      const data = await res.json()

      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Test data generated: ${data.results.attendance} attendance records, ${data.results.shifts} shifts, ${data.results.pto} PTO requests`
        })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to seed data' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to seed data' })
    } finally {
      setSeeding(false)
    }
  }

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all test data? This will delete all attendance, shifts, and PTO requests.')) {
      return
    }

    setClearing(true)
    setMessage(null)
    try {
      const res = await fetch('/api/dev/seed', { method: 'DELETE' })
      const data = await res.json()

      if (res.ok) {
        setMessage({ type: 'success', text: 'Test data cleared successfully' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to clear data' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to clear data' })
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and application settings</p>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Email</span>
            <span className="font-medium text-gray-900">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Role</span>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${
              isOwner ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {isOwner ? 'Owner (Super Admin)' : userRole || 'User'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-600">User ID</span>
            <span className="font-mono text-sm text-gray-500">{user?.id}</span>
          </div>
        </div>
      </div>

      {/* Environment Switcher */}
      <div className="mb-6">
        <EnvSwitcher />
      </div>

      {/* School Rules & Ratios */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">School Rules & Ratios</h2>
            <p className="text-sm text-gray-500">Configure teacher-to-student ratios and break settings</p>
          </div>
        </div>

        {loadingSettings ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Message display */}
            {message && (
              <div className={`p-4 rounded-lg ${
                message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {message.text}
              </div>
            )}

            {/* Normal Ratios */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Teacher-to-Student Ratios (Awake Time)</h3>
                {!editingRatios ? (
                  <button
                    onClick={() => setEditingRatios(true)}
                    className="text-sm text-brand hover:text-brand/80"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingRatios(false)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => normalRatios && saveSettings('ratio_normal', normalRatios, 'Normal teacher-to-student ratios during awake time')}
                      disabled={savingSettings}
                      className="text-sm text-brand hover:text-brand/80 font-medium"
                    >
                      {savingSettings ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {normalRatios && Object.entries(normalRatios).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-600">{AGE_GROUP_LABELS[key] || key}</span>
                    {editingRatios ? (
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => setNormalRatios({ ...normalRatios, [key]: parseInt(e.target.value) || 0 })}
                        className="w-16 text-right text-sm font-medium text-gray-900 border border-gray-300 rounded px-2 py-1"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-900">1:{value}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Nap Time Ratios */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium text-gray-900">Teacher-to-Student Ratios (Nap Time)</h3>
                  <p className="text-xs text-gray-500">Higher ratios allowed when children are sleeping</p>
                </div>
                {!editingNapRatios ? (
                  <button
                    onClick={() => setEditingNapRatios(true)}
                    className="text-sm text-brand hover:text-brand/80"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingNapRatios(false)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => napRatios && saveSettings('ratio_naptime', napRatios, 'Teacher-to-student ratios during nap time')}
                      disabled={savingSettings}
                      className="text-sm text-brand hover:text-brand/80 font-medium"
                    >
                      {savingSettings ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {napRatios && Object.entries(napRatios).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-600">{AGE_GROUP_LABELS[key] || key}</span>
                    {editingNapRatios ? (
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => setNapRatios({ ...napRatios, [key]: parseInt(e.target.value) || 0 })}
                        className="w-16 text-right text-sm font-medium text-gray-900 border border-gray-300 rounded px-2 py-1"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-900">1:{value}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Break Settings */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Break Settings</h3>
                {!editingBreaks ? (
                  <button
                    onClick={() => setEditingBreaks(true)}
                    className="text-sm text-brand hover:text-brand/80"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingBreaks(false)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => breakSettings && saveSettings('break_settings', breakSettings, 'Settings for teacher breaks')}
                      disabled={savingSettings}
                      className="text-sm text-brand hover:text-brand/80 font-medium"
                    >
                      {savingSettings ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
              {breakSettings && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between bg-yellow-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-600">Break Duration</span>
                    {editingBreaks ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={breakSettings.break_duration_minutes}
                          onChange={(e) => setBreakSettings({ ...breakSettings, break_duration_minutes: parseInt(e.target.value) || 0 })}
                          className="w-16 text-right text-sm font-medium text-gray-900 border border-gray-300 rounded px-2 py-1"
                        />
                        <span className="text-sm text-gray-500">min</span>
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-gray-900">{breakSettings.break_duration_minutes} minutes</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between bg-yellow-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-600">Breaks per Shift</span>
                    {editingBreaks ? (
                      <input
                        type="number"
                        value={breakSettings.breaks_per_shift}
                        onChange={(e) => setBreakSettings({ ...breakSettings, breaks_per_shift: parseInt(e.target.value) || 0 })}
                        className="w-16 text-right text-sm font-medium text-gray-900 border border-gray-300 rounded px-2 py-1"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-900">{breakSettings.breaks_per_shift}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-600">Break 1 Window</span>
                    <span className="text-sm font-medium text-gray-900">Shift start → Lunch</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-600">Break 2 Window</span>
                    <span className="text-sm font-medium text-gray-900">Lunch → Shift end</span>
                  </div>
                </div>
              )}
            </div>

            {/* Coverage Rules */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Coverage Rules</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <span className="text-brand">•</span>
                  <span>Infant-qualified teachers can cover any classroom</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-brand">•</span>
                  <span>Non-infant teachers cannot cover infant rooms</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-brand">•</span>
                  <span>Aides can cover any classroom if a qualified teacher is present</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-brand">•</span>
                  <span>Directors can cover during breaks</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-brand">•</span>
                  <span>Floaters can move between schools when needed</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Development Tools - Only show in test mode */}
      {isTestMode && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-amber-900">Test Data Tools</h2>
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-200 text-amber-800 rounded">TEST MODE</span>
          </div>

          <p className="text-sm text-amber-700 mb-4">
            Generate or clear test data for this test environment. These tools are not available in production.
          </p>

          {message && (
            <div className={`p-4 rounded-lg mb-4 ${
              message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {message.text}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleSeedData}
              disabled={seeding || clearing}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              {seeding ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Generate Test Data
                </>
              )}
            </button>

            <button
              onClick={handleClearData}
              disabled={seeding || clearing}
              className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
            >
              {clearing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                  Clearing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear Test Data
                </>
              )}
            </button>
          </div>

          <div className="mt-4 text-xs text-amber-600">
            <p><strong>Generate Test Data:</strong> Creates 14 days of attendance, 1 week of shifts, and PTO requests</p>
            <p><strong>Clear Test Data:</strong> Removes all attendance, shifts, and PTO requests (keeps schools, teachers, students)</p>
          </div>
        </div>
      )}
    </div>
  )
}
