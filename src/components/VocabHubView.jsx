import { useState } from 'react'
import TranslationView from './TranslationView'
import MyWordsView from './MyWordsView'

// SAC-091: outer tab shell only — TranslationView/MyWordsView render
// exactly as they did as separate modes, each still owning its own
// "← Back" button/heading; this component's only job is the segmented
// control above them and which one is currently mounted. A bare
// conditional render (not a keep-both-mounted pattern), so an in-progress
// translation left on the Translate tab won't survive a trip to My Words
// and back — no different from navigating away from any other unsaved
// input in this app.
export default function VocabHubView({ onBack }) {
  const [activeTab, setActiveTab] = useState('translate')

  return (
    <div>
      {/* Segmented control styling matches MyWordsView's own format/
          direction picker buttons (SAC-090) — the closest existing
          "toggle between two states" convention already in this codebase,
          reused rather than inventing a new visual pattern. */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('translate')}
          className={`flex-1 min-h-[44px] rounded-control font-semibold transition ${
            activeTab === 'translate' ? 'bg-primary text-white' : 'bg-primary-light text-primary-text'
          }`}
        >
          Translate
        </button>
        <button
          onClick={() => setActiveTab('mywords')}
          className={`flex-1 min-h-[44px] rounded-control font-semibold transition ${
            activeTab === 'mywords' ? 'bg-primary text-white' : 'bg-primary-light text-primary-text'
          }`}
        >
          My Words
        </button>
      </div>

      {activeTab === 'translate' ? <TranslationView onBack={onBack} /> : <MyWordsView onBack={onBack} />}
    </div>
  )
}
