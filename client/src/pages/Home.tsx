/*
 * Quiet Blueprint style reminder: this is a drafting-board workspace, not a generic form.
 * Keep file state visible, use IBM Plex Mono for XML metadata, and reserve safety orange for deliberate edits.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDownAZ,
  Check,
  ChevronDown,
  CircleHelp,
  Command,
  Download,
  FileCode2,
  FilePlus2,
  FolderOpen,
  Keyboard,
  Layers3,
  Menu,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Undo2,
  UploadCloud,
  X,
} from "lucide-react";
import {
  DEMO_XML,
  addCommand,
  normalizeShortcut,
  parseXml,
  shortcutFromKeyboardEvent,
  removeCommand,
  shortcutFormatIssue,
  updateCommandField,
  type CommandField,
  type ShortcutCommand,
} from "@/lib/xmlEditor";

const BRAND_MARK = `${import.meta.env.BASE_URL}roamer-mark.png`;
const MAX_HISTORY = 30;

function keyParts(shortcut: string) {
  return shortcut ? shortcut.split("+") : [];
}

function prettyCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function categoryShortLabel(label: string) {
  return label.replace("RoamerGUI_", "").replace("Category", "").replace(/([a-z])([A-Z])/g, "$1 $2");
}

export default function Home() {
  const [xmlText, setXmlText] = useState(DEMO_XML);
  const [lastExportedXml, setLastExportedXml] = useState(DEMO_XML);
  const [fileName, setFileName] = useState("RoamerCommands.xml");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"order" | "id" | "shortcut">("order");
  const [history, setHistory] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [shortcutDraft, setShortcutDraft] = useState("");
  const [isCapturingShortcut, setIsCapturingShortcut] = useState(false);
  const [acceleratorDraft, setAcceleratorDraft] = useState("");
  const [newCommand, setNewCommand] = useState({ categoryId: "", id: "", shortcut: "", accelerator: "", toggle: false });
  const [isDragging, setIsDragging] = useState(false);
  const [isDemo, setIsDemo] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseXml(xmlText), [xmlText]);
  const dirty = xmlText !== lastExportedXml;
  const errorCount = parsed.issues.filter((issue) => issue.type === "error").length;
  const warningCount = parsed.issues.filter((issue) => issue.type === "warning").length;

  const filteredCommands = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const result = parsed.commands.filter((command) => {
      const categoryMatch = categoryFilter === "all" || command.categoryId === categoryFilter;
      const queryMatch = !normalizedQuery || [command.id, command.categoryLabel, command.shortcut, command.accelerator]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
      return categoryMatch && queryMatch;
    });
    if (sortBy === "id") return [...result].sort((a, b) => a.id.localeCompare(b.id));
    if (sortBy === "shortcut") return [...result].sort((a, b) => a.shortcut.localeCompare(b.shortcut) || a.id.localeCompare(b.id));
    return result;
  }, [categoryFilter, parsed.commands, query, sortBy]);

  const selectedCommand = parsed.commands.find((command) => command.index === selectedIndex) ?? filteredCommands[0];
  const currentShortcutIssue = shortcutFormatIssue(shortcutDraft);
  const conflictCommands = parsed.commands.filter(
    (command) => command.index !== selectedCommand?.index && normalizeShortcut(command.shortcut) === normalizeShortcut(shortcutDraft) && normalizeShortcut(shortcutDraft),
  );
  const newCommandShortcutIssue = shortcutFormatIssue(newCommand.shortcut);
  const newCommandConflict = parsed.commands.find(
    (command) => normalizeShortcut(command.shortcut) === normalizeShortcut(newCommand.shortcut) && normalizeShortcut(newCommand.shortcut),
  );

  useEffect(() => {
    setShortcutDraft(selectedCommand?.shortcut ?? "");
    setAcceleratorDraft(selectedCommand?.accelerator ?? "");
  }, [selectedCommand?.index, selectedCommand?.shortcut, selectedCommand?.accelerator]);

  useEffect(() => {
    if (!newCommand.categoryId && parsed.categories[0]) {
      setNewCommand((current) => ({ ...current, categoryId: parsed.categories[0].id }));
    }
  }, [newCommand.categoryId, parsed.categories]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        downloadXml();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      }
      if (event.key === "Escape") {
        setShowAdd(false);
        setShowHelp(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const commitXml = (nextXml: string, message?: string) => {
    setHistory((current) => [...current, xmlText].slice(-MAX_HISTORY));
    setXmlText(nextXml);
    if (message) toast.success(message);
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) {
      toast.info("Nothing to undo yet.");
      return;
    }
    setHistory((current) => current.slice(0, -1));
    setXmlText(previous);
    toast.success("Last change undone.");
  };

  const updateField = (field: CommandField, value: string | boolean) => {
    if (!selectedCommand) return;
    try {
      const nextXml = updateCommandField(xmlText, selectedCommand.index, field, value);
      commitXml(nextXml, field === "shortcut" ? "Shortcut updated." : "Command updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update this command.");
    }
  };

  const captureShortcut = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!isCapturingShortcut) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape") {
      setIsCapturingShortcut(false);
      return;
    }
    const captured = shortcutFromKeyboardEvent(event.nativeEvent);
    if (!captured) {
      toast.info("Press a key after the modifier, or Escape to cancel.");
      return;
    }
    setShortcutDraft(captured);
    setIsCapturingShortcut(false);
    const issue = shortcutFormatIssue(captured);
    const conflict = parsed.commands.filter(
      (command) => command.index !== selectedCommand?.index && normalizeShortcut(command.shortcut) === normalizeShortcut(captured),
    );
    if (issue) toast.error(issue);
    else if (conflict.length) toast.error(`Conflict with ${conflict.map((command) => command.id).join(", ")}. Choose another combination.`);
    else toast.success(`${captured} captured. Press Apply shortcut to save it.`);
  };

  const applyShortcutDraft = () => {
    if (!selectedCommand) return;
    if (currentShortcutIssue) {
      toast.error(currentShortcutIssue);
      return;
    }
    if (conflictCommands.length) {
      toast.error("That shortcut is already assigned. Choose a unique combination.");
      return;
    }
    updateField("shortcut", shortcutDraft);
  };

  const applyAcceleratorDraft = () => updateField("accelerator", acceleratorDraft);

  const loadXmlFile = (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xml")) {
      toast.error("Please choose an .xml file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const nextParsed = parseXml(text);
      if (!nextParsed.valid) {
        toast.error(nextParsed.error ?? "This XML file could not be read.");
        return;
      }
      setHistory([]);
      setXmlText(text);
      setLastExportedXml(text);
      setFileName(file.name);
      setSelectedIndex(nextParsed.commands[0]?.index ?? 0);
      setCategoryFilter("all");
      setQuery("");
      setIsDemo(false);
      toast.success(`${file.name} loaded locally.`);
    };
    reader.onerror = () => toast.error("The file could not be read by your browser.");
    reader.readAsText(file);
  };

  const openFilePicker = () => fileInputRef.current?.click();

  const downloadXml = () => {
    if (!parsed.valid || errorCount > 0) {
      toast.error("Export is blocked until the XML is valid.");
      return;
    }
    const blob = new Blob([xmlText], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName.toLowerCase().endsWith(".xml") ? fileName : `${fileName}.xml`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setLastExportedXml(xmlText);
    toast.success("XML exported. Your original file was not overwritten.");
  };

  const resetToLastExport = () => {
    if (!dirty) {
      toast.info("The editor is already at the last exported version.");
      return;
    }
    setHistory((current) => [...current, xmlText].slice(-MAX_HISTORY));
    setXmlText(lastExportedXml);
    toast.success("Restored the last exported version.");
  };

  const handleAdd = () => {
    if (!newCommand.id.trim()) {
      toast.error("A command ID is required.");
      return;
    }
    if (newCommandShortcutIssue) {
      toast.error(newCommandShortcutIssue);
      return;
    }
    if (newCommandConflict) {
      toast.error(`Shortcut conflict with ${newCommandConflict.id}.`);
      return;
    }
    try {
      const nextXml = addCommand(xmlText, newCommand);
      commitXml(nextXml, "Command added to the file.");
      setSelectedIndex(parsed.commands.length);
      setShowAdd(false);
      setNewCommand({ categoryId: parsed.categories[0]?.id ?? "", id: "", shortcut: "", accelerator: "", toggle: false });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add the command.");
    }
  };

  const handleRemove = () => {
    if (!selectedCommand) return;
    const confirmed = window.confirm(`Remove ${selectedCommand.id}? This can be undone, but the exported file will not change until you download it.`);
    if (!confirmed) return;
    try {
      const nextXml = removeCommand(xmlText, selectedCommand.index);
      commitXml(nextXml, "Command removed. Undo is available.");
      setSelectedIndex(Math.max(0, selectedCommand.index - 1));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove the command.");
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark-frame"><img src={BRAND_MARK} alt="Roamer Shortcut Studio mark" /></div>
          <div>
            <div className="brand-name"><span className="brand-word">Roamer</span><span className="brand-slash">/</span><span className="brand-word">Shortcut</span></div>
            <div className="brand-subtitle">STUDIO / LOCAL XML WORKBENCH</div>
          </div>
        </div>
        <div className="topbar-actions">
          <div className={`save-state ${dirty ? "is-dirty" : "is-clean"}`}>
            <span className="state-dot" />
            <span>{dirty ? "Unsaved changes" : "All changes exported"}</span>
          </div>
          <button className="icon-button top-help" aria-label="Show safety notes" onClick={() => setShowHelp((current) => !current)}><CircleHelp size={18} /></button>
          <button className="button button-primary" onClick={downloadXml} disabled={!parsed.valid || errorCount > 0}>
            <Download size={16} /> Export XML <span className="button-kbd">⌘S</span>
          </button>
          <button className="icon-button mobile-menu-button" aria-label="Open menu" onClick={() => setMobileMenu((current) => !current)}><Menu size={18} /></button>
        </div>
        {showHelp && (
          <div className="help-popover">
            <div className="eyebrow">SAFE BY DEFAULT</div>
            <p>Your file is parsed and edited entirely in this browser. Nothing is uploaded. Original files are never overwritten; use Export XML when you are ready.</p>
            <button className="text-button" onClick={() => setShowHelp(false)}>Dismiss</button>
          </div>
        )}
      </header>

      <main className="workspace">
        <section className="intro-row">
          <div>
            <div className="eyebrow"><span className="eyebrow-mark" /> COMMAND DEFINITION EDITOR</div>
            <h1>Shape the controls.<br /><em>Keep the file intact.</em></h1>
            <p className="intro-copy">A focused workspace for safely tuning Navisworks command shortcuts without hand-editing XML.</p>
          </div>
          <div className="intro-meta">
            <div className="coordinate-label">ROAMER / 01<br />SHORTCUT SYSTEMS</div>
            <div className="line-drawing" aria-hidden="true"><span /><span /><span /></div>
          </div>
        </section>

        <section className={`file-drop-zone ${isDragging ? "is-dragging" : ""}`} onClick={openFilePicker} onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragging(false); }} onDrop={(event) => { event.preventDefault(); setIsDragging(false); loadXmlFile(event.dataTransfer.files[0]); }}>
          <input ref={fileInputRef} className="visually-hidden" type="file" accept=".xml,text/xml,application/xml" onChange={(event) => loadXmlFile(event.target.files?.[0])} />
          <div className="drop-icon"><UploadCloud size={20} /></div>
          <div className="drop-copy"><strong>{isDemo ? "Load your RoamerCommands.xml" : fileName}</strong><span>{isDemo ? "Drop a file here or browse from your computer" : "Drop another XML file to switch workspaces"}</span></div>
          <div className="drop-meta"><span>LOCAL ONLY</span><span className="drop-separator" /> <span>XML</span><ChevronDown size={15} /></div>
        </section>

        <section className="file-safety-note" aria-label="File location and backup guidance">
          <div className="file-safety-icon"><ShieldCheck size={18} /></div>
          <div className="file-safety-copy">
            <strong>Before you begin: make a backup copy</strong>
            <p>On Windows, the file is usually located in one of these folders:</p>
            <code>C:\Program Files\Autodesk\Navisworks Manage 20XX\Layout\RoamerCommands.xml</code>
            <code>C:\Program Files\Autodesk\Navisworks Simulate 20XX\Layout\RoamerCommands.xml</code>
            <p>Replace <bdi>20XX</bdi> with your installed version. Copy the original file to a safe folder before editing; Export XML creates a new file and never overwrites the original.</p>
          </div>
        </section>

        <section className="stat-strip" aria-label="File summary">
          <div className="stat-cell"><span className="stat-label">FILE</span><strong className="mono truncate">{fileName}</strong></div>
          <div className="stat-cell"><span className="stat-label">COMMANDS</span><strong>{prettyCount(parsed.commands.length)}</strong></div>
          <div className="stat-cell"><span className="stat-label">CATEGORIES</span><strong>{prettyCount(parsed.categories.length)}</strong></div>
          <div className="stat-cell"><span className="stat-label">STATUS</span><strong className={errorCount ? "text-danger" : warningCount ? "text-warn" : "text-success"}>{errorCount ? "Blocked" : warningCount ? `${warningCount} review` : "Ready"}</strong></div>
          <div className="stat-cell stat-action-cell"><span className="stat-label">HISTORY</span><button className="text-button" onClick={undo} disabled={!history.length}><Undo2 size={14} /> Undo {history.length ? `(${history.length})` : ""}</button></div>
        </section>

        <div className="workspace-grid">
          <aside className={`command-index ${mobileMenu ? "mobile-open" : ""}`}>
            <div className="panel-heading">
              <div><span className="panel-kicker">INDEX / 01</span><h2>Commands</h2></div>
              <span className="count-badge">{filteredCommands.length}</span>
            </div>
            <div className="search-box"><Search size={16} /><input aria-label="Search commands" placeholder="Search IDs, categories…" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button className="clear-search" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}</div>
            <div className="index-controls">
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter by category">
                <option value="all">All categories</option>
                {parsed.categories.map((category) => <option key={category.id} value={category.id}>{categoryShortLabel(category.label)} · {category.count}</option>)}
              </select>
              <button className="sort-button" onClick={() => setSortBy((current) => current === "order" ? "id" : current === "id" ? "shortcut" : "order")} title="Cycle sort order"><ArrowDownAZ size={15} /><span>{sortBy === "order" ? "File order" : sortBy === "id" ? "Command ID" : "Shortcut"}</span></button>
            </div>
            <div className="command-list" role="listbox" aria-label="Commands">
              {filteredCommands.length ? filteredCommands.map((command) => (
                <button key={`${command.id}-${command.index}`} className={`command-row ${selectedCommand?.index === command.index ? "is-selected" : ""}`} onClick={() => { setSelectedIndex(command.index); setMobileMenu(false); }} role="option" aria-selected={selectedCommand?.index === command.index}>
                  <span className="row-index">{String(command.index + 1).padStart(2, "0")}</span>
                  <span className="row-details"><strong>{command.id}</strong><small>{command.categoryLabel}</small></span>
                  <span className="row-shortcut">{command.shortcut ? keyParts(command.shortcut).map((part) => <kbd key={part}>{part}</kbd>) : <span className="not-set">—</span>}</span>
                </button>
              )) : <div className="empty-state"><Search size={19} /><p>No commands match this view.</p><button className="text-button" onClick={() => { setQuery(""); setCategoryFilter("all"); }}>Clear filters</button></div>}
            </div>
            <button className="add-command-link" onClick={() => setShowAdd((current) => !current)}><Plus size={16} /> Add a command</button>
          </aside>

          <section className="editor-column">
            <div className="editor-header">
              <div><span className="panel-kicker">EDITOR / {selectedCommand ? String(selectedCommand.index + 1).padStart(2, "0") : "—"}</span><h2>{selectedCommand ? "Command details" : "No command selected"}</h2></div>
              {selectedCommand && <div className="editor-header-actions"><span className="kind-pill">{selectedCommand.kind}</span><button className="danger-button" onClick={handleRemove}><Trash2 size={15} /> Remove</button></div>}
            </div>
            {selectedCommand ? <>
              <div className="command-identity"><div className="identity-icon"><Command size={21} /></div><div><div className="identity-label">COMMAND ID</div><div className="identity-id mono">{selectedCommand.id}</div></div><div className="identity-category"><span className="identity-label">CATEGORY</span><strong>{selectedCommand.categoryLabel}</strong></div></div>
              <div className="field-block"><div className="field-heading"><div><span className="field-number">01</span><div><label htmlFor="shortcut-input">Primary shortcut</label><p>Full key combination used to trigger this command.</p></div></div><Keyboard size={19} /></div><div className={`shortcut-input-shell ${isCapturingShortcut ? "is-capturing" : ""}`}><div className="keycap-preview">{shortcutDraft ? keyParts(normalizeShortcut(shortcutDraft)).map((part) => <kbd key={part}>{part}</kbd>) : <span className="keycap-placeholder">Not assigned</span>}</div><input id="shortcut-input" value={isCapturingShortcut ? "" : shortcutDraft} onChange={(event) => setShortcutDraft(event.target.value)} onKeyDown={(event) => { if (isCapturingShortcut) captureShortcut(event); else if (event.key === "Enter") applyShortcutDraft(); }} placeholder={isCapturingShortcut ? "Press your shortcut now…" : "e.g. Ctrl+Shift+M"} aria-describedby="shortcut-help" /></div><div className="capture-actions"><button className={`capture-button ${isCapturingShortcut ? "is-active" : ""}`} onClick={() => setIsCapturingShortcut((current) => !current)}>{isCapturingShortcut ? <><X size={14} /> Cancel capture</> : <><Keyboard size={14} /> Capture from keyboard</>}</button>{shortcutDraft && <button className="clear-capture" onClick={() => { setShortcutDraft(""); setIsCapturingShortcut(false); }} aria-label="Clear shortcut">Clear</button>}</div><p className="capture-help" id="shortcut-help">{isCapturingShortcut ? "Press modifiers together with a key. Escape cancels." : "Type a combination or use keyboard capture."}</p>{currentShortcutIssue && <div className="inline-notice notice-warn"><AlertTriangle size={15} /> {currentShortcutIssue}</div>}{conflictCommands.length > 0 && !currentShortcutIssue && <div className="inline-notice notice-danger"><AlertTriangle size={15} /> Conflicts with <strong>{conflictCommands.map((command) => command.id).join(", ")}</strong>.</div>}<div className="field-actions"><span className="field-hint">Press Enter to apply</span><button className="button button-primary" onClick={applyShortcutDraft} disabled={Boolean(currentShortcutIssue || conflictCommands.length)}>Apply shortcut</button></div></div>
              <div className="field-block compact-field"><div className="field-heading"><div><span className="field-number">02</span><div><label htmlFor="accelerator-input">Menu accelerator</label><p>Optional single-key menu access hint.</p></div></div></div><div className="accelerator-row"><input id="accelerator-input" className="plain-input mono" value={acceleratorDraft} onChange={(event) => setAcceleratorDraft(event.target.value)} placeholder="e.g. S" /><button className="button button-secondary" onClick={applyAcceleratorDraft}>Apply</button></div></div>
              <div className="field-block compact-field"><div className="field-heading"><div><span className="field-number">03</span><div><label htmlFor="toggle-input">Toggle command</label><p>Marks this command as a stateful UI toggle.</p></div></div><button className={`toggle-switch ${selectedCommand.toggle ? "is-on" : ""}`} id="toggle-input" aria-pressed={selectedCommand.toggle} onClick={() => updateField("toggle", !selectedCommand.toggle)}><span /></button></div></div>
            </> : <div className="empty-editor"><FileCode2 size={32} /><h3>Load an XML file to begin</h3><p>Choose a valid RoamerCommands.xml file or load the sample workspace.</p><button className="button button-secondary" onClick={() => { setXmlText(DEMO_XML); setLastExportedXml(DEMO_XML); setIsDemo(true); }}>Load sample file</button></div>}

            {showAdd && <div className="add-panel"><div className="add-panel-heading"><div><span className="panel-kicker">NEW ENTRY / 01</span><h3>Add command</h3></div><button className="icon-button" onClick={() => setShowAdd(false)} aria-label="Close add command"><X size={17} /></button></div><p className="add-copy">Create a standard command in an existing category. Empty fields are omitted from the XML.</p><div className="add-grid"><label>Category<select value={newCommand.categoryId} onChange={(event) => setNewCommand({ ...newCommand, categoryId: event.target.value })}>{parsed.categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label><label>Command ID<input value={newCommand.id} onChange={(event) => setNewCommand({ ...newCommand, id: event.target.value })} placeholder="RoamerGUI_CUSTOM_COMMAND" /></label><label>Shortcut<input value={newCommand.shortcut} onChange={(event) => setNewCommand({ ...newCommand, shortcut: event.target.value })} placeholder="Ctrl+Alt+K" />{newCommandShortcutIssue && <small className="input-error">{newCommandShortcutIssue}</small>}{newCommandConflict && <small className="input-error">Conflicts with {newCommandConflict.id}</small>}</label><label>Accelerator<input value={newCommand.accelerator} onChange={(event) => setNewCommand({ ...newCommand, accelerator: event.target.value })} placeholder="K" /></label></div><label className="checkbox-label"><input type="checkbox" checked={newCommand.toggle} onChange={(event) => setNewCommand({ ...newCommand, toggle: event.target.checked })} /><span>Mark as a toggle command</span></label><div className="add-panel-actions"><button className="button button-secondary" onClick={() => setShowAdd(false)}>Cancel</button><button className="button button-primary" onClick={handleAdd} disabled={Boolean(newCommandShortcutIssue || newCommandConflict)}><Plus size={16} /> Add to file</button></div></div>}
          </section>

          <aside className="health-rail">
            <div className="health-heading"><span className="panel-kicker">FILE HEALTH</span><div className={`health-stamp ${errorCount ? "is-error" : warningCount ? "is-warning" : "is-good"}`}>{errorCount ? <AlertTriangle size={18} /> : <ShieldCheck size={18} />}<strong>{errorCount ? "BLOCKED" : warningCount ? "REVIEW" : "VALID"}</strong></div></div>
            <p className="health-copy">{errorCount ? "Resolve structural errors before export." : warningCount ? "The document is valid, with a few assignments to review." : "The document is structurally sound and ready to export."}</p>
            <div className="health-rule" />
            <div className="health-list"><div className="health-item"><span className="health-icon good"><Check size={14} /></span><div><strong>XML structure</strong><small>{parsed.valid ? "Well-formed document" : "Parsing failed"}</small></div></div><div className="health-item"><span className={`health-icon ${warningCount ? "warn" : "good"}`}>{warningCount ? <AlertTriangle size={14} /> : <Check size={14} />}</span><div><strong>Shortcut review</strong><small>{warningCount ? `${warningCount} warning${warningCount > 1 ? "s" : ""} detected` : "No conflicts detected"}</small></div></div><div className="health-item"><span className={`health-icon ${dirty ? "warn" : "good"}`}>{dirty ? <RotateCcw size={14} /> : <Check size={14} />}</span><div><strong>Export state</strong><small>{dirty ? "Changes not exported" : "Matches last export"}</small></div></div></div>
            {warningCount > 0 && <div className="issues-box"><div className="issues-title"><AlertTriangle size={14} /> REVIEW NOTES</div>{parsed.issues.filter((issue) => issue.type === "warning").slice(0, 3).map((issue, index) => <div className="issue-line" key={`${issue.message}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{issue.message}</p></div>)}{warningCount > 3 && <div className="more-issues">+ {warningCount - 3} more in this file</div>}</div>}
            <div className="privacy-note"><ShieldCheck size={16} /><div><strong>Private by design</strong><p>Your XML stays in this browser until you choose Export.</p></div></div>
            <div className="rail-actions"><button className="text-button" onClick={resetToLastExport} disabled={!dirty}><RotateCcw size={14} /> Restore last export</button><button className="text-button" onClick={() => setShowHelp(true)}><CircleHelp size={14} /> How it works</button></div>
          </aside>
        </div>
      </main>

      <footer className="footer-bar"><span><span className="footer-mark" /> ROAMER SHORTCUT STUDIO</span><span>BUILT FOR CAREFUL EDITS / v1.0</span><span className="footer-keys"><kbd>⌘</kbd><kbd>S</kbd> export <kbd>⌘</kbd><kbd>Z</kbd> undo</span></footer>
    </div>
  );
}
