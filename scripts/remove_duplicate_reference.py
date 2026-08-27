from pathlib import Path

path = Path('/home/ubuntu/roamer-shortcut-studio/client/src/pages/Home.tsx')
text = path.read_text()
start = '        <section className="reference-toolbar" aria-label="Shortcut filters">'
end = '        <section className="file-safety-note" aria-label="File location and backup guidance">'
first = text.find(start)
second = text.find(start, first + len(start))
if first < 0 or second < 0:
    raise SystemExit('Expected two reference toolbar blocks')
second_end = text.find(end, second)
if second_end < 0:
    raise SystemExit('Could not find block boundary')
updated = text[:second] + text[second_end:]
path.write_text(updated)
print('Removed duplicate reference block')
