import { Undo2, Redo2 } from 'lucide-react';
import { useAnimationStore } from '../store/animationStore';

export default function UndoRedoButtons() {
  const { undo, redo, canUndo, canRedo } = useAnimationStore();
  const canUndoVal = canUndo();
  const canRedoVal = canRedo();

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={undo}
        disabled={!canUndoVal}
        title={canUndoVal ? '撤销 (Ctrl+Z)' : '无操作可撤销'}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
          canUndoVal
            ? 'bg-editor-border hover:bg-slate-600 text-slate-200 hover:scale-105 active:scale-95'
            : 'bg-editor-border/30 text-slate-600 cursor-not-allowed'
        }`}
      >
        <Undo2 size={15} />
      </button>
      <button
        onClick={redo}
        disabled={!canRedoVal}
        title={canRedoVal ? '重做 (Ctrl+Shift+Z)' : '无操作可重做'}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
          canRedoVal
            ? 'bg-editor-border hover:bg-slate-600 text-slate-200 hover:scale-105 active:scale-95'
            : 'bg-editor-border/30 text-slate-600 cursor-not-allowed'
        }`}
      >
        <Redo2 size={15} />
      </button>
    </div>
  );
}
