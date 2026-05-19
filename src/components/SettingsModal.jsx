'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../contexts/AuthContext'

const Section = ({ title, children }) => (
  <div className="settings-section">
    <h3 className="settings-section-title">{title}</h3>
    {children}
  </div>
)

const Field = ({ label, children }) => (
  <div className="settings-field">
    <label className="settings-label">{label}</label>
    {children}
  </div>
)

export default function SettingsModal({ onClose }) {
  const { user, signOut, updateDisplayName, updatePassword, deleteAccount } = useAuth()

  const isOAuth = !user?.app_metadata?.providers?.includes('email') &&
    (user?.app_metadata?.provider === 'google' || user?.app_metadata?.providers?.includes('google'))

  const currentName = user?.user_metadata?.full_name || ''
  const email       = user?.email || ''

  /* ── Profile ── */
  const [name, setName]           = useState(currentName)
  const [nameSaving, setNameSaving] = useState(false)
  const [nameMsg, setNameMsg]     = useState(null) // { ok, text }

  const saveName = async () => {
    if (!name.trim() || name.trim() === currentName || nameSaving) return
    setNameSaving(true); setNameMsg(null)
    const { error } = await updateDisplayName(name.trim())
    setNameMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Name updated!' })
    setNameSaving(false)
  }

  /* ── Password ── */
  const [pw, setPw]               = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwSaving, setPwSaving]   = useState(false)
  const [pwMsg, setPwMsg]         = useState(null)

  const savePassword = async () => {
    if (!pw || pw.length < 6) return setPwMsg({ ok: false, text: 'Password must be at least 6 characters.' })
    if (pw !== pwConfirm)    return setPwMsg({ ok: false, text: 'Passwords do not match.' })
    setPwSaving(true); setPwMsg(null)
    const { error } = await updatePassword(pw)
    if (error) { setPwMsg({ ok: false, text: error.message }) }
    else       { setPwMsg({ ok: true, text: 'Password updated!' }); setPw(''); setPwConfirm('') }
    setPwSaving(false)
  }

  /* ── Delete account ── */
  const [deletePhase, setDeletePhase] = useState(0) // 0=hidden 1=confirm 2=deleting
  const [deleteInput, setDeleteInput] = useState('')
  const [deleteError, setDeleteError] = useState(null)

  const startDelete  = () => { setDeletePhase(1); setDeleteInput(''); setDeleteError(null) }
  const cancelDelete = () => { setDeletePhase(0); setDeleteInput(''); setDeleteError(null) }

  const confirmDelete = async () => {
    if (deleteInput !== email) return setDeleteError('Email does not match.')
    setDeletePhase(2); setDeleteError(null)
    const { error } = await deleteAccount()
    if (error) { setDeleteError(error.message); setDeletePhase(1) }
    else       { await signOut() }
  }

  return createPortal(
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="settings-header">
          <h2 className="settings-title">Settings</h2>
          <button className="settings-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="settings-body">

          {/* ── Profile ── */}
          <Section title="Profile">
            <Field label="Display name">
              <div className="settings-input-row">
                <input
                  className="settings-input"
                  value={name}
                  onChange={e => { setName(e.target.value); setNameMsg(null) }}
                  onKeyDown={e => e.key === 'Enter' && saveName()}
                  placeholder="Your name"
                  maxLength={60}
                />
                <button
                  className="settings-btn"
                  onClick={saveName}
                  disabled={!name.trim() || name.trim() === currentName || nameSaving}
                >
                  {nameSaving ? '…' : 'Save'}
                </button>
              </div>
              {nameMsg && <p className={`settings-msg${nameMsg.ok ? ' settings-msg--ok' : ' settings-msg--err'}`}>{nameMsg.text}</p>}
            </Field>

            <Field label="Email">
              <input className="settings-input settings-input--readonly" value={email} readOnly />
            </Field>
          </Section>

          {/* ── Security (email users only) ── */}
          {!isOAuth && (
            <Section title="Security">
              <Field label="New password">
                <input
                  className="settings-input"
                  type="password"
                  value={pw}
                  onChange={e => { setPw(e.target.value); setPwMsg(null) }}
                  placeholder="At least 6 characters"
                />
              </Field>
              <Field label="Confirm password">
                <div className="settings-input-row">
                  <input
                    className="settings-input"
                    type="password"
                    value={pwConfirm}
                    onChange={e => { setPwConfirm(e.target.value); setPwMsg(null) }}
                    onKeyDown={e => e.key === 'Enter' && savePassword()}
                    placeholder="Repeat new password"
                  />
                  <button
                    className="settings-btn"
                    onClick={savePassword}
                    disabled={!pw || !pwConfirm || pwSaving}
                  >
                    {pwSaving ? '…' : 'Update'}
                  </button>
                </div>
                {pwMsg && <p className={`settings-msg${pwMsg.ok ? ' settings-msg--ok' : ' settings-msg--err'}`}>{pwMsg.text}</p>}
              </Field>
            </Section>
          )}

          {/* ── Danger zone ── */}
          <Section title="Danger zone">
            {deletePhase === 0 && (
              <button className="settings-danger-btn" onClick={startDelete}>
                Delete account
              </button>
            )}

            {deletePhase >= 1 && (
              <div className="settings-delete-confirm">
                <p className="settings-delete-warning">
                  This will permanently delete your account and all your playlists. This cannot be undone.
                </p>
                <Field label={`Type your email to confirm: ${email}`}>
                  <input
                    className="settings-input settings-input--danger"
                    value={deleteInput}
                    onChange={e => { setDeleteInput(e.target.value); setDeleteError(null) }}
                    placeholder={email}
                    disabled={deletePhase === 2}
                    autoFocus
                  />
                </Field>
                {deleteError && <p className="settings-msg settings-msg--err">{deleteError}</p>}
                <div className="settings-delete-actions">
                  <button className="settings-btn settings-btn--ghost" onClick={cancelDelete} disabled={deletePhase === 2}>
                    Cancel
                  </button>
                  <button
                    className="settings-btn settings-btn--delete"
                    onClick={confirmDelete}
                    disabled={deleteInput !== email || deletePhase === 2}
                  >
                    {deletePhase === 2 ? 'Deleting…' : 'Delete my account'}
                  </button>
                </div>
              </div>
            )}
          </Section>

        </div>
      </div>
    </div>,
    document.body
  )
}
