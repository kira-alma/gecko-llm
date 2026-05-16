"use client";

import { useState } from "react";

export function EditableItem({
  text,
  onUpdate,
  onDelete,
  color = "text-muted-foreground",
  children,
}: {
  text: string;
  onUpdate: (newText: string) => void;
  onDelete: () => void;
  color?: string;
  children?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(text);

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { onUpdate(editText); setEditing(false); }
            if (e.key === "Escape") { setEditText(text); setEditing(false); }
          }}
          onBlur={() => { onUpdate(editText); setEditing(false); }}
          className="flex-1 text-[11px] px-2 py-0.5 rounded bg-muted/30 border border-emerald-500/30 text-foreground outline-none"
        />
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-1.5">
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm cursor-pointer hover:bg-muted/10 rounded px-0.5 -mx-0.5 transition-colors ${color}`}
          onClick={() => setEditing(true)}
          title="Click to edit"
        >
          {text}
        </span>
        {children}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="text-white/40 hover:text-red-400 transition-colors text-sm shrink-0 mt-0.5 px-1 rounded hover:bg-red-500/10"
        title="Remove"
      >
        {"\u2717"}
      </button>
    </div>
  );
}

export function AddItemInput({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (text: string) => void;
}) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="text-[10px] text-emerald-400/60 hover:text-emerald-400 transition-colors"
      >
        + Add item
      </button>
    );
  }

  return (
    <div className="flex gap-1.5 mt-1">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) { onAdd(value.trim()); setValue(""); }
          if (e.key === "Escape") { setValue(""); setShow(false); }
        }}
        placeholder={placeholder}
        className="flex-1 text-[10px] px-2 py-1 rounded bg-muted/20 border border-border/30 text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-emerald-500/30"
      />
      <button
        onClick={() => { if (value.trim()) { onAdd(value.trim()); setValue(""); } }}
        className="text-[10px] text-emerald-400 hover:text-emerald-300 px-2"
      >
        Add
      </button>
      <button
        onClick={() => { setValue(""); setShow(false); }}
        className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground px-1"
      >
        Cancel
      </button>
    </div>
  );
}
