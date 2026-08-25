/*
 * Quiet Blueprint style reminder: keep XML state explicit, technical, and reversible.
 * This module is browser-only and never sends imported file contents anywhere.
 */

export type CommandField = "shortcut" | "accelerator" | "toggle";

export type ShortcutCommand = {
  index: number;
  id: string;
  kind: string;
  categoryId: string;
  categoryLabel: string;
  shortcut: string;
  accelerator: string;
  toggle: boolean;
};

export type CategoryOption = {
  id: string;
  label: string;
  count: number;
};

export type XmlIssue = {
  type: "error" | "warning";
  message: string;
  commandId?: string;
};

export type ParsedXml = {
  valid: boolean;
  commands: ShortcutCommand[];
  categories: CategoryOption[];
  issues: XmlIssue[];
  error?: string;
};

const COMMAND_TAGS = new Set([
  "Command",
  "StringCommand",
  "ComboCommand",
  "TreeComboCommand",
  "FloatCommand",
  "IntCommand",
  "ColorCommand",
]);

export const DEMO_XML = `<?xml version="1.0" encoding="utf-8"?>
<CommandDefinition>
  <Category ID="RoamerGUI_FileCategory">
    <Command ID="RoamerGUI_FILE_NEW"><Shortcut>Ctrl+N</Shortcut><Accelerator>N</Accelerator></Command>
    <Command ID="RoamerGUI_FILE_OPEN"><Shortcut>Ctrl+O</Shortcut><Accelerator>O</Accelerator></Command>
    <Command ID="RoamerGUI_FILE_SAVE"><Shortcut>Ctrl+S</Shortcut><Accelerator>S</Accelerator></Command>
    <Command ID="RoamerGUI_FILE_SAVE_AS"><Accelerator>A</Accelerator></Command>
    <Command ID="RoamerGUI_FILE_CLOSE" />
  </Category>
  <Category ID="RoamerGUI_EditCategory">
    <Command ID="RoamerGUI_EDIT_UNDO"><Shortcut>Ctrl+Z</Shortcut><Accelerator>U</Accelerator></Command>
    <Command ID="RoamerGUI_EDIT_REDO"><Shortcut>Ctrl+Y</Shortcut><Accelerator>R</Accelerator></Command>
    <Command ID="RoamerGUI_QUICK_FIND_DLG"><Shortcut>Ctrl+F</Shortcut></Command>
    <Command ID="RoamerGUI_EDIT_HIDE"><Shortcut>Ctrl+H</Shortcut><Toggle>true</Toggle></Command>
  </Category>
  <Category ID="RoamerGUI_NavModeCategory">
    <Command ID="RoamerGUI_OM_MODE_WALK"><Shortcut>Ctrl+2</Shortcut><Accelerator>W</Accelerator><Toggle>true</Toggle></Command>
    <Command ID="RoamerGUI_OM_MODE_ORBIT"><Shortcut>Ctrl+7</Shortcut><Accelerator>O</Accelerator><Toggle>true</Toggle></Command>
  </Category>
  <Category ID="RoamerGUI_DisplayCategory">
    <Command ID="RoamerGUI_OM_RENDER_FULL"><Shortcut>F</Shortcut><Accelerator>F</Accelerator><Toggle>true</Toggle></Command>
    <Command ID="RoamerGUI_OM_RENDER_WIRE"><Shortcut>W</Shortcut><Accelerator>W</Accelerator><Toggle>true</Toggle></Command>
  </Category>
</CommandDefinition>`;

const titleize = (id: string) => {
  const trimmed = id.replace(/^RoamerGUI_/, "").replace(/Category$/i, "");
  return trimmed
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim() || "Uncategorized";
};

const directChild = (element: Element, tagName: string) =>
  Array.from(element.children).find((child) => child.tagName === tagName);

const directText = (element: Element, tagName: string) =>
  directChild(element, tagName)?.textContent?.trim() ?? "";

export function normalizeShortcut(value: string) {
  const aliases: Record<string, string> = {
    CONTROL: "Ctrl",
    CTRL: "Ctrl",
    OPTION: "Alt",
    ALT: "Alt",
    COMMAND: "Meta",
    CMD: "Meta",
    META: "Meta",
    SHIFT: "Shift",
  };
  const parts = value
    .trim()
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return "";
  const key = parts.pop() ?? "";
  const modifiers = Array.from(
    new Set(
      parts.map((part) => aliases[part.toUpperCase()] ?? part).filter(Boolean),
    ),
  ).sort((a, b) => ["Ctrl", "Alt", "Shift", "Meta"].indexOf(a) - ["Ctrl", "Alt", "Shift", "Meta"].indexOf(b));
  const normalizedKey = key.length === 1 ? key.toUpperCase() : key.toUpperCase();
  return [...modifiers, normalizedKey].join("+");
}

export function shortcutFormatIssue(value: string) {
  const normalized = normalizeShortcut(value);
  if (!normalized) return undefined;
  const parts = normalized.split("+");
  const finalKey = parts.at(-1) ?? "";
  const modifierNames = new Set(["Ctrl", "Alt", "Shift", "Meta"]);
  if (parts.length === 1 && modifierNames.has(finalKey)) return "A shortcut needs a key, not only a modifier.";
  if (parts.slice(0, -1).some((part) => !modifierNames.has(part))) {
    return "Use modifiers such as Ctrl, Alt, Shift, or Meta before the key.";
  }
  return undefined;
}

