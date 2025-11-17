'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { useAutosave, loadFromLocalStorage, hasNewerLocalVersion, clearLocalStorage } from '@/lib/hooks/useAutosave';
import type { EditorData } from '@/types';

// Dynamically import Monaco Editor to avoid SSR issues
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function TranslationEditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectSlug = params.project as string;
  const languageCode = params.language as string;
  const filename = decodeURIComponent(params.filename as string);

  const [editorData, setEditorData] = useState<EditorData | null>(null);
  const [translationContent, setTranslationContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingPR, setCreatingPR] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);

  const autosaveKey = { project: projectSlug, language: languageCode, filename };
  const { lastSaved, isDirty, manualSave, clear: clearAutosave } = useAutosave(
    autosaveKey,
    translationContent,
    !loading
  );

  useEffect(() => {
    loadEditorData();
  }, [projectSlug, languageCode, filename]);

  const loadEditorData = async () => {
    try {
      const response = await fetch(
        `/api/${projectSlug}/translate/${languageCode}/file/${encodeURIComponent(filename)}`
      );

      if (!response.ok) {
        throw new Error('Failed to load file');
      }

      const data = await response.json();
      const edData: EditorData = data.data;
      setEditorData(edData);

      // Check for local autosave
      const hasNewer = hasNewerLocalVersion(
        autosaveKey,
        edData.translationContent,
        edData.metadata.lastUpdated || undefined
      );

      if (hasNewer) {
        setShowRestorePrompt(true);
      } else {
        setTranslationContent(edData.translationContent);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = () => {
    const saved = loadFromLocalStorage(autosaveKey);
    if (saved) {
      setTranslationContent(saved.content);
    }
    setShowRestorePrompt(false);
  };

  const handleDiscard = () => {
    if (editorData) {
      setTranslationContent(editorData.translationContent);
    }
    clearAutosave();
    setShowRestorePrompt(false);
  };

  const handleCopyFromMachine = () => {
    if (editorData) {
      setTranslationContent(editorData.machineContent);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/${projectSlug}/translate/${languageCode}/save`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, content: translationContent }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save');
      }

      clearAutosave();
      manualSave();
      alert('Draft saved successfully!');
    } catch (err: any) {
      setError(err.message);
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePR = async () => {
    if (!confirm('Are you sure you want to create a pull request? Make sure your translation is complete.')) {
      return;
    }

    setCreatingPR(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/${projectSlug}/translate/${languageCode}/pr`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename,
            content: translationContent,
            message: `Complete translation for ${filename}`,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create PR');
      }

      clearAutosave();
      alert(`Pull request created successfully! PR #${data.prNumber}`);
      router.push(`/${projectSlug}/translate/${languageCode}`);
    } catch (err: any) {
      setError(err.message);
      alert('Failed to create PR: ' + err.message);
    } finally {
      setCreatingPR(false);
    }
  };

  if (loading) {
    return <Loading fullScreen text="Loading editor..." />;
  }

  if (error || !editorData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error || 'Failed to load editor'}</p>
          <Link
            href={`/${projectSlug}/translate/${languageCode}`}
            className="text-blue-600 hover:underline"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isRTL = editorData.language.direction === 'rtl';

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Restore Prompt */}
      {showRestorePrompt && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="text-yellow-900">
              You have unsaved work from a previous session. Would you like to restore it?
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={handleRestore}>
                Restore
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDiscard}>
                Discard
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/${projectSlug}/translate/${languageCode}`}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{filename}</h1>
              <p className="text-sm text-gray-600">{editorData.language.name} Translation</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {lastSaved && (
              <span className="text-sm text-gray-600">
                Last saved: {lastSaved.toLocaleTimeString()}
                {isDirty && ' (unsaved changes)'}
              </span>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSaveDraft}
              loading={saving}
              disabled={saving || creatingPR}
            >
              Save Draft
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleCreatePR}
              loading={creatingPR}
              disabled={saving || creatingPR}
            >
              Create Pull Request
            </Button>
          </div>
        </div>
      </div>

      {/* Three-Column Editor */}
      <div className="flex-1 grid grid-cols-3 gap-4 p-4 overflow-hidden">
        {/* Column 1: English Original */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">English (Original)</h3>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language="markdown"
              value={editorData.englishContent}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
              }}
              theme="vs-light"
            />
          </div>
        </div>

        {/* Column 2: Working Translation */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
          <div className="bg-blue-100 px-4 py-2 border-b border-blue-200 flex items-center justify-between">
            <h3 className="font-semibold text-blue-900">Your Translation</h3>
            {isRTL && (
              <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                RTL
              </span>
            )}
          </div>
          <div className="flex-1 overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
            <Editor
              height="100%"
              language="markdown"
              value={translationContent}
              onChange={(value) => setTranslationContent(value || '')}
              options={{
                minimap: { enabled: false },
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                rtl: isRTL,
              }}
              theme="vs-light"
            />
          </div>
        </div>

        {/* Column 3: Machine Translation */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Machine Translation</h3>
            <button
              onClick={handleCopyFromMachine}
              className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 px-2 py-1 rounded transition-colors"
            >
              Copy to Working →
            </button>
          </div>
          <div className="flex-1 overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
            <Editor
              height="100%"
              language="markdown"
              value={editorData.machineContent}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                rtl: isRTL,
              }}
              theme="vs-light"
            />
          </div>
        </div>
      </div>

      {/* Info Bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-6">
            <span>
              Status:{' '}
              <span className="font-medium">
                {editorData.metadata.status.replace('-', ' ')}
              </span>
            </span>
            {editorData.metadata.wordCount > 0 && (
              <span>{editorData.metadata.wordCount.toLocaleString()} words</span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            Auto-saves every 30 seconds to your browser
          </div>
        </div>
      </div>
    </div>
  );
}
