import re

with open('src/components/DashboardAdmin.tsx', 'r') as f:
    content = f.read()

# Replace empty buttons with a generic placeholder
count = 0
def replace_empty_button(match):
    global count
    count += 1
    return '<button className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">Ação</button>'

# Match <button followed by whitespace and </button>
content = re.sub(r'<button\s*</button>', replace_empty_button, content)

with open('src/components/DashboardAdmin.tsx', 'w') as f:
    f.write(content)

print(f"Replaced {count} empty buttons.")