function getCommandElements(doc: XMLDocument) {
  return Array.from(doc.getElementsByTagName("Category")).flatMap((category) =>
    Array.from(category.children).filter(
      (element) => COMMAND_TAGS.has(element.tagName) && element.getAttribute("ID"),
    ),
  );
}

function parseRaw(xml: string) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const parserError = doc.getElementsByTagName("parsererror")[0];
  if (parserError || doc.documentElement?.tagName !== "CommandDefinition") {
    throw new Error("The file is not a valid Roamer command definition.");
  }
  return doc;
}

export function parseXml(xml: string): ParsedXml {
  try {
    const doc = parseRaw(xml);
    const categories = Array.from(doc.getElementsByTagName("Category"));
    const commands: ShortcutCommand[] = [];
    const categoryMap = new Map<string, CategoryOption>();

    categories.forEach((category) => {
      const categoryId = category.getAttribute("ID") ?? "uncategorized";
      const option: CategoryOption = {
        id: categoryId,
        label: titleize(categoryId),
        count: 0,
      };
      categoryMap.set(categoryId, option);
      Array.from(category.children)
        .filter((element) => COMMAND_TAGS.has(element.tagName) && element.getAttribute("ID"))
        .forEach((element) => {
          option.count += 1;
          commands.push({
            index: commands.length,
            id: element.getAttribute("ID") ?? "Unnamed command",
            kind: element.tagName,
            categoryId,
            categoryLabel: option.label,
            shortcut: directText(element, "Shortcut"),
            accelerator: directText(element, "Accelerator"),
            toggle: directText(element, "Toggle").toLowerCase() === "true",
          });
        });
    });

    const issues: XmlIssue[] = [];
    const ids = new Map<string, number>();
    const shortcuts = new Map<string, string[]>();
    commands.forEach((command) => {
      ids.set(command.id, (ids.get(command.id) ?? 0) + 1);
      const normalized = normalizeShortcut(command.shortcut);
      if (normalized) shortcuts.set(normalized, [...(shortcuts.get(normalized) ?? []), command.id]);
      const formatIssue = shortcutFormatIssue(command.shortcut);
      if (formatIssue) issues.push({ type: "warning", message: formatIssue, commandId: command.id });
    });
    ids.forEach((count, id) => {
      if (count > 1) issues.push({ type: "error", message: `Duplicate command ID appears ${count} times.`, commandId: id });
    });
    shortcuts.forEach((commandIds, shortcut) => {
      if (commandIds.length > 1) {
        issues.push({
          type: "warning",
          message: `${shortcut} is assigned to ${commandIds.length} commands.`,
          commandId: commandIds.join(", "),
        });
      }
    });

    return {
      valid: true,
      commands,
      categories: Array.from(categoryMap.values()),
      issues,
    };
  } catch (error) {
    return {
      valid: false,
      commands: [],
      categories: [],
      issues: [{ type: "error", message: error instanceof Error ? error.message : "Could not read this XML file." }],
      error: error instanceof Error ? error.message : "Could not read this XML file.",
    };
  }
}

export function serializeXml(doc: XMLDocument) {
  const serialized = new XMLSerializer().serializeToString(doc);
  return serialized.startsWith("<?xml") ? serialized : `<?xml version="1.0" encoding="utf-8"?>\n${serialized}`;
}

function updateChild(element: Element, tagName: string, value: string) {
  const existing = directChild(element, tagName);
  if (!value.trim()) {
    existing?.remove();
    return;
  }
  if (existing) {
    existing.textContent = value.trim();
    return;
  }
  const child = element.ownerDocument.createElement(tagName);
  child.textContent = value.trim();
  element.appendChild(child);
}

export function updateCommandField(xml: string, index: number, field: CommandField, value: string | boolean) {
  const doc = parseRaw(xml);
  const target = getCommandElements(doc)[index];
  if (!target) throw new Error("The selected command no longer exists in this file.");
  if (field === "toggle") updateChild(target, "Toggle", value ? "true" : "false");
  else updateChild(target, field === "shortcut" ? "Shortcut" : "Accelerator", String(value));
  return serializeXml(doc);
}

export function addCommand(
  xml: string,
  values: { categoryId: string; id: string; shortcut: string; accelerator: string; toggle: boolean },
) {
  const doc = parseRaw(xml);
  const category = Array.from(doc.getElementsByTagName("Category")).find(
    (candidate) => candidate.getAttribute("ID") === values.categoryId,
  );
  if (!category) throw new Error("Choose an existing category before adding a command.");
  if (!values.id.trim()) throw new Error("A command ID is required.");
  if (getCommandElements(doc).some((element) => element.getAttribute("ID") === values.id.trim())) {
    throw new Error("That command ID already exists in this file.");
  }
  const command = doc.createElement("Command");
  command.setAttribute("ID", values.id.trim());
  updateChild(command, "Shortcut", values.shortcut);
  updateChild(command, "Accelerator", values.accelerator);
  if (values.toggle) updateChild(command, "Toggle", "true");
  category.appendChild(command);
  return serializeXml(doc);
}

export function removeCommand(xml: string, index: number) {
  const doc = parseRaw(xml);
  const target = getCommandElements(doc)[index];
  if (!target?.parentNode) throw new Error("The selected command no longer exists in this file.");
  target.parentNode.removeChild(target);
  return serializeXml(doc);
}
