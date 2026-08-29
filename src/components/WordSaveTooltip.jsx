import SaveWordButton from './SaveWordButton'

// SAC-092: the click-word tooltip's visual treatment, extracted from
// HoverableText.jsx so Vocabulary Preview (which isn't a sentence-level
// component and can't reuse HoverableText's tokenize-a-sentence props) gets
// the exact same look and save behavior, instead of a second, subtly
// different popup. HoverableText.jsx renders this component too, rather
// than keeping its own separate copy of this markup.
export default function WordSaveTooltip({ word, english, source }) {
  return (
    <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap bg-secondary-light border border-secondary text-secondary-text text-xs px-2 py-1 rounded-control shadow-lg z-20 flex items-center gap-1.5">
      {english}
      {/* 24px tap target — smaller than this app's usual 44px minimum, a
          deliberate exception since a full 44px button would dominate this
          small floating tooltip. */}
      <SaveWordButton
        spanish={word}
        english={english}
        source={source}
        className="min-w-[24px] min-h-[24px] flex items-center justify-center text-sm leading-none shrink-0"
      />
    </span>
  )
}
