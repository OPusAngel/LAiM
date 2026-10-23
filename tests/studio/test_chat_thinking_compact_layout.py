"""Responsive contract for the composer Thinking control."""

from pathlib import Path


REPO = Path(__file__).resolve().parents[2]
THREAD_TSX = REPO / "studio/frontend/src/components/assistant-ui/thread.tsx"
SHARED_TSX = REPO / "studio/frontend/src/features/chat/shared-composer.tsx"
INDEX_CSS = REPO / "studio/frontend/src/index.css"


def test_thinking_control_has_compact_hooks_in_both_composers():
    for path in (THREAD_TSX, SHARED_TSX):
        source = path.read_text(encoding = "utf-8")
        assert 'className="LAiM-thinking-label"' in source
        # Wrapped in the space scale so it grows with the composer; a bare 15px would not.
        assert (
            "LAiM-thinking-caret size-[calc(15px*var(--ui-space-scale,1))]" in source
        ), f"{path.name}: the Thinking caret lost its hook or its scaled 15px size"
        assert 'data-pill-label="Thinking settings"' in source


def test_narrow_composer_collapses_thinking_to_the_bulb():
    css = INDEX_CSS.read_text(encoding = "utf-8")

    assert css.count("container-type: inline-size;") >= 2
    compact_start = css.index("@container (max-width: 36rem)")
    compact_end = css.index("\t.LAiM-tick {", compact_start)
    compact_rule = css[compact_start:compact_end]

    assert ".LAiM-thinking-pill" in compact_rule
    assert "@apply size-8" in compact_rule
    assert ".LAiM-thinking-label" in compact_rule
    assert ".LAiM-thinking-caret" in compact_rule
    assert "display: none;" in compact_rule
